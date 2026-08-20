import axios from "axios";
import { TOKEN_KEY } from "@/providers/auth-provider";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * ---------------------------------------------------------
 * REQUEST INTERCEPTOR
 * ---------------------------------------------------------
 *
 * Automatically attach the administrator access token.
 */
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem(TOKEN_KEY);

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/*
 * ---------------------------------------------------------
 * RESPONSE INTERCEPTOR
 * ---------------------------------------------------------
 */
apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    /*
     * Network / timeout error
     */
    if (!error?.response) {
      const networkError = new Error(
        error?.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : "Unable to connect to the server. Please check your connection.",
      );

      networkError.status = null;
      networkError.code = error?.code || null;
      networkError.errors = null;
      networkError.data = null;

      return Promise.reject(networkError);
    }

    /*
     * Authentication failure
     */
    if (
      typeof window !== "undefined" &&
      error.response.status === 401 &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/forgot-password") &&
      !window.location.pathname.startsWith("/reset-password")
    ) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem("azff_admin");

      window.location.assign("/login?reason=session-expired");

      return Promise.reject(
        new Error("Your session has expired. Please log in again."),
      );
    }

    /*
     * Normalize backend errors into a predictable
     * frontend-friendly Error object.
     */
    const payload = error?.response?.data;

    const message =
      payload?.message || error?.message || "Something went wrong.";

    const normalized = new Error(message);

    normalized.status = error?.response?.status || null;

    normalized.errors = payload?.errors || null;

    normalized.data = payload || null;

    normalized.code = error?.code || null;

    return Promise.reject(normalized);
  },
);

/*
 * ---------------------------------------------------------
 * API RESPONSE HELPERS
 * ---------------------------------------------------------
 */

/**
 * Returns only the API `data` property.
 *
 * Example:
 *
 * {
 *   success: true,
 *   data: [...]
 * }
 *
 * becomes:
 *
 * [...]
 */
export const unwrap = (response) => {
  return response?.data?.data;
};

/**
 * Returns the complete normalized API payload.
 *
 * Useful for endpoints that return:
 *
 * data + meta
 *
 * such as paginated transaction history.
 */
export const unwrapResponse = (response) => {
  const payload = response?.data;

  return {
    success: payload?.success ?? true,

    message: payload?.message || "",

    data: payload?.data ?? null,

    meta: payload?.meta ?? null,
  };
};

/**
 * Convenience helper for paginated endpoints.
 *
 * Returns:
 *
 * {
 *   items: [],
 *   pagination: {}
 * }
 */
export const unwrapPaginated = (response, itemKey = "items") => {
  const payload = response?.data;

  return {
    [itemKey]: Array.isArray(payload?.data) ? payload.data : [],

    pagination: payload?.meta || {
      page: 1,
      limit: 0,
      total: 0,
      pages: 0,
    },

    success: payload?.success ?? true,

    message: payload?.message || "",
  };
};

/*
 * ---------------------------------------------------------
 * QUERY STRING
 * ---------------------------------------------------------
 *
 * Converts:
 *
 * {
 *   page: 1,
 *   limit: 25,
 *   search: "feed"
 * }
 *
 * into:
 *
 * page=1&limit=25&search=feed
 */
export const queryString = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    /*
     * Ignore empty values.
     */
    if (value === undefined || value === null || value === "") {
      return;
    }

    /*
     * Ignore NaN.
     */
    if (typeof value === "number" && Number.isNaN(value)) {
      return;
    }

    /*
     * Support arrays.
     *
     * Example:
     *
     * category: ["feed", "medicine"]
     */
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          search.append(key, String(item));
        }
      });

      return;
    }

    search.set(key, String(value));
  });

  return search.toString();
};
