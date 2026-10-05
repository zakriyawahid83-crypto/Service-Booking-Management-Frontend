import axios from "axios";
import {
  AUTH_NOTICE_KEY,
  clearAuthSession,
  getAccessToken,
} from "./authSession";

const API_BASE_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "https://service-booking-management-system-production.up.railway.app";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      sessionStorage.setItem(
        AUTH_NOTICE_KEY,
        "Your session has expired. Please sign in again."
      );

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;