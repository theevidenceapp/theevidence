/**
 * pages/dashboard/Dashboard.tsx — Admin Analytics Overview
 * ------------------------------------------------------------------
 * Rendered as the `children` of <AdminPanelLayout>, which already
 * supplies the header (title, search, notifications, logout) and the
 * <main> wrapper (padding, background). This component is ONLY the
 * page content that goes inside that <main>.
 *
 * DATA SOURCE NOTE
 * The backend (backend/src/controllers/admin.controller.ts) only exposes:
 *   GET /admin/analytics          -> { success, analytics: { totalViews, totalBlogs } }
 *   GET /admin/analytics/blogs    -> { success, blogs: [{ title, slug, views, createdAt }] }
 *   GET /admin/get-blocked-users  -> { success, count, users }
 *   GET /admin/get-editor         -> { msg, editor }
 *   GET /admin/get-publisher      -> { msg, editor }  (publishers, reuses "editor" key)
 *
 * There is NO endpoint for "Unique Visitors", "Avg. Read Time", a
 * day-by-day "Views over Time" series, or a "Device Breakdown" split —
 * none of that is tracked anywhere in the backend/models. Rather than
 * fabricate numbers, this keeps the reference visual layout but swaps
 * those slots for metrics that ARE real and traceable to an endpoint:
 *   - Total Views        <- /admin/analytics
 *   - Total Blogs         <- /admin/analytics
 *   - Blocked Users       <- /admin/get-blocked-users
 *   - Avg. Views / Blog   <- derived (totalViews / totalBlogs)
 *   - "Views over Time"   -> "Views by Blog" area chart, real per-blog views
 *   - "Device Breakdown"  -> "Access Breakdown" (Editors / Publishers / Blocked)
 *
 * The "7 Days / 30 Days / All Time" pill control mirrors the reference
 * UI but is presentational only — there is no backend date-range filter
 * to wire it to yet. The download/refresh icon buttons ARE wired to the
 * real export + refetch behavior.
 *
 * If/when the backend adds real visitor-session, read-time, or device
 * analytics, swap the derived sections below for direct API-backed
 * values — the layout will not need to change.
 * ------------------------------------------------------------------
 */

import * as React from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Ban,
    ChevronRight,
    Download,
    Eye,
    FileText,
    RefreshCw,
    TrendingUp,
    UserCog,
} from "lucide-react";

import { apiClient } from "@/api/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { useAuthStore } from "@/store/authStore";

// =====================================================================
// Types — mirrored 1:1 from backend controllers, do not widen loosely
// =====================================================================

interface AnalyticsSummary {
    totalViews: number;
    totalBlogs: number;
}

interface AnalyticsResponse {
    success: boolean;
    analytics: AnalyticsSummary;
}

interface BlogAnalyticsItem {
    _id: string;
    title: string;
    slug: string;
    views: number;
    createdAt: string;
}

interface BlogAnalyticsResponse {
    success: boolean;
    blogs: BlogAnalyticsItem[];
}

type AdminRole = "READER" | "PUBLISHER" | "ADMIN" | "EDITOR";

interface AdminUser {
    _id: string;
    email: string;
    name: string;
    role: AdminRole;
    isActive: boolean;
    avatar?: string;
}

interface BlockedUsersResponse {
    success: boolean;
    count: number;
    users: AdminUser[];
}

interface RoleListResponse {
    msg: string;
    editor: AdminUser[];
}

interface DashboardData {
    totalViews: number;
    totalBlogs: number;
    blockedCount: number;
    editorCount: number;
    publisherCount: number;
    blogs: BlogAnalyticsItem[];
}

// =====================================================================
// Helpers
// =====================================================================

const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});

const preciseFormatter = new Intl.NumberFormat("en-US");

function formatCompact(value: number): string {
    return compactFormatter.format(Math.max(0, value ?? 0));
}

