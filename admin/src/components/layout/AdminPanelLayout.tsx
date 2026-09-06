import { apiClient } from "@/api/api-client";
import {
    MonitorSmartphone,
    Search,
    Bell,
    HelpCircle,
    LogOut,
    LayoutGrid,
    Users,
    FileText,
    Ban,
    Settings,
    User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", icon: LayoutGrid, active: true },
    { label: "Users", icon: Users },
    { label: "Content", icon: FileText },
    { label: "Blocked Users", icon: Ban },
    { label: "Settings", icon: Settings },
];

interface AdminPanelLayoutProps {
    children?: React.ReactNode;
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen w-full flex-col bg-neutral-950 bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:14px_14px] font-sans">
            {/* Dark top strip */}
            <header className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
                <MonitorSmartphone className="h-5 w-5 shrink-0 text-white/90" />
                <h1 className="truncate text-sm font-medium text-white/90 sm:text-base">
                    Admin Dashboard - Analytics
                </h1>
            </header>

            {/* White header row: brand block (desktop only) + search + actions */}
            <div className="flex shrink-0 border-b border-slate-200 bg-white">
                <div className="hidden w-64 shrink-0 items-center gap-3 border-r border-slate-200 px-5 py-3 md:flex">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-bold text-white shadow-sm">
                        A
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-tight text-slate-900">
                            Admin Panel
                        </p>
                        <p className="truncate text-xs leading-tight text-slate-500">
                            System Management
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <button
                            type="button"
                            aria-label="Notifications"
                            className="relative rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                        </button>
                        <button
                            type="button"
                            aria-label="Help"
                            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <HelpCircle className="h-5 w-5" />
                        </button>
                        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                        <button
                            onClick={async () => {
                                const res = await apiClient.get('/user/logout');
                                console.log(res);
                                if(res.status===200) navigate('/');
                            }}
                            type="button"
                            className="hidden items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 sm:flex"
                        >
                            Logout
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Body: sidebar + main content */}
            <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:gap-0 md:p-0">
                <aside className="flex w-full flex-1 flex-col overflow-hidden rounded-2xl border-l-4 border-indigo-600 bg-white shadow-xl md:w-64 md:flex-none md:shrink-0 md:rounded-none md:shadow-none">
                    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 md:hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-bold text-white">
                            A
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                                Admin Panel
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                System Management
                            </p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
                            <a
                                key={label}
                                href="#"
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <Icon
                                    className={`h-[18px] w-[18px] shrink-0 ${active ? "text-indigo-600" : "text-slate-400"
                                        }`}
                                />
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="shrink-0 border-t border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                    Admin User
                                </p>
                                <a
                                    href="#"
                                    className="truncate text-xs font-medium text-indigo-600 hover:underline"
                                >
                                    View Profile
                                </a>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="min-h-[50vh] flex-1 rounded-2xl bg-white p-6 shadow-xl md:min-h-0 md:rounded-none md:bg-slate-50 md:p-6 md:shadow-none">
                    {children}
                </main>
            </div>
        </div>
    );
}