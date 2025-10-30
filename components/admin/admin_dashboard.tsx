import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import supabaseClient from "../../context/supabaseClient";
import { Page } from "../../types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import EventCard from "../EventCard";
import CongratulationsModal from "../CongratulationsModal";
import TopScoresModal from "../TopScoresModal";
import KnowledgeCentreModal from "../KnowledgeCentreModel";

// Component: LatestCompletersList
const LatestCompletersList: React.FC = () => {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      user_id: string;
      name: string;
      score: number;
      completed_at: string;
    }>
  >([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchLatest = async () => {
    try {
      // Try calling RPC first
      const { data, error } = await supabaseClient.rpc(
        "admin_latest_completers",
        { limit_rows: 8 } as any
      );
      console.debug("admin_latest_completers:", data, error);
      if (!error && Array.isArray(data)) {
        const mapped = (data as any[]).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          name: r.name || r.user_id,
          score: Number(r.score || 0),
          completed_at: r.completed_at,
        }));
        setRows(mapped);
        setStatusMsg(
          mapped.length > 0 ? `${mapped.length} rows` : "RPC returned 0 rows"
        );
        return;
      }
      setStatusMsg(
        error ? `RPC error: ${String(error)}` : "RPC returned unexpected result"
      );
    } catch (e) {
      console.debug("admin_latest_completers rpc failed", e);
      setStatusMsg(`RPC threw: ${String(e)}`);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{statusMsg ?? "Loading..."}</div>
        <button
          onClick={() => fetchLatest()}
          className="text-sm px-3 py-1 bg-gray-100 rounded"
        >
          Refresh
        </button>
      </div>
      {rows.length === 0 && (
        <div className="text-sm text-gray-500">
          No recent completers found (RPC may be missing or returned 0 rows).
        </div>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between bg-white p-3 rounded border border-gray-100 shadow-sm"
        >
          <div>
            <div className="text-teal-600 font-semibold">{r.user_id}</div>
            <div className="text-sm text-gray-600">{r.name}</div>
          </div>
          <div className="text-center text-sm text-gray-600">
            <div>
              {r.completed_at
                ? new Date(r.completed_at).toLocaleDateString()
                : "-"}
            </div>
            <div className="text-xs text-gray-400">
              {r.completed_at
                ? new Date(r.completed_at).toLocaleTimeString()
                : ""}
            </div>
          </div>
          <div>
            <div className="bg-green-200 text-green-800 px-3 py-1 rounded font-medium">
              {r.score}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Sample data for charts
const revenueData = [
  { name: "plane", US: 400, France: 300, Japan: 200 },
  { name: "helicopter", US: 350, France: 250, Japan: 220 },
  { name: "boat", US: 300, France: 200, Japan: 250 },
  { name: "train", US: 280, France: 220, Japan: 180 },
  { name: "subway", US: 390, France: 320, Japan: 250 },
  { name: "bus", US: 320, France: 280, Japan: 220 },
  { name: "car", US: 350, France: 300, Japan: 270 },
  { name: "moto", US: 300, France: 250, Japan: 230 },
  { name: "bicycle", US: 270, France: 210, Japan: 180 },
  { name: "horse", US: 320, France: 240, Japan: 160 },
];

// statsCards are now generated dynamically from DB counts (see state below)

const AdminDashboard: React.FC = () => {
  const { tasks } = useContext(AppContext);
  const { t, language, setCurrentPage } = useContext(AppContext);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showTopScores, setShowTopScores] = useState(false);
  const [showKnowledgeCentre, setShowKnowledgeCentre] = useState(false);

  // Counts for admin stats
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [slogansCount, setSlogansCount] = useState<number | null>(null);
  const [imagesCount, setImagesCount] = useState<number | null>(null);
  const [completedAllModulesCount, setCompletedAllModulesCount] = useState<
    number | null
  >(null);

  const allTasksCompleted = tasks.every(
    (task) => task.completedSteps === task.totalSteps
  );

  useEffect(() => {
    if (allTasksCompleted) {
      const timer = setTimeout(() => setShowCongrats(true), 500);
      return () => clearTimeout(timer);
    }
  }, [allTasksCompleted]);

  // Fetch admin counts
  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      try {
        // First try an admin RPC that returns counts in one call. This RPC must be
        // created server-side (security definer) to bypass per-row RLS for aggregates.
        try {
          const { data: rpcData, error: rpcErr } = await supabaseClient.rpc(
            "admin_dashboard_counts"
          );
          if (
            !rpcErr &&
            rpcData &&
            Array.isArray(rpcData) &&
            rpcData.length > 0
          ) {
            const row = rpcData[0] as any;
            if (mounted) {
              setTotalUsers(Number(row.total_users || 0));
              setSlogansCount(Number(row.slogans || 0));
              setImagesCount(Number(row.image_submitters || 0));
              setCompletedAllModulesCount(Number(row.completed_all || 0));
            }
            return; // used RPC result, no need for client-side queries
          }
        } catch (e) {
          // ignore RPC errors; fall back to client-side queries
          // eslint-disable-next-line no-console
          console.debug(
            "admin_dashboard_counts RPC not available or failed, falling back",
            e
          );
        }

        // total registered users: use profiles table (works with client RLS)
        const { count: profileCount, error: profileErr } = await supabaseClient
          .from("profiles")
          .select("*", { count: "exact", head: true });
        if (!profileErr && mounted) setTotalUsers(profileCount ?? 0);

        // number of users who submitted slogans (user_slogans)
        const { count: sCount, error: slogansErr } = await supabaseClient
          .from("user_slogans")
          .select("*", { count: "exact", head: true });
        if (!slogansErr && mounted) setSlogansCount(sCount ?? 0);

        // number of users who submitted images (distinct user_id in image_submissions)
        // number of distinct users who submitted images
        const { data: imagesData, error: imagesErr } = await supabaseClient
          .from("image_submissions")
          .select("user_id");
        if (!imagesErr && mounted) {
          const distinct = new Set(
            (imagesData || []).map((r: any) => r.user_id)
          );
          setImagesCount(distinct.size);
        }

        // Module completion is provided by the RPC when available. If RPC isn't
        // available we no longer perform client-side scans of the module tables
        // (these can be expensive and may be blocked by RLS). Leave the value
        // null so the UI shows '—' until the RPC is installed.
        if (mounted) setCompletedAllModulesCount(null);
      } catch (e) {
        // ignore errors; keep counts null
        // eslint-disable-next-line no-console
        console.error("Error fetching admin counts", e);
      }
    };

    fetchCounts();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch quiz completion counts per task (task1..task6)
  const [quizCompletionData, setQuizCompletionData] = useState<
    Array<{ task: string; count: number }>
  >([]);
  // New: per-module counts used for the line chart
  const [quizLineData, setQuizLineData] = useState<
    Array<{ task: string; m1: number; m2: number; m3: number }>
  >([]);
  // counts of distinct users who completed any task in each module (m1/m2/m3)
  const [quizModuleCounts, setQuizModuleCounts] = useState<{
    m1: number;
    m2: number;
    m3: number;
  } | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchQuizCounts = async () => {
      try {
        // Try RPC first
        try {
          const { data: rpcData, error: rpcErr } = await supabaseClient.rpc(
            "admin_quiz_completion_counts"
          );
          console.debug(
            "admin_quiz_completion_counts rpcData:",
            rpcData,
            "error:",
            rpcErr
          );
          if (!rpcErr && rpcData && Array.isArray(rpcData)) {
            const lineData = (rpcData as any[]).map((r) => ({
              task: r.task,
              m1: Number(r.m1 || 0),
              m2: Number(r.m2 || 0),
              m3: Number(r.m3 || 0),
            }));
            const withZero = [{ task: "0", m1: 0, m2: 0, m3: 0 }, ...lineData];
            if (mounted) setQuizLineData(withZero);
            // Prefer RPC to fetch module totals (avoids RLS problems). Try admin_module_totals RPC first.
            try {
              const { data: totals, error: totalsErr } =
                await supabaseClient.rpc("admin_module_totals");
              console.debug(
                "admin_module_totals totals:",
                totals,
                "error:",
                totalsErr
              );
              if (
                !totalsErr &&
                totals &&
                Array.isArray(totals) &&
                totals.length > 0
              ) {
                const row = totals[0] as any;
                if (mounted)
                  setQuizModuleCounts({
                    m1: Number(row.m1 || 0),
                    m2: Number(row.m2 || 0),
                    m3: Number(row.m3 || 0),
                  });
                return;
              }
            } catch (e) {
              console.debug("admin_module_totals RPC failed:", e);
              // rpc not available or failed, fall back to client selects
            }

            // Fallback: fetch module-level progress including per-task flags so we can
            // compute counts of users who completed ALL tasks in each module.
            try {
              const [m1res, m2res, m3res] = await Promise.all([
                supabaseClient
                  .from("module_m1_progress")
                  .select(
                    "user_id, task1_completed, task2_completed, task3_completed, task4_completed, task5_completed, task6_completed"
                  ),
                supabaseClient
                  .from("module_m2_progress")
                  .select(
                    "user_id, task1_completed, task2_completed, task3_completed, task4_completed"
                  ),
                supabaseClient
                  .from("module_m3_progress")
                  .select(
                    "user_id, task1_completed, task2_completed, task3_completed, task4_completed, task5_completed"
                  ),
              ]);
              const m1 = m1res.data || [];
              const m2 = m2res.data || [];
              const m3 = m3res.data || [];
              console.debug(
                "module selects (fallback with flags): m1.length, m2.length, m3.length =>",
                m1.length,
                m2.length,
                m3.length
              );
              const m1CompleteCount = (m1 || []).filter(
                (r: any) =>
                  r.task1_completed &&
                  r.task2_completed &&
                  r.task3_completed &&
                  r.task4_completed &&
                  r.task5_completed &&
                  r.task6_completed
              ).length;
              const m2CompleteCount = (m2 || []).filter(
                (r: any) =>
                  r.task1_completed &&
                  r.task2_completed &&
                  r.task3_completed &&
                  r.task4_completed
              ).length;
              const m3CompleteCount = (m3 || []).filter(
                (r: any) =>
                  r.task1_completed &&
                  r.task2_completed &&
                  r.task3_completed &&
                  r.task4_completed &&
                  r.task5_completed
              ).length;
              if (mounted) {
                setQuizModuleCounts({
                  m1: m1CompleteCount,
                  m2: m2CompleteCount,
                  m3: m3CompleteCount,
                });
                console.debug("computed module completion counts (fallback):", {
                  m1: m1CompleteCount,
                  m2: m2CompleteCount,
                  m3: m3CompleteCount,
                });
              }
            } catch (e) {
              // ignore module count errors
            }

            return;
          }
        } catch (e) {
          console.debug(
            "admin_quiz_completion_counts RPC not available, falling back to client queries",
            e
          );
        }

        const [m1res, m2res, m3res] = await Promise.all([
          supabaseClient
            .from("module_m1_progress")
            .select(
              "user_id, task1_completed, task2_completed, task3_completed, task4_completed, task5_completed, task6_completed"
            ),
          supabaseClient
            .from("module_m2_progress")
            .select(
              "user_id, task1_completed, task2_completed, task3_completed, task4_completed"
            ),
          supabaseClient
            .from("module_m3_progress")
            .select(
              "user_id, task1_completed, task2_completed, task3_completed, task4_completed, task5_completed"
            ),
        ]);
        const m1 = m1res.data || [];
        const m2 = m2res.data || [];
        const m3 = m3res.data || [];
        console.debug(
          "module selects (final fallback): lengths",
          m1.length,
          m2.length,
          m3.length
        );

        const m1Sets: Record<string, Set<string>> = {
          task1: new Set(),
          task2: new Set(),
          task3: new Set(),
          task4: new Set(),
          task5: new Set(),
          task6: new Set(),
        };
        const m2Sets: Record<string, Set<string>> = {
          task1: new Set(),
          task2: new Set(),
          task3: new Set(),
          task4: new Set(),
          task5: new Set(),
          task6: new Set(),
        };
        const m3Sets: Record<string, Set<string>> = {
          task1: new Set(),
          task2: new Set(),
          task3: new Set(),
          task4: new Set(),
          task5: new Set(),
          task6: new Set(),
        };

        m1.forEach((r: any) => {
          const uid = r.user_id;
          if (r.task1_completed) m1Sets.task1.add(uid);
          if (r.task2_completed) m1Sets.task2.add(uid);
          if (r.task3_completed) m1Sets.task3.add(uid);
          if (r.task4_completed) m1Sets.task4.add(uid);
          if (r.task5_completed) m1Sets.task5.add(uid);
          if (r.task6_completed) m1Sets.task6.add(uid);
        });
        m2.forEach((r: any) => {
          const uid = r.user_id;
          if (r.task1_completed) m2Sets.task1.add(uid);
          if (r.task2_completed) m2Sets.task2.add(uid);
          if (r.task3_completed) m2Sets.task3.add(uid);
          if (r.task4_completed) m2Sets.task4.add(uid);
        });
        m3.forEach((r: any) => {
          const uid = r.user_id;
          if (r.task1_completed) m3Sets.task1.add(uid);
          if (r.task2_completed) m3Sets.task2.add(uid);
          if (r.task3_completed) m3Sets.task3.add(uid);
          if (r.task4_completed) m3Sets.task4.add(uid);
          if (r.task5_completed) m3Sets.task5.add(uid);
        });

        const tasks = ["task1", "task2", "task3", "task4", "task5", "task6"];
        const lineData = tasks.map((t) => ({
          task: t,
          m1: m1Sets[t].size,
          m2: m2Sets[t].size,
          m3: m3Sets[t].size,
        }));
        const withZero = [{ task: "0", m1: 0, m2: 0, m3: 0 }, ...lineData];
        if (mounted) setQuizLineData(withZero);
        // compute module-level counts of users who have COMPLETED ALL tasks in each module
        try {
          const m1Complete = (m1 || []).filter(
            (r: any) =>
              r.task1_completed &&
              r.task2_completed &&
              r.task3_completed &&
              r.task4_completed &&
              r.task5_completed &&
              r.task6_completed
          ).length;
          const m2Complete = (m2 || []).filter(
            (r: any) =>
              r.task1_completed &&
              r.task2_completed &&
              r.task3_completed &&
              r.task4_completed
          ).length;
          const m3Complete = (m3 || []).filter(
            (r: any) =>
              r.task1_completed &&
              r.task2_completed &&
              r.task3_completed &&
              r.task4_completed &&
              r.task5_completed
          ).length;
          if (mounted)
            setQuizModuleCounts({
              m1: m1Complete,
              m2: m2Complete,
              m3: m3Complete,
            });
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.error("Error fetching quiz completion counts", e);
      }
    };
    fetchQuizCounts();
    return () => {
      mounted = false;
    };
  }, []);

  // Prepare stats cards dynamically from fetched counts
  const statsCards = [
    {
      id: "registered",
      title: "Registered Users",
      value: totalUsers !== null ? String(totalUsers-1) : "—",
      change: "",
      trend: "up",
      icon: (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 20c0-2.21 3.582-4 6-4s6 1.79 6 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "slogans",
      title: "Slogans Submitted",
      value: slogansCount !== null ? String(slogansCount) : "—",
      change: "",
      trend: "up",
      icon: (
        <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "images",
      title: "Image Submissions",
      value: imagesCount !== null ? String(imagesCount) : "—",
      change: "",
      trend: "up",
      icon: (
        <svg
          className="w-6 h-6 text-purple-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 17l5-5 4 4 5-7 2 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "completed",
      title: "Completed All Modules",
      value:
        completedAllModulesCount !== null
          ? String(completedAllModulesCount)
          : "—",
      change: "",
      trend: "up",
      icon: (
        <svg
          className="w-6 h-6 text-yellow-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top section with header and welcome */}
      <div className="pt-8 px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome to your dashboard</p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg shadow p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-gray-100">{card.icon}</div>
                <div
                  className={`flex items-center ${
                    card.trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {card.change}
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 15l7-7 7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-sm text-gray-500">{card.title}</div>
              <div className="text-2xl font-bold text-gray-900">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Quiz Completion (Per Module)
            </h3>
            {/* <div className="text-2xl font-bold text-gray-900">$59,342.32</div> */}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={quizLineData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="task" />
                <YAxis domain={[0, "dataMax"]} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;
                    const item = payload[0].payload as any;
                    return (
                      <div className="bg-white border p-2 text-sm">
                        <div className="font-semibold">{label}</div>
                        <div className="text-blue-600">m1: {item.m1}</div>
                        <div className="text-green-600">m2: {item.m2}</div>
                        <div className="text-yellow-600">m3: {item.m3}</div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="m1" stroke="#8884d8" />
                <Line type="monotone" dataKey="m2" stroke="#82ca9d" />
                <Line type="monotone" dataKey="m3" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Three Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Progress Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Registration Targets
            </h3>
            <div className="h-80 flex flex-col items-center justify-start -mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {(() => {
                    const registered = totalUsers-1;
                    const target = 1671;
                    const remaining = Math.max(target - registered, 0);
                    const data = [
                      { name: "Registered", value: registered },
                      { name: "Remaining", value: remaining },
                    ];
                    const COLORS = ["#dbeafe", "#fde68a"]; // light blue, light yellow
                    return (
                      <Pie
                        data={data}
                        dataKey="value"
                        cx="50%"
                        cy="45%"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {data.map((entry, index) => (
                          <Cell
                            key={`slice-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    );
                  })()}
                  <Tooltip formatter={(value: any) => [value, "users"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-52 text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {(totalUsers-1)}
                </div>
                <div className="text-xs text-gray-500">Registered</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 inline-block bg-[#dbeafe] rounded-sm" />
                <span className="text-gray-600">Registered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 inline-block bg-[#fde68a] rounded-sm" />
                <span className="text-gray-600">Remaining to 1671</span>
              </div>
            </div>
          </div>

          {/* Sales Quantity Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Quiz Completion (Per Module)
            </h3>
            <div className="h-80 mt-4">
              {/* increased height and slight downward offset */}
              <ResponsiveContainer width="100%" height="100%">
                {/* Show counts per module (m1/m2/m3) as three bars */}
                <BarChart
                  data={
                    quizModuleCounts
                      ? [
                          { module: "m1", count: quizModuleCounts.m1 },
                          { module: "m2", count: quizModuleCounts.m2 },
                          { module: "m3", count: quizModuleCounts.m3 },
                        ]
                      : [
                          { module: "m1", count: 0 },
                          { module: "m2", count: 0 },
                          { module: "m3", count: 0 },
                        ]
                  }
                  margin={{ left: 0, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="module" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" name="Completed users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions / Latest Completers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Completions
            </h3>
            <div className="h-64 overflow-y-auto">
              <LatestCompletersList />
            </div>
          </div>
        </div>
      </div>

      {showCongrats && (
        <CongratulationsModal onClose={() => setShowCongrats(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
