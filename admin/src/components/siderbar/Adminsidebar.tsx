import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutGrid,
    Users,
    FileText,
    Ban,
    Settings,
    Network,
    LogOut,
    Paperclip,
} from "lucide-react";
import { apiClient } from "@/api/api-client";
import { cn } from "@/lib/utils";

// =====================================================================
// Types
// =====================================================================

type BadgeTone = "indigo" | "rose" | "slate";

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
}

interface AdminSidebarProps {
    /** Controls the slide-in drawer on mobile/tablet. Ignored at md+ where the sidebar is always visible. */
    isOpen: boolean;
    /** Called when the user dismisses the mobile drawer (close button, backdrop tap, or a nav item tap). */
    onClose: () => void;
    /** Optional override — falls back to the default nav below so the component works out of the box. */
    navItems?: NavItem[];
}

// =====================================================================
// Default nav config — pass `navItems` prop to wire in real counts
// (e.g. live user/content/blocked totals) without touching this file.
//
// NOTE: "Content" and "Blocked Users" both currently point to
// "/users-list". With URL-driven active-state detection (see
// `isPathActive` below), both entries will highlight together whenever
// that route is active — this is very likely a copy/paste typo in the
// original routes rather than intended behavior, and worth pointing one
// of them at its actual destination.
// =====================================================================

const DEFAULT_NAV_ITEMS: NavItem[] = [
    { label: "Dashboard Overview", icon: LayoutGrid, navigateTo: '/admin/dashboard' },
    { label: "Editor Overview", icon: FileText, badge: { label: "", tone: "indigo" }, navigateTo: '/editor/overview' },
    { label: "Review Queue", icon: Paperclip, badge: { label: "", tone: "indigo" }, navigateTo: '/editor/review/queue' },
    { label: "User Role Management", icon: Users, badge: { label: '', tone: "slate", }, navigateTo: '/admin/users' },
    { label: "Blocked Users", icon: Ban, badge: { label: "", tone: "rose" }, navigateTo: '/admin/blocked-users' },
    { label: "Settings", icon: Settings },
];

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
    indigo: "bg-indigo-600 text-white",
    rose: "bg-rose-50 text-rose-500",
    slate: "bg-slate-100 text-slate-600",
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

    const normalize = (path: string) => path.replace(/\/+$/, "") || "/";
    const normalizedPathname = normalize(pathname);
    const normalizedTarget = normalize(target);

    if (normalizedTarget === "/") return normalizedPathname === "/";

    return (
        normalizedPathname === normalizedTarget ||
        normalizedPathname.startsWith(`${normalizedTarget}/`)
    );
}

// =====================================================================
// Component
// =====================================================================

export default function AdminSidebar({
    isOpen,
    onClose,
    navItems = DEFAULT_NAV_ITEMS,
}: AdminSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        const res = await apiClient.get("/user/logout");
        if (res.status === 200) navigate("/");
    };

    return (
        <>
            {/* Backdrop — mobile/tablet only, sits above content, below the drawer */}
            <div
                aria-hidden="true"
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-300 md:hidden",
                    isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                )}
            />

            {/* Sidebar / drawer */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex h-dvh w-72 shrink-0 flex-col overflow-hidden bg-white transition-transform duration-300 ease-in-out",
                    "md:sticky md:top-0 md:z-auto md:h-screen md:w-72 md:translate-x-0 md:border-r md:border-slate-200 lg:w-80",
                    isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
                )}
            >
                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {/* Admin user card */}
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50/70 p-3">
                        <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                                Admin User
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                admin@system.internal
                            </p>
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
                        {navItems.map(({ label, icon: Icon, active: forcedActive, badge, navigateTo }) => {
                            const active = forcedActive ?? isPathActive(location.pathname, navigateTo);

                            return (
                                <Link
                                    to={navigateTo ?? "#"}
                                    key={label}
                                    aria-current={active ? "page" : undefined}
                                    onClick={(event) => {
                                        // Items without a real destination (e.g. "Settings" until
                                        // it's wired up) shouldn't navigate to a broken route.
                                        if (!navigateTo) event.preventDefault();
                                        onClose();
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors",
                                        active
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                                            : "border-transparent text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-[18px] w-[18px] shrink-0",
                                            active ? "text-indigo-600" : "text-slate-400",
                                        )}
                                    />
                                    <span className="min-w-0 flex-1 truncate">{label}</span>
                                    {active ? (
                                        <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                                            Active
                                        </span>
                                    ) : (
                                        badge && (
                                            <span
                                                className={cn(
                                                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    BADGE_TONE_CLASSES[badge.tone],
                                                )}
                                            >
                                                {badge.label}
                                            </span>
                                        )
                                    )}
                                </Link>
                            );
                        })}
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
                        onClick={handleLogout}
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