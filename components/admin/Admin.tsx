
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { Department, Designation } from "../../types";
import supabaseClient from "../../context/supabaseClient";
import AdminDashboard from "./admin_dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Video,
  FileText,
  Menu,
  X,
  LogOut,
} from "lucide-react";

type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  department?: string | null;
  designation?: string | null;
  score?: number | null;
};

const Admin: React.FC = () => {
  const { currentUser, logout } = useContext(AppContext);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  // Helper: check whether a given user id (or profile id) is present in loaded profiles
  // and therefore has role === 'user' (we only load profiles with role='user').
  const hasUserProfile = (userId: any) => {
    try {
      if (!userId) return false;
      const s = String(userId);
      return profiles.some(
        (p) => String(p.user_id) === s || String(p.id) === s
      );
    } catch (e) {
      return false;
    }
  };

  // Read initial state from URL params so refresh preserves the current admin tab
  const readUrlState = () => {
    if (typeof window === "undefined")
      return { view: "dashboard" as const, analytics: "none" as const };
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const analyticsParam = params.get("analytics");
    // If URL params are provided, prefer them. Otherwise try localStorage (preserve last tab across reloads)
    const lsView = window.localStorage.getItem("admin:selectedView");
    const lsAnalytics = window.localStorage.getItem("admin:selectedAnalytics");
    const view =
      viewParam === "dashboard" ||
      viewParam === "stats" ||
      viewParam === "registrations"
        ? viewParam
        : lsView === "dashboard" ||
          lsView === "stats" ||
          lsView === "registrations"
        ? lsView
        : "dashboard";
    const analytics =
      analyticsParam === "videoCompletion" ||
      analyticsParam === "mdMessage" ||
      analyticsParam === "slogan" ||
      analyticsParam === "cartoon" ||
      analyticsParam === "suggestion"
        ? analyticsParam
        : lsAnalytics === "videoCompletion" ||
          lsAnalytics === "mdMessage" ||
          lsAnalytics === "slogan" ||
          lsAnalytics === "cartoon" ||
          lsAnalytics === "suggestion"
        ? lsAnalytics
        : "none";
    return {
      view: view as "dashboard" | "stats" | "registrations",
      analytics: analytics as
        | "none"
        | "videoCompletion"
        | "mdMessage"
        | "slogan"
        | "cartoon"
        | "suggestion",
    };
  };

  const [selectedView, setSelectedView] = useState<
    "dashboard" | "stats" | "registrations"
  >(() => readUrlState().view);
  const [selectedAnalytics, setSelectedAnalytics] = useState<
    | "none"
    | "videoCompletion"
    | "mdMessage"
    | "slogan"
    | "cartoon"
    | "suggestion"
  >(() => readUrlState().analytics);
  const [showBy, setShowBy] = useState<"department" | "designation">(
    "department"
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [designationFilter, setDesignationFilter] = useState<string>("All");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // console.log("View:", selectedView, "Analytics:", selectedAnalytics);

  // Profiles
  const fetchProfiles = async () => {
    try {
      // Supabase select has an implicit cap (1000 rows). Use paginated fetch
      // to ensure we retrieve all profiles in large deployments.
      const pageSize = 1000;
      let from = 0;
      let allRows: any[] = [];
      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("id, user_id, name, department, designation, score, role")
          .eq("role", "user")
          .range(from, to);
        if (error) {
          console.error("Error fetching profiles (paged):", error.message || error);
          break;
        }
        const rows = (data || []) as any[];
        allRows = allRows.concat(rows);
        if (rows.length < pageSize) {
          // last page
          break;
        }
        from += pageSize;
      }

      // normalize to ProfileRow shape (role not stored on ProfileRow typically)
      setProfiles((allRows || []).map((d) => ({
        id: d.id,
        user_id: d.user_id,
        name: d.name,
        department: d.department,
        designation: d.designation,
        score: d.score,
      })) as ProfileRow[]);
    } catch (e) {
      console.error("Unexpected error in fetchProfiles", e);
    }
  };

  useEffect(() => {
    fetchProfiles();

    // Helper to subscribe safely for both v1 and v2 clients.
    const subscribeToProfiles = () => {
      try {
        // Supabase v2 channel API
        if (typeof (supabaseClient as any).channel === "function") {
          const channel = (supabaseClient as any)
            .channel("public:profiles")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "profiles" },
              () => {
                fetchProfiles();
              }
            )
            .subscribe();
          return { type: "v2", channel };
        }

        // Supabase v1 style
        if (typeof (supabaseClient as any).from === "function") {
          const sub = (supabaseClient as any)
            .from("profiles")
            .on("*", (payload: any) => {
              fetchProfiles();
            })
            .subscribe();
          return { type: "v1", sub };
        }
      } catch (e) {
        console.debug("subscribeToProfiles: subscription failed", e);
      }
      return null;
    };

    const subscription = subscribeToProfiles();

    return () => {
      try {
        if (!subscription) return;
        if (subscription.type === "v2" && subscription.channel) {
          // removeChannel if available, otherwise try unsubscribe
          if (typeof (supabaseClient as any).removeChannel === "function") {
            (supabaseClient as any).removeChannel(subscription.channel);
          } else if (typeof subscription.channel.unsubscribe === "function") {
            subscription.channel.unsubscribe();
          }
        } else if (subscription.type === "v1" && subscription.sub) {
          if (
            typeof (supabaseClient as any).removeSubscription === "function"
          ) {
            (supabaseClient as any).removeSubscription(subscription.sub);
          } else if (typeof subscription.sub.unsubscribe === "function") {
            subscription.sub.unsubscribe();
          }
        }
      } catch (e) {
        console.debug("Error removing profiles subscription", e);
      }
    };
    // run once on mount
  }, []);

  // Keep URL in sync with selectedView/selectedAnalytics so refresh preserves state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("view", selectedView);
      if (selectedAnalytics && selectedAnalytics !== "none") {
        params.set("analytics", selectedAnalytics);
      } else {
        params.delete("analytics");
      }
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");
      // replaceState so navigation stack isn't polluted on normal tab switches
      window.history.replaceState({}, "", newUrl);
      // persist to localStorage as a fallback for environments where query may be stripped
      try {
        window.localStorage.setItem("admin:selectedView", selectedView);
        window.localStorage.setItem(
          "admin:selectedAnalytics",
          selectedAnalytics
        );
      } catch (e) {
        // ignore localStorage errors (e.g., private mode)
      }
    } catch (e) {
      // ignore
    }
  }, [selectedView, selectedAnalytics]);

  // Respond to browser navigation (back/forward) by reading URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const { view, analytics } = readUrlState();
      setSelectedView(view);
      setSelectedAnalytics(analytics);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // video, md, slogans, images, suggestions
  const [videoRows, setVideoRows] = useState<Array<any>>([]);
  const [videoDeptFilter, setVideoDeptFilter] = useState<string>("All");
  const [videoDesigFilter, setVideoDesigFilter] = useState<string>("All");
  const [videoModuleFilter, setVideoModuleFilter] = useState<
    "All" | "m1" | "m2" | "m3"
  >("All");
  const [videoTaskFilter, setVideoTaskFilter] = useState<
    "All" | "task1" | "task2" | "task3" | "task4" | "task5" | "task6"
  >("All");
  const [mdRows, setMdRows] = useState<Array<any>>([]);
  const [mdRawTasks, setMdRawTasks] = useState<Array<any>>([]);
  const [mdDeptFilter, setMdDeptFilter] = useState<string>("All");
  const [mdDesigFilter, setMdDesigFilter] = useState<string>("All");

  const [sloganRows, setSloganRows] = useState<Array<any>>([]);
  const [sloganDeptFilter, setSloganDeptFilter] = useState<string>("All");
  const [sloganDesigFilter, setSloganDesigFilter] = useState<string>("All");

  const [imageRows, setImageRows] = useState<Array<any>>([]);
  const [imageDeptFilter, setImageDeptFilter] = useState<string>("All");
  const [imageDesigFilter, setImageDesigFilter] = useState<string>("All");

  const [suggestionRows, setSuggestionRows] = useState<Array<any>>([]);
  const [suggestionDeptFilter, setSuggestionDeptFilter] =
    useState<string>("All");
  const [suggestionDesigFilter, setSuggestionDesigFilter] =
    useState<string>("All");

  // Fetch helpers with fallbacks and robust error handling
  const fetchSlogans = async () => {
    try {
      // Try RPC
      try {
        const { data: rpcData, error: rpcErr } = (await (
          supabaseClient as any
        ).rpc?.("get_slogan_submissions")) ?? { data: null, error: null };
        if (!rpcErr && Array.isArray(rpcData)) {
          const joined = (rpcData as any[]).map((r, idx) => ({
            id: r.id
              ? String(r.id)
              : `${String(r.user_id)}_${String(r.created_at || idx)}`,
            user_id: r.user_id,
            employee_id: r.employee_id || r.user_id,
            name: r.name || r.user_id,
            department: r.department || "Unknown",
            designation: r.designation || "Unknown",
            slogan: r.slogan || "",
            created_at: r.created_at || null,
          }));
          // Only include rows that correspond to loaded profiles with role='user'.
          const filtered = joined.filter((jr) => hasUserProfile(jr.user_id));
          console.debug(
            "fetchSlogans: loaded via RPC count=",
            filtered.length,
            "sample=",
            filtered.slice(0, 3)
          );
          setSloganRows(filtered);
          return;
        } else if (rpcErr) {
          console.debug(
            "fetchSlogans: get_slogan_submissions RPC returned error",
            rpcErr
          );
        }
      } catch (e) {
        console.debug("fetchSlogans: rpc attempt failed", e);
      }

      const { data, error } = await supabaseClient
        .from("user_slogans")
        .select("user_id, slogan, created_at");
      if (error) {
        console.error("Error fetching user_slogans:", error.message || error);
        setSloganRows([]);
        return;
      }

      const rows = data || [];
      console.debug(
        "fetchSlogans: raw user_slogans rows count=",
        rows.length,
        "sample=",
        rows.slice(0, 3)
      );
      if (rows.length === 0) {
        setSloganRows([]);
        return;
      }

      const userIds = Array.from(
        new Set(rows.map((r: any) => String(r.user_id)))
      );
      let profileMap = new Map<string, any>();
      try {
        const { data: profilesDataById, error: profilesErrorById } =
          await supabaseClient
            .from("profiles")
            .select("id, user_id, name, department, designation, role")
            .in("id", userIds as string[])
            .eq("role", "user");

        let profilesData = profilesDataById || [];
        let usedJoin = "id";
        if (
          (!profilesData || profilesData.length === 0) &&
          userIds.length > 0
        ) {
          const { data: profilesDataByUserId, error: profilesErrorByUserId } =
            await supabaseClient
              .from("profiles")
              .select("id, user_id, name, department, designation, role")
              .in("user_id", userIds as string[])
              .eq("role", "user");
          if (profilesErrorByUserId) {
            console.error(
              "Error fetching profiles for slogans by user_id:",
              profilesErrorByUserId.message || profilesErrorByUserId
            );
          }
          if (profilesDataByUserId && profilesDataByUserId.length > 0) {
            profilesData = profilesDataByUserId;
            usedJoin = "user_id";
          }
        }

        console.debug(
          "fetchSlogans: profiles fetched count=",
          (profilesData || []).length,
          "usedJoin=",
          usedJoin,
          "sample=",
          (profilesData || []).slice(0, 3)
        );
        (profilesData || []).forEach((p: any) => {
          if (p?.id) profileMap.set(String(p.id), p);
          if (p?.user_id) profileMap.set(String(p.user_id), p);
        });
      } catch (e) {
        console.error("Unexpected error fetching profiles for slogans", e);
      }

      const joined = rows
        .map((r: any, idx: number) => {
          const profile = profileMap.get(String(r.user_id)) || null;
          if (!profile) return null; // skip if profile not a role='user' profile
          const compositeId = `${String(r.user_id)}_${String(
            r.created_at || idx
          )}`;
          return {
            id: compositeId,
            user_id: r.user_id,
            employee_id: profile?.user_id || r.user_id,
            name: profile?.name || r.user_id,
            department: profile?.department || "Unknown",
            designation: profile?.designation || "Unknown",
            slogan: r.slogan || "",
            created_at: r.created_at || null,
          };
        })
        .filter(Boolean) as any[];
      console.debug(
        "fetchSlogans: joined rows count=",
        joined.length,
        "sample=",
        joined.slice(0, 3)
      );
      setSloganRows(joined);
    } catch (e) {
      console.error("fetchSlogans overall error", e);
      setSloganRows([]);
    }
  };

  const fetchImageSubmissions = async () => {
    try {
      try {
        const { data: rpcData, error: rpcErr } = (await (
          supabaseClient as any
        ).rpc?.("get_image_submissions_with_profiles")) ?? {
          data: null,
          error: null,
        };
        if (!rpcErr && Array.isArray(rpcData)) {
          const joined = (rpcData as any[]).map((r, idx) => ({
            id: r.id
              ? String(r.id)
              : `${String(r.user_id)}_${String(r.created_at || idx)}`,
            user_id: r.user_id,
            employee_id: r.employee_id || r.user_id,
            name: r.name || r.user_id,
            department: r.department || "Unknown",
            designation: r.designation || "Unknown",
            created_at: r.created_at || null,
          }));
          // Only include rows that correspond to loaded profiles with role='user'.
          const filtered = joined.filter((jr) => hasUserProfile(jr.user_id));
          console.debug(
            "fetchImageSubmissions: loaded via RPC count=",
            filtered.length,
            "sample=",
            filtered.slice(0, 3)
          );
          setImageRows(filtered);
          return;
        } else if (rpcErr) {
          console.debug(
            "fetchImageSubmissions: RPC get_image_submissions_with_profiles returned error",
            rpcErr
          );
        }
      } catch (e) {
        console.debug("fetchImageSubmissions: rpc attempt failed", e);
      }

      const { data, error } = await supabaseClient
        .from("image_submissions")
        .select("user_id, created_at");
      if (error) {
        console.error(
          "Error fetching image_submissions:",
          error.message || error
        );
        setImageRows([]);
        return;
      }

      const rows = data || [];
      console.debug(
        "fetchImageSubmissions: raw image_submissions rows count=",
        rows.length,
        "sample=",
        rows.slice(0, 3)
      );
      if (rows.length === 0) {
        setImageRows([]);
        return;
      }

      const userIds = Array.from(
        new Set(rows.map((r: any) => String(r.user_id)))
      );
      let profileMap = new Map<string, any>();
      try {
        const { data: profilesDataById, error: profilesErrorById } =
          await supabaseClient
            .from("profiles")
            .select("id, user_id, name, department, designation, role")
            .in("id", userIds as string[])
            .eq("role", "user");

        let profilesData = profilesDataById || [];
        let usedJoin = "id";
        if (
          (!profilesData || profilesData.length === 0) &&
          userIds.length > 0
        ) {
          const { data: profilesDataByUserId, error: profilesErrorByUserId } =
            await supabaseClient
              .from("profiles")
              .select("id, user_id, name, department, designation, role")
              .in("user_id", userIds as string[])
              .eq("role", "user");
          if (profilesErrorByUserId) {
            console.error(
              "Error fetching profiles for image_submissions by user_id:",
              profilesErrorByUserId.message || profilesErrorByUserId
            );
          }
          if (profilesDataByUserId && profilesDataByUserId.length > 0) {
            profilesData = profilesDataByUserId;
            usedJoin = "user_id";
          }
        }
        console.debug(
          "fetchImageSubmissions: profiles fetched count=",
          (profilesData || []).length,
          "usedJoin=",
          usedJoin,
          "sample=",
          (profilesData || []).slice(0, 3)
        );
        (profilesData || []).forEach((p: any) => {
          if (p?.id) profileMap.set(String(p.id), p);
          if (p?.user_id) profileMap.set(String(p.user_id), p);
        });
      } catch (e) {
        console.error(
          "Unexpected error fetching profiles for image_submissions",
          e
        );
      }

      const joined = rows
        .map((r: any, idx: number) => {
          const profile = profileMap.get(String(r.user_id)) || null;
          if (!profile) return null; // skip rows without a role='user' profile
          const compositeId = `${String(r.user_id)}_${String(
            r.created_at || idx
          )}`;
          return {
            id: compositeId,
            user_id: r.user_id,
            employee_id: profile?.user_id || r.user_id,
            name: profile?.name || r.user_id,
            department: profile?.department || "Unknown",
            designation: profile?.designation || "Unknown",
            created_at: r.created_at || null,
          };
        })
        .filter(Boolean) as any[];
      console.debug(
        "fetchImageSubmissions: joined rows count=",
        joined.length,
        "sample=",
        joined.slice(0, 3)
      );
      setImageRows(joined);
    } catch (e) {
      console.error("fetchImageSubmissions overall error", e);
      setImageRows([]);
    }
  };

  const fetchSuggestionSubmissions = async () => {
    try {
      try {
        const { data: rpcData, error: rpcErr } = (await (
          supabaseClient as any
        ).rpc?.("get_suggestion_submissions")) ?? { data: null, error: null };
        if (!rpcErr && Array.isArray(rpcData)) {
          const joined = (rpcData as any[]).map((r, idx) => ({
            id: r.id
              ? String(r.id)
              : `${String(r.user_id)}_${String(r.created_at || idx)}`,
            user_id: r.user_id,
            employee_id: r.employee_id || r.user_id,
            name: r.name || r.user_id,
            department: r.department || "Unknown",
            designation: r.designation || "Unknown",
            created_at: r.created_at || null,
          }));
          // Filter RPC results to only include users that exist in profiles with role='user'
          const filtered = joined.filter((jr) => hasUserProfile(jr.user_id));
          console.debug(
            "fetchSuggestionSubmissions: loaded via RPC count=",
            filtered.length,
            "sample=",
            filtered.slice(0, 3)
          );
          setSuggestionRows(filtered);
          return;
        } else if (rpcErr) {
          console.debug(
            "fetchSuggestionSubmissions: get_suggestion_submissions RPC returned error",
            rpcErr
          );
        }
      } catch (e) {
        console.debug("fetchSuggestionSubmissions: rpc attempt failed", e);
      }

      const { data, error } = await supabaseClient
        .from("user_tasks")
        .select("user_id, completed_steps, updated_at")
        .eq("task_id", "task5")
        .gte("completed_steps", 1);
      if (error) {
        console.error(
          "Error fetching suggestion submissions (user_tasks):",
          error.message || error
        );
        setSuggestionRows([]);
        return;
      }

      const rows = data || [];
      console.debug(
        "fetchSuggestionSubmissions: raw user_tasks rows count=",
        rows.length,
        "sample=",
        rows.slice(0, 3)
      );
      if (rows.length === 0) {
        setSuggestionRows([]);
        return;
      }

      const userIds = Array.from(
        new Set(rows.map((r: any) => String(r.user_id)))
      );
      let profileMap = new Map<string, any>();
      try {
        const { data: profilesDataById, error: profilesErrorById } =
          await supabaseClient
            .from("profiles")
            .select("id, user_id, name, department, designation, role")
            .in("id", userIds as string[])
            .eq("role", "user");

        let profilesData = profilesDataById || [];
        let usedJoin = "id";
        if (
          (!profilesData || profilesData.length === 0) &&
          userIds.length > 0
        ) {
          const { data: profilesDataByUserId, error: profilesErrorByUserId } =
            await supabaseClient
              .from("profiles")
              .select("id, user_id, name, department, designation, role")
              .in("user_id", userIds as string[])
              .eq("role", "user");
          if (profilesErrorByUserId) {
            console.error(
              "Error fetching profiles for suggestions by user_id:",
              profilesErrorByUserId.message || profilesErrorByUserId
            );
          }
          if (profilesDataByUserId && profilesDataByUserId.length > 0) {
            profilesData = profilesDataByUserId;
            usedJoin = "user_id";
          }
        }
        console.debug(
          "fetchSuggestionSubmissions: profiles fetched count=",
          (profilesData || []).length,
          "usedJoin=",
          usedJoin,
          "sample=",
          (profilesData || []).slice(0, 3)
        );
        (profilesData || []).forEach((p: any) => {
          if (p?.id) profileMap.set(String(p.id), p);
          if (p?.user_id) profileMap.set(String(p.user_id), p);
        });
      } catch (e) {
        console.error("Unexpected error fetching profiles for suggestions", e);
      }

      const joined = rows
        .map((r: any, idx: number) => {
          const profile = profileMap.get(String(r.user_id)) || null;
          if (!profile) return null;
          const compositeId = `${String(r.user_id)}_${String(
            r.updated_at || r.completed_steps || idx
          )}`;
          return {
            id: compositeId,
            user_id: r.user_id,
            employee_id: profile?.user_id || r.user_id,
            name: profile?.name || r.user_id,
            department: profile?.department || "Unknown",
            designation: profile?.designation || "Unknown",
            created_at: r.updated_at || null,
          };
        })
        .filter(Boolean) as any[];
      console.debug(
        "fetchSuggestionSubmissions: joined rows count=",
        joined.length,
        "sample=",
        joined.slice(0, 3)
      );
      setSuggestionRows(joined);
    } catch (e) {
      console.error("fetchSuggestionSubmissions overall error", e);
      setSuggestionRows([]);
    }
  };
  const fetchVideoCompletions = async () => {
    // Prefer RPC: admin_video_completion which returns profiles joined with module progress and score.
    try {
      // pass module filter ('all'|'m1'|'m2'|'m3') so server can pre-filter
      const taskIndex =
        videoTaskFilter === "All"
          ? null
          : Number(videoTaskFilter.replace("task", ""));
      const { data, error } = await supabaseClient.rpc(
        "admin_video_completion",
        {
          module_filter: videoModuleFilter.toLowerCase(),
          task_index: taskIndex,
        }
      );
      if (error) {
        console.error(
          "admin_video_completion RPC error:",
          error.message || error
        );
        setVideoRows([]);
        return;
      }
      const rows = (data || []) as any[];
      // map RPC rows to client shape expected by the table
      const mapped = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        employee_id: r.employee_id,
        name: r.name,
        department: r.department || "Unknown",
        designation: r.designation || "Unknown",
        score_m1:
          typeof r.score_m1 === "number"
            ? r.score_m1
            : r.score_m1
            ? Number(r.score_m1)
            : 0,
        score_m2:
          typeof r.score_m2 === "number"
            ? r.score_m2
            : r.score_m2
            ? Number(r.score_m2)
            : 0,
        score_m3:
          typeof r.score_m3 === "number"
            ? r.score_m3
            : r.score_m3
            ? Number(r.score_m3)
            : 0,
        total_score:
          typeof r.total_score === "number"
            ? r.total_score
            : r.total_score
            ? Number(r.total_score)
            : 0,
        task_score:
          typeof r.task_score === "number"
            ? r.task_score
            : r.task_score
            ? Number(r.task_score)
            : 0,
        m1Finished: !!r.m1,
        m2Finished: !!r.m2,
        m3Finished: !!r.m3,
        completed_at: r.completed_at || null,
      }));
      // Ensure each mapped row has a 'score' field for the table; default to total_score
      const withScore = mapped.map((r) => ({
        ...r,
        // default score shown in table depends on selected module & task filter
        score:
          videoTaskFilter === "All" ? r.total_score ?? 0 : r.task_score ?? 0,
      }));
      setVideoRows(withScore);
    } catch (e) {
      console.error("Error calling admin_video_completion RPC", e);
      setVideoRows([]);
    }
  };

  const fetchMDCompletions = async () => {
    try {
      const pageSize = 1000;
      let offset = 0;
      let allRows: any[] = [];

      while (true) {
        const { data: rpcData, error: rpcErr } = await (supabaseClient as any).rpc('get_md_completions', {
          p_limit: pageSize,
          p_offset: offset,
        });

        if (rpcErr) {
          console.error('Error fetching MD completions:', rpcErr.message || rpcErr);
          setMdRows([]);
          setMdRawTasks([]);
          return;
        }

        if (Array.isArray(rpcData)) {
          allRows = allRows.concat(rpcData);

          if (rpcData.length < pageSize) {
            // This was the last page
            break;
          }

          offset += pageSize;
        } else {
          // Should not happen if RPC returns array
          break;
        }
      }

      const mapped = allRows.map((r, idx) => ({
        id: r.id ? String(r.id) : `${String(r.user_id)}_${String(r.task_id || '')}_${idx}`,
        user_id: r.user_id,
        employee_id: r.employee_id || r.user_id,
        name: r.name || String(r.user_id),
        department: r.department || 'Unknown',
        designation: r.designation || 'Unknown',
        score: typeof r.score === 'number' ? r.score : (r.score ? Number(r.score) : 0),
        finished: typeof r.finished === 'boolean' ? r.finished : ((r.completed_steps || 0) >= 7),
      }));
      console.debug('fetchMDCompletions: loaded via RPC count=', mapped.length, 'sample=', mapped.slice(0,3));
      setMdRows(mapped);
      setMdRawTasks([]);

    } catch (e) {
      console.error('fetchMDCompletions outer error', e);
      setMdRows([]);
      setMdRawTasks([]);
    }
  };

  // subscriptions for user_tasks, user_slogans, image_submissions
  useEffect(() => {
    fetchVideoCompletions();
    fetchMDCompletions();
    fetchSlogans();
    const subscribeSafely = (
      channelName: string,
      tableName: string,
      cb: () => void
    ) => {
      try {
        if (typeof (supabaseClient as any).channel === "function") {
          return (supabaseClient as any)
            .channel(channelName)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: tableName },
              () => {
                cb();
              }
            )
            .subscribe();
        } else if (typeof (supabaseClient as any).from === "function") {
          return (supabaseClient as any)
            .from(`${tableName}`)
            .on("*", (payload: any) => {
              cb();
            })
            .subscribe();
        }
      } catch (e) {
        console.debug("subscribeSafely failed for", tableName, e);
      }
      return null;
    };

    const ch = subscribeSafely("public:user_tasks", "user_tasks", () => {
      fetchVideoCompletions();
      fetchMDCompletions();
      fetchSuggestionSubmissions();
    });
    const ch2 = subscribeSafely("public:user_slogans", "user_slogans", () => {
      fetchSlogans();
    });
    const ch3 = subscribeSafely(
      "public:image_submissions",
      "image_submissions",
      () => {
        fetchImageSubmissions();
      }
    );

    return () => {
      const cleanup = (sub: any) => {
        try {
          if (!sub) return;
          if (
            typeof (supabaseClient as any).removeChannel === "function" &&
            sub.channel
          ) {
            (supabaseClient as any).removeChannel(sub.channel);
          } else if (
            typeof (supabaseClient as any).removeSubscription === "function"
          ) {
            (supabaseClient as any).removeSubscription(sub);
          } else if (typeof sub.unsubscribe === "function") {
            sub.unsubscribe();
          }
        } catch (e) {
          console.debug("cleanup subscription failed", e);
        }
      };
      cleanup(ch);
      cleanup(ch2);
      cleanup(ch3);
    };
    // run once on mount
  }, []);

  // re-fetch video completions when module/task filter changes
  useEffect(() => {
    fetchVideoCompletions();
  }, [videoModuleFilter, videoTaskFilter]);

  const exportToCSV = (rows: Array<any>, filename = "export.csv") => {
    try {
      if (!rows || rows.length === 0) {
        const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const keys = Object.keys(rows[0]);
      const header = keys.join(",");
      const csv = [header]
        .concat(
          rows.map((r) =>
            keys
              .map((k) => {
                const v =
                  r[k] === undefined || r[k] === null ? "" : String(r[k]);
                return `"${v.replace(/"/g, '""')}"`;
              })
              .join(",")
          )
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("exportToCSV error", e);
    }
  };

  const departments = useMemo(() => {
    try {
      return Object.values(Department) as string[];
    } catch (e) {
      return [];
    }
  }, []);
  const designations = useMemo(() => {
    try {
      return Object.values(Designation) as string[];
    } catch (e) {
      return [];
    }
  }, []);

  const PLAN_BY_DEPARTMENT: Record<string, number> = {
    [Department.AUTO_PRODUCTION]: 46,
    [Department.ENVIRONMENT]: 3,
    [Department.FINANCE_AND_ACCOUNTS]: 15,
    [Department.FST_AND_DOJO_TRAINING]: 25,
    [Department.FULL_TIME_DIRECTORS]: 2,
    [Department.GD_ASSEMBLY]: 147,
    [Department.GD_MACHINING]: 155,
    [Department.GD_LINE_SUPPLY]: 24,
    [Department.HEALTH_AND_SAFETY]: 14,
    [Department.HR_AND_ADMIN]: 30,
    [Department.INFORMATION_SYSTEMS]: 13,
    [Department.LEARNING_DEVELOPMENT]: 20,
    [Department.MAINTENANCE]: 124,
    [Department.MANUFACTURING_ENGG]: 26,
    [Department.PC_AND_LOGISTICS]: 156,
    [Department.PRODUCTION_ENGG]: 32,
    [Department.PRODUCTION_SUPPORT_COMMON]: 13,
    [Department.PURCHASE_AND_BUSINESS_PLANNING]: 18,
    [Department.QUALITY]: 88,
    [Department.SHOP_FLOOR_DEVELOPMENT]: 6,
    [Department.SUPPLY_CHAIN_MANAGEMENT]: 54,
    [Department.TNGA_ASSEMBLY]: 315,
    [Department.TNGA_LINE_SUPPLY]: 43,
    [Department.TNGA_MACHINING]: 101,
    [Department.TOOL_MGMT_AND_ENGG]: 38,
    [Department.UTILITY_DEPARTMENT]: 51,
  };

  const PLAN_BY_DESIGNATION: Record<string, number> = {
    'TRAINEE': 903,
    'OPERATOR': 188,
    'ASSISTANT ENGINEER': 32,
    'CONTRACT ENGINEER': 28,
    'ENGINEER': 133,
    'SENIOR ENGINEER': 115,
    'ASSISTANT MANAGER': 36,
    'DEPUTY MANAGER': 21,
    'MANAGER': 18,
    'TOP MANAGEMENT': 28,
    'OTHERS': 57,
  };

  const registrationsByDept = useMemo(() => {
    const map = new Map<string, number>();
    profiles.forEach((p) => {
      const key = p.department || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
  }, [profiles]);

  const registrationsByDesig = useMemo(() => {
    const map = new Map<string, number>();
    profiles.forEach((p) => {
      const key = p.designation || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
  }, [profiles]);

  const employeesByDept = useMemo(() => {
    return (departments as string[]).map((key) => ({
      key,
      total: PLAN_BY_DEPARTMENT[key] ?? 0,
    }));
  }, [departments]);

  const employeesByDesig = useMemo(() => {
    return (designations as string[]).map((key) => ({
      key,
      total: PLAN_BY_DESIGNATION[key] ?? 0,
    }));
  }, [designations]);

  const filteredProfiles = profiles.filter((p) => {
    const deptOk =
      departmentFilter === "All"
        ? true
        : (p.department || "Unknown") === departmentFilter;
    const desigOk =
      designationFilter === "All"
        ? true
        : (p.designation || "Unknown") === designationFilter;
    return deptOk && desigOk;
  });

  const displayedProfiles = useMemo(() => {
    return filteredProfiles
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [filteredProfiles]);

  const displayedVideoRows = useMemo(() => {
    const filtered = videoRows
      .filter(
        (r) =>
          (videoDeptFilter === "All" || r.department === videoDeptFilter) &&
          (videoDesigFilter === "All" || r.designation === videoDesigFilter)
      )
      .filter((r) => {
        if (videoTaskFilter !== "All") {
          return r.task_score != null;
        }
        if (videoModuleFilter === "All")
          return r.m1Finished && r.m2Finished && r.m3Finished;
        if (videoModuleFilter === "m1") return r.m1Finished;
        if (videoModuleFilter === "m2") return r.m2Finished;
        if (videoModuleFilter === "m3") return r.m3Finished;
        return true;
      });

    const key =
      videoTaskFilter !== "All"
        ? "task_score"
        : videoModuleFilter === "m1"
        ? "score_m1"
        : videoModuleFilter === "m2"
        ? "score_m2"
        : videoModuleFilter === "m3"
        ? "score_m3"
        : "total_score";

    const withSelectedScore = filtered.map((r) => ({
      ...r,
      score: r[key] || 0,
    }));

    return withSelectedScore
      .slice()
      .sort((a, b) => (b[key] || 0) - (a[key] || 0));
  }, [
    videoRows,
    videoDeptFilter,
    videoDesigFilter,
    videoModuleFilter,
    videoTaskFilter,
  ]);

  const displayedMdRows = useMemo(() => {
    console.log(mdRows)
    return mdRows
      .filter(
        (r) =>
          (mdDeptFilter === "All" || r.department === mdDeptFilter) &&
          (mdDesigFilter === "All" || r.designation === mdDesigFilter)
      )
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [mdRows, mdDeptFilter, mdDesigFilter]);

  const displayedSloganRows = useMemo(() => {
    return sloganRows.filter(
      (r) =>
        (sloganDeptFilter === "All" || r.department === sloganDeptFilter) &&
        (sloganDesigFilter === "All" || r.designation === sloganDesigFilter)
    );
  }, [sloganRows, sloganDeptFilter, sloganDesigFilter]);

  const displayedImageRows = useMemo(() => {
    return imageRows.filter(
      (r) =>
        (imageDeptFilter === "All" || r.department === imageDeptFilter) &&
        (imageDesigFilter === "All" || r.designation === imageDesigFilter)
    );
  }, [imageRows, imageDeptFilter, imageDesigFilter]);

  const displayedSuggestionRows = useMemo(() => {
    return suggestionRows.filter(
      (r) =>
        (suggestionDeptFilter === "All" ||
          r.department === suggestionDeptFilter) &&
        (suggestionDesigFilter === "All" ||
          r.designation === suggestionDesigFilter)
    );
  }, [suggestionRows, suggestionDeptFilter, suggestionDesigFilter]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-white shadow-lg overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">ADMINS</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center mt-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
              {currentUser?.name?.substring(0, 2).toUpperCase() || "AD"}
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {currentUser?.name || "Admin"}
            </h2>
            <p className="text-sm text-teal-500">Administrator</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => {
              setSelectedView("dashboard");
              setSelectedAnalytics("none");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedView === "dashboard" && selectedAnalytics === "none"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard size={22} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setSelectedView("stats");
              setSelectedAnalytics("none");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedView === "stats" && selectedAnalytics === "none"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <BarChart3 size={20} />
            <span className="font-medium">Registration Status</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("mdMessage");
              await fetchMDCompletions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "mdMessage"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">MD Message Completion</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("videoCompletion");
              await fetchVideoCompletions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "videoCompletion"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Video size={20} />
            <span className="font-medium">Video Completion</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("cartoon");
              await fetchImageSubmissions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "cartoon"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Cartoon Submission Analytics</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("slogan");
              await fetchSlogans();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "slogan"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Slogan Competition Analytics</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("suggestion");
              await fetchSuggestionSubmissions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "suggestion"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Suggestion Submission Analytics</span>
          </button>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                console.error("Logout failed", e);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} />
            <div className="text-left">
              <div className="text-sm font-medium">Logout</div>
              <div className="text-xs opacity-80">
                {currentUser?.name || currentUser?.email || "Admin"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm p-4 flex items-center gap-4 border-b border-gray-200">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-full mx-auto">
            {selectedView === "dashboard" && selectedAnalytics === "none" ? (
              <AdminDashboard />
            ) : selectedAnalytics === "slogan" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Slogan Competition Analytics
                  </h3>
                </div>

                {/* Department-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Department-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(departments as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DEPARTMENT[d] ?? 0,
                          submitted: sloganRows.filter(
                            (s) => s.department === d
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Designation-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Designation-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(designations as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DESIGNATION[d] ?? 0,
                          submitted: sloganRows.filter(
                            (s) => s.designation === d
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={sloganDeptFilter}
                        onChange={(e) => setSloganDeptFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={sloganDesigFilter}
                        onChange={(e) => setSloganDesigFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => {
                          const rows = displayedSloganRows.map((r) => ({
                            employee_id: r.employee_id,
                            name: r.name,
                            slogan: r.slogan,
                          }));
                          exportToCSV(rows, "slogan_submissions.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Slogan Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedSloganRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                            <td className="px-4 py-3 text-sm">{r.slogan}</td>
                          </tr>
                        ))}
                        {displayedSloganRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No slogan submissions found for selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : selectedAnalytics === "cartoon" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Cartoon Submission Analytics
                  </h3>
                </div>

                {/* Department-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Department-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(departments as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DEPARTMENT[d] ?? 0,
                          submitted: imageRows.filter((s) => s.department === d)
                            .length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Designation-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Designation-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(designations as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DESIGNATION[d] ?? 0,
                          submitted: imageRows.filter(
                            (s) => s.designation === d
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={imageDeptFilter}
                        onChange={(e) => setImageDeptFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={imageDesigFilter}
                        onChange={(e) => setImageDesigFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => {
                          const rows = displayedImageRows.map((r) => ({
                            employee_id: r.employee_id,
                            name: r.name,
                          }));
                          exportToCSV(rows, "cartoon_submissions.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedImageRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                          </tr>
                        ))}
                        {displayedImageRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No cartoon submissions found for selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : selectedAnalytics === "suggestion" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Suggestion Submission Analytics
                  </h3>
                </div>

                {/* Department-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Department-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(departments as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DEPARTMENT[d] ?? 0,
                          submitted: suggestionRows.filter(
                            (s) => s.department === d
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Designation-wise chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Designation-wise Submissions
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(designations as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DESIGNATION[d] ?? 0,
                          submitted: suggestionRows.filter(
                            (s) => s.designation === d
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="submitted"
                          fill="#F59E0B"
                          name="Submitted"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={suggestionDeptFilter}
                        onChange={(e) =>
                          setSuggestionDeptFilter(e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={suggestionDesigFilter}
                        onChange={(e) =>
                          setSuggestionDesigFilter(e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => {
                          const rows = displayedSuggestionRows.map((r) => ({
                            employee_id: r.employee_id,
                            name: r.name,
                          }));
                          exportToCSV(rows, "suggestion_submissions.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedSuggestionRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                          </tr>
                        ))}
                        {displayedSuggestionRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No suggestion submissions found for selected
                              filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : selectedAnalytics === "videoCompletion" ? (
              <section>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={videoDeptFilter}
                        onChange={(e) => setVideoDeptFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={videoDesigFilter}
                        onChange={(e) => setVideoDesigFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Module:
                      </label>
                      <select
                        value={videoModuleFilter}
                        onChange={(e) =>
                          setVideoModuleFilter(e.target.value as any)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        <option value="m1">m1</option>
                        <option value="m2">m2</option>
                        <option value="m3">m3</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Task:
                      </label>
                      <select
                        value={videoTaskFilter}
                        onChange={(e) =>
                          setVideoTaskFilter(e.target.value as any)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All Tasks</option>
                        <option value="task1">task1</option>
                        <option value="task2">task2</option>
                        <option value="task3">task3</option>
                        <option value="task4">task4</option>
                        <option value="task5">task5</option>
                        <option value="task6">task6</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => {
                          const rows = displayedVideoRows.map((r) => ({
                            employee_id: r.employee_id,
                            name: r.name,
                            department: r.department,
                            designation: r.designation,
                            score_m1: r.score_m1,
                            score_m2: r.score_m2,
                            score_m3: r.score_m3,
                            total_score: r.total_score,
                            task_score: r.task_score,
                            m1: r.m1Finished,
                            m2: r.m2Finished,
                            m3: r.m3Finished,
                          }));
                          exportToCSV(rows, "video_completion.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedVideoRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {r.department}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {r.designation}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {r.score}
                            </td>
                          </tr>
                        ))}
                        {displayedVideoRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No video completion data found for selected
                              filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : selectedAnalytics === "mdMessage" ? (
              <section className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Department-wise Completion
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(departments as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DEPARTMENT[d] ?? 0,
                          completed: mdRows.filter(
                            (m) => m.department === d && m.finished
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="completed"
                          fill="#10B981"
                          name="Completed"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Designation-wise Completion
                  </h3>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(designations as string[]).map((d) => ({
                          category: d,
                          plan: PLAN_BY_DESIGNATION[d] ?? 0,
                          completed: mdRows.filter(
                            (m) => m.designation === d && m.finished
                          ).length,
                        }))}
                        margin={{ top: 24, right: 30, left: 0, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                        <Bar
                          dataKey="completed"
                          fill="#10B981"
                          name="Completed"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={mdDeptFilter}
                        onChange={(e) => setMdDeptFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={mdDesigFilter}
                        onChange={(e) => setMdDesigFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                      <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => {
                          const rows = displayedMdRows.map((r) => ({
                            employee_id: r.employee_id,
                            name: r.name,
                            department: r.department,
                            designation: r.designation,
                            score: r.score,
                          }));
                          exportToCSV(rows, "md_message_completion.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Score (task1)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedMdRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                            <td className="px-4 py-3 text-sm">{r.department}</td>
                            <td className="px-4 py-3 text-sm">
                              {r.designation}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {r.score}
                            </td>
                          </tr>
                        ))}
                        {displayedMdRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No MD Message completion data found for selected
                              filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : selectedView === "stats" && selectedAnalytics === "none" ? (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {showBy === "department"
                      ? "Department-wise Stats"
                      : "Designation-wise Stats"}
                  </h3>
                  <div className="inline-flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowBy("department")}
                      className={`px-4 py-2 font-medium transition-colors ${
                        showBy === "department"
                          ? "bg-red-500 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Department
                    </button>
                    <button
                      onClick={() => setShowBy("designation")}
                      className={`px-4 py-2 font-medium transition-colors ${
                        showBy === "designation"
                          ? "bg-red-500 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Designation
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                  <div style={{ width: "100%", height: 500 }}>
                    {showBy === "department" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={(departments as string[]).map((d) => ({
                            category: d,
                            plan: PLAN_BY_DEPARTMENT[d] ?? 0,
                            actual:
                              registrationsByDept.find((r) => r.key === d)
                                ?.count ?? 0,
                          }))}
                          margin={{ top: 48, right: 30, left: 0, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="category"
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend verticalAlign="top" align="right" />
                          <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                          <Bar
                            dataKey="actual"
                            fill="#F59E0B"
                            name="Registered"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={(designations as string[]).map((d) => ({
                            category: d,
                            plan: PLAN_BY_DESIGNATION[d] ?? 0,
                            actual:
                              registrationsByDesig.find((r) => r.key === d)
                                ?.count ?? 0,
                          }))}
                          margin={{ top: 48, right: 30, left: 0, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="category"
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend verticalAlign="top" align="right" />
                          <Bar dataKey="plan" fill="#2563EB" name="Planned" />
                          <Bar
                            dataKey="actual"
                            fill="#F59E0B"
                            name="Registered"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Top Registrations</h4>
                    <div className="text-sm text-gray-600">
                      Showing{" "}
                      <span className="font-medium">
                        {displayedProfiles.length}
                      </span>{" "}
                      of <span className="font-medium">{profiles.length}</span>{" "}
                      registered
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">
                        Department:
                      </label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">
                        Designation:
                      </label>
                      <select
                        value={designationFilter}
                        onChange={(e) => setDesignationFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="All">All</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ml-auto">
                      <button
                        onClick={() => {
                          const rows = displayedProfiles.map((u) => ({
                            user_id: u.user_id,
                            name: u.name,
                            department: u.department || "Unknown",
                            designation: u.designation || "Unknown",
                            score: u.score,
                          }));
                          exportToCSV(rows, "registered_users.csv");
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedProfiles.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{p.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {p.department}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {p.designation}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {p.score ?? "-"}
                            </td>
                          </tr>
                        ))}
                        {displayedProfiles.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No registrations found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Registrations Summary (All)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm font-medium text-gray-700">
                          <th className="px-4 py-3">Employee ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {profiles.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{p.user_id}</td>
                            <td className="px-4 py-3 text-sm">{p.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {p.department}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {p.designation}
                            </td>
                          </tr>
                        ))}
                        {profiles.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No profiles found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
