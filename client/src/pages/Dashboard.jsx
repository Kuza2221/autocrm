import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ClipboardList, Users, DollarSign, AlertTriangle, Plus, Calendar, UserPlus, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useApp } from '../App.jsx';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get('/api/analytics/summary').then(r => setStats(r.data));
    axios.get('/api/orders').then(r => setOrders(r.data.slice(0, 8)));
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('dashboard.welcome')}, {user?.name} 👋</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label={t('dashboard.activeOrders')} value={stats?.activeOrders ?? '—'} color="bg-blue-500" />
        <StatCard icon={Users} label={t('dashboard.totalClients')} value={stats?.totalClients ?? '—'} color="bg-purple-500" />
        <StatCard icon={DollarSign} label={t('dashboard.monthRevenue')} value={stats ? fmt(stats.monthRevenue) : '—'} color="bg-green-500" sub={`${t('orders.paid')}: ${fmt(stats?.monthPaid)}`} />
        <StatCard icon={AlertTriangle} label={t('dashboard.lowStock')} value={stats?.lowStock ?? '—'} color="bg-orange-500" />
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.quickActions')}</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/orders')} className="btn-primary">
            <Plus size={16} /> {t('dashboard.newOrder')}
          </button>
          <button onClick={() => navigate('/clients')} className="btn-secondary">
            <UserPlus size={16} /> {t('dashboard.newClient')}
          </button>
          <button onClick={() => navigate('/calendar')} className="btn-secondary">
            <Calendar size={16} /> {t('dashboard.newAppointment')}
          </button>
          <button onClick={() => navigate('/analytics')} className="btn-secondary">
            <TrendingUp size={16} /> {t('analytics.title')}
          </button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.recentOrders')}</h2>
          <button onClick={() => navigate('/orders')} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
            {t('common.all')} →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t('orders.client')}</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">{t('orders.vehicle')}</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t('orders.status')}</th>
                <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t('orders.total')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('common.noData')}</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id} className="table-row cursor-pointer" onClick={() => navigate('/orders')}>
                  <td className="px-5 py-3 text-gray-500">#{o.id}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{o.client_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{o.brand} {o.model} {o.plate && `(${o.plate})`}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white hidden sm:table-cell">
                    {fmt(Number(o.total_parts) + Number(o.total_labor) - Number(o.discount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
