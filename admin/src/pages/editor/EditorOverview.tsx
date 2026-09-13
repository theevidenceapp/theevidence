/**
 * pages/editor/EditorOverview.tsx — Editorial Repository Triage Overview
 * ------------------------------------------------------------------
 * This component renders ONLY the main-content region of the Editor
 * Overview screen. The sidebar and top application bar are supplied
 * by the surrounding layout and are intentionally out of scope here.
 *
 * DATA SOURCES
 * -----------
 *   GET /admin/get-statistical-content-data
 *       -> { success, message, content: ContentItem[] }
 *       Full repository snapshot (content body excluded server-side)
 *       used to compute every stat card and section badge count.
 *
 *   GET /admin/get-top-2-content
 *       -> { success, message, content: ContentItem[] }
 *       Top 2 RESEARCH + top 2 BLOG documents (backend-ranked by
 *       `score`, descending). Used to populate the "Research
 *       Submissions" and "Blog Articles" preview sections.
 *
 *   GET /admin/user/:userId
 *       -> { success, message?, user: AdminUserRecord }
 *       Resolves a raw author ObjectId into a displayable identity
 *       (name/email). Called once per unique author ID discovered
 *       across the currently rendered preview cards, deduped and
 *       cached client-side to avoid redundant network calls.
 *
 * DATA-FIDELITY NOTE
 * -------------------
 * The `Blog` schema only exposes a two-state `status` field:
 * "PUBLISHED" | "DRAFT". There is no "UNDER_REVIEW" state and no
 * assigned-reviewer field. `author` arrives as a raw ObjectId string
 * (or, per product requirements, potentially an array of them for
 * multi-author entries — the backend contract for that case was not
 * provided, so this component normalizes either shape defensively).
 * Author identity (name/email) is not populated inline on the content
 * payload; it is resolved out-of-band via `/admin/user/:userId` and
 * merged into the UI. If that lookup fails or is still in flight, the
 * UI falls back to a compact truncated-ID chip rather than fabricating
 * a name. Every number shown (views, counts, breakdowns) is derived
 * directly from the fetched payloads — nothing here is mocked.
 *
 * The "Review Research" / "Review Blog" actions are exposed as
 * optional callback props so the parent route can wire real
 * navigation without this file needing to know about the router.
 * ------------------------------------------------------------------
 */

import * as React from "react";
import {
    Hourglass,
    CheckCircle2,
    Eye,
    Database,
    FlaskConical,
    Newspaper,
    FileText,
    Table2,
    Clock,
    User,
    RefreshCw,
    ArrowRight,
    ImageOff,
} from "lucide-react";

import { apiClient } from "@/api/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/store/authStore";
import { Link } from "react-router-dom";

// =====================================================================
// Types — mirrored 1:1 from the Blog document / controller responses.
// Do not widen these loosely; every field here is backed by the API.
// =====================================================================

type ContentStatus = "PUBLISHED" | "DRAFT";
type ContentDocType = "RESEARCH" | "BLOG";

interface CoverImage {
    url: string;
    publicId: string;
}

interface CsvAsset {
    url: string;
}

interface PdfAsset {
    url: string;
    publicId: string;
    originalName: string;
    _id: string;
}

