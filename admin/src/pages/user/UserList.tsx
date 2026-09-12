/**
 * UsersList.tsx
 * -----------------------------------------------------------------------------
 * Admin Console — User Directory (read-only)
 *
 * Renders the "Users" view of the admin console exactly as specified by design:
 *   - Desktop: 4 KPI cards, filter pills, and a paginated data table.
 *   - Mobile:  3 KPI cards, filter pills, and a paginated stacked card list.
 * Selecting any user (row or card) opens an accessible modal with the user's
 * full profile as returned by the API.
 *
 * Data source
 * -----------------------------------------------------------------------------
 * GET /admin/get-all-users  (via the shared, token-refreshing `apiClient`)
 *
 * This is a single, static, view-only fetch — the entire directory is loaded
 * once. Search, role/verification filtering, and pagination (10 / 25 rows per
 * page) are all performed client-side against that single payload, which is
 * appropriate for an admin directory of this scale. If the directory grows
 * into the tens of thousands of rows, switch to server-side pagination by
 * passing `page`/`pageSize` query params to the endpoint instead.
 *
 * Integration notes
 * -----------------------------------------------------------------------------
 * 1. `apiClient` is imported from "@/api/api-client" — adjust if your alias
 *    or folder layout differs.
 * 2. Requires `lucide-react` and `@radix-ui/react-dialog` as dependencies:
 *      npm install lucide-react @radix-ui/react-dialog
 * 3. Written against Tailwind CSS utility classes; no custom CSS required.
 *
 * -----------------------------------------------------------------------------
 * Bug-fix pass (see change log at bottom of file for a summary)
 * -----------------------------------------------------------------------------
 * The real API does not always return `role` as a strict, upper-cased
 * "ADMIN" | "PUBLISHER" | "READER" value — case can differ, or the field can
 * be missing/null for a given account. The previous version trusted the
 * TypeScript type and indexed straight into ROLE_CONFIG with the raw value,
 * which threw `Cannot read properties of undefined (reading 'icon')` the
 * moment a role didn't match exactly. Role handling is now normalized and
 * defensive everywhere it's read (badge, stat counts, filter pills).
 */

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import type { ReactNode, KeyboardEvent } from "react";
import axios from "axios";
import * as Dialog from "@radix-ui/react-dialog";
import {
    Search,
    Users as UsersIcon,
    CheckCircle2,
    ShieldCheck,
    PenSquare,
    BookOpenText,
    Clock3,
    Calendar,
    History,
    X,
    RefreshCcw,
    AlertTriangle,
    Copy,
    Check,
    Fingerprint,
    KeyRound,
    Phone,
    CakeSlice,
    ShieldQuestion,
    Mail,
    Inbox,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

// NOTE: adjust this import to match your project's folder structure.
import { apiClient } from "@/api/api-client";

/* =============================================================================
 * Types
 * ========================================================================== */

type UserRole = "ADMIN" | "PUBLISHER" | "READER";

/**
 * Shape of a single user record as returned by GET /admin/get-all-users.
 * The endpoint serves two "families" of accounts (local auth vs. Google
 * OAuth), so several fields are optional depending on how the account was
 * provisioned. Every field is treated defensively in the UI.
 *
 * NOTE: `role` is typed as `string` rather than the strict `UserRole` union.
 * The TypeScript union was a lie the API didn't honor at runtime (different
 * casing, or values outside the three known roles) — widening the type here
 * forces every call site to go through `normalizeRole()` instead of trusting
 * a compile-time guarantee the server doesn't actually provide.
 */
interface ApiUser {
    _id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    isActive: boolean;
    isVerified?: boolean;
    googleId?: string;
    authProviderId?: string;
    phone_number?: string;
    dob?: string | null;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

interface GetAllUsersResponse {
    success: boolean;
    users: ApiUser[];
}

type FilterKey = "all" | "admin" | "publisher" | "reader" | "verified";
type FetchStatus = "loading" | "success" | "error";
type PageToken = number | "ellipsis";

/* =============================================================================
 * Constants & static configuration
 * ========================================================================== */

const USERS_ENDPOINT = "/admin/get-all-users";
const PAGE_SIZE_OPTIONS = [10, 25] as const;
const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZE_OPTIONS)[number] = 10;

const ROLE_CONFIG: Record<
    UserRole,
    { label: string; icon: typeof ShieldCheck; badgeClass: string; iconClass: string }
> = {
    ADMIN: {
        label: "Admin",
        icon: ShieldCheck,
        badgeClass: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
        iconClass: "text-indigo-500",
    },
    PUBLISHER: {
        label: "Publisher",
        icon: PenSquare,
        badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
        iconClass: "text-amber-500",
    },
    READER: {
        label: "Reader",
        icon: BookOpenText,
        badgeClass: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
        iconClass: "text-slate-500",
    },
};

/**
 * Fallback config for any role value that doesn't normalize to one of the
 * three known roles. Rendering this instead of crashing means a bad/unknown
 * role from the API becomes a visible, debuggable badge in the UI rather
 * than a blank screen.
 */
const UNKNOWN_ROLE_CONFIG = {
    label: "Unknown role",
    icon: ShieldQuestion,
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    iconClass: "text-rose-500",
};

/** Deterministic avatar palette so the same user always renders the same color. */
const AVATAR_PALETTE: Array<{ bg: string; text: string }> = [
    { bg: "bg-slate-900", text: "text-white" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
    { bg: "bg-amber-100", text: "text-amber-800" },
    { bg: "bg-violet-100", text: "text-violet-700" },
    { bg: "bg-slate-100", text: "text-slate-600" },
];

/* =============================================================================
 * Small pure helpers
 * ========================================================================== */

function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(" ");
}

/**
 * Normalizes any raw `role` value coming off the wire into a known
 * `UserRole`, or `null` if it can't be recognized. Case-insensitive and
 * tolerant of surrounding whitespace, `null`/`undefined`, and non-string
 * values — this is the single source of truth every role comparison in the
 * component should go through, instead of comparing raw strings directly.
 */
function normalizeRole(role: unknown): UserRole | null {
    if (typeof role !== "string") return null;
    const upper = role.trim().toUpperCase();
    return upper === "ADMIN" || upper === "PUBLISHER" || upper === "READER" ? (upper as UserRole) : null;
}

/** Looks up display config for a raw role value, falling back to the "unknown" config. */
function getRoleConfig(role: unknown): { label: string; icon: typeof ShieldCheck; badgeClass: string; iconClass: string } {
    const normalized = normalizeRole(role);
    return normalized ? ROLE_CONFIG[normalized] : UNKNOWN_ROLE_CONFIG;
}

/** "Divyesh Moraniya" -> "DM" · "theevidence" -> "TH" */
function getInitials(name: string): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Stable index into AVATAR_PALETTE derived from the user's immutable id. */
function paletteFor(id: string): { bg: string; text: string } {
    let hash = 0;
    const safeId = id ?? "";
    for (let i = 0; i < safeId.length; i += 1) {
        hash = (hash * 31 + safeId.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Formats an ISO timestamp into UTC date + time strings, matching the design. */
function formatUtc(iso: string | null | undefined): { date: string; time: string } {
    if (!iso) return { date: "—", time: "" };
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return { date: "—", time: "" };

    const date = parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    });
    const time = `${parsed.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    })} UTC`;

    return { date, time };
}

function formatDobOnly(iso: string | null | undefined): string {
    if (!iso) return "Not provided";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "Not provided";
    return parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

/**
 * Builds a windowed page-number sequence for the pagination control, e.g.
 * for page 6 of 20 -> [1, "ellipsis", 5, 6, 7, "ellipsis", 20]. Falls back to
 * a plain sequential list when there are few enough pages to show them all.
 */
function getPageWindow(current: number, total: number): PageToken[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: PageToken[] = [1];

    if (current > 3) pages.push("ellipsis");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let page = start; page <= end; page += 1) pages.push(page);

    if (current < total - 2) pages.push("ellipsis");

    pages.push(total);

    return pages;
}

/* =============================================================================
 * Data hook
 * ========================================================================== */

function useAdminUsers() {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [status, setStatus] = useState<FetchStatus>("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const reload = useCallback(() => setReloadToken((token) => token + 1), []);

    useEffect(() => {
        const controller = new AbortController();

        setStatus("loading");
        setErrorMessage(null);

        apiClient
            .get<GetAllUsersResponse>(USERS_ENDPOINT, { signal: controller.signal })
            .then((response) => {
                if (!response.data?.success || !Array.isArray(response.data.users)) {
                    throw new Error("The server responded without a valid user list.");
                }
                setUsers(response.data.users);
                setStatus("success");
            })
            .catch((error: unknown) => {
                if (axios.isCancel(error) || controller.signal.aborted) return;

                const message =
                    (axios.isAxiosError(error) &&
                        (error.response?.data as { message?: string } | undefined)?.message) ||
                    (error instanceof Error ? error.message : undefined) ||
                    "Unable to load the user directory. Please try again.";

                setStatus("error");
                setErrorMessage(message);
            });

        return () => controller.abort();
    }, [reloadToken]);

    return { users, status, errorMessage, reload };
}

/* =============================================================================
 * Presentational primitives
 * ========================================================================== */

function Avatar({
    name,
    avatar,
    seed,
    size = "md",
}: {
    name: string;
    avatar?: string;
    seed: string;
    size?: "sm" | "md" | "lg";
}) {
    const [imageFailed, setImageFailed] = useState(false);
    const palette = paletteFor(seed);

    const sizeClass =
        size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

    if (avatar && !imageFailed) {
        return (
            <img
                src={avatar}
                alt=""
                aria-hidden="true"
                onError={() => setImageFailed(true)}
                className={cn(sizeClass, "shrink-0 rounded-xl object-cover ring-1 ring-black/5")}
            />
        );
    }

    return (
        <div
            aria-hidden="true"
            className={cn(
                sizeClass,
                palette.bg,
                palette.text,
                "flex shrink-0 items-center justify-center rounded-xl font-semibold",
            )}
        >
            {getInitials(name)}
        </div>
    );
}

/**
 * `role` is intentionally typed as `unknown` here (not `UserRole`) — it is
 * rendered directly from the API payload and must never assume the value
 * matches one of the known roles. `getRoleConfig` handles normalization and
 * always returns a renderable config, so this component can never throw on
 * an unexpected role.
 */
function RoleBadge({ role }: { role: unknown }) {
    const config = getRoleConfig(role);
    const Icon = config.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                config.badgeClass,
            )}
        >
            <Icon className={cn("h-3.5 w-3.5", config.iconClass)} aria-hidden="true" />
            {config.label}
        </span>
    );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                isActive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
            )}
        >
            <span
                className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")}
                aria-hidden="true"
            />
            {isActive ? "Active" : "Inactive"}
        </span>
    );
}

