import axios from 'axios';

// 租客端專用 axios 實例。token 存在 localStorage 的 tenantToken，與房東端 (token) 分開，
// 兩端可同時登入互不干擾。401 時導回租客登入頁。
const tenantApi = axios.create({
  baseURL: '/api',
});

tenantApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenantToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

tenantApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tenantToken');
      if (window.location.pathname.startsWith('/tenant') && window.location.pathname !== '/tenant/login') {
        window.location.href = '/tenant/login';
      }
    }
    return Promise.reject(err);
  }
);

export default tenantApi;