interface ContentItem {
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage: CoverImage;
    csv: CsvAsset;
    pdfs: PdfAsset[];
    /**
     * Raw author ObjectId(s). Normally a single string, but the UI is
     * built to gracefully render a list when multiple authors are
     * present, since a post may have more than one author.
     */
    author: string | string[];
    views: number;
    category: string;
    tags: string[];
    status: ContentStatus;
    docType: ContentDocType;
    readTime: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface StatisticalContentResponse {
    success: boolean;
    message: string;
    content: ContentItem[];
}

interface Top2ContentResponse {
    success: boolean;
    message: string;
    content: ContentItem[];
}

interface DerivedStats {
    totalEntries: number;
    researchTotal: number;
    blogTotal: number;
    draftResearch: number;
    draftBlog: number;
    publishedResearch: number;
    publishedBlog: number;
    totalViews: number;
}

interface OverviewData {
    stats: DerivedStats;
    topResearch: ContentItem[];
    topBlogs: ContentItem[];
}

/**
 * Shape of the record returned by GET /admin/user/:userId.
 * The controller selects the full User document minus `accessToken`,
 * so the exact field set is whatever the User schema defines. We only
 * depend on a conservative, optional subset here and never assume a
 * field is present — every consumer falls back gracefully.
 */
interface AdminUserRecord {
    _id: string;
    name?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
}

interface AdminUserResponse {
    success: boolean;
    message?: string;
    user: AdminUserRecord;
}

type AuthorFetchStatus = "loading" | "loaded" | "error";

interface AuthorDirectoryEntry {
    status: AuthorFetchStatus;
    record?: AdminUserRecord;
}

/** Map of author ObjectId -> resolution state, shared across cards. */
type AuthorDirectory = Record<string, AuthorDirectoryEntry>;

// =====================================================================
// Formatting helpers
// =====================================================================

const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});
const preciseFormatter = new Intl.NumberFormat("en-US");

function formatCompact(value: number): string {
    return compactFormatter.format(Math.max(0, value ?? 0));
}

function formatCount(value: number): string {
    return preciseFormatter.format(Math.max(0, value ?? 0));
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "Not published";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

function truncateAuthorId(id: string): string {
    if (!id) return "Unknown";
    return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/**
 * Normalizes the `author` field — which may be a single ObjectId
 * string, an array of them, or missing — into a deduped array of
 * non-empty string IDs. This is the single choke point that lets the
 * rest of the UI treat "one author" and "many authors" identically.
 */
function normalizeAuthors(
    author: string | string[] | null | undefined,
): string[] {
    const raw = Array.isArray(author) ? author : author ? [author] : [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const candidate of raw) {
        const trimmed = typeof candidate === "string" ? candidate.trim() : "";
        if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            result.push(trimmed);
        }
    }
    return result;
}

/**
 * Best-effort human-readable name for a resolved author record.
 * Falls back to the truncated ObjectId if no name-like field exists
 * or resolution failed — never fabricates an identity.
 */
function getDisplayName(
    record: AdminUserRecord | undefined,
    fallbackId: string,
): string {
    if (!record) return truncateAuthorId(fallbackId);
    return (
        record.displayName?.trim() ||
        record.name?.trim() ||
        record.fullName?.trim() ||
        record.email?.trim() ||
        truncateAuthorId(fallbackId)
    );
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// =====================================================================
// Derivation — everything below is computed strictly from real fields
// =====================================================================

function deriveStats(content: ContentItem[]): DerivedStats {
    let researchTotal = 0;
    let blogTotal = 0;
    let draftResearch = 0;
    let draftBlog = 0;
    let publishedResearch = 0;
    let publishedBlog = 0;
    let totalViews = 0;

    for (const item of content) {
        totalViews += item.views ?? 0;

        if (item.docType === "RESEARCH") {
            researchTotal += 1;
            if (item.status === "DRAFT") draftResearch += 1;
            if (item.status === "PUBLISHED") publishedResearch += 1;
        } else if (item.docType === "BLOG") {
            blogTotal += 1;
            if (item.status === "DRAFT") draftBlog += 1;
            if (item.status === "PUBLISHED") publishedBlog += 1;
        }
    }

    return {
        totalEntries: content.length,
        researchTotal,
        blogTotal,
        draftResearch,
        draftBlog,
        publishedResearch,
        publishedBlog,
        totalViews,
    };
}

// =====================================================================
// Data hook
// =====================================================================

function useOverviewData() {
    const authLoading = useAuthStore((s) => s.isLoading);

    const [data, setData] = React.useState<OverviewData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchAll = React.useCallback(async () => {
        // Yield a microtask so this callback's continuation runs as its
        // own async task, independent of whatever synchronously invoked it.
        await Promise.resolve();

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
                apiClient.get<StatisticalContentResponse>(
                    "/admin/get-statistical-content-data",
                ),
                apiClient.get<Top2ContentResponse>("/admin/get-top-2-content"),
            ]);

            const [statsRes, topRes] = results;

            if (statsRes.status === "rejected") {
                throw new Error("Failed to load repository statistics.");
            }

            const allContent = statsRes.value.data.content ?? [];
            const stats = deriveStats(allContent);

            const topContent =
                topRes.status === "fulfilled" ? topRes.value.data.content ?? [] : [];

            const topResearch = topContent.filter(
                (item) => item.docType === "RESEARCH",
            );
            const topBlogs = topContent.filter((item) => item.docType === "BLOG");

            setData({ stats, topResearch, topBlogs });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while loading the overview.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (authLoading) return;
        fetchAll();
    }, [authLoading, fetchAll]);

    return { data, isLoading, error, refetch: fetchAll };
}

