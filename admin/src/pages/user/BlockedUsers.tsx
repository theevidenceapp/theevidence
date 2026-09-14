/**
 * BlockedUsers.tsx
 * -----------------------------------------------------------------------------
 * Admin Console — Access Control (Block / Unblock Users)
 *
 * Companion screen to the existing User Directory (`UsersList.tsx`). It is
 * intentionally built on the same visual language, layout grid, sidebar
 * width assumptions, and interaction patterns as that screen, so the two
 * feel like one product rather than two separately designed pages:
 *   - Desktop: KPI cards, a segmented "All Users / Blocked Users" tab
 *     control, filter pills, and a paginated data table with an inline
 *     Block/Unblock action per row.
 *   - Mobile:  the same information re-flowed into a stacked card list.
 * Selecting any user (row or card) opens an accessible, read-only profile
 * modal. Blocking or unblocking an account always goes through a dedicated,
 * two-step confirmation dialog, whether it was triggered from the table,
 * the card list, or the profile modal — there is exactly one code path for
 * the action, so behavior can never drift between entry points.
 *
 * Data sources
 * -----------------------------------------------------------------------------
 * GET  /admin/get-all-users   (via the shared, token-refreshing `apiClient`)
 * GET  /get-blocked-users     (dedicated feed backing the "Blocked Users" tab)
 * POST /block/:email          (block; no request body)
 * POST /unblock/:email        (unblock; no request body)
 *
 * INTEGRATION NOTE ON THE LAST TWO ENDPOINTS: the controllers provided for
 * this feature (`BlockUser`, `unblockUser`) don't pin down an HTTP verb or a
 * mount path in the router itself. This file assumes they are mounted at
 * the paths above and issued as POST, matching the convention already used
 * by the sibling role-update endpoint in this codebase
 * (`POST /admin/user/role/:userId`). If your router instead mounts these
 * under `/admin`, or expects `PATCH`, update `BLOCK_USER_ENDPOINT` /
 * `UNBLOCK_USER_ENDPOINT` and the two `apiClient.post(...)` calls below —
 * everything else is agnostic to that choice.
 *
 * SECURITY NOTE FOR THE BACKEND TEAM: `getAllUsers` excludes `accessToken`
 * via `.select("-accessToken")`, but `getBlockedUsers` does not. This file
 * never reads or renders that field, so it poses no risk to this UI, but
 * the same projection should probably be applied to `getBlockedUsers` for
 * defense in depth.
 *
 * Access-control safeguard
 * -----------------------------------------------------------------------------
 * Accounts whose role is ADMIN cannot be blocked from this screen — the
 * action control renders a disabled "Protected" pill instead of a Block
 * button. This mirrors the equivalent ADMIN safeguard in the User Directory
 * (where ADMIN accounts can't have their role changed in-console) and
 * exists for the same reason: prevent an admin from being locked out, or
 * another admin's access from being revoked, by a casual click in a list.
 * This is a client-side UX guard, not a substitute for server-side
 * authorization — the server remains the source of truth.
 *
 * Integration notes
 * -----------------------------------------------------------------------------
 * 1. `apiClient` is imported from "@/api/api-client" — adjust if your alias
 *    or folder layout differs.
 * 2. Requires `lucide-react` and `@radix-ui/react-dialog` as dependencies:
 *      npm install lucide-react @radix-ui/react-dialog
 * 3. Written against Tailwind CSS utility classes; no custom CSS required.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { memo } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import * as Dialog from '@radix-ui/react-dialog';
import {
    Search,
    Users as UsersIcon,
    CheckCircle2,
    ShieldCheck,
    ShieldAlert,
    PenSquare,
    BookOpenText,
    FilePenLine,
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
    Loader2,
    Lock,
    Ban,
    Unlock,
    BadgeCheck,
    ShieldOff,
} from 'lucide-react';

// NOTE: adjust this import to match your project's folder structure.
import { apiClient } from '@/api/api-client';
import useTitle from '@/hooks/useTitle';
import { toast } from '@/components/ui/toast';

/* =============================================================================
 * Types
 * ========================================================================== */

type UserRole = 'ADMIN' | 'PUBLISHER' | 'READER' | 'EDITOR';

/**
 * Shape of a single user record as returned by GET /admin/get-all-users,
 * GET /get-blocked-users, POST /block/:email, and POST /unblock/:email.
 * Kept intentionally identical to the User Directory's `ApiUser` so records
 * can move between the two screens' state without any mapping step.
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

interface GetBlockedUsersResponse {
    success: boolean;
    /** Server-reported total. Informational only — the UI treats `users.length` as authoritative. */
    count?: number;
    users: ApiUser[];
}

/** Shared response contract for both POST /block/:email and POST /unblock/:email. */
interface BlockActionResponse {
    success: boolean;
    msg?: string;
    user?: ApiUser;
}

type TabKey = 'all' | 'blocked';
type FilterKey =
    | 'all'
    | 'admin'
    | 'publisher'
    | 'editor'
    | 'reader'
    | 'verified'
    | 'blocked';
type FetchStatus = 'loading' | 'success' | 'error';
type PageToken = number | 'ellipsis';
type ConfirmStage = 'review' | 'confirming' | 'saving' | 'error';

interface PendingAccessAction {
    user: ApiUser;
    type: 'block' | 'unblock';
}

/* =============================================================================
 * Constants & static configuration
 * ========================================================================== */

const ALL_USERS_ENDPOINT = '/admin/get-all-users';
const BLOCKED_USERS_ENDPOINT = '/admin/get-blocked-users';
const BLOCK_USER_ENDPOINT = '/admin/block';
const UNBLOCK_USER_ENDPOINT = '/admin/unblock';

