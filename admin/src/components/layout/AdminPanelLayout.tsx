import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminSidebar from '@/components/siderbar/Adminsidebar';
import { apiClient } from '@/api/api-client';
import { toast } from '@/components/ui/toast';

// Reuse AdminSidebar's own prop types instead of re-declaring/exporting
// new ones from that file — keeps this wrapper in sync automatically and
// requires zero changes to AdminSidebar.tsx.
type AdminSidebarProps = React.ComponentProps<typeof AdminSidebar>;

interface AdminLayoutProps {
    role?: AdminSidebarProps['role'];
    userName?: AdminSidebarProps['userName'];
    onLogout?: AdminSidebarProps['onLogout'];
    navItems?: AdminSidebarProps['navItems'];
    /**
     * Optional page heading rendered above `children`, in a consistent
     * spot on every page. Omit entirely if a page wants to draw its own
     * heading (e.g. it needs custom layout in that space).
     */
    title?: React.ReactNode;
    /** Optional one-line description shown under `title`. */
    description?: React.ReactNode;
    /** Optional actions (buttons, filters) aligned to the right of the header row. */
    actions?: React.ReactNode;
    /** Cap the content column's width. Defaults to 'default' (1280px). Use 'full' for dashboards/tables that want the whole column. */
    contentWidth?: 'default' | 'full';
    children: React.ReactNode;
}

/**
 * Shared layout for every admin/editor page.
 *
 * Owns the sidebar's open state and renders the mobile nav trigger itself,
 * as a normal in-flow element (`sticky`, not `fixed`) at the top of the
 * content column. Because it takes up real layout space, page content
 * (headings, filters, cards) simply starts below it on every page — it
 * can never render underneath the trigger, and no per-page padding is
 * required.
 *
 * `AdminSidebar` is rendered with `hideTrigger` so its own built-in
 * floating button never mounts.
 */
export default function AdminLayout({
    role = 'ADMIN',
    userName,
    navItems,
    title,
    description,
    actions,
    contentWidth = 'default',
    children,
}: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const logoutUser = async () => {
        try {
            const res = await apiClient.post('/user/logout');
            window.location.href = '/'
            toast.add({
                type: 'success',
                description: 'Signed out successfully.'
            })
            console.log(res);
        } catch (error) {
            toast.add({
                type: 'error',
                description: 'Unable to sign out. Please try again.'
            })
            console.log(error);
        }
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <AdminSidebar
                role={role}
                userName={userName}
                onLogout={logoutUser}
                navItems={navItems}
                hideTrigger
                isOpen={isSidebarOpen}
                onOpenChange={setIsSidebarOpen}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                {/* In-flow mobile topbar. Sticky, not fixed — it reserves
                    height in the document, so it cannot overlap whatever
                    the page renders next. Hidden on md+ where the sidebar
                    is a normal static column. */}
                <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm md:hidden">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        aria-label={
                            isSidebarOpen
                                ? 'Close navigation menu'
                                : 'Open navigation menu'
                        }
                        aria-expanded={isSidebarOpen}
                        aria-controls="admin-sidebar"
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors active:scale-90 motion-reduce:transition-none',
                            isSidebarOpen && 'bg-[#121826] text-white',
                        )}
                    >
                        <span className="relative flex h-5 w-5 items-center justify-center">
                            <Menu
                                className={cn(
                                    'absolute h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none',
                                    isSidebarOpen
                                        ? 'rotate-90 scale-0 opacity-0'
                                        : 'rotate-0 scale-100 opacity-100',
                                )}
                            />
                            <X
                                className={cn(
                                    'absolute h-5 w-5 transition-all duration-200 ease-out motion-reduce:transition-none',
                                    isSidebarOpen
                                        ? 'rotate-0 scale-100 opacity-100'
                                        : '-rotate-90 scale-0 opacity-0',
                                )}
                            />
                        </span>
                    </button>
                    {title && (
                        <span className="truncate text-sm font-semibold text-slate-900">
                            {title}
                        </span>
                    )}
                </header>

                <main className="min-w-0 flex-1">
                    <div
                        className={cn(
                            'mx-auto px-4 py-6 sm:px-6 lg:px-8',
                            contentWidth === 'default' && 'max-w-7xl',
                        )}
                    >
                        {(title || description || actions) && (
                            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                                <div className="min-w-0">
                                    {title && (
                                        <h1 className="hidden truncate text-xl font-semibold tracking-tight text-slate-900 md:block">
                                            {title}
                                        </h1>
                                    )}
                                    {description && (
                                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                                            {description}
                                        </p>
                                    )}
                                </div>
                                {actions && (
                                    <div className="flex shrink-0 items-center gap-2">
                                        {actions}
                                    </div>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}