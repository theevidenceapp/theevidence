/**
 * AdminNotFound.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * 404 / "Page Not Found" state for the Admin Console.
 *
 * Scope note: this component renders ONLY the 404 content region
 * (top utility bar, hero, actions, quick-navigation, diagnostic footer).
 * It intentionally does NOT render the primary sidebar (desktop) or the
 * bottom tab bar (mobile) — those are assumed to already be mounted by
 * the parent shell/layout, per the existing application chrome.
 *
 * Stack: React 18+, TypeScript, Tailwind CSS, shadcn/ui (Button, Badge),
 * lucide-react for iconography. No other runtime dependencies required.
 *
 * Responsiveness: the desktop and mobile admin consoles in this product
 * are not simple reflows of one another — they differ in information
 * density, hierarchy, and even which affordances are surfaced (e.g. the
 * desktop diagnostic bar vs. the mobile "report route" link). Rather than
 * force one markup tree through breakpoint gymnastics, two purpose-built
 * layouts are composed from one shared data/config surface and toggled
 * via Tailwind's `md:` breakpoint. This keeps each layout legible and
 * avoids specificity fights between reflowed utility classes.
 * ─────────────────────────────────────────────────────────────────────────
 */

import * as React from "react";
import {
    Search,
    Bell,
    User,
    Compass,
    Home,
    Users,
    FileText,
    UserX,
    HelpCircle,
    LayoutDashboard,
    TerminalSquare,
    Copy,
    Flag,
    ChevronRight,
    ShieldCheck,
    BarChart3,
    CircleSlash2,
    Ban,
    Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────── *
 * Types
 * ────────────────────────────────────────────────────────────────────── */

/** A single entry in the "Quick Navigation" grid/list. */
export interface QuickNavItem {
    /** Stable identifier — used as the React key and for analytics/testing hooks. */
    id: string;
    /** Icon rendered inside the item's icon chip. Accepts any lucide-react-shaped icon component. */
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
    /** Invoked when the item is activated (click or Enter/Space). */
    onSelect?: () => void;
    /** Optional href — if provided, the item renders as a link semantically. */
    href?: string;
}

/** Diagnostic metadata surfaced in the desktop footer bar. */
export interface RouteDiagnostics {
    errorSlug: string;
    sessionTimestampUtc: string;
    nodeId: string;
    targetRequest: string;
}

export interface AdminNotFoundProps {
    /** e.g. "PRODUCTION" — shown in the desktop top bar. */
    environment?: string;
    /** e.g. "404" */
    errorCode?: string;

    /** Primary CTA — desktop: "Back to Dashboard", mobile: "Return to Dashboard". */
    onBackToDashboard?: () => void;
    /** Secondary CTA — desktop: "Browse User Directory", mobile: "Go to Users Directory". */
    onBrowseUsers?: () => void;
    /** Desktop-only tertiary CTA — "Documentation & Support". */
    onOpenDocs?: () => void;
    /** Mobile-only — "Report this broken route" link, and desktop "Report Route" button. */
    onReportRoute?: () => void;
    /** Desktop-only — "Copy URL" diagnostic action. Resolves to a boolean success flag. */
    onCopyUrl?: () => boolean | void;

    /** Items rendered in the desktop 4-column Quick Navigation grid. */
    desktopQuickNav?: QuickNavItem[];
    /** Items rendered in the mobile Quick Navigation list. */
    mobileQuickNav?: QuickNavItem[];

    /** Count shown in the desktop "RESOLVED_MODULES" badge. */
    resolvedModulesCount?: number;
    /** Diagnostic strip shown in the desktop footer bar. */
    diagnostics?: RouteDiagnostics;

    /** Optional className passed to the root element for layout composition. */
    className?: string;
}

/* ────────────────────────────────────────────────────────────────────── *
 * Defaults — mirror the approved reference states exactly
 * ────────────────────────────────────────────────────────────────────── */

const DEFAULT_DESKTOP_QUICK_NAV: QuickNavItem[] = [
    {
        id: "dashboard",
        icon: LayoutDashboard,
        title: "Dashboard",
        description: "System overview, active telemetry & key metrics",
    },
    {
        id: "user-directory",
        icon: Users,
        title: "User Directory",
        description: "Account roles, federated identities & seats",
    },
    {
        id: "content-workflows",
        icon: FileText,
        title: "Content Workflows",
        description: "Editorial drafts, localization & assets",
    },
    {
        id: "security-exclusions",
        icon: UserX,
        title: "Security Exclusions",
        description: "Blacklist filters, bans & compliance logs",
    },
];

const DEFAULT_MOBILE_QUICK_NAV: QuickNavItem[] = [
    {
        id: "console-overview",
        icon: BarChart3,
        title: "Console Overview",
        description: "System health, metrics & logs",
    },
    {
        id: "content-manager",
        icon: FileText,
        title: "Content Manager",
        description: "Articles, media & drafts",
    },
    {
        id: "access-control",
        icon: ShieldCheck,
        title: "Access Control",
        description: "Restricted and blocked IPs",
    },
];

const DEFAULT_DIAGNOSTICS: RouteDiagnostics = {
    errorSlug: "404_PAGE_NOT_FOUND",
    sessionTimestampUtc: "2026-09-12 16:52:42 UTC",
    nodeId: "gateway-prod-us-east-04",
    targetRequest: "srcdoc",
};

/* ────────────────────────────────────────────────────────────────────── *
 * Root component
 * ────────────────────────────────────────────────────────────────────── */

export function AdminNotFound({
    environment = "PRODUCTION",
    errorCode = "404",
    onBackToDashboard,
    onBrowseUsers,
    onOpenDocs,
    onReportRoute,
    onCopyUrl,
    desktopQuickNav = DEFAULT_DESKTOP_QUICK_NAV,
    mobileQuickNav = DEFAULT_MOBILE_QUICK_NAV,
    resolvedModulesCount = 4,
    diagnostics = DEFAULT_DIAGNOSTICS,
    className,
}: AdminNotFoundProps) {
    return (
        <div className={cn("min-h-full w-full bg-slate-50", className)}>
            <DesktopNotFound
                environment={environment}
                errorCode={errorCode}
                onBackToDashboard={onBackToDashboard}
                onBrowseUsers={onBrowseUsers}
                onOpenDocs={onOpenDocs}
                onReportRoute={onReportRoute}
                onCopyUrl={onCopyUrl}
                quickNav={desktopQuickNav}
                resolvedModulesCount={resolvedModulesCount}
                diagnostics={diagnostics}
            />
            <MobileNotFound
                errorCode={errorCode}
                onBackToDashboard={onBackToDashboard}
                onBrowseUsers={onBrowseUsers}
                onReportRoute={onReportRoute}
                quickNav={mobileQuickNav}
            />
        </div>
    );
}

export default AdminNotFound;

/* ────────────────────────────────────────────────────────────────────── *
 * Desktop layout (≥ md)
 * ────────────────────────────────────────────────────────────────────── */

interface DesktopNotFoundProps {
    environment: string;
    errorCode: string;
    onBackToDashboard?: () => void;
    onBrowseUsers?: () => void;
    onOpenDocs?: () => void;
    onReportRoute?: () => void;
    onCopyUrl?: () => boolean | void;
    quickNav: QuickNavItem[];
    resolvedModulesCount: number;
    diagnostics: RouteDiagnostics;
}

function DesktopNotFound({
    environment,
    errorCode,
    onBackToDashboard,
    onBrowseUsers,
    onOpenDocs,
    onReportRoute,
    onCopyUrl,
    quickNav,
    resolvedModulesCount,
    diagnostics,
}: DesktopNotFoundProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopyUrl = React.useCallback(() => {
        const result = onCopyUrl?.();
        // Treat an explicit `false` as a signalled failure; anything else
        // (including `undefined`, for callers who don't report status) is a success.
        if (result !== false) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        }
    }, [onCopyUrl]);

    return (
        <div className="hidden md:flex md:flex-col md:min-h-full">
            {/* Utility bar */}
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
                <span className="text-xs font-semibold tracking-wide text-slate-500">
                    ENVIRONMENT: {environment}
                </span>
                <div className="flex items-center gap-4 text-slate-500">
                    <button
                        type="button"
                        aria-label="Search"
                        className="rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <Bell className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Account"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition-opacity hover:opacity-90"
                    >
                        <User className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 px-8 py-14">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                        <Compass className="h-7 w-7 text-indigo-600" strokeWidth={1.75} />
                    </div>

                    <Badge
                        variant="secondary"
                        className="mb-6 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        HTTP {errorCode}
                    </Badge>

                    <div className="mb-2 flex items-center justify-center gap-3">
                        <span className="text-6xl font-bold tracking-tight text-slate-900">
                            {errorCode}
                        </span>
                        <span className="h-9 w-px bg-slate-300" aria-hidden="true" />
                        <span className="text-left">
                            <span className="block text-xs font-bold tracking-wide text-indigo-600">
                                ROUTING EXCEPTION
                            </span>
                            <span className="block text-2xl font-bold text-slate-900">
                                Page Not Found
                            </span>
                        </span>
                    </div>

                    <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-slate-500">
                        The admin resource or endpoint you are attempting to reach does
                        not exist, was deprecated, or requires elevated system
                        permissions to inspect.
                    </p>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <Button
                            onClick={onBackToDashboard}
                            className="gap-2 bg-indigo-600 px-5 text-white hover:bg-indigo-700"
                        >
                            <Home className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                        <Button
                            onClick={onBrowseUsers}
                            variant="outline"
                            className="gap-2 border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
                        >
                            <Users className="h-4 w-4" />
                            Browse User Directory
                        </Button>
                        <Button
                            onClick={onOpenDocs}
                            variant="outline"
                            className="gap-2 border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
                        >
                            <HelpCircle className="h-4 w-4" />
                            Documentation &amp; Support
                        </Button>
                    </div>
                </div>

                {/* Quick navigation */}
                <section className="mx-auto mt-16 max-w-5xl" aria-label="Quick navigation">
                    <div className="mb-5 flex items-end justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Quick Navigation
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Common administrative paths within your active session scope
                            </p>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            RESOLVED_MODULES: {resolvedModulesCount}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {quickNav.map((item) => (
                            <QuickNavCard key={item.id} item={item} />
                        ))}
                    </div>
                </section>

                {/* Diagnostic footer bar */}
                <div className="mx-auto mt-6 max-w-5xl rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                <TerminalSquare className="h-4 w-4 shrink-0 text-slate-400" />
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                                    {diagnostics.errorSlug}
                                </code>
                                <span className="text-slate-300">•</span>
                                <span>Session: {diagnostics.sessionTimestampUtc}</span>
                                <span className="text-slate-300">•</span>
                                <span>Node: {diagnostics.nodeId}</span>
                            </div>
                            <div className="text-sm text-slate-500">
                                Target Request:{" "}
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                                    {diagnostics.targetRequest}
                                </code>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <Button
                                onClick={handleCopyUrl}
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-slate-200 text-slate-700"
                            >
                                {copied ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                )}
                                {copied ? "Copied" : "Copy URL"}
                            </Button>
                            <Button
                                onClick={onReportRoute}
                                size="sm"
                                className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
                            >
                                <Flag className="h-3.5 w-3.5" />
                                Report Route
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function QuickNavCard({ item }: { item: QuickNavItem }) {
    const Icon = item.icon;
    const Tag = item.href ? "a" : "button";

    return (
        <Tag
            {...(item.href ? { href: item.href } : { type: "button" })}
            onClick={item.onSelect}
            className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-bold text-slate-900">{item.title}</span>
            <span className="mt-1 text-sm leading-snug text-slate-500">
                {item.description}
            </span>
        </Tag>
    );
}

/* ────────────────────────────────────────────────────────────────────── *
 * Mobile layout (< md)
 * ────────────────────────────────────────────────────────────────────── */

interface MobileNotFoundProps {
    errorCode: string;
    onBackToDashboard?: () => void;
    onBrowseUsers?: () => void;
    onReportRoute?: () => void;
    quickNav: QuickNavItem[];
}

function MobileNotFound({
    errorCode,
    onBackToDashboard,
    onBrowseUsers,
    onReportRoute,
    quickNav,
}: MobileNotFoundProps) {
    // Render the error code with the middle character accented, matching the
    // reference state, without assuming the code is literally "404".
    const codeChars = errorCode.split("");
    const midIndex = Math.floor(codeChars.length / 2);

    return (
        <div className="flex flex-col md:hidden">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span>
                        <span className="block text-[11px] font-bold tracking-wide text-indigo-600">
                            ADMIN CONSOLE
                        </span>
                        <span className="block text-base font-bold text-slate-900">
                            {errorCode} Not Found
                        </span>
                    </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                    <button type="button" aria-label="Notifications" className="p-1">
                        <Bell className="h-[18px] w-[18px]" />
                    </button>
                    <button
                        type="button"
                        aria-label="Account"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white"
                    >
                        <User className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 px-5 py-8">
                <div className="flex flex-col items-center text-center">
                    <Badge
                        variant="secondary"
                        className="mb-6 gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        ERROR {errorCode}
                    </Badge>

                    <div className="relative mb-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                            <CircleSlash2
                                className="h-8 w-8 text-indigo-600"
                                strokeWidth={1.5}
                            />
                        </div>
                        <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white ring-4 ring-slate-50">
                            <Ban className="h-3.5 w-3.5" />
                        </span>
                    </div>

                    <h1 className="mb-1 text-4xl font-bold tracking-tight text-slate-900">
                        {codeChars.map((char, i) => (
                            <span
                                key={i}
                                className={i === midIndex ? "text-indigo-600" : undefined}
                            >
                                {char}
                            </span>
                        ))}
                    </h1>
                    <p className="mb-3 text-xl font-bold text-slate-900">
                        Page Not Found
                    </p>

                    <p className="mb-8 text-sm leading-relaxed text-slate-500">
                        The screen or admin resource you requested cannot be located. It
                        may have been relocated or removed.
                    </p>

                    <div className="flex w-full flex-col gap-3">
                        <Button
                            onClick={onBackToDashboard}
                            className="h-12 w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Return to Dashboard
                        </Button>
                        <Button
                            onClick={onBrowseUsers}
                            variant="secondary"
                            className="h-12 w-full gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Users className="h-4 w-4" />
                            Go to Users Directory
                        </Button>
                    </div>
                </div>

                {/* Quick navigation */}
                <section className="mt-10" aria-label="Quick navigation">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wide text-slate-500">
                            QUICK NAVIGATION
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                            STATUS: IDLE
                        </span>
                    </div>

                    <ul className="flex flex-col gap-3">
                        {quickNav.map((item) => (
                            <li key={item.id}>
                                <MobileQuickNavRow item={item} />
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Diagnostic footer */}
                <div className="mt-8 flex flex-col items-center gap-2 text-center">
                    <p className="text-xs text-slate-400">
                        HTTP {errorCode} • Resource Not Found
                    </p>
                    <button
                        type="button"
                        onClick={onReportRoute}
                        className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        <Flag className="h-3.5 w-3.5" />
                        Report this broken route
                    </button>
                </div>
            </main>
        </div>
    );
}

function MobileQuickNavRow({ item }: { item: QuickNavItem }) {
    const Icon = item.icon;
    const Tag = item.href ? "a" : "button";

    return (
        <Tag
            {...(item.href ? { href: item.href } : { type: "button" })}
            onClick={item.onSelect}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-colors active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">
                    {item.title}
                </span>
                <span className="block truncate text-xs text-slate-500">
                    {item.description}
                </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Tag>
    );
}