const PAGE_SIZE_OPTIONS = [10, 25] as const;
const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZE_OPTIONS)[number] = 10;

const ROLE_CONFIG: Record<
    UserRole,
    {
        label: string;
        icon: typeof ShieldCheck;
        badgeClass: string;
        iconClass: string;
    }
> = {
    ADMIN: {
        label: 'Admin',
        icon: ShieldCheck,
        badgeClass:
            'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
        iconClass: 'text-indigo-500',
    },
    PUBLISHER: {
        label: 'Publisher',
        icon: PenSquare,
        badgeClass:
            'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
        iconClass: 'text-amber-500',
    },
    EDITOR: {
        label: 'Editor',
        icon: FilePenLine,
        badgeClass: 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
        iconClass: 'text-teal-500',
    },
    READER: {
        label: 'Reader',
        icon: BookOpenText,
        badgeClass:
            'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
        iconClass: 'text-slate-500',
    },
};

/** Fallback config for any role value that doesn't normalize to one of the known roles. */
const UNKNOWN_ROLE_CONFIG = {
    label: 'Unknown role',
    icon: ShieldQuestion,
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    iconClass: 'text-rose-500',
};

/** Deterministic avatar palette so the same user always renders the same color. */
const AVATAR_PALETTE: Array<{ bg: string; text: string }> = [
    { bg: 'bg-slate-900', text: 'text-white' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-amber-100', text: 'text-amber-800' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-slate-100', text: 'text-slate-600' },
];

/* =============================================================================
 * Small pure helpers
 * ========================================================================== */

function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Normalizes any raw `role` value coming off the wire into a known
 * `UserRole`, or `null` if it can't be recognized. Case-insensitive and
 * tolerant of surrounding whitespace and non-string values.
 */
function normalizeRole(role: unknown): UserRole | null {
    if (typeof role !== 'string') return null;
    const upper = role.trim().toUpperCase();
    return upper === 'ADMIN' ||
        upper === 'PUBLISHER' ||
        upper === 'READER' ||
        upper === 'EDITOR'
        ? (upper as UserRole)
        : null;
}

function getRoleConfig(role: unknown): {
    label: string;
    icon: typeof ShieldCheck;
    badgeClass: string;
    iconClass: string;
} {
    const normalized = normalizeRole(role);
    return normalized ? ROLE_CONFIG[normalized] : UNKNOWN_ROLE_CONFIG;
}

function getInitials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Stable index into AVATAR_PALETTE derived from the user's immutable id. */
function paletteFor(id: string): { bg: string; text: string } {
    let hash = 0;
    const safeId = id ?? '';
    for (let i = 0; i < safeId.length; i += 1) {
        hash = (hash * 31 + safeId.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Formats an ISO timestamp into UTC date + time strings. */
function formatUtc(iso: string | null | undefined): {
    date: string;
    time: string;
} {
    if (!iso) return { date: '—', time: '' };
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return { date: '—', time: '' };

    const date = parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    });
    const time = `${parsed.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    })} UTC`;

    return { date, time };
}

function formatDobOnly(iso: string | null | undefined): string {
    if (!iso) return 'Not provided';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'Not provided';
    return parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * Builds a windowed page-number sequence for the pagination control, e.g.
 * for page 6 of 20 -> [1, "ellipsis", 5, 6, 7, "ellipsis", 20].
 */
function getPageWindow(current: number, total: number): PageToken[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: PageToken[] = [1];
    if (current > 3) pages.push('ellipsis');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let page = start; page <= end; page += 1) pages.push(page);

    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);

    return pages;
}

/**
 * Extracts a human-readable error message from a failed axios request.
 * The block/unblock endpoints report errors under `msg`, while the
 * directory endpoints use `message` — both are checked so error banners
 * read correctly regardless of which call failed.
 */
function extractErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | { message?: string; msg?: string }
            | undefined;
        const serverMessage = data?.message || data?.msg;
        if (serverMessage) return serverMessage;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

/* =============================================================================
 * Data hook
 * ========================================================================== */

/**
 * Owns both data feeds this screen needs — the full directory (for the "All
 * Users" tab and the always-visible KPI totals) and the dedicated blocked
 * list (for the "Blocked Users" tab) — plus the two mutations that act on
 * them.
 *
 * The two lists are fetched independently, but a successful block/unblock
 * updates both in place from the single server response, so the KPI cards,
 * both tabs, and the profile modal all reflect the change immediately
 * without a full reload. If the mutation response ever omits the updated
 * user (`response.data.user`), the blocked list is refetched as a fallback
 * so it can't silently drift out of sync.
 */
