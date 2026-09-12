import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import SignIn from "@/pages/auth/SignIn";
import AdminAccessDenied from "@/pages/error/AdminAccessDenied";
import VerifyToken from "@/components/token/VerifyToken";
import AdminPanelLayout from "@/components/layout/AdminPanelLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { apiClient } from "@/api/api-client";
import { useAuthStore } from "@/store/authStore";
import UserManagement from "@/pages/user/UserManagement";
import Dashboard from "@/components/dashboard/dashboard";
import UsersList from "@/pages/user/UserList";

const App = () => {
  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const response = await apiClient.get("/user/get-access-token");

        const accessToken = response.data.accessToken;

        useAuthStore.getState().setAccessToken(accessToken);
      } catch (error) {
        console.error("Failed to get access token", error);
        useAuthStore.getState().clearAccessToken();
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };

    getAccessToken();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />

        <Route path="/auth/login" element={<AdminAccessDenied />} />

        <Route path="/verify-token" element={<VerifyToken />} />

        <Route element={<ProtectedRoute />}>
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
                <UsersList />
              </AdminPanelLayout>
            }
          />
        </Route>
        <Route path="/admin/users/:id"
          element={<AdminPanelLayout></AdminPanelLayout>} >
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;