import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../store/authStore";

const apiClient = axios.create({
  baseURL: import.meta.env.PUBLIC_API_URL,
  withCredentials: true,
});

let isRefreshing = false;

let refreshPromise: Promise<string> | null = null;

// --------------------------------------------------
// REQUEST INTERCEPTOR
// --------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// --------------------------------------------------
// RESPONSE INTERCEPTOR
// --------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const is401 = error.response?.status === 401;

    const isRefreshRequest = originalRequest.url?.includes("/refresh-token");

    if (!is401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // ----------------------------------------------
      // Someone else is already refreshing
      // ----------------------------------------------

      if (isRefreshing && refreshPromise) {
        const newToken = await refreshPromise;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      }

      // ----------------------------------------------
      // Start refresh
      // ----------------------------------------------

      isRefreshing = true;

      refreshPromise = apiClient
        .get("/user/refresh-token")
        .then((response) => {
          const newToken = response.data.accessToken;

          useAuthStore.getState().setToken(newToken);

          return newToken;
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });

      const newToken = await refreshPromise;

      // ----------------------------------------------
      // Retry original request
      // ----------------------------------------------

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh token itself is invalid/expired
      useAuthStore.getState().clear();

      return Promise.reject(refreshError);
    }
  },
);

export { apiClient };