function useAccessControlUsers() {
    const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
    const [allStatus, setAllStatus] = useState<FetchStatus>('loading');
    const [allError, setAllError] = useState<string | null>(null);
    const [allReloadToken, setAllReloadToken] = useState(0);

    const [blockedUsers, setBlockedUsers] = useState<ApiUser[]>([]);
    const [blockedStatus, setBlockedStatus] = useState<FetchStatus>('loading');
    const [blockedError, setBlockedError] = useState<string | null>(null);
    const [blockedReloadToken, setBlockedReloadToken] = useState(0);

    const reloadAll = useCallback(() => setAllReloadToken((t) => t + 1), []);
    const reloadBlocked = useCallback(
        () => setBlockedReloadToken((t) => t + 1),
        [],
    );

    useEffect(() => {
        const controller = new AbortController();
        setAllStatus('loading');
        setAllError(null);

        apiClient
            .get<GetAllUsersResponse>(ALL_USERS_ENDPOINT, {
                signal: controller.signal,
            })
            .then((response) => {
                if (
                    !response.data?.success ||
                    !Array.isArray(response.data.users)
                ) {
                    throw new Error(
                        'The server responded without a valid user list.',
                    );
                }
                setAllUsers(response.data.users);
                setAllStatus('success');
            })
            .catch((error: unknown) => {
                if (axios.isCancel(error) || controller.signal.aborted) return;
                setAllStatus('error');
                setAllError(
                    extractErrorMessage(
                        error,
                        'Unable to load the user directory. Please try again.',
                    ),
                );
            });

        return () => controller.abort();
    }, [allReloadToken]);

    useEffect(() => {
        const controller = new AbortController();
        setBlockedStatus('loading');
        setBlockedError(null);

        apiClient
            .get<GetBlockedUsersResponse>(BLOCKED_USERS_ENDPOINT, {
                signal: controller.signal,
            })
            .then((response) => {
                if (
                    !response.data?.success ||
                    !Array.isArray(response.data.users)
                ) {
                    throw new Error(
                        'The server responded without a valid blocked-user list.',
                    );
                }
                setBlockedUsers(response.data.users);
                setBlockedStatus('success');
            })
            .catch((error: unknown) => {
                if (axios.isCancel(error) || controller.signal.aborted) return;
                setBlockedStatus('error');
                setBlockedError(
                    extractErrorMessage(
                        error,
                        'Unable to load blocked accounts. Please try again.',
                    ),
                );
            });

        return () => controller.abort();
    }, [blockedReloadToken]);

    /** POST /block/:email — see BLOCK_USER_ENDPOINT integration note at the top of this file. */
    const blockUserByEmail = useCallback(
        async (email: string): Promise<void> => {
            try {
                const response = await apiClient.put<BlockActionResponse>(
                    `${BLOCK_USER_ENDPOINT}/${email}`,
                );

                toast.add({
                    type: 'success',
                    description: 'User blocked successfully.'
                })

                if (!response.data?.success) {
                    throw new Error(
                        response.data?.msg || 'Failed to block this account.',
                    );
                }

                const serverUser = response.data.user;

                setAllUsers((prev) =>
                    prev.map((u) =>
                        u.email === email
                            ? { ...u, ...(serverUser ?? {}), isActive: false }
                            : u,
                    ),
                );
                setBlockedUsers((prev) => {
                    const alreadyListed = prev.some((u) => u.email === email);
                    if (alreadyListed) {
                        return prev.map((u) =>
                            u.email === email
                                ? { ...u, ...(serverUser ?? {}), isActive: false }
                                : u,
                        );
                    }
                    return serverUser
                        ? [{ ...serverUser, isActive: false }, ...prev]
                        : prev;
                });

                if (!serverUser) reloadBlocked();
            } catch (error) {
                toast.add({
                    type: 'error',
                    description: 'Failed to block this account. Please try again.'
                })
                throw new Error(
                    extractErrorMessage(
                        error,
                        'Failed to block this account. Please try again.',
                    ),
                );
            }
        },
        [reloadBlocked],
    );

    /** POST /unblock/:email — see UNBLOCK_USER_ENDPOINT integration note at the top of this file. */
    const unblockUserByEmail = useCallback(
        async (email: string): Promise<void> => {
            try {
                const response = await apiClient.put<BlockActionResponse>(
                    `${UNBLOCK_USER_ENDPOINT}/${email}`,
                );

                toast.add({
                    type: 'success',
                    description: 'User unblocked successfully.'
                })

                if (!response.data?.success) {
                    throw new Error(
                        response.data?.msg || 'Failed to unblock this account.',
                    );
                }

                const serverUser = response.data.user;

                setAllUsers((prev) =>
                    prev.map((u) =>
                        u.email === email
                            ? { ...u, ...(serverUser ?? {}), isActive: true }
                            : u,
                    ),
                );
                setBlockedUsers((prev) => prev.filter((u) => u.email !== email));
            } catch (error) {
                toast.add({
                    type: 'error',
                    description: 'Failed to unblock this account. Please try again.'
                })
                throw new Error(
                    extractErrorMessage(
                        error,
                        'Failed to unblock this account. Please try again.',
                    ),
                );
            }
        },
        [],
    );

    return {
        allUsers,
        allStatus,
        allError,
        reloadAll,
        blockedUsers,
        blockedStatus,
        blockedError,
        reloadBlocked,
        blockUserByEmail,
        unblockUserByEmail,
    };
}

/* =============================================================================
 * Presentational primitives
 * ========================================================================== */

function Avatar({
    name,
    avatar,
    seed,
    size = 'md',
}: {
    name: string;
    avatar?: string;
    seed: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const [imageFailed, setImageFailed] = useState(false);
    const palette = paletteFor(seed);

    const sizeClass =
        size === 'lg'
            ? 'h-16 w-16 text-lg'
            : size === 'sm'
                ? 'h-9 w-9 text-xs'
                : 'h-11 w-11 text-sm';

    if (avatar && !imageFailed) {
        return (
            <img
                src={avatar}
                alt=""
                aria-hidden="true"
                onError={() => setImageFailed(true)}
                className={cn(
                    sizeClass,
                    'shrink-0 rounded-xl object-cover ring-1 ring-black/5',
                )}
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
                'flex shrink-0 items-center justify-center rounded-xl font-semibold',
            )}
        >
            {getInitials(name)}
        </div>
    );
}

function RoleBadge({ role }: { role: unknown }) {
    const config = getRoleConfig(role);
    const Icon = config.icon;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
                config.badgeClass,
            )}
        >
            <Icon
                className={cn('h-3.5 w-3.5', config.iconClass)}
                aria-hidden="true"
            />
            {config.label}
        </span>
    );
}

