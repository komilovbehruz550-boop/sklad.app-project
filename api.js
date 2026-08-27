// api.js — backend bilan ishlash uchun yordamchi funksiyalar

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("sklad_token");
}
function setToken(token) {
  localStorage.setItem("sklad_token", token);
}
function clearToken() {
  localStorage.removeItem("sklad_token");
  localStorage.removeItem("sklad_user");
}
function getUser() {
  const raw = localStorage.getItem("sklad_user");
  return raw ? JSON.parse(raw) : null;
}
function setUser(user) {
  localStorage.setItem("sklad_user", JSON.stringify(user));
}

async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_BASE + path, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || "Xatolik yuz berdi (" + res.status + ")");
  }
  return data;
}

const api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => apiRequest("/auth/me"),

  getProducts: () => apiRequest("/products"),
  getProduct: (id) => apiRequest(`/products/${id}`),
  createProduct: (payload) => apiRequest("/products", { method: "POST", body: JSON.stringify(payload) }),
  deleteProduct: (id) => apiRequest(`/products/${id}`, { method: "DELETE" }),

  getBatches: (productId) => apiRequest("/batches" + (productId ? `?product_id=${productId}` : "")),
  createBatch: (payload) => apiRequest("/batches", { method: "POST", body: JSON.stringify(payload) }),
  splitBatch: (id, boxesToSplit) => apiRequest(`/batches/${id}/split`, { method: "POST", body: JSON.stringify({ boxes_to_split: boxesToSplit }) }),
  scanBarcode: (code) => apiRequest(`/batches/scan/${encodeURIComponent(code)}`),

  getMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest("/movements" + (qs ? `?${qs}` : ""));
  },
  createChiqim: (payload) => apiRequest("/movements/chiqim", { method: "POST", body: JSON.stringify(payload) }),

  getMonthlyReport: (productId) => apiRequest("/reports/monthly" + (productId ? `?product_id=${productId}` : "")),

  getDashboard: () => apiRequest("/dashboard"),
};
