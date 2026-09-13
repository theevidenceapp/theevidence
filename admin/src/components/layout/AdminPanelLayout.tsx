import * as React from "react";
import { apiClient } from "@/api/api-client";
import {
    Menu,
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
import AdminSidebar from "@/components/siderbar/Adminsidebar";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
}

// const NAV_ITEMS: NavItem[] = [
//     { label: "Dashboard", icon: LayoutGrid, active: true },
//     { label: "Users", icon: Users },
//     { label: "Content", icon: FileText },
//     { label: "Blocked Users", icon: Ban },
//     { label: "Settings", icon: Settings },
// ];

interface AdminPanelLayoutProps {
    children?: React.ReactNode;
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);

    const navigate = useNavigate();
    // const activeItem = NAV_ITEMS.find((item) => item.active) ?? NAV_ITEMS[0];

    const handleLogout = async () => {
        const res = await apiClient.get("/user/logout");
        console.log(res);
        if (res.status === 200) navigate("/");
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#F3F4FD] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open menu"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>
                {/* Desktop search */}
                <div className="relative hidden w-full max-w-xs md:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                    <button
                        type="button"
                        aria-label="Search"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100 md:hidden"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                    <button
                        type="button"
                        aria-label="Help"
                        className="hidden rounded-full p-2 text-slate-500 hover:bg-slate-100 md:block"
                    >
                        <HelpCircle className="h-5 w-5" />
                    </button>

                    <div className="hidden h-6 w-px bg-slate-200 md:block" />

                    <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Log out"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 md:hidden"
                    >
                        <User className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Body: sidebar + main content */}
            <div className="flex flex-1 flex-col md:flex-row">
                <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}