function VerificationBadge({ isVerified }: { isVerified: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                isVerified
                    ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                    : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
            )}
        >
            {isVerified ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isVerified ? "Verified" : "Pending"}
        </span>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    iconWrapperClass,
    iconClass,
    footer,
}: {
    label: string;
    value: ReactNode;
    icon: typeof UsersIcon;
    iconWrapperClass: string;
    iconClass: string;
    footer: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                </span>
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconWrapperClass)}>
                    {/* h-4.5/w-4.5 is not a valid Tailwind spacing step (scale jumps 3.5 -> 4 -> 5),
                        so it silently rendered at the browser default icon size. Using an arbitrary
                        value keeps the intended 18px icon. */}
                    <Icon className={cn("h-[18px] w-[18px]", iconClass)} aria-hidden="true" />
                </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">{footer}</div>
        </div>
    );
}

function FilterPill({
    label,
    count,
    isActive,
    onClick,
    icon: Icon,
    className,
}: {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    icon?: typeof CheckCircle2;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isActive}
            className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                className,
            )}
        >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {label}
            <span
                className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-white text-slate-500",
                )}
            >
                {count}
            </span>
        </button>
    );
}

/* =============================================================================
 * Pagination control (shared between the desktop table and mobile list)
 * ========================================================================== */

function PaginationBar({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    rangeStart,
    rangeEnd,
    onPageChange,
    onPageSizeChange,
}: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    rangeStart: number;
    rangeEnd: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}) {
    const pageTokens = useMemo(() => getPageWindow(currentPage, totalPages), [currentPage, totalPages]);

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
                <span className="text-xs text-slate-500 sm:text-sm">
                    {totalItems === 0
                        ? "No results"
                        : `Showing ${rangeStart}\u2013${rangeEnd} of ${totalItems}`}
                </span>

                <label className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                        aria-label="Rows per page"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size} / page
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="flex items-center justify-center gap-1 sm:justify-end">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1">
                    {pageTokens.map((token, index) =>
                        token === "ellipsis" ? (
                            <span
                                key={`ellipsis-${index}`}
                                className="flex h-8 w-8 items-center justify-center text-sm text-slate-400"
                            >
                                &#8230;
                            </span>
                        ) : (
                            <button
                                key={token}
                                type="button"
                                onClick={() => onPageChange(token)}
                                aria-current={token === currentPage ? "page" : undefined}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                                    token === currentPage
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-600 hover:bg-slate-100",
                                )}
                            >
                                {token}
                            </button>
                        ),
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