function formatDate(iso: string): string {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

function truncateLabel(label: string, max = 10): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

// =====================================================================
// Data hook
// =====================================================================

function useDashboardData() {
    const authLoading = useAuthStore((s) => s.isLoading);

    const [data, setData] = React.useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchAll = React.useCallback(async () => {
        // Yield a microtask first. Anything below this line now runs
        // in a separate task from whatever synchronously invoked
        // fetchAll() (e.g. the effect), so subsequent setState calls
        // are async continuations, not part of the effect's render pass.
        await Promise.resolve();

        // Read the latest token directly from the store instead of a
        // closed-over value, so this callback stays referentially
        // stable (empty dep array) while still seeing fresh auth state.
        const token = useAuthStore.getState().accessToken;
        if (!token) {
            setIsLoading(false);
            setError("Not authenticated.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const results = await Promise.allSettled([
                apiClient.get<AnalyticsResponse>("/admin/analytics"),
                apiClient.get<BlogAnalyticsResponse>("/admin/analytics/blogs"),
                apiClient.get<BlockedUsersResponse>("/admin/get-blocked-users"),
                apiClient.get<RoleListResponse>("/admin/get-editor"),
                apiClient.get<RoleListResponse>("/admin/get-publisher"),
            ]);

            const [analyticsRes, blogsRes, blockedRes, editorRes, publisherRes] =
                results;

            if (analyticsRes.status === "rejected") {
                throw new Error("Failed to load analytics summary.");
            }
            if (blogsRes.status === "rejected") {
                throw new Error("Failed to load blog analytics.");
            }

            const analytics = analyticsRes.value.data.analytics;
            const blogs = blogsRes.value.data.blogs ?? [];

            const blockedCount =
                blockedRes.status === "fulfilled"
                    ? blockedRes.value.data.count ??
                    blockedRes.value.data.users?.length ??
                    0
                    : 0;

            const editorCount =
                editorRes.status === "fulfilled"
                    ? editorRes.value.data.editor?.length ?? 0
                    : 0;

            const publisherCount =
                publisherRes.status === "fulfilled"
                    ? publisherRes.value.data.editor?.length ?? 0
                    : 0;

            setData({
                totalViews: analytics.totalViews ?? 0,
                totalBlogs: analytics.totalBlogs ?? 0,
                blockedCount,
                editorCount,
                publisherCount,
                blogs,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while loading the dashboard.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        // Wait until the auth bootstrap (get-access-token / refresh-token)
        // has finished. fetchAll() itself decides what to do once it runs
        // — this effect body has no setState calls of its own.
        if (authLoading) return;

        fetchAll();
    }, [authLoading, fetchAll]);

    return { data, isLoading, error, refetch: fetchAll };
}

// =====================================================================
// Range pill control (presentational only — no backend date filter yet)
// =====================================================================

const RANGE_OPTIONS = ["7 Days", "30 Days", "All Time"] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

function RangeToggle({
    value,
    onChange,
}: {
    value: RangeOption;
    onChange: (v: RangeOption) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
            {RANGE_OPTIONS.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                        value === option
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 hover:text-slate-700",
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}

// =====================================================================
// Stat card
// =====================================================================

interface StatCardProps {
    label: string;
    value: string;
    delta?: { value: string; direction: "up" | "down" };
    icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, delta, icon: Icon }: StatCardProps) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                </p>
                {delta && (
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            delta.direction === "up"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-500",
                        )}
                    >
                        {delta.value}
                    </span>
                )}
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {value}
                </p>
                <Icon className="mb-0.5 h-5 w-5 shrink-0 text-slate-300" />
            </div>
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-8 w-20" />
        </div>
    );
}

// =====================================================================
// Views by Blog chart (real per-blog view counts — no time-series
// endpoint exists on the backend, see header note)
// =====================================================================

