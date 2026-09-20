import { fetchAPI } from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const glBankService = {
  getMasterAkun: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    return fetchAPI(`/gl-bank/akun/master?${qs.toString()}`, { headers: getAuthHeaders() });
  },
  createMasterAkun: (payload) =>
    fetchAPI("/gl-bank/akun/master", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  updateMasterAkun: (id, payload) =>
    fetchAPI(`/gl-bank/akun/master/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  deleteMasterAkun: (id) =>
    fetchAPI(`/gl-bank/akun/master/${id}`, { method: "DELETE", headers: getAuthHeaders() }),
  getAkun: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    return fetchAPI(`/gl-bank/akun?${qs.toString()}`, { headers: getAuthHeaders() });
  },
  getTransaksi: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    return fetchAPI(`/gl-bank/transaksi?${qs.toString()}`, { headers: getAuthHeaders() });
  },
  getSaldo: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    return fetchAPI(`/gl-bank/saldo?${qs.toString()}`, { headers: getAuthHeaders() });
  },
  createTransaksi: (payload) =>
    fetchAPI("/gl-bank/transaksi", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  updateTransaksi: (id, payload) =>
    fetchAPI(`/gl-bank/transaksi/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  deleteTransaksi: (id) =>
    fetchAPI(`/gl-bank/transaksi/${id}`, { method: "DELETE", headers: getAuthHeaders() }),
};

export default glBankService;
