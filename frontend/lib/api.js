import {
  apiClient,
  queryString,
  unwrap,
  unwrapPaginated,
} from "@/lib/api-client";
const get = async (path, params) =>
  unwrap(await apiClient.get(params ? `${path}?${queryString(params)}` : path));

const post = async (path, data, config) =>
  unwrap(await apiClient.post(path, data, config));

const patch = async (path, data, config) =>
  unwrap(await apiClient.patch(path, data, config));

const del = async (path) => unwrap(await apiClient.delete(path));

export const api = {
  auth: {
    login: async (data) => unwrap(await apiClient.post("/auth/login", data)),

    forgotPassword: async (data) =>
      unwrap(await apiClient.post("/auth/forgot-password", data)),

    resetPassword: async (data) =>
      unwrap(await apiClient.post("/auth/reset-password", data)),

    me: async () => get("/auth/me"),

    logout: async () => post("/auth/logout"),

    changePassword: async (data) => post("/auth/change-password", data),
  },

  dashboard: {
    get: (params) => get("/dashboard", params),
  },

  analytics: {
    dashboard: (params) => get("/analytics", params),

    financial: (params) => get("/analytics/financial", params),

    sales: (params) => get("/analytics/sales", params),

    expenses: (params) => get("/analytics/expenses", params),

    production: (params) => get("/analytics/production", params),
  },

  reports: {
    all: (params) => get("/reports", params),

    financial: (params) => get("/reports/financial", params),

    sales: (params) => get("/reports/sales", params),

    expenses: (params) => get("/reports/expenses", params),

    production: (params) => get("/reports/production", params),
  },

  ponds: {
    list: (params) => get("/ponds", params),

    get: (id) => get(`/ponds/${id}`),

    create: (data) => post("/ponds", data),

    update: (id, data) => patch(`/ponds/${id}`, data),

    remove: (id) => del(`/ponds/${id}`),
  },

  stocking: {
    list: (params) => get("/stocking", params),

    get: (id) => get(`/stocking/${id}`),

    create: (data) => post("/stocking", data),

    update: (id, data) => patch(`/stocking/${id}`, data),

    remove: (id) => del(`/stocking/${id}`),
  },

  feeding: {
    today: () => get("/feeding/today"),

    list: (params) => get("/feeding", params),

    get: (id) => get(`/feeding/${id}`),

    create: (data) => post("/feeding", data),

    update: (id, data) => patch(`/feeding/${id}`, data),

    remove: (id) => del(`/feeding/${id}`),
  },

  water: {
    summary: () => get("/water-management/summary"),

    list: (params) => get("/water-management", params),

    get: (id) => get(`/water-management/${id}`),

    create: (data) => post("/water-management", data),

    update: (id, data) => patch(`/water-management/${id}`, data),

    recordChange: (id, data) =>
      post(`/water-management/${id}/water-change`, data),
  },
  growth: {
    analytics: (params) => get("/growth/analytics", params),

    list: (params) => get("/growth", params),

    get: (id) => get(`/growth/${id}`),

    create: (data) => post("/growth", data),

    update: (id, data) => patch(`/growth/${id}`, data),

    remove: (id) => del(`/growth/${id}`),
  },
  mortality: {
    list: async (params = {}) => {
      return get("/mortality", params);
    },

    summary: async (params = {}) => {
      const response = await get("/mortality/summary", params);

      /**
       * Backend response:
       *
       * data: {
       *   summary: {
       *     totalMortality,
       *     records,
       *     byPond,
       *     byCause
       *   }
       * }
       *
       * Return the summary itself so
       * frontend can use:
       *
       * summary.totalMortality
       */
      return response?.summary ?? response;
    },

    get: async (id) => {
      const response = await get(`/mortality/${id}`);

      return response?.record ?? response;
    },

    create: async (data) => {
      return post("/mortality", data);
    },

    update: async (id, data) => {
      return patch(`/mortality/${id}`, data);
    },
  },

  sales: {
    summary: (params) => get("/sales/summary", params),

    list: (params) => get("/sales", params),

    get: (id) => get(`/sales/${id}`),

    create: (data) => post("/sales", data),

    update: (id, data) => patch(`/sales/${id}`, data),

    remove: (id) => del(`/sales/${id}`),

    invoice: (id) =>
      apiClient.get(`/invoices/${id}/print`, {
        responseType: "blob",
      }),
  },

  expenses: {
    summary: (params) => get("/expenses/summary", params),

    list: (params) => get("/expenses", params),

    get: (id) => get(`/expenses/${id}`),

    create: (data) => post("/expenses", data),

    update: (id, data) => patch(`/expenses/${id}`, data),

    remove: (id) => del(`/expenses/${id}`),
  },

  /*
   * ========================================================
   * INVENTORY
   * ========================================================
   */

  inventory: {
    list: (params) => get("/inventory", params),

    summary: () => get("/inventory/summary"),

    lowStock: () => get("/inventory/low-stock"),

    get: (id) => get(`/inventory/${id}`),

    create: (data) => post("/inventory", data),

    update: (id, data) => patch(`/inventory/${id}`, data),

    remove: (id) => del(`/inventory/${id}`),

    stockIn: (id, data) => post(`/inventory/${id}/stock-in`, data),

    stockOut: (id, data) => post(`/inventory/${id}/stock-out`, data),

    adjust: (id, data) => post(`/inventory/${id}/adjust`, data),

    /*
     * GLOBAL TRANSACTION HISTORY
     *
     * No inventory ID is required.
     */
    transactions: async (params = {}) => {
      const query = queryString(params);

      const response = await apiClient.get(
        `/inventory/transactions${query ? `?${query}` : ""}`,
      );

      return unwrapPaginated(response, "transactions");
    },

    /*
     * TRANSACTION HISTORY FOR ONE ITEM
     */
    itemTransactions: async (inventoryId, params = {}) => {
      const id =
        typeof inventoryId === "string" ? inventoryId : inventoryId?._id;

      if (!id || typeof id !== "string" || id === "[object Object]") {
        throw new Error("A valid inventory item ID is required.");
      }

      const query = queryString(params);

      const response = await apiClient.get(
        `/inventory/${encodeURIComponent(id)}/transactions${
          query ? `?${query}` : ""
        }`,
      );

      return unwrapPaginated(response, "transactions");
    },
  },

  customers: {
    summary: (params) => get("/customers/summary", params),

    list: (params) => get("/customers", params),

    get: (id) => get(`/customers/${id}`),

    create: (data) => post("/customers", data),

    update: (id, data) => patch(`/customers/${id}`, data),

    remove: (id) => del(`/customers/${id}`),
  },

  suppliers: {
    list: (params) => get("/suppliers", params),

    get: (id) => get(`/suppliers/${id}`),

    create: (data) => post("/suppliers", data),

    update: (id, data) => patch(`/suppliers/${id}`, data),

    remove: (id) => del(`/suppliers/${id}`),
  },

  activities: {
    summary: (params) => get("/daily-activities/summary", params),

    list: (params) => get("/daily-activities", params),

    get: (id) => get(`/daily-activities/${id}`),

    create: (data) => post("/daily-activities", data),

    update: (id, data) => patch(`/daily-activities/${id}`, data),

    remove: (id) => del(`/daily-activities/${id}`),
  },

  notifications: {
    unreadCount: () => get("/notifications/unread-count"),

    list: (params) => get("/notifications", params),

    get: (id) => get(`/notifications/${id}`),

    create: (data) => post("/notifications", data),

    read: (id) => patch(`/notifications/${id}/read`),

    unread: (id) => patch(`/notifications/${id}/unread`),

    readAll: () => patch("/notifications/read-all"),

    remove: (id) => del(`/notifications/${id}`),
  },

  gallery: {
    list: (params) => get("/gallery", params),

    get: (id) => get(`/gallery/${id}`),

    create: (formData) =>
      post("/gallery", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),

    update: (id, data) => patch(`/gallery/${id}`, data),

    remove: (id) => del(`/gallery/${id}`),
  },

  settings: {
    all: () => get("/settings"),

    update: (data) => patch("/settings", data),

    profile: () => get("/settings/profile"),

    updateProfile: (data) => patch("/settings/profile", data),

    uploadAvatar: (formData) =>
      post("/settings/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),

    account: () => get("/settings/account"),

    changeEmail: (data) => patch("/settings/account/email", data),

    changePassword: (data) => post("/settings/account/change-password", data),

    logout: () => post("/settings/account/logout"),

    notifications: () => get("/settings/notifications"),

    updateNotifications: (data) => patch("/settings/notifications", data),

    farm: () => get("/settings/farm"),

    updateFarm: (data) => patch("/settings/farm", data),

    uploadFarmLogo: (formData) =>
      post("/settings/farm/logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),

    removeFarmLogo: () => del("/settings/farm/logo"),

    feedingSchedule: () => get("/settings/feeding-schedule"),

    updateFeedingSchedule: (data) => patch("/settings/feeding-schedule", data),
  },

  public: {
    home: () => get("/public"),

    about: () => get("/public/about"),

    contact: () => get("/public/contact"),

    overview: () => get("/public/overview"),

    gallery: (params) => get("/public/gallery", params),

    content: (params) => get("/public/content", params),
  },
};