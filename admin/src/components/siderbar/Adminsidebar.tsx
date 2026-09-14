import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    Users,
    FileText,
    Ban,
    Settings,
    LogOut,
    Paperclip,
    Menu,
    X,
    ShieldCheck,
    PanelLeftClose,
    PanelLeftOpen,
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
     * Called when the user clicks "Log out". The component performs no
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
    /**
     * Allow collapsing to an icon-only rail on desktop (md+). Defaults to
     * true. The preference persists to localStorage so it survives reloads.
     */
    collapsible?: boolean;
    /** Initial collapsed state before any stored preference is read. Defaults to false. */
    defaultCollapsed?: boolean;
    /** Product name shown next to the brand mark. */
    brandName?: string;
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
        label: 'Dashboard overview',
        icon: LayoutGrid,
        navigateTo: '/admin/dashboard',
        allowedRoles: ['ADMIN'],
    },
    {
        label: 'Editorial Overview',
        icon: FileText,
        badge: { label: '', tone: 'indigo' },
        navigateTo: '/editor/overview',
        allowedRoles: ['EDITOR', 'ADMIN'],
    },
    {
        label: 'Review queue',
        icon: Paperclip,
        badge: { label: '', tone: 'indigo' },
        navigateTo: '/editor/review/queue',
        allowedRoles: ['EDITOR', 'ADMIN'],
    },
    {
        label: 'User Management',
        icon: Users,
        badge: { label: '', tone: 'slate' },
        navigateTo: '/admin/users',
        allowedRoles: ['ADMIN'],
    },
    {
        label: 'Access Control',
        icon: Ban,
        badge: { label: '', tone: 'rose' },
        navigateTo: '/admin/blocked-users',
        allowedRoles: ['ADMIN'],
    },
];

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
    indigo: 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/25',
    rose: 'bg-rose-400/15 text-rose-300 ring-1 ring-inset ring-rose-400/25',
    slate: 'bg-slate-400/10 text-slate-300 ring-1 ring-inset ring-slate-400/20',
};

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'admin-sidebar:collapsed';

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
    return role === 'EDITOR' ? 'Editor console' : 'Admin console';
}

