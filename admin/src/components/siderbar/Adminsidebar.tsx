import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    Users,
    FileText,
    Ban,
    Settings,
    Network,
    LogOut,
    Paperclip,
    Menu,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================================
// Types
// =====================================================================

/**
 * Static, self-contained role type — no dependency on an auth store or
 * API. Callers pass whichever role value applies via the `role` prop.
 */
export type UserRole = 'ADMIN' | 'EDITOR';

type BadgeTone = 'indigo' | 'rose' | 'slate';

interface NavBadge {
    label: string;
    tone: BadgeTone;
}

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /**
     * Optional manual override. Leave unset (recommended) so the item's
     * active/background state is derived automatically from the current
     * URL via `useLocation()`. Only set this if you need to force a
     * particular item to appear active regardless of route.
     */
    active?: boolean;
    badge?: NavBadge;
    navigateTo?: string;
    /**
     * Roles allowed to see this item. Mirrors ProtectedRoute's
     * allowedRoles — keep these in sync with the router's actual guards
     * so the sidebar never advertises a link the user can't open.
     * Omit for items with no route (e.g. "Settings") — those show for
     * everyone since there's no destination to protect.
     */
    allowedRoles?: UserRole[];
}

interface AdminSidebarProps {
    /**
     * Static role value supplied by the caller — no store, no fetch.
     * Drives which nav items are visible and the "Admin Console" /
     * "Editor Console" label. Defaults to 'ADMIN' if omitted.
     */
    role?: UserRole;
    /** Display name shown in the user card. Purely presentational. */
    userName?: string;
    /**
     * Called when the user clicks "Log Out". The component performs no
     * API calls itself — pass in whatever logic your app needs (clear
     * local state, redirect, call an API, etc.). If omitted, logout is a
     * no-op click.
     */
    onLogout?: () => void;
    /**
     * Controlled mode (optional). Pass this + `onOpenChange` if a parent
     * layout needs to know/drive the drawer state (e.g. to shift page
     * content, or to trigger it from a topbar button elsewhere in the
     * tree). If omitted, the sidebar manages its own open/close state
     * internally and renders its own hamburger trigger — it works
     * correctly on mobile with zero wiring required.
     */
    isOpen?: boolean;
    /** Controlled-mode callback, fired whenever the drawer wants to open or close. */
    onOpenChange?: (open: boolean) => void;
    /** @deprecated kept for backward compatibility — called whenever the drawer closes. Prefer `onOpenChange`. */
    onClose?: () => void;
    /** Optional override — falls back to the default nav below so the component works out of the box. */
    navItems?: NavItem[];
    /**
     * Hide the built-in floating hamburger button on mobile. Only useful
     * if a parent topbar renders its own trigger wired via `isOpen`/`onOpenChange`.
     */
    hideTrigger?: boolean;
}

// =====================================================================
// Default nav config — pass `navItems` prop to wire in real counts
// (e.g. live user/content/blocked totals) without touching this file.
//
// allowedRoles here must match the ProtectedRoute allowedRoles wrapping
// the corresponding route in App.tsx — this list is presentation only,
// it doesn't enforce anything; the router is still the real guard.
// =====================================================================

const DEFAULT_NAV_ITEMS: NavItem[] = [
    {
        label: 'Dashboard Overview',
        icon: LayoutGrid,
        navigateTo: '/admin/dashboard',
        allowedRoles: ['ADMIN'],
    },
    {
        label: 'Editor Overview',
        icon: FileText,
        badge: { label: '', tone: 'indigo' },
        navigateTo: '/editor/overview',
        allowedRoles: ['EDITOR', 'ADMIN'],
    },
    {
        label: 'Review Queue',
        icon: Paperclip,
        badge: { label: '', tone: 'indigo' },
        navigateTo: '/editor/review/queue',
        allowedRoles: ['EDITOR', 'ADMIN'],
    },
    {
        label: 'User Role Management',
        icon: Users,
        badge: { label: '', tone: 'slate' },
        navigateTo: '/admin/users',
        allowedRoles: ['ADMIN'],
    },
    {
        label: 'Blocked Users',
        icon: Ban,
        badge: { label: '', tone: 'rose' },
        navigateTo: '/admin/blocked-users',
        allowedRoles: ['ADMIN'],
    },
    { label: 'Settings', icon: Settings },
];

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
    indigo: 'bg-indigo-600 text-white',
    rose: 'bg-rose-50 text-rose-500',
    slate: 'bg-slate-100 text-slate-600',
};