/** Renders account access status. Framed as Active / Blocked, matching this screen's purpose. */
function AccessStatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
                isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
            )}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isActive ? 'bg-emerald-500' : 'bg-red-500',
                )}
                aria-hidden="true"
            />
            {isActive ? 'Active' : 'Blocked'}
        </span>
    );
}

function VerificationBadge({ isVerified }: { isVerified: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
                isVerified
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                    : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
            )}
        >
            {isVerified ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isVerified ? 'Verified' : 'Pending'}
        </span>
    );
}

/**
 * Inline Block / Unblock trigger. It never performs the mutation itself —
 * clicking it only *requests* the action via `onRequestBlock` /
 * `onRequestUnblock`, which the parent uses to open the shared
 * `ConfirmAccessDialog`. This keeps the one and only code path that can
 * actually call the API centralized in that dialog, regardless of whether
 * the click came from the table, the mobile card, or the profile modal.
 *
 * ADMIN accounts render a disabled "Protected" pill instead of a Block
 * button — see the "Access-control safeguard" note at the top of the file.
 */
function AccessActionButton({
    user,
    onRequestBlock,
    onRequestUnblock,
    fullWidth = false,
}: {
    user: ApiUser;
    onRequestBlock: (user: ApiUser) => void;
    onRequestUnblock: (user: ApiUser) => void;
    fullWidth?: boolean;
}) {
    const isBlocked = !user.isActive;
    const isProtectedAdmin = normalizeRole(user.role) === 'ADMIN';

    if (isProtectedAdmin && !isBlocked) {
        return (
            <span
                title="Administrator accounts are protected from being blocked here."
                className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400',
                    fullWidth && 'w-full',
                )}
            >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Protected
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                if (isBlocked) onRequestUnblock(user);
                else onRequestBlock(user);
            }}
            className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                isBlocked
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-500'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100 focus-visible:ring-red-500',
                fullWidth && 'w-full',
            )}
        >
            {isBlocked ? (
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isBlocked ? 'Unblock' : 'Block'}
        </button>
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
                <span
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        iconWrapperClass,
                    )}
                >
                    {/* h-[18px]/w-[18px] is an intentional arbitrary value: the
                        nearest Tailwind steps (h-4 / h-5) render visibly too
                        small or too large next to this card's 36px icon well. */}
                    <Icon
                        className={cn('h-[18px] w-[18px]', iconClass)}
                        aria-hidden="true"
                    />
                </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                    {value}
                </span>
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
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
                isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                className,
            )}
        >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {label}
            <span
                className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                    isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-500',
                )}
            >
                {count}
            </span>
        </button>
    );
}

/** Segmented control switching between the full directory and the dedicated blocked-accounts feed. */
function SectionTabs({
    active,
    counts,
    onChange,
}: {
    active: TabKey;
    counts: { all: number; blocked: number };
    onChange: (key: TabKey) => void;
}) {
    const tabs: Array<{ key: TabKey; label: string; count: number }> = [
        { key: 'all', label: 'All Users', count: counts.all },
        { key: 'blocked', label: 'Blocked Users', count: counts.blocked },
    ];

    return (
        <div
            role="tablist"
            aria-label="Account list"
            className="inline-flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto"
        >
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors sm:flex-none',
                        active === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700',
                    )}
                >
                    {tab.label}
                    <span
                        className={cn(
                            'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                            active === tab.key
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-500',
                        )}
                    >
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
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
    const pageTokens = useMemo(
        () => getPageWindow(currentPage, totalPages),
        [currentPage, totalPages],
    );

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
                <span className="text-xs text-slate-500 sm:text-sm">
                    {totalItems === 0
                        ? 'No results'
                        : `Showing ${rangeStart}\u2013${rangeEnd} of ${totalItems}`}
                </span>

                <label className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            onPageSizeChange(Number(event.target.value))
                        }
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
                        token === 'ellipsis' ? (
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
                                aria-current={
                                    token === currentPage ? 'page' : undefined
                                }
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                                    token === currentPage
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-100',
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
 * -----------------------------------------------------------------------------
 * Unlike the User Directory, each row here carries its own interactive
 * action button (Block/Unblock), not just a "view details" affordance. To
 * avoid nesting a <button> inside a whole-row <button> (an accessibility
 * anti-pattern, and one that would make the Block action also open the
 * profile modal via event bubbling), the profile cell itself is the click
 * target for "view details", and the action button lives in its own cell
 * with its own click handler.
 * ========================================================================== */

const DesktopUserRow = memo(function DesktopUserRow({
    user,
    onSelect,
    onRequestBlock,
    onRequestUnblock,
}: {
    user: ApiUser;
    onSelect: (user: ApiUser) => void;
    onRequestBlock: (user: ApiUser) => void;
    onRequestUnblock: (user: ApiUser) => void;
}) {
    const memberSince = formatUtc(user.createdAt);

    return (
        <div className="grid grid-cols-[2.2fr_0.9fr_1fr_1fr_1fr_0.9fr] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0 hover:bg-slate-50">
            <button
                type="button"
                onClick={() => onSelect(user)}
                aria-label={`View details for ${user.name}`}
                className="flex min-w-0 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                <Avatar name={user.name} avatar={user.avatar} seed={user._id} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                        {user.email}
                    </p>
                </div>
            </button>

            <div>
                <RoleBadge role={user.role} />
            </div>

            <div>
                <AccessStatusBadge isActive={user.isActive} />
            </div>

            <div>
                <VerificationBadge isVerified={Boolean(user.isVerified)} />
            </div>

            <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                    {memberSince.date}
                </p>
                <p className="text-xs text-slate-400">{memberSince.time}</p>
            </div>

            <div className="flex justify-end">
                <AccessActionButton
                    user={user}
                    onRequestBlock={onRequestBlock}
                    onRequestUnblock={onRequestUnblock}
                />
            </div>
        </div>
    );
});

const MobileUserCard = memo(function MobileUserCard({
    user,
    onSelect,
    onRequestBlock,
    onRequestUnblock,
}: {
    user: ApiUser;
    onSelect: (user: ApiUser) => void;
    onRequestBlock: (user: ApiUser) => void;
    onRequestUnblock: (user: ApiUser) => void;
}) {
    const memberSince = formatUtc(user.createdAt);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
                type="button"
                onClick={() => onSelect(user)}
                aria-label={`View details for ${user.name}`}
                className="flex w-full min-w-0 items-start justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                        name={user.name}
                        avatar={user.avatar}
                        seed={user._id}
                        size="sm"
                    />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            {user.email}
                        </p>
                    </div>
                </div>
                <RoleBadge role={user.role} />
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <AccessStatusBadge isActive={user.isActive} />
                <VerificationBadge isVerified={Boolean(user.isVerified)} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Joined
                </span>
                <span className="font-medium text-slate-700">
                    {memberSince.date}
                </span>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <AccessActionButton
                    user={user}
                    onRequestBlock={onRequestBlock}
                    onRequestUnblock={onRequestUnblock}
                    fullWidth
                />
            </div>
        </div>
    );
});

