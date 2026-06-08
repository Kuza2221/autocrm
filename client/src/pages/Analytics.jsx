import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('month');
  const [revenue, setRevenue] = useState([]);
  const [services, setServices] = useState([]);
  const [masters, setMasters] = useState([]);

  useEffect(() => {
    axios.get(`/api/analytics/revenue?period=${period}`).then(r => setRevenue(r.data));
    axios.get('/api/analytics/services').then(r => setServices(r.data));
    axios.get('/api/analytics/masters').then(r => setMasters(r.data));
  }, [period]);

  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('analytics.title')}</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {['week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t(`analytics.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.revenueChart')}</h2>
        {revenue.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{t('common.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name={t('analytics.revenue')} fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="paid" name={t('analytics.paid')} fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top services */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.topServices')}</h2>
          {services.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{t('common.noData')}</div>
          ) : (
            <div className="space-y-3">
              {services.slice(0, 8).map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{s.count}×</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(s.count / services[0].count) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">{fmt(s.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Masters */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('analytics.masterStats')}</h2>
          {masters.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{t('common.noData')}</div>
          ) : (
            <div className="space-y-3">
              {masters.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.done_orders} / {m.total_orders} {t('analytics.orders')}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(m.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
