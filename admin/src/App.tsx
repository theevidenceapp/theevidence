import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import SignIn from '@/pages/auth/SignIn';
import AdminAccessDenied from '@/pages/error/AdminAccessDenied';
import VerifyToken from '@/components/token/VerifyToken';
import AdminPanelLayout from '@/components/layout/AdminPanelLayout';
import ProtectedRoute from '@/components/route/ProtectedRoute';

import { apiClient } from '@/api/api-client';
import { useAuthStore } from '@/store/adminAuthStore';
import Dashboard from '@/components/dashboard/dashboard';
import UsersList from '@/pages/user/UserList';
import AdminNotFound from '@/pages/error/Adminnotfound';
import EditorOverview from '@/pages/editor/EditorOverview';
import ReviewWindow from '@/pages/editor/review/Reviewwindow';
import ReviewQueue from '@/pages/editor/review/Reviewqueue';
import BlockedUsers from '@/pages/user/BlockedUsers';
import UnauthorizedAccess from '@/components/route/UnauthorizedAccess';
import { Toaster } from '@/components/ui/toast';

function EditorOverviewRoute() {
    const navigate = useNavigate();
    return (
        <AdminPanelLayout>
            <EditorOverview
                onReviewResearch={(item) =>
                    navigate(`/editor/review/${item.slug}`)
                }
                onReviewBlog={(item) => navigate(`/editor/review/${item.slug}`)}
            />
        </AdminPanelLayout>
    );
}

const App = () => {

    const isPublicBootstrapRoute = ['/verify-token', '/auth/login', '/'].includes(
        window.location.pathname,
    );
    
    useEffect(() => {
        if (isPublicBootstrapRoute) {
            useAuthStore.getState().setLoading(false);
            return;
        }
        const getAccessToken = async () => {
            try {
                const response = await apiClient.get('/user/get-access-token');

                const accessToken = response.data.accessToken;

                useAuthStore.getState().setAccessToken(accessToken);
                useAuthStore.getState().setRole(response.data.role);
            } catch (error) {
                console.error('Failed to get access token', error);
                useAuthStore.getState().clearAccessToken();
            } finally {
                useAuthStore.getState().setLoading(false);
            }
        };

        getAccessToken();
    }, []);

    return (
        <div>
            <Toaster />
            <BrowserRouter>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<SignIn />} />
                    <Route path="/auth/login" element={<AdminAccessDenied />} />
                    <Route path="/verify-token" element={<VerifyToken />} />

                    {/* Admin-only routes */}
                    <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                        <Route
                            path="/admin/dashboard"
                            element={
                                <AdminPanelLayout>
                                    <Dashboard />
                                </AdminPanelLayout>
                            }
                        />
                        <Route
                            path="/admin/users"
                            element={
                                <AdminPanelLayout>
                                    <UsersList />
                                </AdminPanelLayout>
                            }
                        />
                        <Route
                            path="/admin/app-content"
                            element={
                                <AdminPanelLayout>
                                    <UsersList />
                                </AdminPanelLayout>
                            }
                        />
                        <Route
                            path="/admin/blocked-users"
                            element={
                                <AdminPanelLayout>
                                    <BlockedUsers />
                                </AdminPanelLayout>
                            }
                        />
                    </Route>

                    {/* Editor-only routes */}
                    <Route element={<ProtectedRoute allowedRoles={["EDITOR", "ADMIN"]} />}>
                        <Route
                            path="/editor/overview"
                            element={<EditorOverviewRoute />}
                        />
                        <Route
                            path="/editor/review/queue"
                            element={
                                <AdminPanelLayout>
                                    <ReviewQueue />
                                </AdminPanelLayout>
                            }
                        />
                        <Route
                            path="/editor/review/:slug"
                            element={
                                <AdminPanelLayout>
                                    <ReviewWindow />
                                </AdminPanelLayout>
                            }
                        />
                    </Route>

                    <Route path="/unauthorized-access" element={<UnauthorizedAccess />} />
                    <Route path="*" element={<AdminNotFound />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
};

export default App;