/* =============================================================================
 * Detail row used inside the profile modal
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
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {label}
                    </p>
                    <div className="mt-0.5 break-all text-sm font-medium text-slate-800">
                        {value}
                    </div>
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
                        <Check
                            className="h-3.5 w-3.5 text-emerald-500"
                            aria-hidden="true"
                        />
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
    onRequestBlock,
    onRequestUnblock,
}: {
    user: ApiUser | null;
    onOpenChange: (open: boolean) => void;
    onRequestBlock: (user: ApiUser) => void;
    onRequestUnblock: (user: ApiUser) => void;
}) {
    const isOpen = user !== null;
    const memberSince = user ? formatUtc(user.createdAt) : null;
    const lastActive = user ? formatUtc(user.updatedAt) : null;
    const authProvider = user?.googleId
        ? 'Google'
        : user?.authProviderId
            ? 'Direct sign-up'
            : 'Unknown';

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
                                    <Avatar
                                        name={user.name}
                                        avatar={user.avatar}
                                        seed={user._id}
                                        size="lg"
                                    />
                                    <div className="min-w-0">
                                        <Dialog.Title className="truncate text-base font-bold text-slate-900">
                                            {user.name}
                                        </Dialog.Title>
                                        <p className="truncate text-sm text-slate-500">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <Dialog.Close
                                    aria-label="Close"
                                    className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                >
                                    <X
                                        className="h-[18px] w-[18px]"
                                        aria-hidden="true"
                                    />
                                </Dialog.Close>
                            </div>

                            <div className="px-6 py-2">
                                <div className="flex flex-wrap items-center gap-2 py-3">
                                    <RoleBadge role={user.role} />
                                    <AccessStatusBadge isActive={user.isActive} />
                                    <VerificationBadge
                                        isVerified={Boolean(user.isVerified)}
                                    />
                                </div>

                                <div className="pb-4">
                                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                    user.isActive
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-red-50 text-red-600',
                                                )}
                                            >
                                                {user.isActive ? (
                                                    <ShieldCheck
                                                        className="h-4 w-4"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <ShieldOff
                                                        className="h-4 w-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    Account access
                                                </p>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    {user.isActive
                                                        ? 'This account can sign in normally'
                                                        : 'This account is currently blocked'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <AccessActionButton
                                                user={user}
                                                onRequestBlock={onRequestBlock}
                                                onRequestUnblock={onRequestUnblock}
                                                fullWidth
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100 border-t border-slate-100">
                                    <DetailRow
                                        icon={Mail}
                                        label="Email address"
                                        value={user.email}
                                        copyable={user.email}
                                    />

                                    <DetailRow
                                        icon={Fingerprint}
                                        label="User ID"
                                        value={
                                            <span className="font-mono text-xs uppercase">
                                                {user._id}
                                            </span>
                                        }
                                        copyable={user._id}
                                    />

                                    {user.googleId ? (
                                        <DetailRow
                                            icon={KeyRound}
                                            label="Google account ID"
                                            value={
                                                <span className="font-mono text-xs uppercase">
                                                    {user.googleId}
                                                </span>
                                            }
                                            copyable={user.googleId}
                                        />
                                    ) : null}

                                    {user.authProviderId ? (
                                        <DetailRow
                                            icon={KeyRound}
                                            label="Auth provider ID"
                                            value={
                                                <span className="font-mono text-xs">
                                                    {user.authProviderId}
                                                </span>
                                            }
                                            copyable={user.authProviderId}
                                        />
                                    ) : null}

                                    <DetailRow
                                        icon={ShieldQuestion}
                                        label="Sign-in method"
                                        value={authProvider}
                                    />

                                    <DetailRow
                                        icon={Phone}
                                        label="Phone number"
                                        value={
                                            user.phone_number &&
                                                user.phone_number.length > 0
                                                ? user.phone_number
                                                : 'Not provided'
                                        }
                                    />

                                    <DetailRow
                                        icon={CakeSlice}
                                        label="Date of birth"
                                        value={formatDobOnly(user.dob)}
                                    />

                                    <DetailRow
                                        icon={Calendar}
                                        label="Member since"
                                        value={
                                            memberSince ? (
                                                <span>
                                                    {memberSince.date}{' '}
                                                    <span className="text-slate-400">
                                                        · {memberSince.time}
                                                    </span>
                                                </span>
                                            ) : (
                                                '—'
                                            )
                                        }
                                    />

                                    <DetailRow
                                        icon={History}
                                        label="Last updated"
                                        value={
                                            lastActive ? (
                                                <span>
                                                    {lastActive.date}{' '}
                                                    <span className="text-slate-400">
                                                        · {lastActive.time}
                                                    </span>
                                                </span>
                                            ) : (
                                                '—'
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
 * Block / Unblock confirmation dialog
 * -----------------------------------------------------------------------------
 * The single place in this file that is allowed to call `blockUserByEmail`
 * or `unblockUserByEmail`. It requires two distinct, deliberate clicks
 * before the request fires:
 *   1. The initial "Block account" / "Unblock account" button moves the
 *      dialog into a `confirming` stage instead of acting immediately.
 *   2. Only a second click on the now-relabeled "Yes, block/unblock this
 *      account" button actually issues the request.
 * Clicking "Cancel" at any point closes the dialog without side effects.
 * Stacks above the profile modal (z-[60] vs. z-50) so it can be opened
 * from within that modal as well as directly from the table or card list.
 * ========================================================================== */