// =====================================================================
// Helpers
// =====================================================================

/**
 * Determines whether a nav item's target route matches the current URL.
 * Matches exactly, or as a path prefix (so `/admin/users-list/123` still
 * highlights an item pointing at `/admin/users-list`). Trailing slashes
 * are normalized so `/dashboard` and `/dashboard/` are treated the same.
 */
function isPathActive(pathname: string, target?: string): boolean {
    if (!target) return false;

    const normalize = (path: string) => path.replace(/\/+$/, '') || '/';
    const normalizedPathname = normalize(pathname);
    const normalizedTarget = normalize(target);

    if (normalizedTarget === '/') return normalizedPathname === '/';

    return (
        normalizedPathname === normalizedTarget ||
        normalizedPathname.startsWith(`${normalizedTarget}/`)
    );
}

/**
 * An item with no allowedRoles is unrestricted (e.g. "Settings").
 * Otherwise the current role must appear in the item's allowed list.
 */
function isItemVisible(item: NavItem, role: UserRole): boolean {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(role);
}

/**
 * Console title shown in the sidebar user card. Editors see an
 * "Editor" console, everyone else (admins) sees the default "Admin".
 */
function getConsoleLabel(role: UserRole): string {
    return role === 'EDITOR' ? 'Editor Console' : 'Admin Console';
}

// =====================================================================
// Hamburger trigger — animated menu <-> close icon morph.
// Fixed to the top-left corner, only rendered below the `md` breakpoint.
// =====================================================================

function HamburgerButton({
    open,
    onClick,
}: {
    open: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="admin-sidebar"
            className={cn(
                'fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition-all duration-200 active:scale-90 md:hidden',
                open && 'bg-slate-900 text-white ring-slate-900',
            )}
        >
            <span className="relative flex h-5 w-5 items-center justify-center">
                <Menu
                    className={cn(
                        'absolute h-5 w-5 transition-all duration-200 ease-out',
                        open
                            ? 'rotate-90 scale-0 opacity-0'
                            : 'rotate-0 scale-100 opacity-100',
                    )}
                />
                <X
                    className={cn(
                        'absolute h-5 w-5 transition-all duration-200 ease-out',
                        open
                            ? 'rotate-0 scale-100 opacity-100'
                            : '-rotate-90 scale-0 opacity-0',
                    )}
                />
            </span>
        </button>
    );
}

// =====================================================================
// Component
// =====================================================================

