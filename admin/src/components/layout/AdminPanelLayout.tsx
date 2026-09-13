import * as React from 'react';
import { apiClient } from '@/api/api-client';
import {
    Menu,
    Search,
    Bell,
    HelpCircle,
    User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/siderbar/Adminsidebar';

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
        const res = await apiClient.get('/user/logout');
        console.log(res);
        if (res.status === 200) navigate('/');
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#F3F4FD] font-sans">
            {/* Body: sidebar + main content */}
            <div className="flex flex-1 flex-col md:flex-row">
                <AdminSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