// =====================================================================
// Author directory hook — resolves ObjectId author references to
// displayable identities via GET /admin/user/:userId, deduped and
// cached so the same author is never fetched twice across cards or
// across refetches of the underlying content.
// =====================================================================

async function fetchAuthorRecord(userId: string): Promise<AdminUserRecord | null> {
    try {
        const response = await apiClient.get<AdminUserResponse>(`/admin/user/${userId}`);

        // TEMPORARY DIAGNOSTIC — remove once shape is confirmed.
        console.log(`[authorDirectory] /admin/user/${userId} raw response:`, response);

        // Defensive: handle both "apiClient unwraps to body" and
        // "apiClient returns full Axios response" conventions, since
        // I don't yet know which one your apiClient uses.
        const body: AdminUserResponse | undefined =
            (response as any)?.data ?? (response as any);

        if (!body?.success) {
            console.warn(
                `[authorDirectory] /admin/user/${userId} returned success=false or malformed body`,
                body,
            );
            return null;
        }
        if (!body.user) {
            console.warn(
                `[authorDirectory] /admin/user/${userId} succeeded but had no 'user' field`,
                body,
            );
            return null;
        }
        return body.user;
    } catch (err) {
        // TEMPORARY DIAGNOSTIC — remove once root cause is fixed.
        console.error(`[authorDirectory] /admin/user/${userId} threw:`, err);
        return null;
    }
}

function useAuthorDirectory(authorIds: string[]): AuthorDirectory {
    const [directory, setDirectory] = React.useState<AuthorDirectory>({});
    const directoryRef = React.useRef<AuthorDirectory>(directory);
    directoryRef.current = directory;

    // Stable dependency key so the effect only re-runs when the actual
    // set of IDs changes, not on every render of the parent.
    const authorIdsKey = authorIds.join("|");

    React.useEffect(() => {
        if (authorIds.length === 0) return;

        const idsToFetch = authorIds.filter((id) => {
            const existing = directoryRef.current[id];
            return !existing || existing.status === "error";
        });

        if (idsToFetch.length === 0) return;

        setDirectory((prev) => {
            const next = { ...prev };
            idsToFetch.forEach((id) => {
                next[id] = { status: "loading" };
            });
            return next;
        });

        idsToFetch.forEach((id) => {
            fetchAuthorRecord(id)
                .then((record) => {
                    setDirectory((prev) => ({
                        ...prev,
                        [id]: record
                            ? { status: "loaded", record }
                            : { status: "error" },
                    }));
                })
                .catch(() => {
                    setDirectory((prev) => ({
                        ...prev,
                        [id]: { status: "error" },
                    }));
                });
        });
        // authorIdsKey intentionally drives this effect instead of the
        // authorIds array reference, which changes identity every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authorIdsKey]);

    return directory;
}

// =====================================================================
// Sync status pill (reflects real fetch state, not business data)
// =====================================================================

function SyncPill({
    isLoading,
    hasError,
}: {
    isLoading: boolean;
    hasError: boolean;
}) {
    if (hasError) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Sync Error
            </span>
        );
    }
    if (isLoading) {
        return (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Syncing…
            </span>
        );
    }
    return (
        <>
        {/* Return no UI */}
        </>
    );
}

// =====================================================================
// Stat card
// =====================================================================