export default function AdminSidebar({
    role = 'ADMIN',
    userName,
    onLogout,
    isOpen: controlledOpen,
    onOpenChange,
    onClose,
    navItems = DEFAULT_NAV_ITEMS,
    hideTrigger = false,
}: AdminSidebarProps) {
    const location = useLocation();

    // State is always self-managed internally so the built-in hamburger
    // works immediately on click, regardless of what a parent does or
    // doesn't wire up. If a parent passes `isOpen`, we treat it as a
    // one-way sync signal (e.g. to force-close the drawer from outside)
    // and still notify the parent via `onOpenChange`/`onClose` — but we
    // never depend on the parent to hand `isOpen` back to us on every
    // click, since that previously left the drawer stuck if the parent
    // only implemented the old `onClose`-only API and never re-rendered
    // with an updated `isOpen`.
    const [internalOpen, setInternalOpen] = React.useState(
        controlledOpen ?? false,
    );
    const open = internalOpen;

    // If a parent explicitly changes `isOpen`, reflect that — but this
    // is a one-way sync, not a requirement for the toggle to function.
    React.useEffect(() => {
        if (controlledOpen !== undefined) setInternalOpen(controlledOpen);
    }, [controlledOpen]);

    const setOpen = React.useCallback(
        (next: boolean) => {
            setInternalOpen(next);
            onOpenChange?.(next);
            if (!next) onClose?.();
        },
        [onOpenChange, onClose],
    );

    const close = React.useCallback(() => setOpen(false), [setOpen]);
    const toggle = React.useCallback(() => setOpen(!open), [open, setOpen]);

    // Auto-close the drawer whenever the route changes (tapping a nav
    // link already closes it, but this also covers back/forward nav,
    // redirects, etc.).
    React.useEffect(() => {
        if (open) close();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Escape key closes the drawer.
    React.useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, close]);

    // Lock body scroll while the mobile drawer is open.
    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        const original = document.body.style.overflow;
        if (open) document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    const visibleNavItems = navItems.filter((item) => isItemVisible(item, role));
    const consoleLabel = getConsoleLabel(role);

    return (
        <>
            {!hideTrigger && <HamburgerButton open={open} onClick={toggle} />}

            {/* Backdrop — mobile/tablet only, sits above content, below the drawer */}
            <div
                aria-hidden="true"
                onClick={close}
                className={cn(
                    'fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-300 ease-out md:hidden',
                    open
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
            />

            {/* Sidebar / drawer */}
            <aside
                id="admin-sidebar"
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex h-dvh w-[85vw] max-w-72 shrink-0 flex-col overflow-hidden bg-white transition-transform duration-300 ease-in-out will-change-transform',
                    'md:sticky md:top-0 md:z-auto md:h-screen md:w-72 md:max-w-none md:translate-x-0 md:border-r md:border-slate-200 lg:w-80',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0',
                )}
            >
                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {/* Admin user card */}
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50/70 p-3 pl-14 md:pl-3">
                        <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                                {userName || consoleLabel}
                            </p>
                            {userName && (
                                <p className="truncate text-xs font-medium text-slate-400">
                                    {consoleLabel}
                                </p>
                            )}
                        </div>
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                            Super
                        </span>
                    </div>

                    {/* Navigation */}
                    <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Navigation
                    </p>
                    <nav className="space-y-1">
                        {visibleNavItems.map(
                            ({
                                label,
                                icon: Icon,
                                active: forcedActive,
                                badge,
                                navigateTo,
                            }) => {
                                const active =
                                    forcedActive ??
                                    isPathActive(location.pathname, navigateTo);

                                return (
                                    <Link
                                        to={navigateTo ?? '#'}
                                        key={label}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        onClick={(event) => {
                                            // Items without a real destination (e.g. "Settings" until
                                            // it's wired up) shouldn't navigate to a broken route.
                                            if (!navigateTo)
                                                event.preventDefault();
                                            close();
                                        }}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors',
                                            active
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                                : 'border-transparent text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                'h-[18px] w-[18px] shrink-0',
                                                active
                                                    ? 'text-indigo-600'
                                                    : 'text-slate-400',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1 truncate">
                                            {label}
                                        </span>
                                        {active ? (
                                            <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                                                Active
                                            </span>
                                        ) : (
                                            badge && (
                                                <>
                                                    {/* Render no UI */}
                                                </>
                                            )
                                        )}
                                    </Link>
                                );
                            },
                        )}
                    </nav>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 px-4 py-3">
                    <div className="mb-3 flex items-center justify-between rounded-lg bg-indigo-50/70 px-3 py-2.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Network className="h-4 w-4 text-indigo-500" />
                            System Status
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            Operational
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </button>
                </div>
            </aside>
        </>
    );
}