/* =============================================================================
 * Table row (desktop) & Card (mobile)
 * ========================================================================== */

function InteractiveRow({
    onOpen,
    children,
    className,
    ariaLabel,
}: {
    onOpen: () => void;
    children: ReactNode;
    className?: string;
    ariaLabel: string;
}) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            onClick={onOpen}
            onKeyDown={handleKeyDown}
            className={cn(
                "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                className,
            )}
        >
            {children}
        </div>
    );
}

const DesktopUserRow = memo(function DesktopUserRow({
    user,
    onSelect,
}: {
    user: ApiUser;
    onSelect: (user: ApiUser) => void;
}) {
    const memberSince = formatUtc(user.createdAt);
    const lastActive = formatUtc(user.updatedAt);

    return (
        <InteractiveRow
            onOpen={() => onSelect(user)}
            ariaLabel={`View details for ${user.name}`}
            className="grid grid-cols-[2.2fr_0.9fr_1fr_1fr_1fr_1fr] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0 hover:bg-slate-50"
        >
            <div className="flex min-w-0 items-center gap-3">
                <Avatar name={user.name} avatar={user.avatar} seed={user._id} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
            </div>

            <div>
                <RoleBadge role={user.role} />
            </div>

            <div>
                <StatusBadge isActive={user.isActive} />
            </div>

            <div>
                <VerificationBadge isVerified={Boolean(user.isVerified)} />
            </div>

            <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{memberSince.date}</p>
                <p className="text-xs text-slate-400">{memberSince.time}</p>
            </div>

            <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{lastActive.date}</p>
                <p className="text-xs text-slate-400">{lastActive.time}</p>
            </div>
        </InteractiveRow>
    );
});

