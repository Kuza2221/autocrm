import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../App.jsx';
import AIAssistant from './AIAssistant.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import OnboardingTour from './OnboardingTour.jsx';
import OnboardingChecklist from './OnboardingChecklist.jsx';
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Package,
  DollarSign, BarChart2, Settings, LogOut, Menu, X, Moon, Sun, Wrench
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/clients', icon: Users, key: 'clients' },
  { to: '/orders', icon: ClipboardList, key: 'orders' },
  { to: '/calendar', icon: Calendar, key: 'calendar' },
  { to: '/warehouse', icon: Package, key: 'warehouse' },
  { to: '/finance', icon: DollarSign, key: 'finance' },
  { to: '/analytics', icon: BarChart2, key: 'analytics' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

export default function Layout({ children }) {
  const { t } = useTranslation();
  const { user, logout, dark, setDark } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">AutoCRM</span>
        </div>

        {/* Global Search */}
        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-800">
          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={key}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Icon size={18} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button onClick={() => setDark(!dark)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? t('settings.light') : t('settings.dark')}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Wrench size={12} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">AutoCRM</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* AI Assistant floating button */}
      <AIAssistant />
      <OnboardingTour />
    </div>
  );
}