function ViewsByBlogChart({ blogs }: { blogs: BlogAnalyticsItem[] }) {
    const chartData = React.useMemo(
        () =>
            [...blogs]
                .sort((a, b) => b.views - a.views)
                .slice(0, 7)
                .reverse()
                .map((blog) => ({
                    name: truncateLabel(blog.title),
                    fullName: blog.title,
                    views: blog.views,
                })),
        [blogs],
    );

    const peakViews = React.useMemo(
        () => chartData.reduce((max, d) => Math.max(max, d.views), 0),
        [chartData],
    );

    if (chartData.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
                No published blogs yet.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart
                data={chartData}
                margin={{ top: 24, right: 12, left: -8, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef0f4" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={(props) => {
                        const { x, y, payload } = props;
                        const isPeak = payload.value === truncateLabel(
                            chartData.find((d) => d.views === peakViews)?.name ?? "",
                        );
                        return (
                            <text
                                x={x}
                                y={Number(y) + 12}
                                textAnchor="middle"
                                fontSize={12}
                                fontWeight={isPeak ? 700 : 400}
                                fill={isPeak ? "#4f46e5" : "#94a3b8"}
                            >
                                {payload.value}
                            </text>
                        );
                    }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => formatCompact(v)}
                    width={42}
                />
                <Tooltip
                    formatter={(value: unknown) => {
                        // Return a fallback array if the value is missing or not a number
                        if (typeof value !== 'number') return ['0', 'Views'];

                        return [preciseFormatter.format(value), 'Views'];
                    }}

                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                    contentStyle={{
                        borderRadius: 12,
                        border: "none",
                        background: "#0f172a",
                        color: "#fff",
                        fontSize: 12,
                        padding: "6px 10px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#cbd5e1", marginBottom: 2 }}
                />
                <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fill="url(#viewsFill)"
                    dot={(props) => {
                        const { cx, cy, payload, key } = props;
                        if (payload.views !== peakViews) {
                            return <React.Fragment key={key} />;
                        }
                        return (
                            <circle
                                key={key}
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#fff"
                                stroke="#4f46e5"
                                strokeWidth={3}
                            />
                        );
                    }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// =====================================================================
// Access breakdown (real counts — replaces the unavailable device split)
// =====================================================================

interface AccessRow {
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

function AccessBreakdown({
    editorCount,
    publisherCount,
    blockedCount,
}: {
    editorCount: number;
    publisherCount: number;
    blockedCount: number;
}) {
    const rows: AccessRow[] = [
        { label: "Editors", count: editorCount, icon: UserCog, color: "bg-indigo-600" },
        { label: "Publishers", count: publisherCount, icon: FileText, color: "bg-indigo-300" },
        { label: "Blocked", count: blockedCount, icon: Ban, color: "bg-slate-300" },
    ];
    const total = Math.max(1, rows.reduce((sum, r) => sum + r.count, 0));

    return (
        <div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className={cn("h-full", row.color)}
                        style={{ width: `${(row.count / total) * 100}%` }}
                    />
                ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
                {rows.map(({ label, count, color }) => (
                    <div key={label} className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} />
                            <span className="truncate">{label}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                            {Math.round((count / total) * 100)}%
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================================================
// Top performing blogs list
// =====================================================================

function TopBlogsList({ blogs }: { blogs: BlogAnalyticsItem[] }) {
    const [expanded, setExpanded] = React.useState(false);
    const sorted = React.useMemo(
        () => [...blogs].sort((a, b) => b.views - a.views),
        [blogs],
    );
    const visible = expanded ? sorted : sorted.slice(0, 3);

    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">
                        Top Performing Blogs
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Ranked by total views
                    </p>
                </div>
                {sorted.length > 3 && (
                    <button
                        type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        className="flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
                    >
                        {expanded ? "Show Less" : "View All"}
                        {!expanded && <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                )}
            </div>

            {sorted.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                    No published blogs to display yet.
                </p>
            ) : (
                <div className="mt-4 divide-y divide-slate-100">
                    {visible.map((blog, index) => (
                        <div key={blog._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="relative shrink-0">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                    {index + 1}
                                </span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-indigo-600">
                                    /{blog.slug}
                                </p>
                                <p className="truncate text-sm font-semibold text-slate-900">
                                    {blog.title}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{preciseFormatter.format(blog.views)}</span>
                                    <span>·</span>
                                    <span>{formatDate(blog.createdAt)}</span>
                                </div>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =====================================================================
// Export handler (client-side CSV of currently loaded blog analytics)
// =====================================================================

function exportBlogsToCsv(blogs: BlogAnalyticsItem[]) {
    const header = ["Title", "Slug", "Views", "Created Date"];
    const rows = blogs.map((b) => [
        `"${b.title.replace(/"/g, '""')}"`,
        b.slug,
        String(b.views),
        formatDate(b.createdAt),
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blog-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
}

// =====================================================================
// Page content — this is everything AdminPanelLayout renders as
// {children} inside its <main>. No sidebar/topbar here; the layout
// already owns those.
// =====================================================================

export default function Dashboard() {
    const { data, isLoading, error, refetch } = useDashboardData();
    const [range, setRange] = React.useState<RangeOption>("7 Days");

    const avgViewsPerBlog =
        data && data.totalBlogs > 0
            ? Math.round(data.totalViews / data.totalBlogs)
            : 0;

    return (
        <div className="w-full">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <RangeToggle value={range} onChange={setRange} />
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        aria-label="Refresh"
                        className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-500 shadow-sm"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => data && exportBlogsToCsv(data.blogs)}
                        disabled={!data || data.blogs.length === 0}
                        aria-label="Export"
                        className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-500 shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-5">
                    <AlertTitle>Couldn&apos;t load dashboard data</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{error}</span>
                        <Button size="sm" variant="outline" onClick={() => refetch()}>
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {isLoading || !data ? (
                    Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <StatCard
                            label="Total Views"
                            value={formatCompact(data.totalViews)}
                            icon={Eye}
                        />
                        <StatCard
                            label="Total Blogs"
                            value={preciseFormatter.format(data.totalBlogs)}
                            icon={FileText}
                        />
                        <StatCard
                            label="Blocked Users"
                            value={preciseFormatter.format(data.blockedCount)}
                            icon={Ban}
                        />
                        <StatCard
                            label="Avg. Views / Blog"
                            value={formatCompact(avgViewsPerBlog)}
                            icon={TrendingUp}
                        />
                    </>
                )}
            </div>

            {/* Chart */}
            <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            Views by Blog
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Real per-blog view counts, highest first
                        </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        Live
                    </span>
                </div>
                <div className="mt-4">
                    {isLoading || !data ? (
                        <Skeleton className="h-[280px] w-full rounded-xl" />
                    ) : (
                        <ViewsByBlogChart blogs={data.blogs} />
                    )}
                </div>
            </div>

            {/* Access breakdown */}
            <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">
                        Access Breakdown
                    </h3>
                    <span className="text-xs font-medium text-slate-400">
                        Editors · Publishers · Blocked
                    </span>
                </div>
                <div className="mt-5">
                    {isLoading || !data ? (
                        <div>
                            <Skeleton className="h-2.5 w-full rounded-full" />
                            <div className="mt-5 grid grid-cols-3 gap-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-9 w-full" />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <AccessBreakdown
                            editorCount={data.editorCount}
                            publisherCount={data.publisherCount}
                            blockedCount={data.blockedCount}
                        />
                    )}
                </div>
            </div>

            {/* Top performing blogs */}
            <div className="mt-5">
                {isLoading || !data ? (
                    <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                        <Skeleton className="mb-6 h-6 w-48" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="mb-3 h-12 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <TopBlogsList blogs={data.blogs} />
                )}
            </div>
        </div>
    );
}