const MobileUserCard = memo(function MobileUserCard({
    user,
    onSelect,
}: {
    user: ApiUser;
    onSelect: (user: ApiUser) => void;
}) {
    const memberSince = formatUtc(user.createdAt);
    const lastActive = formatUtc(user.updatedAt);

    return (
        <InteractiveRow
            onOpen={() => onSelect(user)}
            ariaLabel={`View details for ${user.name}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={user.name} avatar={user.avatar} seed={user._id} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                </div>
                <RoleBadge role={user.role} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge isActive={user.isActive} />
                <VerificationBadge isVerified={Boolean(user.isVerified)} />
            </div>

            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Joined
                    </span>
                    <span className="font-medium text-slate-700">{memberSince.date}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" aria-hidden="true" /> Last updated
                    </span>
                    <span className="font-medium text-slate-700">{lastActive.date}</span>
                </div>
            </div>
        </InteractiveRow>
    );
});

/* =============================================================================
 * Detail row used inside the modal
 * ========================================================================== */

function DetailRow({
    icon: Icon,
    label,
    value,
    copyable,
}: {
    icon: typeof Mail;
    label: string;
    value: ReactNode;
    copyable?: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!copyable) return;
        try {
            await navigator.clipboard.writeText(copyable);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard access can be denied by the browser; fail silently.
        }
    };

    return (
        <div className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                    <div className="mt-0.5 break-all text-sm font-medium text-slate-800">{value}</div>
                </div>
            </div>

            {copyable ? (
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={`Copy ${label.toLowerCase()}`}
                    className="mt-1 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                </button>
            ) : null}
        </div>
    );
}

/* =============================================================================
 * User detail modal
 * ========================================================================== */

function UserDetailModal({
    user,
    onOpenChange,
}: {
    user: ApiUser | null;
    onOpenChange: (open: boolean) => void;
}) {
    const isOpen = user !== null;
    const memberSince = user ? formatUtc(user.createdAt) : null;
    const lastActive = user ? formatUtc(user.updatedAt) : null;
    const authProvider = user?.googleId ? "Google" : user?.authProviderId ? "Direct sign-up" : "Unknown";

    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
                <Dialog.Content
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-0 shadow-xl focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
                    aria-describedby={undefined}
                >
                    {user ? (
                        <>
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <Avatar name={user.name} avatar={user.avatar} seed={user._id} size="lg" />
                                    <div className="min-w-0">
                                        <Dialog.Title className="truncate text-base font-bold text-slate-900">
                                            {user.name}
                                        </Dialog.Title>
                                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <Dialog.Close
                                    aria-label="Close"
                                    className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                >
                                    <X className="h-[18px] w-[18px]" aria-hidden="true" />
                                </Dialog.Close>
                            </div>

                            <div className="px-6 py-2">
                                <div className="flex flex-wrap items-center gap-2 py-3">
                                    <RoleBadge role={user.role} />
                                    <StatusBadge isActive={user.isActive} />
                                    <VerificationBadge isVerified={Boolean(user.isVerified)} />
                                </div>

                                <div className="divide-y divide-slate-100">
                                    <DetailRow icon={Mail} label="Email address" value={user.email} copyable={user.email} />

                                    <DetailRow
                                        icon={Fingerprint}
                                        label="User ID"
                                        value={<span className="font-mono text-xs uppercase">{user._id}</span>}
                                        copyable={user._id}
                                    />

                                    {user.googleId ? (
                                        <DetailRow
                                            icon={KeyRound}
                                            label="Google account ID"
                                            value={<span className="font-mono text-xs uppercase">{user.googleId}</span>}
                                            copyable={user.googleId}
                                        />
                                    ) : null}

                                    {user.authProviderId ? (
                                        <DetailRow
                                            icon={KeyRound}
                                            label="Auth provider ID"
                                            value={<span className="font-mono text-xs">{user.authProviderId}</span>}
                                            copyable={user.authProviderId}
                                        />
                                    ) : null}

                                    <DetailRow icon={ShieldQuestion} label="Sign-in method" value={authProvider} />

                                    <DetailRow
                                        icon={Phone}
                                        label="Phone number"
                                        value={user.phone_number && user.phone_number.length > 0 ? user.phone_number : "Not provided"}
                                    />

                                    <DetailRow icon={CakeSlice} label="Date of birth" value={formatDobOnly(user.dob)} />

                                    <DetailRow
                                        icon={Calendar}
                                        label="Member since"
                                        value={
                                            memberSince ? (
                                                <span>
                                                    {memberSince.date}{" "}
                                                    <span className="text-slate-400">· {memberSince.time}</span>
                                                </span>
                                            ) : (
                                                "—"
                                            )
                                        }
                                    />

                                    <DetailRow
                                        icon={History}
                                        label="Last active"
                                        value={
                                            lastActive ? (
                                                <span>
                                                    {lastActive.date} <span className="text-slate-400">· {lastActive.time}</span>
                                                </span>
                                            ) : (
                                                "—"
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                                    >
                                        Close
                                    </button>
                                </Dialog.Close>
                            </div>
                        </>
                    ) : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* =============================================================================
 * Loading / error / empty states
 * ========================================================================== */

function StatSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-14 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
        </div>
    );
}

function RowSkeleton() {
    return (
        <div className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0">
            <div className="h-11 w-11 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded bg-slate-200" />
                <div className="h-3 w-56 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded-lg bg-slate-100" />
            <div className="h-6 w-20 rounded-lg bg-slate-100" />
        </div>
    );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                <div>
                    <p className="text-sm font-semibold text-red-800">Couldn't load the user directory</p>
                    <p className="text-sm text-red-600">{message}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onRetry}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-100"
            >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
            </button>
        </div>
    );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">No matching accounts</p>
            <p className="max-w-xs text-sm text-slate-500">
                {hasQuery
                    ? "No users match your search and filter combination. Try clearing the search or choosing a different filter."
                    : "There are no registered users in this category yet."}
            </p>
        </div>
    );
}

/* =============================================================================
 * Root component
 * ========================================================================== */

export default function UsersList() {
    const { users, status, errorMessage, reload } = useAdminUsers();
    const [query, setQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
    const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => u.isActive).length;
        // Role comparisons go through normalizeRole() so casing differences
        // or unexpected values from the API don't silently drop users out of
        // every role-based count.
        const admins = users.filter((u) => normalizeRole(u.role) === "ADMIN").length;
        const publishers = users.filter((u) => normalizeRole(u.role) === "PUBLISHER").length;
        const readers = users.filter((u) => normalizeRole(u.role) === "READER").length;
        const verified = users.filter((u) => u.isVerified === true).length;

        return {
            total,
            active,
            admins,
            publishers,
            readers,
            verified,
            suspended: total - active,
            scopedTier: publishers + readers,
            activePercent: total === 0 ? 0 : Math.round((active / total) * 100),
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        let list = users;

        if (activeFilter === "admin") list = list.filter((u) => normalizeRole(u.role) === "ADMIN");
        else if (activeFilter === "publisher") list = list.filter((u) => normalizeRole(u.role) === "PUBLISHER");
        else if (activeFilter === "reader") list = list.filter((u) => normalizeRole(u.role) === "READER");
        else if (activeFilter === "verified") list = list.filter((u) => u.isVerified === true);

        const trimmedQuery = query.trim().toLowerCase();
        if (trimmedQuery.length > 0) {
            list = list.filter(
                (u) =>
                    (u.name ?? "").toLowerCase().includes(trimmedQuery) ||
                    (u.email ?? "").toLowerCase().includes(trimmedQuery),
            );
        }

        return list;
    }, [users, activeFilter, query]);

    // Reset back to page 1 whenever the underlying result set changes shape,
    // so the user never lands on a stale, now out-of-range page.
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, query, pageSize]);

    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedUsers = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredUsers.slice(startIndex, startIndex + pageSize);
    }, [filteredUsers, safeCurrentPage, pageSize]);

    const rangeStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const rangeEnd = Math.min(safeCurrentPage * pageSize, totalItems);

    const handlePageChange = useCallback(
        (page: number) => {
            setCurrentPage(Math.min(Math.max(page, 1), totalPages));
        },
        [totalPages],
    );

    const handlePageSizeChange = useCallback((size: number) => {
        setPageSize(size);
    }, []);

    const filters: Array<{
        key: FilterKey;
        label: string;
        count: number;
        icon?: typeof CheckCircle2;
        className?: string;
    }> = [
            { key: "all", label: "All Accounts", count: stats.total },
            { key: "admin", label: "Admins", count: stats.admins },
            { key: "publisher", label: "Publishers", count: stats.publishers },
            { key: "reader", label: "Readers", count: stats.readers },
            { key: "verified", label: "Verified", count: stats.verified, icon: CheckCircle2, className: "hidden md:inline-flex" },
        ];

    const isLoading = status === "loading";
    const isError = status === "error";
    const hasActiveQueryOrFilter = query.trim().length > 0 || activeFilter !== "all";

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                {/* ---------------------------------------------------------------- */}
                {/* Header                                                          */}
                {/* ---------------------------------------------------------------- */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory</h1>
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                {stats.total} Members
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            View-only inspection of registered team accounts, role privileges, and activity status.
                        </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                        <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        Read-Only View
                    </span>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Error state                                                     */}
                {/* ---------------------------------------------------------------- */}
                {isError ? <ErrorBanner message={errorMessage ?? "Something went wrong."} onRetry={reload} /> : null}

                {/* ---------------------------------------------------------------- */}
                {/* KPI stat cards                                                  */}
                {/* ---------------------------------------------------------------- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {isLoading ? (
                        <>
                            <StatSkeleton />
                            <StatSkeleton />
                            <StatSkeleton />
                            <div className="hidden lg:block">
                                <StatSkeleton />
                            </div>
                        </>
                    ) : (
                        <>
                            <StatCard
                                label="Total Accounts"
                                value={stats.total}
                                icon={UsersIcon}
                                iconWrapperClass="bg-slate-100"
                                iconClass="text-slate-600"
                                footer={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                        Complete organization roster
                                    </span>
                                }
                            />

                            <StatCard
                                label="Active Users"
                                value={
                                    <>
                                        {stats.active}
                                        <span className="ml-2 align-middle text-sm font-semibold text-emerald-600">
                                            {stats.activePercent}% Active
                                        </span>
                                    </>
                                }
                                icon={CheckCircle2}
                                iconWrapperClass="bg-emerald-50"
                                iconClass="text-emerald-600"
                                footer={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {stats.suspended} suspended or deactivated
                                    </span>
                                }
                            />

                            <StatCard
                                label="Administrators"
                                value={stats.admins}
                                icon={ShieldCheck}
                                iconWrapperClass="bg-indigo-50"
                                iconClass="text-indigo-600"
                                footer={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                        with elevated rights
                                    </span>
                                }
                            />

                            <div className="hidden lg:block">
                                <StatCard
                                    label="Publishers & Readers"
                                    value={
                                        <span className="text-2xl">
                                            {stats.publishers}
                                            <span className="mx-1 text-base font-medium text-slate-400">Publisher</span>·{" "}
                                            {stats.readers}
                                            <span className="ml-1 text-base font-medium text-slate-400">Reader</span>
                                        </span>
                                    }
                                    icon={PenSquare}
                                    iconWrapperClass="bg-amber-50"
                                    iconClass="text-amber-600"
                                    footer={
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            {stats.scopedTier} scoped tier members
                                        </span>
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Filters + search                                                */}
                {/* ---------------------------------------------------------------- */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {filters.map((filter) => (
                            <FilterPill
                                key={filter.key}
                                label={filter.label}
                                count={filter.count}
                                icon={filter.icon}
                                className={filter.className}
                                isActive={activeFilter === filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                            />
                        ))}
                    </div>

                    <div className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search by name or email..."
                            aria-label="Search users by name or email"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Desktop table                                                   */}
                {/* ---------------------------------------------------------------- */}
                <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                    <div className="grid grid-cols-[2.2fr_0.9fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>User Profile</span>
                        <span>Role</span>
                        <span>Account Status</span>
                        <span>Verification</span>
                        <span className="text-right">Member Since</span>
                        <span className="text-right">Last Active</span>
                    </div>

                    {isLoading ? (
                        <>
                            <RowSkeleton />
                            <RowSkeleton />
                            <RowSkeleton />
                            <RowSkeleton />
                        </>
                    ) : paginatedUsers.length === 0 ? (
                        <EmptyState hasQuery={hasActiveQueryOrFilter} />
                    ) : (
                        paginatedUsers.map((user) => (
                            <DesktopUserRow key={user._id} user={user} onSelect={setSelectedUser} />
                        ))
                    )}

                    {!isLoading && totalItems > 0 ? (
                        <PaginationBar
                            currentPage={safeCurrentPage}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            totalItems={totalItems}
                            rangeStart={rangeStart}
                            rangeEnd={rangeEnd}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    ) : null}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Mobile card list                                                */}
                {/* ---------------------------------------------------------------- */}
                <div className="flex flex-col gap-3 md:hidden">
                    {isLoading ? (
                        <>
                            <StatSkeleton />
                            <StatSkeleton />
                        </>
                    ) : paginatedUsers.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white">
                            <EmptyState hasQuery={hasActiveQueryOrFilter} />
                        </div>
                    ) : (
                        paginatedUsers.map((user) => (
                            <MobileUserCard key={user._id} user={user} onSelect={setSelectedUser} />
                        ))
                    )}

                    {!isLoading && totalItems > 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white">
                            <PaginationBar
                                currentPage={safeCurrentPage}
                                totalPages={totalPages}
                                pageSize={pageSize}
                                totalItems={totalItems}
                                rangeStart={rangeStart}
                                rangeEnd={rangeEnd}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>
                    ) : null}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Footnote (desktop only)                                         */}
                {/* ---------------------------------------------------------------- */}
                <div className="hidden items-center justify-between text-xs text-slate-400 md:flex">
                    <span>Directory reflects verified authentication records synchronized across all active organizations.</span>
                    <span>System Timestamp · UTC Standard</span>
                </div>
            </div>

            <UserDetailModal user={selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} />
        </div>
    );
}

/* =============================================================================
 * Change log (this pass)
 * -----------------------------------------------------------------------------
 * 1. CRASH FIX: RoleBadge threw "Cannot read properties of undefined (reading
 *    'icon')" whenever `user.role` wasn't an exact match for "ADMIN" |
 *    "PUBLISHER" | "READER" (wrong casing, null, or an unrecognized role from
 *    the API). Added `normalizeRole()` + `getRoleConfig()` and an
 *    UNKNOWN_ROLE_CONFIG fallback so any role value renders a badge instead
 *    of throwing.
 * 2. `ApiUser.role` widened from the strict `UserRole` union to `string`,
 *    since the compile-time type was not something the API actually
 *    guaranteed at runtime.
 * 3. Role-based stat counts and role filter pills (`admin`/`publisher`/
 *    `reader`) now compare through `normalizeRole()` too, so casing
 *    mismatches no longer silently under-count or mis-bucket users the way
 *    a raw `u.role === "ADMIN"` comparison did.
 * 4. `getInitials` / `paletteFor` guarded against a missing `name` / `_id`
 *    (`(name ?? "")`, `id ?? ""`) so a record missing those fields can't
 *    throw on `.trim()` / `.charCodeAt`.
 * 5. Search filter guarded `u.name` / `u.email` with `?? ""` before
 *    `.toLowerCase()` for the same reason.
 * 6. Fixed `h-4.5 w-4.5` (not a real Tailwind spacing step — the scale jumps
 *    3.5 → 4 → 5) to `h-[18px] w-[18px]` in StatCard's icon and the modal's
 *    close button, so those icons render at the intended size instead of
 *    falling back to default sizing.
 * ========================================================================== */