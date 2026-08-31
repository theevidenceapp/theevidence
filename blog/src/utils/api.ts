import { useAuthStore } from "../store/authStore";// Adjust path to your zustand file

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URI || import.meta.env.PUBLIC_BACKEND_URI || "http://localhost:5000";
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  // Read token from Zustand store if available (client-side)
  let token: string | null = null;
  try {
    token = useAuthStore.getState().token;
  } catch (e) {
    // In SSR or if not initialized, token remains null
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
};