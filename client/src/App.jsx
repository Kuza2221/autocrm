import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Orders from './pages/Orders.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Warehouse from './pages/Warehouse.jsx';
import Finance from './pages/Finance.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import Schedule from './pages/Schedule.jsx';
import api, { setToken } from './api.js';

export const AppContext = createContext(null);
export function useApp() { return useContext(AppContext); }

const PERMISSIONS = {
  admin:       ['dashboard','clients','orders','calendar','warehouse','finance','analytics','settings','schedule'],
  manager:     ['dashboard','clients','orders','calendar','warehouse','finance','analytics','schedule'],
  receptionist:['dashboard','clients','orders','calendar'],
  mechanic:    ['dashboard','orders','warehouse','schedule'],
};

export function canAccess(role, resource) {
  return (PERMISSIONS[role] || []).includes(resource);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // checking cookie on load
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // ── Auto-login via refresh token cookie on page load ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1' && params.get('token')) {
      const token = params.get('token');
      setToken(token);
      api.get('/users/me').then(r => {
        setUser(r.data);
        window.history.replaceState({}, '', '/');
      }).catch(() => setAuthLoading(false)).finally(() => setAuthLoading(false));
      return;
    }
    api.post('/users/refresh')
      .then(({ data }) => {
        setToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => { /* No valid cookie — show login */ })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = ({ accessToken, user: u }) => {
    setToken(accessToken);
    setUser(u);
  };

  const logout = async () => {
    try { await api.post('/users/logout'); } catch {}
    setToken(null);
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">AutoCRM...</span>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, login, logout, dark, setDark, canAccess: (resource) => canAccess(user?.role, resource) }}>
      <BrowserRouter>
        {!user ? (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        )}
      </BrowserRouter>
    </AppContext.Provider>
  );
}
