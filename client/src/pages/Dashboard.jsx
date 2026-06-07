import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { ClipboardList, Users, DollarSign, AlertTriangle, Plus, Calendar, UserPlus, TrendingUp, Bell, Cake } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useApp } from '../App.jsx';
import { format } from 'date-fns';

const lang = () => (localStorage.getItem('lang') || 'ru').slice(0,2);

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
  const [birthdays, setBirthdays] = useState([]);
  const [reminders, setReminders] = useState([]);
  const l = lang();

  useEffect(() => {
    api.get('/analytics/summary').then(r => setStats(r.data));
    api.get('/orders').then(r => setOrders(r.data.slice(0, 8)));
    api.get('/clients/birthdays').then(r => setBirthdays(r.data)).catch(() => {});
    api.get('/reminders').then(r => setReminders(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString();

  const completeReminder = async (id) => {
    await api.put(`/reminders/${id}/complete`);
    api.get('/reminders').then(r => setReminders(r.data.slice(0, 5)));
  };

  const quickActions = [
    { icon: Plus, label: l==='ru'?'Новая заявка':l==='es'?'Nueva orden':'New Order', desc: l==='ru'?'Принять авто в ремонт':l==='es'?'Recibir vehículo':'Accept vehicle for repair', color: 'bg-blue-500', path: '/orders' },
    { icon: UserPlus, label: l==='ru'?'Новый клиент':l==='es'?'Nuevo cliente':'New Client', desc: l==='ru'?'Добавить клиента в базу':l==='es'?'Agregar cliente':'Add client to database', color: 'bg-purple-500', path: '/clients' },
    { icon: Calendar, label: l==='ru'?'Запись':l==='es'?'Cita':'Appointment', desc: l==='ru'?'Записать на приём':l==='es'?'Agendar cita':'Schedule appointment', color: 'bg-green-500', path: '/calendar' },
    { icon: TrendingUp, label: l==='ru'?'Аналитика':l==='es'?'Analítica':'Analytics', desc: l==='ru'?'Отчёты и статистика':l==='es'?'Informes':'Reports & stats', color: 'bg-orange-500', path: '/analytics' },
  ];

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

      {/* Birthdays widget */}
      {birthdays.length > 0 && (
        <div className="card p-5 border-l-4 border-pink-400">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} className="text-pink-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {l==='ru'?'Дни рождения (ближайшие 7 дней)':l==='es'?'Cumpleaños (próximos 7 días)':'Upcoming Birthdays (7 days)'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg px-3 py-2">
                <span className="text-lg">🎂</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone} · {c.birthday?.slice(5)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders widget */}
      {reminders.length > 0 && (
        <div className="card p-5 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {l==='ru'?'Напоминания':l==='es'?'Recordatorios':'Reminders'}
            </h2>
          </div>
          <div className="space-y-2">
            {reminders.map(r => {
              const overdue = r.due_date && new Date(r.due_date) < new Date();
              return (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg ${overdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/10'}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${overdue ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{r.title}</p>
                    <p className="text-xs text-gray-400">{r.client_name} {r.due_date && `· ${r.due_date}`}</p>
                  </div>
                  <button onClick={() => completeReminder(r.id)} className="ml-3 text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0">
                    ✓ {l==='ru'?'Готово':l==='es'?'Listo':'Done'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, desc, color, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="card p-4 text-left hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
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