function getInitials(name?: string): string {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
                'fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-[#121826] text-slate-200 shadow-lg ring-1 ring-white/10 transition-all duration-200 ease-out active:scale-90 motion-reduce:transition-none md:hidden',
                open && 'bg-amber-400 text-slate-900 ring-amber-400',
            )}
        >
            <span className="relative flex h-5 w-5 items-center justify-center">
                <Menu
                    className={cn(
                        'absolute h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none',
                        open
                            ? 'rotate-90 scale-0 opacity-0'
                            : 'rotate-0 scale-100 opacity-100',
                    )}
                />
                <X
                    className={cn(
                        'absolute h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none',
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
    collapsible = true,
    defaultCollapsed = false,
    brandName = 'The Evidence',
}: AdminSidebarProps) {
    const location = useLocation();

    // ---- Drawer open/close state (mobile) ---------------------------
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

    // ---- Collapsed rail state (desktop only) -------------------------
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

    // Restore the persisted preference once, on mount.
    React.useEffect(() => {
        if (!collapsible || typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);
        if (stored !== null) setCollapsed(stored === '1');
    }, [collapsible]);

    // Persist on change.
    React.useEffect(() => {
        if (!collapsible || typeof window === 'undefined') return;
        window.localStorage.setItem(
            SIDEBAR_COLLAPSE_STORAGE_KEY,
            collapsed ? '1' : '0',
        );
    }, [collapsed, collapsible]);

    // The rail can only collapse on md+ layouts — if the viewport drops
    // below that (or the drawer is opened on mobile), force it back open
    // so mobile users never lose their labels.
    React.useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const query = window.matchMedia('(min-width: 768px)');
        const handleChange = () => {
            if (!query.matches) setCollapsed(false);
        };
        handleChange();
        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);

    const isRailCollapsed = collapsible && collapsed;

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
                    'fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden',
                    open
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
            />

            {/* Sidebar / drawer */}
            <aside
                id="admin-sidebar"
                aria-label="Admin navigation"
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex h-dvh w-[85vw] max-w-72 shrink-0 flex-col overflow-hidden bg-[#121826] text-slate-200 transition-transform duration-300 ease-in-out will-change-transform motion-reduce:transition-none',
                    'md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:border-r md:border-white/[0.06]',
                    isRailCollapsed ? 'md:w-[76px]' : 'md:w-72 md:max-w-none lg:w-[280px]',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0',
                )}
            >
                {/* Brand row */}
                <div
                    className={cn(
                        'flex h-16 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4',
                        isRailCollapsed && 'md:justify-center md:px-0',
                    )}
                >
                    <span
                        className={cn(
                            'truncate text-[15px] font-semibold tracking-tight text-white',
                            isRailCollapsed && 'md:hidden',
                        )}
                    >
                        {brandName}
                    </span>
                    {collapsible && (
                        <button
                            type="button"
                            onClick={() => setCollapsed((prev) => !prev)}
                            aria-label={
                                isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                            }
                            className="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 md:flex"
                        >
                            {isRailCollapsed ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
                    {/* User card */}
                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5',
                            isRailCollapsed && 'md:justify-center md:p-2',
                        )}
                    >
                        <div className="relative shrink-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-[13px] font-semibold text-slate-900">
                                {getInitials(userName)}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#121826]" />
                        </div>
                        <div
                            className={cn(
                                'min-w-0 flex-1',
                                isRailCollapsed && 'md:hidden',
                            )}
                        >
                            <p className="truncate text-sm font-semibold text-white">
                                {userName || consoleLabel}
                            </p>
                            {userName && (
                                <p className="truncate text-xs text-slate-400">
                                    {consoleLabel}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav
                        className={cn(
                            'mt-5 space-y-0.5 border-t border-white/[0.06] pt-4',
                        )}
                        aria-label="Primary"
                    >
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
                                        aria-current={active ? 'page' : undefined}
                                        onClick={(event) => {
                                            // Items without a real destination (e.g. "Settings" until
                                            // it's wired up) shouldn't navigate to a broken route.
                                            if (!navigateTo) event.preventDefault();
                                            close();
                                        }}
                                        className={cn(
                                            'group relative flex items-center gap-3 rounded-lg border-l-2 py-2 pl-2.5 pr-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                                            active
                                                ? 'border-amber-400 bg-amber-400/10 text-white'
                                                : 'border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
                                            isRailCollapsed && 'md:justify-center md:border-l-0 md:px-0',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                                active && 'bg-amber-400/15',
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'h-[17px] w-[17px]',
                                                    active ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-300',
                                                )}
                                            />
                                        </span>
                                        <span
                                            className={cn(
                                                'min-w-0 flex-1 truncate',
                                                isRailCollapsed && 'md:hidden',
                                            )}
                                        >
                                            {label}
                                        </span>
                                        {badge?.label && (
                                            <span
                                                className={cn(
                                                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                                                    BADGE_TONE_CLASSES[badge.tone],
                                                    isRailCollapsed && 'md:hidden',
                                                )}
                                            >
                                                {badge.label}
                                            </span>
                                        )}

                                        {/* Collapsed-rail tooltip */}
                                        {isRailCollapsed && (
                                            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none md:block">
                                                {label}
                                                {badge?.label && (
                                                    <span className="ml-1.5 text-slate-400">
                                                        · {badge.label}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </Link>
                                );
                            },
                        )}
                    </nav>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
                    <div
                        className={cn(
                            'mb-2 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400',
                            isRailCollapsed && 'md:justify-center md:px-0',
                        )}
                    >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        <span className={cn(isRailCollapsed && 'md:hidden')}>
                            All systems operational
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-400/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50',
                            isRailCollapsed && 'md:justify-center md:px-0',
                        )}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span className={cn(isRailCollapsed && 'md:hidden')}>
                            Log out
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
}