interface StatCardProps {
    label: string;
    value: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
}

function StatCard({ label, value, sub, icon: Icon, accent }: StatCardProps) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                </p>
                <span
                    className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        accent,
                    )}
                >
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {value}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                {sub}
            </p>
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <div className="flex items-start justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
        </div>
    );
}

// =====================================================================
// Shared bits: status badge, category tag, attachment chips, author
// =====================================================================

function StatusBadge({ status }: { status: ContentStatus }) {
    const isPublished = status === "PUBLISHED";
    return (
        <span
            className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
                isPublished
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600",
            )}
        >
            {status}
        </span>
    );
}

function CategoryTag({ category }: { category: string }) {
    if (!category) return null;
    return (
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {category}
        </span>
    );
}

function AttachmentChips({ item }: { item: ContentItem }) {
    const pdfs = item.pdfs ?? [];
    const hasPdfs = pdfs.length > 0;
    const hasCsv = Boolean(item.csv?.url);

    if (!hasPdfs && !hasCsv) return null;

    return (
        <div className="mt-3 flex flex-wrap gap-1.5">
            {hasPdfs &&
                pdfs.map((pdf) => (
                    <Link
                        key={pdf._id}
                        to={pdf.url}
                        target="_blank"
                        rel="noreferrer"
                        title={pdf.originalName}
                        className="inline-flex max-w-[160px] items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100"
                    >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">{pdf.originalName}</span>
                    </Link>
                ))}
            {hasCsv && (
                <Link
                    to={item.csv.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-600 hover:bg-teal-100"
                >
                    <Table2 className="h-3 w-3 shrink-0" />
                    dataset.csv
                </Link>
            )
            }
        </div >
    );
}

function TagRow({ tags }: { tags: string[] }) {
    if (!tags || tags.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                >
                    #{tag}
                </span>
            ))}
        </div>
    );
}

/**
 * Renders a single resolved (or in-flight, or failed) author as a
 * compact pill: an initials badge + display name, with the raw
 * ObjectId (and email, once known) available on hover via `title`.
 */
function AuthorPill({
    id,
    entry,
}: {
    id: string;
    entry?: AuthorDirectoryEntry;
}) {
    if (!entry || entry.status === "loading") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-14" />
            </span>
        );
    }

    const resolvedName =
        entry.status === "loaded"
            ? getDisplayName(entry.record, id)
            : truncateAuthorId(id);
    const tooltip =
        entry.status === "loaded" ? entry.record?.email ?? id : id;

    return (
        <span
            title={tooltip}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
        >
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[8px] font-bold text-white">
                {getInitials(resolvedName)}
            </span>
            <span className="truncate">{resolvedName}</span>
        </span>
    );
}

const MAX_VISIBLE_AUTHORS = 2;

/**
 * Renders one-or-many authors for a content item. Handles the
 * single-author case identically to the multi-author case — both
 * flow through `normalizeAuthors`, so no branching logic lives here
 * beyond an overflow affordance for long author lists.
 */
function AuthorList({
    authorIds,
    directory,
}: {
    authorIds: string[];
    directory: AuthorDirectory;
}) {
    if (authorIds.length === 0) {
        return (
            <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Unknown author</span>
            </span>
        );
    }

    const visible = authorIds.slice(0, MAX_VISIBLE_AUTHORS);
    const overflowCount = authorIds.length - visible.length;

    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {visible.map((id) => (
                <AuthorPill key={id} id={id} entry={directory[id]} />
            ))}
            {overflowCount > 0 && (
                <span
                    className="text-[11px] font-semibold text-slate-400"
                    title={authorIds.slice(MAX_VISIBLE_AUTHORS).join(", ")}
                >
                    +{overflowCount} more
                </span>
            )}
        </span>
    );
}