function ConfirmAccessDialog({
    pending,
    onOpenChange,
    onBlock,
    onUnblock,
}: {
    pending: PendingAccessAction | null;
    onOpenChange: (open: boolean) => void;
    onBlock: (email: string) => Promise<void>;
    onUnblock: (email: string) => Promise<void>;
}) {
    const isOpen = pending !== null;
    const [stage, setStage] = useState<ConfirmStage>('review');
    const [errorText, setErrorText] = useState<string | null>(null);

    // Reset internal state every time a different action is requested, so a
    // stale "confirming"/"error" state can never leak into the next dialog.
    useEffect(() => {
        setStage('review');
        setErrorText(null);
    }, [pending?.user._id, pending?.type]);

    const isBlockAction = pending?.type === 'block';
    const isSaving = stage === 'saving';

    const handlePrimaryClick = async () => {
        if (!pending) return;

        if (stage === 'review') {
            setStage('confirming');
            return;
        }

        setStage('saving');
        setErrorText(null);
        try {
            if (isBlockAction) {
                await onBlock(pending.user.email);
            } else {
                await onUnblock(pending.user.email);
            }
            onOpenChange(false);
        } catch (error) {
            setStage('error');
            setErrorText(
                error instanceof Error
                    ? error.message
                    : `Failed to ${isBlockAction ? 'block' : 'unblock'} this account.`,
            );
        }
    };

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !isSaving) onOpenChange(false);
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
                <Dialog.Content
                    className="fixed inset-x-4 top-1/2 z-[60] -translate-y-1/2 rounded-2xl bg-white p-0 shadow-xl focus:outline-none sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2"
                    aria-describedby={undefined}
                    onEscapeKeyDown={(event) => {
                        if (isSaving) event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                        if (isSaving) event.preventDefault();
                    }}
                >
                    {pending ? (
                        <>
                            <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                        isBlockAction
                                            ? 'bg-red-50 text-red-600'
                                            : 'bg-emerald-50 text-emerald-600',
                                    )}
                                >
                                    {isBlockAction ? (
                                        <Ban className="h-5 w-5" aria-hidden="true" />
                                    ) : (
                                        <Unlock
                                            className="h-5 w-5"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <Dialog.Title className="text-base font-bold text-slate-900">
                                        {isBlockAction
                                            ? 'Block this account?'
                                            : 'Unblock this account?'}
                                    </Dialog.Title>
                                    <p className="mt-0.5 truncate text-sm text-slate-500">
                                        {pending.user.name} · {pending.user.email}
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 py-4">
                                <p className="text-sm text-slate-600">
                                    {isBlockAction
                                        ? 'Blocking this account immediately signs the user out and prevents them from signing back in until an administrator unblocks them.'
                                        : 'Unblocking this account restores normal sign-in access immediately.'}
                                </p>

                                {stage === 'confirming' ? (
                                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                                        <ShieldAlert
                                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        This takes effect immediately. Confirm
                                        again to proceed.
                                    </p>
                                ) : null}

                                {stage === 'error' && errorText ? (
                                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
                                        <AlertTriangle
                                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {errorText}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSaving}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrimaryClick}
                                    disabled={isSaving}
                                    className={cn(
                                        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                        isBlockAction
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700',
                                    )}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2
                                                className="h-3.5 w-3.5 animate-spin"
                                                aria-hidden="true"
                                            />
                                            {isBlockAction
                                                ? 'Blocking'
                                                : 'Unblocking'}
                                        </>
                                    ) : stage === 'confirming' ? (
                                        `Yes, ${isBlockAction ? 'block' : 'unblock'} this account`
                                    ) : (
                                        `${isBlockAction ? 'Block' : 'Unblock'} account`
                                    )}
                                </button>
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

