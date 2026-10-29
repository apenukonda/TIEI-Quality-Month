
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
  manager_name?: string | null;
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

  const getManagerForUser = (userId?: any, employeeId?: any) => {
    if (!userId && !employeeId) return "-";
    const uStr = userId ? String(userId).trim().toLowerCase() : "";
    const eStr = employeeId ? String(employeeId).trim().toLowerCase() : "";
    const matched = profiles.find((p) => {
      const pId = p.id ? String(p.id).trim().toLowerCase() : "";
      const pUserId = p.user_id ? String(p.user_id).trim().toLowerCase() : "";
      return (
        (uStr && (pId === uStr || pUserId === uStr)) ||
        (eStr && (pId === eStr || pUserId === eStr))
      );
    });
    if (matched?.manager_name && matched.manager_name !== "N/A") {
      return matched.manager_name;
    }
    return "-";
  };

  const resolveManager = (r: {
    manager_name?: string | null;
    user_id?: any;
    employee_id?: any;
  }) => {
    if (r.manager_name && r.manager_name !== "N/A" && r.manager_name !== "-") {
      return r.manager_name;
    }
    return getManagerForUser(r.user_id, r.employee_id);
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
      analyticsParam === "comics" ||
      analyticsParam === "blueprint"
        ? analyticsParam
        : lsAnalytics === "videoCompletion" ||
          lsAnalytics === "mdMessage" ||
          lsAnalytics === "slogan" ||
          lsAnalytics === "cartoon" ||
          lsAnalytics === "comics" ||
          lsAnalytics === "blueprint"
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
        | "comics"
        | "blueprint",
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
    | "comics"
    | "blueprint"
  >(() => readUrlState().analytics);
  const [showBy, setShowBy] = useState<"department" | "designation">(
    "department"
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [designationFilter, setDesignationFilter] = useState<string>("All");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024
  );
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };
  const [blueprintRows, setBlueprintRows] = useState<Array<any>>([]);
  // console.log("View:", selectedView, "Analytics:", selectedAnalytics);

  // Profiles
  const fetchProfiles = async () => {
    try {
      // 1. Try to fetch via RPC get_admin_profiles (joins profiles with employee_registry)
      const { data: rpcData, error: rpcErr } = await (supabaseClient as any).rpc(
        "get_admin_profiles",
        { p_limit: 5000, p_offset: 0 }
      );

      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        setProfiles(
          rpcData.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            name: d.name,
            department: d.department,
            designation: d.designation,
            manager_name: d.manager_name || "N/A",
            score: d.score,
          }))
        );
        return;
      }

      // 2. Fallback: Paginated fetch from profiles table directly
      const pageSize = 1000;
      let from = 0;
      let allRows: any[] = [];
      while (true) {
        const to = from + pageSize - 1;
        let { data, error } = await supabaseClient
          .from("profiles")
          .select("id, user_id, name, department, designation, manager_name, score, role")
          .eq("role", "user")
          .range(from, to);

        if (error) {
          // If manager_name column does not exist on profiles table yet, query without it
          const res = await supabaseClient
            .from("profiles")
            .select("id, user_id, name, department, designation, score, role")
            .eq("role", "user")
            .range(from, to);
          data = res.data;
          error = res.error;
        }

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

      // normalize to ProfileRow shape
      setProfiles((allRows || []).map((d) => ({
        id: d.id,
        user_id: d.user_id,
        name: d.name,
        department: d.department,
        designation: d.designation,
        manager_name: d.manager_name || "N/A",
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

  // video, md, slogans, images, comics
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


  // Fetch helpers with fallbacks and robust error handling
  const fetchBlueprintSubmissions = async () => {
    const { data, error } = await supabaseClient
      .from("beyond_blueprint_submissions")
      .select("id, user_id, problem, way_of_outflow, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching blueprint submissions:", error.message || error);
      setBlueprintRows([]);
      return;
    }

    const profileMap = new Map<string, any>();
    profiles.forEach((profile) => {
      profileMap.set(String(profile.id), profile);
      profileMap.set(String(profile.user_id), profile);
    });
    setBlueprintRows((data || []).map((row: any) => {
      const profile = profileMap.get(String(row.user_id));
      return {
        ...row,
        employee_id: profile?.user_id || row.user_id,
        name: profile?.name || row.user_id,
        department: profile?.department || "Unknown",
        designation: profile?.designation || "Unknown",
        manager_name: profile?.manager_name || null,
      };
    }));
  };

  const fetchSlogans = async () => {
    try {
      // Try RPC
      try {
        const { data: rpcData, error: rpcErr } = (await (
          supabaseClient as any
        ).rpc?.("get_slogan_submissions")) ?? { data: null, error: null };
        if (
          !rpcErr &&
          Array.isArray(rpcData) &&
          rpcData.every((row: any) => row.task_id && row.image_url)
        ) {
          const joined = (rpcData as any[]).map((r, idx) => ({
            id: r.id
              ? String(r.id)
              : `${String(r.user_id)}_${String(r.created_at || idx)}`,
            user_id: r.user_id,
            task_id: r.task_id,
            image_url: r.image_url,
            employee_id: r.employee_id || r.user_id,
            name: r.name || r.user_id,
            department: r.department || "Unknown",
            designation: r.designation || "Unknown",
            manager_name: r.manager_name || null,
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
            manager_name: profile?.manager_name || null,
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
            manager_name: r.manager_name || null,
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
        .select("id, user_id, task_id, image_url, created_at")
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
            task_id: r.task_id,
            image_url: r.image_url,
            employee_id: profile?.user_id || r.user_id,
            name: profile?.name || r.user_id,
            department: profile?.department || "Unknown",
            designation: profile?.designation || "Unknown",
            manager_name: profile?.manager_name || null,
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

  const fetchVideoCompletions = async () => {
    // Prefer RPC: admin_video_completion which returns profiles joined with module progress and score.
    try {
      // pass module filter ('all'|'m1'|'m2'|'m3') so server can pre-filter
      // jdnfvijn
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
        if (videoModuleFilter !== "All" || videoTaskFilter !== "All") {
          const fallback = await supabaseClient.rpc("admin_video_completion");
          if (!fallback.error && Array.isArray(fallback.data)) {
            setVideoRows(
              (fallback.data as any[]).map((r) => ({
                ...r,
                department: r.department || "Unknown",
                designation: r.designation || "Unknown",
                score_m1: Number(r.score_m1 || 0),
                score_m2: Number(r.score_m2 || 0),
                score_m3: Number(r.score_m3 || 0),
                total_score: Number(r.total_score || 0),
                task_score: Number(r.task_score || 0),
                m1Finished: !!r.m1,
                m2Finished: !!r.m2,
                m3Finished: !!r.m3,
              }))
            );
            return;
          }
        }
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
        manager_name: r.manager_name || null,
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
        manager_name: r.manager_name || null,
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
    fetchBlueprintSubmissions();
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
    const ch4 = subscribeSafely(
      "public:beyond_blueprint_submissions",
      "beyond_blueprint_submissions",
      () => {
        fetchBlueprintSubmissions();
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
      cleanup(ch4);
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

  const PLAN_BY_DEPARTMENT: Record<Department, number> = {
    [Department.ADMINISTRATION]: 10,
    [Department.ASSEMBLY_MAINTENANCE_TNGA]: 19,
    [Department.ASSY_MAINTENANCE_GD]: 5,
    [Department.BUSINESS_PLANNING]: 7,
    [Department.CSR]: 4,
    [Department.DIE_MAINTENANCE]: 26,
    [Department.ENG_LOGISTICS]: 23,
    [Department.ENG_ASSY]: 18,
    [Department.ENG_ASSY_MAIN_1]: 43,
    [Department.ENG_ASSY_MAIN_2]: 46,
    [Department.ENG_ASSY_MAIN_3]: 58,
    [Department.ENG_PROD_BLOCK_LINE]: 60,
    [Department.ENG_PROD_CRANK_LINE]: 52,
    [Department.ENG_PROD_HEAD_LINE]: 57,
    [Department.ENG_PROD_MACHINING]: 6,
    [Department.EXTERNAL_AFFAIRS]: 1,
    [Department.FINANCE_ACCOUNTS]: 14,
    [Department.FST_AND_DOJO_TRAINING]: 54,
    [Department.FULL_TIME_DIRECTORS]: 2,
    [Department.GD_LINE_SUPPLY]: 27,
    [Department.HUMAN_RESOURCE]: 23,
    [Department.INFORMATION_SYSTEMS]: 24,
    [Department.INFRA_AND_FACILITY_MANAGEMENT]: 15,
    [Department.INTERNAL_LOGISTICS_SPM]: 2,
    [Department.LEARNING_AND_DEVELOPMENT]: 19,
    [Department.MACHINING_MAINTENANCE_GD]: 37,
    [Department.MACHINING_MAINTENANCE_TNGA]: 32,
    [Department.MAINTENANCE]: 8,
    [Department.MAINTENANCE_ENGINEERING]: 9,
    [Department.MANUFACTURING_ENGG]: 21,
    [Department.MANUFACTURING_EXCELLENCE]: 16,
    [Department.OHC]: 7,
    [Department.PC_GPS]: 22,
    [Department.PC_PLANNING]: 13,
    [Department.PC_AND_LOGISTICS]: 15,
    [Department.PE_PROJECTS]: 25,
    [Department.PE_DEVELOPMENT]: 16,
    [Department.PLANT_ADMIN]: 1,
    [Department.PLANT_ENGINEERING_DC]: 5,
    [Department.PRODUCTION_DC]: 6,
    [Department.PRODUCTION_ENGG]: 7,
    [Department.PRODUCTION_SUPPORT_COMMON]: 9,
    [Department.PRODUCTION_SUPPORT_AUTO]: 6,
    [Department.PURCHASE]: 14,
    [Department.QC]: 71,
    [Department.QE]: 12,
    [Department.QUALITY]: 1,
    [Department.QUALITY_ASSURANCE_DC]: 1,
    [Department.SAFETY_AND_ENVIRONMENT]: 14,
    [Department.SCM_GOGUCHI]: 24,
    [Department.SCM_PROJECTS]: 18,
    [Department.SERVICE_PARTS]: 22,
    [Department.SHOP_FLOOR_DEVELOPMENT]: 6,
    [Department.SQE]: 9,
    [Department.TNGA_ASSEMBLY]: 12,
    [Department.TNGA_ASSY_1]: 106,
    [Department.TNGA_ASSY_2]: 106,
    [Department.TNGA_ASSY_3]: 75,
    [Department.TNGA_BLOCK]: 28,
    [Department.TNGA_CRANK]: 27,
    [Department.TNGA_HEAD]: 43,
    [Department.TNGA_LINE_SUPPLY]: 22,
    [Department.TNGA_MACHINING]: 5,
    [Department.TNGA_ASSEMBLY_LOGISTICS]: 55,
    [Department.TNGA_MACHINING_LOGISTICS]: 9,
    [Department.TOOL_MGMT_AND_ENGG]: 44,
    [Department.UTILITY_DEPARTMENT]: 43,
  };

  const PLAN_BY_DESIGNATION: Record<Designation, number> = {
    [Designation.APPRENTICE]: 238,
    [Designation.APPRENTICE_TRAINEE]: 120,
    [Designation.ASSISTANT_ENGINEER]: 39,
    [Designation.ASSISTANT_MANAGER]: 33,
    [Designation.COMPLIANCE_ASSISTANT]: 1,
    [Designation.COORDINATOR]: 1,
    [Designation.DEPUTY_GENERAL_MANAGER]: 9,
    [Designation.DEPUTY_MANAGER]: 29,
    [Designation.DEPUTY_MANAGING_DIRECTOR]: 1,
    [Designation.ENGINEER]: 141,
    [Designation.ENGINEER_TRAINEE]: 24,
    [Designation.EXECUTIVE]: 1,
    [Designation.EXECUTIVE_MANAGING_COORDINATOR]: 2,
    [Designation.GENERAL_MANAGER]: 1,
    [Designation.GRADUATE_ENGINEER_TRAINEE]: 4,
    [Designation.IN_PLANT_TRAINEE]: 3,
    [Designation.JAPANESE_TRANSLATOR]: 2,
    [Designation.L1_SUPPORT_ENGINEER]: 2,
    [Designation.L1_SPACE_SUPPORT_ENGINEER]: 1,
    [Designation.MALE_NURSE]: 1,
    [Designation.MANAGER]: 18,
    [Designation.MANAGING_COORDINATOR]: 7,
    [Designation.MANAGING_DIRECTOR]: 1,
    [Designation.MEDICAL_ASSISTANT]: 5,
    [Designation.MEDICAL_OFFICER]: 1,
    [Designation.MULTI_SKILLED_OPERATOR]: 33,
    [Designation.NETWORK_SUPPORT]: 4,
    [Designation.OFFICER]: 17,
    [Designation.OFFICER_TRAINEE]: 10,
    [Designation.SECURITY_WORK_PERMIT]: 1,
    [Designation.SENIOR_ENGINEER]: 120,
    [Designation.SENIOR_MANAGER]: 11,
    [Designation.SENIOR_MULTI_SKILLED_OPERATOR]: 145,
    [Designation.SENIOR_OFFICER]: 10,
    [Designation.SENIOR_VICE_PRESIDENT]: 1,
    [Designation.SPECIALIST]: 1,
    [Designation.SR_ENGINEER]: 1,
    [Designation.TEAM_LEADER_TRAINEE]: 1,
    [Designation.TRAINEE]: 592,
    [Designation.VICE_PRESIDENT]: 5,
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
          return (
            r.task_score != null &&
            (Number(r.task_score) > 0 ||
              (videoModuleFilter === "m1" && r.m1Finished) ||
              (videoModuleFilter === "m2" && r.m2Finished) ||
              (videoModuleFilter === "m3" && r.m3Finished))
          );
        }
        if (videoModuleFilter === "All")
          return r.m1Finished && r.m2Finished && r.m3Finished;
        if (videoModuleFilter === "m1")
          return r.m1Finished || Number(r.score_m1) > 0;
        if (videoModuleFilter === "m2")
          return r.m2Finished || Number(r.score_m2) > 0;
        if (videoModuleFilter === "m3")
          return r.m3Finished || Number(r.score_m3) > 0;
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
        r.task_id === "task3" &&
        (imageDeptFilter === "All" || r.department === imageDeptFilter) &&
        (imageDesigFilter === "All" || r.designation === imageDesigFilter)
    );
  }, [imageRows, imageDeptFilter, imageDesigFilter]);

  const displayedComicRows = useMemo(() => {
    return imageRows.filter(
      (r) =>
        r.task_id === "task7" &&
        (imageDeptFilter === "All" || r.department === imageDeptFilter) &&
        (imageDesigFilter === "All" || r.designation === imageDesigFilter)
    );
  }, [imageRows, imageDeptFilter, imageDesigFilter]);

  return (
    <div className="flex h-screen min-w-0 bg-gray-50">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 lg:hidden"
        />
      )}
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0 lg:w-64" : "-translate-x-full lg:w-0"
        } fixed inset-y-0 left-0 z-40 w-64 transform transition-all duration-300 bg-white shadow-lg overflow-hidden flex flex-col lg:relative lg:inset-auto lg:z-auto lg:translate-x-0`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">ADMINS</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation menu"
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
              closeSidebarOnMobile();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedView === "dashboard" && selectedAnalytics === "none"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard size={22} />
            <span className="min-w-0 flex-1 text-left font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setSelectedView("stats");
              setSelectedAnalytics("none");
              closeSidebarOnMobile();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedView === "stats" && selectedAnalytics === "none"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <BarChart3 size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Registration Status</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("mdMessage");
              closeSidebarOnMobile();
              await fetchMDCompletions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "mdMessage"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">MD Message Completion</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("videoCompletion");
              closeSidebarOnMobile();
              await fetchVideoCompletions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "videoCompletion"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Video size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Video Completion</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("cartoon");
              closeSidebarOnMobile();
              await fetchImageSubmissions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "cartoon"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Craft your Vision Analytics</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("slogan");
              closeSidebarOnMobile();
              await fetchSlogans();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "slogan"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Quality mantra Analytics</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("comics");
              closeSidebarOnMobile();
              await fetchImageSubmissions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "comics"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Quality Comics Analytics</span>
          </button>

          <button
            onClick={async () => {
              setSelectedAnalytics("blueprint");
              closeSidebarOnMobile();
              await fetchBlueprintSubmissions();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
              selectedAnalytics === "blueprint"
                ? "bg-red-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText size={20} />
            <span className="min-w-0 flex-1 text-left font-medium">Beyond the Blueprint Review</span>
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
      <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
        <div className="bg-white shadow-sm p-4 flex items-center gap-4 border-b border-gray-200 shrink-0">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-full mx-auto">
            {selectedView === "dashboard" && selectedAnalytics === "none" ? (
              <AdminDashboard />
            ) : selectedAnalytics === "slogan" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Quality mantra Analytics
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
                          const rows = displayedSloganRows.map((r) => {
                            const mgr = resolveManager(r);
                            return {
                              employee_id: r.employee_id,
                              name: r.name,
                              department: r.department || "Unknown",
                              designation: r.designation || "Unknown",
                              manager: mgr !== "-" ? mgr : "N/A",
                              slogan: r.slogan,
                            };
                          });
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
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Manager</th>
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
                            <td className="px-4 py-3 text-sm">{r.department}</td>
                            <td className="px-4 py-3 text-sm">{r.designation}</td>
                            <td className="px-4 py-3 text-sm">{resolveManager(r)}</td>
                            <td className="px-4 py-3 text-sm">{r.slogan}</td>
                          </tr>
                        ))}
                        {displayedSloganRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
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
                    Craft your Vision Analytics
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
                          submitted: imageRows.filter((s) => s.task_id === "task3" && s.department === d)
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
                            (s) => s.task_id === "task3" && s.designation === d
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
                          const rows = displayedImageRows.map((r) => {
                            return {
                              employee_id: r.employee_id,
                              name: r.name,
                              department: r.department || "Unknown",
                              designation: r.designation || "Unknown",
                              image_url: r.image_url || "",
                            };
                          });
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
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Image URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedImageRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                            <td className="px-4 py-3 text-sm">{r.department}</td>
                            <td className="px-4 py-3 text-sm">{r.designation}</td>
                            <td className="max-w-xs px-4 py-3 text-sm">
                              <a
                                href={r.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={r.image_url}
                                className="block truncate text-blue-600 hover:underline"
                              >
                                {r.image_url}
                              </a>
                            </td>
                          </tr>
                        ))}
                        {displayedImageRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
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
            ) : selectedAnalytics === "blueprint" ? (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">Beyond the Blueprint Review</h3>
                  <button
                    onClick={fetchBlueprintSubmissions}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-sm font-medium text-gray-700">
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Problem Identified</th>
                        <th className="px-4 py-3">Way of Outflow</th>
                        <th className="px-4 py-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {blueprintRows.map((row) => (
                        <tr key={row.id} className="align-top hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{row.employee_id}</td>
                          <td className="px-4 py-3 text-sm">{row.name}</td>
                          <td className="px-4 py-3 text-sm">{row.department}</td>
                          <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-sm">{row.problem}</td>
                          <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-sm">{row.way_of_outflow}</td>
                          <td className="px-4 py-3 text-sm">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                      {blueprintRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No Beyond the Blueprint submissions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : selectedAnalytics === "comics" ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">
                    Quality Comics Analytics
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
                          submitted: imageRows.filter(
                            (s) => s.task_id === "task7" && s.department === d
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
                          submitted: imageRows.filter(
                            (s) => s.task_id === "task7" && s.designation === d
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
                          const rows = displayedComicRows.map((r) => {
                            return {
                              employee_id: r.employee_id,
                              name: r.name,
                              department: r.department || "Unknown",
                              designation: r.designation || "Unknown",
                              image_url: r.image_url || "",
                            };
                          });
                          exportToCSV(rows, "quality_comics_submissions.csv");
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
                          <th className="px-4 py-3">Image URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {displayedComicRows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {r.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.name}</td>
                            <td className="px-4 py-3 text-sm">{r.department}</td>
                            <td className="px-4 py-3 text-sm">{r.designation}</td>
                            <td className="max-w-xs px-4 py-3 text-sm">
                              <a
                                href={r.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={r.image_url}
                                className="block truncate text-blue-600 hover:underline"
                              >
                                {r.image_url}
                              </a>
                            </td>
                          </tr>
                        ))}
                        {displayedComicRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No quality comics submissions found for selected
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
                          const rows = displayedVideoRows.map((r) => {
                            const mgr = resolveManager(r);
                            return {
                              employee_id: r.employee_id,
                              name: r.name,
                              department: r.department,
                              designation: r.designation,
                              manager: mgr !== "-" ? mgr : "N/A",
                              score_m1: r.score_m1,
                              score_m2: r.score_m2,
                              score_m3: r.score_m3,
                              total_score: r.total_score,
                              task_score: r.task_score,
                              m1: r.m1Finished,
                              m2: r.m2Finished,
                              m3: r.m3Finished,
                            };
                          });
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
                          <th className="px-4 py-3">Manager</th>
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
                            <td className="px-4 py-3 text-sm">
                              {resolveManager(r)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {r.score}
                            </td>
                          </tr>
                        ))}
                        {displayedVideoRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
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
                          const rows = displayedMdRows.map((r) => {
                            const mgr = resolveManager(r);
                            return {
                              employee_id: r.employee_id,
                              name: r.name,
                              department: r.department,
                              designation: r.designation,
                              manager: mgr !== "-" ? mgr : "N/A",
                              score: r.score,
                            };
                          });
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
                          <th className="px-4 py-3">Manager</th>
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
                            <td className="px-4 py-3 text-sm">
                              {resolveManager(r)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {r.score}
                            </td>
                          </tr>
                        ))}
                        {displayedMdRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
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
                            manager: u.manager_name || "N/A",
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
                          <th className="px-4 py-3">Manager</th>
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
                            <td className="px-4 py-3 text-sm">
                              {p.manager_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {p.score ?? "-"}
                            </td>
                          </tr>
                        ))}
                        {displayedProfiles.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
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
                          <th className="px-4 py-3">Manager</th>
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
                            <td className="px-4 py-3 text-sm">
                              {p.manager_name || "-"}
                            </td>
                          </tr>
                        ))}
                        {profiles.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
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