function MetaRow({
    item,
    authorDirectory,
}: {
    item: ContentItem;
    authorDirectory: AuthorDirectory;
}) {
    const authorIds = React.useMemo(
        () => normalizeAuthors(item.author),
        [item.author],
    );

    return (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <AuthorList authorIds={authorIds} directory={authorDirectory} />
            <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.readTime > 0 ? `${item.readTime} min read` : "Read time N/A"}
            </span>
            <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatCount(item.views)} views
            </span>
            <span className="text-slate-400">{formatDate(item.publishedAt)}</span>
        </div>
    );
}

// =====================================================================
// Research Submissions section (list-style cards — no cover imagery,
// matching the editorial triage layout)
// =====================================================================

function ResearchCard({
    item,
    rank,
    onReview,
    authorDirectory,
}: {
    item: ContentItem;
    rank: number;
    onReview?: (item: ContentItem) => void;
    authorDirectory: AuthorDirectory;
}) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                            {rank}
                        </span>
                        <CategoryTag category={item.category} />
                        <StatusBadge status={item.status} />
                        <span className="truncate text-xs text-slate-400">
                            slug: {item.slug}
                        </span>
                    </div>

                    <h3 className="mt-2 truncate text-base font-bold text-slate-900 sm:text-lg">
                        {item.title}
                    </h3>
                    {item.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {item.excerpt}
                        </p>
                    )}

                    <MetaRow item={item} authorDirectory={authorDirectory} />
                    <TagRow tags={item.tags} />
                    <AttachmentChips item={item} />
                </div>

                <Button
                    onClick={() => onReview?.(item)}
                    className="w-full shrink-0 gap-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 md:w-auto"
                >
                    Review Research
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function ResearchCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-4 h-9 w-40" />
        </div>
    );
}

// =====================================================================
// Blog Articles section (image cards)
// =====================================================================

function BlogCard({
    item,
    onReview,
    authorDirectory,
}: {
    item: ContentItem;
    onReview?: (item: ContentItem) => void;
    authorDirectory: AuthorDirectory;
}) {
    const hasImage = Boolean(item.coverImage?.url);

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-44">
                {hasImage ? (
                    <img
                        src={item.coverImage.url}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                        <ImageOff className="h-8 w-8 text-white/70" />
                    </div>
                )}
                <div className="absolute left-3 top-3">
                    <CategoryTag category={item.category} />
                </div>
                <div className="absolute right-3 top-3">
                    <StatusBadge status={item.status} />
                </div>
            </div>

            <div className="flex flex-1 flex-col p-4 sm:p-5">
                <p className="truncate text-xs font-medium text-slate-400">
                    slug: {item.slug}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-bold text-slate-900">
                    {item.title}
                </h3>
                {item.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {item.excerpt}
                    </p>
                )}

                <TagRow tags={item.tags} />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <MetaRow item={item} authorDirectory={authorDirectory} />
                </div>

                <Button
                    onClick={() => onReview?.(item)}
                    className="mt-4 w-full gap-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto sm:self-end"
                >
                    Review Blog
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function BlogCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <Skeleton className="h-40 w-full sm:h-44" />
            <div className="p-4 sm:p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-4 h-9 w-32" />
            </div>
        </div>
    );
}

// =====================================================================
// Section header
// =====================================================================

function SectionHeader({
    icon: Icon,
    title,
    docType,
    pendingCount,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    docType: ContentDocType;
    pendingCount: number;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Icon className="h-4 w-4" />
                </span>
                <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                        {title}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400">
                        docType: {docType}
                    </p>
                </div>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                {pendingCount} Pending
            </span>
        </div>
    );
}

function EmptySection({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No {label} available in the current ranking.
        </div>
    );
}

// =====================================================================
// Root component
// =====================================================================

export interface EditorOverviewProps {
    onReviewResearch?: (item: ContentItem) => void;
    onReviewBlog?: (item: ContentItem) => void;
}

