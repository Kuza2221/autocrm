import axios from 'axios';

// Central axios instance — all API calls go through here
const api = axios.create({
  baseURL: '/api',
  withCredentials: true // send cookies on every request
});

// Token stored in memory (not localStorage — more secure)
let _accessToken = null;

export function setToken(token) {
  _accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
  }
}

export function getToken() { return _accessToken; }

// ── Response interceptor: auto-refresh on 401 ────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry && !orig.url?.includes('/users/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          orig.headers['Authorization'] = `Bearer ${token}`;
          return api(orig);
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/users/refresh');
        setToken(data.accessToken);
        refreshQueue.forEach(p => p.resolve(data.accessToken));
        refreshQueue = [];
        orig.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch (e) {
        refreshQueue.forEach(p => p.reject(e));
        refreshQueue = [];
        setToken(null);
        window.location.href = '/';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
