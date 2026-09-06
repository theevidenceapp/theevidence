/**
 * pages/dashboard/Dashboard.tsx — Admin Analytics Overview
 * ------------------------------------------------------------------
 * Rendered as the `children` of <AdminPanelLayout>, which already
 * supplies the dark top strip, white search/actions bar, sidebar nav,
 * and the <main> wrapper (padding, background, rounded corners). This
 * component is ONLY the page content that goes inside that <main>.
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
 * fabricate numbers, this keeps the original visual layout but swaps
 * those four slots for metrics that ARE real and traceable to an
 * endpoint:
 *   - Total Views        <- /admin/analytics
 *   - Total Blogs         <- /admin/analytics
 *   - Blocked Users       <- /admin/get-blocked-users
 *   - Avg. Views / Blog   <- derived (totalViews / totalBlogs)
 *   - "Views over Time"   -> "Views by Blog" area chart, real per-blog views
 *   - "Device Breakdown"  -> "Access Breakdown" (Editors / Publishers / Blocked)
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
    Download,
    Eye,
    FileText,
    RefreshCw,
    TrendingDown,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
    const [data, setData] = React.useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchAll = React.useCallback(async () => {
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
        fetchAll();
    }, [fetchAll]);

    return { data, isLoading, error, refetch: fetchAll };
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                {delta && (
                    <span
                        className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            delta.direction === "up"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-500",
                        )}
                    >
                        {delta.direction === "up" ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        {delta.value}
                    </span>
                )}
            </div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-20" />
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

    if (chartData.length === 0) {
        return (
            <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
                No published blogs yet.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <AreaChart
                data={chartData}
                margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef0f4" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => formatCompact(v)}
                    width={42}
                />
                <Tooltip
                    formatter={(value: number) => [
                        preciseFormatter.format(value),
                        "Views",
                    ]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                    contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fill="url(#viewsFill)"
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
        { label: "Editors", count: editorCount, icon: UserCog },
        { label: "Publishers", count: publisherCount, icon: FileText },
        { label: "Blocked", count: blockedCount, icon: Ban },
    ];
    const max = Math.max(1, ...rows.map((r) => r.count));

    return (
        <div className="space-y-6">
            {rows.map(({ label, count, icon: Icon }) => (
                <div key={label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                            <Icon className="h-4 w-4 text-slate-400" />
                            {label}
                        </span>
                        <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${(count / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// =====================================================================
// Top performing blogs table
// =====================================================================

function TopBlogsTable({ blogs }: { blogs: BlogAnalyticsItem[] }) {
    const [expanded, setExpanded] = React.useState(false);
    const visible = expanded ? blogs : blogs.slice(0, 4);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-5">
                <h3 className="text-lg font-bold text-slate-900">
                    Top Performing Blogs
                </h3>
                {blogs.length > 4 && (
                    <button
                        type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        className="text-sm font-semibold text-indigo-600 hover:underline"
                    >
                        {expanded ? "Show Less" : "View All →"}
                    </button>
                )}
            </div>

            {blogs.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-slate-500">
                    No published blogs to display yet.
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-transparent">
                            <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Title
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Slug
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Views
                            </TableHead>
                            <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Created Date
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visible.map((blog) => (
                            <TableRow key={blog._id} className="border-slate-100">
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                                            <FileText className="h-4 w-4 text-indigo-500" />
                                        </div>
                                        <span className="font-medium text-slate-900">
                                            {blog.title}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500">/{blog.slug}</TableCell>
                                <TableCell className="font-semibold text-slate-900">
                                    {preciseFormatter.format(blog.views)}
                                </TableCell>
                                <TableCell className="pr-6 text-slate-500">
                                    {formatDate(blog.createdAt)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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

    const avgViewsPerBlog =
        data && data.totalBlogs > 0
            ? Math.round(data.totalViews / data.totalBlogs)
            : 0;

    return (
        <div className="w-full">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        Analytics Overview
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Real-time performance metrics and content engagement.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="gap-2 border-slate-200 text-slate-600"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => data && exportBlogsToCsv(data.blogs)}
                        disabled={!data || data.blogs.length === 0}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* Chart + breakdown */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">
                        Views by Blog
                    </h3>
                    {isLoading || !data ? (
                        <Skeleton className="h-[320px] w-full rounded-xl" />
                    ) : (
                        <ViewsByBlogChart blogs={data.blogs} />
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-bold text-slate-900">
                        Access Breakdown
                    </h3>
                    {isLoading || !data ? (
                        <div className="space-y-6">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i}>
                                    <Skeleton className="mb-2 h-4 w-24" />
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                            ))}
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
            <div className="mt-6">
                {isLoading || !data ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <Skeleton className="mb-6 h-6 w-48" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="mb-3 h-12 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <TopBlogsTable blogs={data.blogs} />
                )}
            </div>
        </div>
    );
}