export default function EditorOverview({
    onReviewResearch,
    onReviewBlog,
}: EditorOverviewProps) {
    const { data, isLoading, error, refetch } = useOverviewData();

    const stats = data?.stats;
    const draftTotal = (stats?.draftResearch ?? 0) + (stats?.draftBlog ?? 0);
    const publishedTotal =
        (stats?.publishedResearch ?? 0) + (stats?.publishedBlog ?? 0);

    // Every unique author ID referenced by the currently rendered
    // preview cards (Research + Blog). Deduped once here so the
    // directory hook only ever fetches an ID a single time regardless
    // of how many cards reference it.
    const allAuthorIds = React.useMemo(() => {
        if (!data) return [];
        const ids = [
            ...data.topResearch.flatMap((item) => normalizeAuthors(item.author)),
            ...data.topBlogs.flatMap((item) => normalizeAuthors(item.author)),
        ];
        return normalizeAuthors(ids);
    }, [data]);

    const authorDirectory = useAuthorDirectory(allAuthorIds);

    return (
        <div className="w-full">
            {/* Page heading */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Triage &amp; Editorial Pipeline
                        </p>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <SyncPill isLoading={isLoading} hasError={Boolean(error)} />
                    </div>
                    <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                        Editorial Repository Triage
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">
                        Evaluate submitted manuscripts and articles strictly grounded to
                        schema entries.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-100">
                        <Database className="h-3.5 w-3.5 text-slate-400" />
                        {stats ? formatCount(stats.totalEntries) : "—"} entries total
                    </span>
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
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Couldn&apos;t load the editorial overview</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{error}</span>
                        <Button size="sm" variant="outline" onClick={() => refetch()}>
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {isLoading || !stats ? (
                    Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <StatCard
                            label="Pending Review"
                            value={formatCount(draftTotal)}
                            sub={`${formatCount(stats.draftResearch)} Research • ${formatCount(
                                stats.draftBlog,
                            )} Blogs`}
                            icon={Hourglass}
                            accent="bg-amber-50 text-amber-600"
                        />
                        <StatCard
                            label="Published"
                            value={formatCount(publishedTotal)}
                            sub={`${formatCount(
                                stats.publishedResearch,
                            )} Research • ${formatCount(stats.publishedBlog)} Blogs`}
                            icon={CheckCircle2}
                            accent="bg-emerald-50 text-emerald-600"
                        />
                        <StatCard
                            label="Total Views"
                            value={formatCompact(stats.totalViews)}
                            sub={`Across ${formatCount(stats.totalEntries)} entries`}
                            icon={Eye}
                            accent="bg-indigo-50 text-indigo-600"
                        />
                        <StatCard
                            label="Total Repository"
                            value={formatCount(stats.totalEntries)}
                            sub={`${formatCount(stats.researchTotal)} Research • ${formatCount(
                                stats.blogTotal,
                            )} Blogs`}
                            icon={Database}
                            accent="bg-slate-100 text-slate-600"
                        />
                    </>
                )}
            </div>

            {/* Research Submissions */}
            <div className="mt-8">
                <SectionHeader
                    icon={FlaskConical}
                    title="Research Submissions"
                    docType="RESEARCH"
                    pendingCount={stats?.draftResearch ?? 0}
                />
                <div className="space-y-3">
                    {isLoading || !data ? (
                        <>
                            <ResearchCardSkeleton />
                            <ResearchCardSkeleton />
                        </>
                    ) : data.topResearch.length === 0 ? (
                        <EmptySection label="research submissions" />
                    ) : (
                        data.topResearch.map((item, index) => (
                            <ResearchCard
                                key={item._id}
                                item={item}
                                rank={index + 1}
                                onReview={onReviewResearch}
                                authorDirectory={authorDirectory}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Blog Articles */}
            <div className="mt-8">
                <SectionHeader
                    icon={Newspaper}
                    title="Blog Articles"
                    docType="BLOG"
                    pendingCount={stats?.draftBlog ?? 0}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {isLoading || !data ? (
                        <>
                            <BlogCardSkeleton />
                            <BlogCardSkeleton />
                        </>
                    ) : data.topBlogs.length === 0 ? (
                        <div className="sm:col-span-2">
                            <EmptySection label="blog articles" />
                        </div>
                    ) : (
                        data.topBlogs.map((item) => (
                            <BlogCard
                                key={item._id}
                                item={item}
                                onReview={onReviewBlog}
                                authorDirectory={authorDirectory}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}