function ErrorBanner({
    title,
    message,
    onRetry,
}: {
    title: string;
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
                    aria-hidden="true"
                />
                <div>
                    <p className="text-sm font-semibold text-red-800">{title}</p>
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

function EmptyState({
    activeTab,
    hasQuery,
}: {
    activeTab: TabKey;
    hasQuery: boolean;
}) {
    if (activeTab === 'blocked' && !hasQuery) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <ShieldCheck
                    className="h-8 w-8 text-emerald-300"
                    aria-hidden="true"
                />
                <p className="text-sm font-semibold text-slate-700">
                    No accounts are currently blocked
                </p>
                <p className="max-w-xs text-sm text-slate-500">
                    Every account in the directory currently has normal sign-in
                    access.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Inbox className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">
                No matching accounts
            </p>
            <p className="max-w-xs text-sm text-slate-500">
                {hasQuery
                    ? 'No users match your search and filter combination. Try clearing the search or choosing a different filter.'
                    : 'There are no registered users in this category yet.'}
            </p>
        </div>
    );
}

/* =============================================================================
 * Root component
 * ========================================================================== */

export default function BlockedUsers() {
    useTitle('Blocked Users')
    const {
        allUsers,
        allStatus,
        allError,
        reloadAll,
        blockedUsers,
        blockedStatus,
        blockedError,
        reloadBlocked,
        blockUserByEmail,
        unblockUserByEmail,
    } = useAccessControlUsers();

    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] =
        useState<PendingAccessAction | null>(null);
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // The filter-pill set differs slightly per tab (see `filters` below); reset
    // to "all" on tab switch so a pill that doesn't exist on the new tab can
    // never remain silently selected.
    useEffect(() => {
        setActiveFilter('all');
    }, [activeTab]);

    const sourceUsers = activeTab === 'all' ? allUsers : blockedUsers;
    const sourceStatus = activeTab === 'all' ? allStatus : blockedStatus;
    const sourceError = activeTab === 'all' ? allError : blockedError;
    const sourceReload = activeTab === 'all' ? reloadAll : reloadBlocked;

    // The profile modal always resolves the selected user from whichever
    // source list is active, so it reflects a block/unblock the instant
    // local state updates.
    const selectedUser = useMemo(
        () =>
            selectedUserId
                ? (sourceUsers.find((u) => u._id === selectedUserId) ?? null)
                : null,
        [sourceUsers, selectedUserId],
    );

    // KPI totals are always computed from the full directory, independent of
    // which tab is active, so the top of the page always shows the whole
    // picture.
    const kpiStats = useMemo(() => {
        const total = allUsers.length;
        const active = allUsers.filter((u) => u.isActive).length;
        const blocked = total - active;
        const verified = allUsers.filter((u) => u.isVerified === true).length;

        return {
            total,
            active,
            blocked,
            verified,
            activePercent: total === 0 ? 0 : Math.round((active / total) * 100),
            blockedPercent: total === 0 ? 0 : Math.round((blocked / total) * 100),
        };
    }, [allUsers]);

    // Filter-pill counts are scoped to whichever list is currently active, so
    // the numbers on the pills always match what pagination is drawing from.
    const filterCounts = useMemo(() => {
        const admins = sourceUsers.filter(
            (u) => normalizeRole(u.role) === 'ADMIN',
        ).length;
        const publishers = sourceUsers.filter(
            (u) => normalizeRole(u.role) === 'PUBLISHER',
        ).length;
        const editors = sourceUsers.filter(
            (u) => normalizeRole(u.role) === 'EDITOR',
        ).length;
        const readers = sourceUsers.filter(
            (u) => normalizeRole(u.role) === 'READER',
        ).length;
        const verified = sourceUsers.filter((u) => u.isVerified === true).length;
        const blocked = sourceUsers.filter((u) => u.isActive === false).length;

        return { admins, publishers, editors, readers, verified, blocked };
    }, [sourceUsers]);

    const filteredUsers = useMemo(() => {
        let list = sourceUsers;

        if (activeFilter === 'admin')
            list = list.filter((u) => normalizeRole(u.role) === 'ADMIN');
        else if (activeFilter === 'publisher')
            list = list.filter((u) => normalizeRole(u.role) === 'PUBLISHER');
        else if (activeFilter === 'editor')
            list = list.filter((u) => normalizeRole(u.role) === 'EDITOR');
        else if (activeFilter === 'reader')
            list = list.filter((u) => normalizeRole(u.role) === 'READER');
        else if (activeFilter === 'verified')
            list = list.filter((u) => u.isVerified === true);
        else if (activeFilter === 'blocked')
            list = list.filter((u) => u.isActive === false);

        const trimmedQuery = query.trim().toLowerCase();
        if (trimmedQuery.length > 0) {
            list = list.filter(
                (u) =>
                    (u.name ?? '').toLowerCase().includes(trimmedQuery) ||
                    (u.email ?? '').toLowerCase().includes(trimmedQuery),
            );
        }

        return list;
    }, [sourceUsers, activeFilter, query]);

    // Reset back to page 1 whenever the underlying result set changes shape,
    // so the user never lands on a stale, now out-of-range page.
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, activeFilter, query, pageSize]);

    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedUsers = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredUsers.slice(startIndex, startIndex + pageSize);
    }, [filteredUsers, safeCurrentPage, pageSize]);

    const rangeStart =
        totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
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

    const handleSelectUser = useCallback((user: ApiUser) => {
        setSelectedUserId(user._id);
    }, []);

    const handleModalOpenChange = useCallback((open: boolean) => {
        if (!open) setSelectedUserId(null);
    }, []);

    const handleRequestBlock = useCallback((user: ApiUser) => {
        setPendingAction({ user, type: 'block' });
    }, []);

    const handleRequestUnblock = useCallback((user: ApiUser) => {
        setPendingAction({ user, type: 'unblock' });
    }, []);

    const handleConfirmDialogOpenChange = useCallback((open: boolean) => {
        if (!open) setPendingAction(null);
    }, []);

    const filters: Array<{
        key: FilterKey;
        label: string;
        count: number;
        icon?: typeof CheckCircle2;
        className?: string;
    }> = [
            {
                key: 'all',
                label: activeTab === 'blocked' ? 'All Blocked' : 'All Accounts',
                count: sourceUsers.length,
            },
            { key: 'admin', label: 'Admins', count: filterCounts.admins },
            { key: 'publisher', label: 'Publishers', count: filterCounts.publishers },
            { key: 'editor', label: 'Editors', count: filterCounts.editors },
            { key: 'reader', label: 'Readers', count: filterCounts.readers },
            {
                key: 'verified',
                label: 'Verified',
                count: filterCounts.verified,
                icon: CheckCircle2,
                className: 'hidden md:inline-flex',
            },
            // The "Blocked" pill is only meaningful on the "All Users" tab — on
            // the "Blocked Users" tab every row already matches it.
            ...(activeTab === 'all'
                ? [
                    {
                        key: 'blocked' as FilterKey,
                        label: 'Blocked',
                        count: filterCounts.blocked,
                        icon: Ban,
                        className: 'hidden md:inline-flex',
                    },
                ]
                : []),
        ];

    const isLoading = sourceStatus === 'loading';
    const isError = sourceStatus === 'error';
    const hasActiveQueryOrFilter =
        query.trim().length > 0 || activeFilter !== 'all';

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                {/* ---------------------------------------------------------------- */}
                {/* Header                                                          */}
                {/* ---------------------------------------------------------------- */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Access Control
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                                {kpiStats.blocked} Blocked
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Review every account's sign-in access and block or
                            unblock accounts as needed.
                        </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                        <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        Access Control Enabled
                    </span>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Error state                                                     */}
                {/* ---------------------------------------------------------------- */}
                {isError ? (
                    <ErrorBanner
                        title={
                            activeTab === 'blocked'
                                ? "Couldn't load blocked accounts"
                                : "Couldn't load the user directory"
                        }
                        message={sourceError ?? 'Something went wrong.'}
                        onRetry={sourceReload}
                    />
                ) : null}

                {/* ---------------------------------------------------------------- */}
                {/* KPI stat cards (always reflect the full directory)              */}
                {/* ---------------------------------------------------------------- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {allStatus === 'loading' ? (
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
                                value={kpiStats.total}
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
                                        {kpiStats.active}
                                        <span className="ml-2 align-middle text-sm font-semibold text-emerald-600">
                                            {kpiStats.activePercent}% Active
                                        </span>
                                    </>
                                }
                                icon={CheckCircle2}
                                iconWrapperClass="bg-emerald-50"
                                iconClass="text-emerald-600"
                                footer={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Can sign in normally
                                    </span>
                                }
                            />

                            <StatCard
                                label="Blocked Accounts"
                                value={
                                    <>
                                        {kpiStats.blocked}
                                        <span className="ml-2 align-middle text-sm font-semibold text-red-600">
                                            {kpiStats.blockedPercent}%
                                        </span>
                                    </>
                                }
                                icon={Ban}
                                iconWrapperClass="bg-red-50"
                                iconClass="text-red-600"
                                footer={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        Sign-in currently restricted
                                    </span>
                                }
                            />

                            <div className="hidden lg:block">
                                <StatCard
                                    label="Verified Accounts"
                                    value={kpiStats.verified}
                                    icon={BadgeCheck}
                                    iconWrapperClass="bg-blue-50"
                                    iconClass="text-blue-600"
                                    footer={
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                            {kpiStats.total - kpiStats.verified}{' '}
                                            pending verification
                                        </span>
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Tabs                                                            */}
                {/* ---------------------------------------------------------------- */}
                <SectionTabs
                    active={activeTab}
                    counts={{ all: allUsers.length, blocked: kpiStats.blocked }}
                    onChange={setActiveTab}
                />

                {/* ---------------------------------------------------------------- */}
                {/* Filters + search                                                */}
                {/* ---------------------------------------------------------------- */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 sm:pb-0">
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
                    <div className="grid grid-cols-[2.2fr_0.9fr_1fr_1fr_1fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>User Profile</span>
                        <span>Role</span>
                        <span>Account Access</span>
                        <span>Verification</span>
                        <span className="text-right">Member Since</span>
                        <span className="text-right">Actions</span>
                    </div>

                    {isLoading ? (
                        <>
                            <RowSkeleton />
                            <RowSkeleton />
                            <RowSkeleton />
                            <RowSkeleton />
                        </>
                    ) : paginatedUsers.length === 0 ? (
                        <EmptyState
                            activeTab={activeTab}
                            hasQuery={hasActiveQueryOrFilter}
                        />
                    ) : (
                        paginatedUsers.map((user) => (
                            <DesktopUserRow
                                key={user._id}
                                user={user}
                                onSelect={handleSelectUser}
                                onRequestBlock={handleRequestBlock}
                                onRequestUnblock={handleRequestUnblock}
                            />
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
                            <EmptyState
                                activeTab={activeTab}
                                hasQuery={hasActiveQueryOrFilter}
                            />
                        </div>
                    ) : (
                        paginatedUsers.map((user) => (
                            <MobileUserCard
                                key={user._id}
                                user={user}
                                onSelect={handleSelectUser}
                                onRequestBlock={handleRequestBlock}
                                onRequestUnblock={handleRequestUnblock}
                            />
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
                    <span>
                        Blocking an account takes effect immediately across all
                        active sessions.
                    </span>
                    <span>System Timestamp · UTC Standard</span>
                </div>
            </div>

            <UserDetailModal
                user={selectedUser}
                onOpenChange={handleModalOpenChange}
                onRequestBlock={handleRequestBlock}
                onRequestUnblock={handleRequestUnblock}
            />

            <ConfirmAccessDialog
                pending={pendingAction}
                onOpenChange={handleConfirmDialogOpenChange}
                onBlock={blockUserByEmail}
                onUnblock={unblockUserByEmail}
            />
        </div>
    );
}