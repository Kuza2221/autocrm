import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Modal from '../components/Modal.jsx';

const EXPENSE_CATS = ['Запчасти', 'Аренда', 'Зарплата', 'Коммунальные', 'Инструменты', 'Прочее',
  'Parts', 'Rent', 'Salary', 'Utilities', 'Tools', 'Other'];

function ExpenseForm({ onSave, onClose }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ category: 'Прочее', description: '', amount: '', date: today });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/expenses', form);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">{t('finance.category')}</label>
        <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
          {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('finance.description')}</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{t('finance.amount')} *</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('finance.date')}</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

export default function Finance() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [modal, setModal] = useState(null);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const load = () => {
    axios.get('/api/orders').then(r => setOrders(r.data));
    axios.get(`/api/expenses?from=${from}&to=${to}`).then(r => setExpenses(r.data));
  };

  useEffect(() => { load(); }, [from, to]);

  const deleteExpense = async (id) => {
    await axios.delete(`/api/expenses/${id}`);
    load();
  };

  const doneOrders = orders.filter(o => o.status === 'done');
  const revenue = doneOrders.reduce((s, o) => s + Number(o.total_parts) + Number(o.total_labor) - Number(o.discount), 0);
  const totalPaid = doneOrders.reduce((s, o) => s + Number(o.paid), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - totalExpenses;

  const unpaidOrders = orders.filter(o => {
    const total = Number(o.total_parts) + Number(o.total_labor) - Number(o.discount);
    return total - Number(o.paid) > 0 && o.status !== 'cancelled';
  });
  const totalDebt = unpaidOrders.reduce((s, o) => {
    const total = Number(o.total_parts) + Number(o.total_labor) - Number(o.discount);
    return s + total - Number(o.paid);
  }, 0);

  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.title')}</h1>
        <button onClick={() => setModal('expense')} className="btn-primary">
          <Plus size={16} /> {t('finance.addExpense')}
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('common.from')}:</span>
          <input className="input w-36" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('common.to')}:</span>
          <input className="input w-36" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <p className="text-sm text-gray-500">{t('finance.revenue')}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(revenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('orders.paid')}: {fmt(totalPaid)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <p className="text-sm text-gray-500">{t('finance.expenses')}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(totalExpenses)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-blue-500" />
            <p className="text-sm text-gray-500">{t('finance.profit')}</p>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(profit)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-red-500 mb-1">{t('finance.totalDebt')}</p>
          <p className="text-2xl font-bold text-red-500">{fmt(totalDebt)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{unpaidOrders.length} {t('finance.unpaidOrders')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unpaid orders */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('finance.unpaidOrders')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {unpaidOrders.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">{t('common.noData')}</p>}
            {unpaidOrders.map(o => {
              const total = Number(o.total_parts) + Number(o.total_labor) - Number(o.discount);
              const debt = total - Number(o.paid);
              return (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">#{o.id} — {o.client_name || '—'}</span>
                    <div className="text-xs text-gray-400">{o.brand} {o.model} {o.plate && `· ${o.plate}`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-500">−{fmt(debt)}</div>
                    <div className="text-xs text-gray-400">{t('common.total')}: {fmt(total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('finance.expenses')}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {expenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">{t('common.noData')}</p>}
            {expenses.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{e.category}</span>
                  {e.description && <div className="text-xs text-gray-400">{e.description}</div>}
                  <div className="text-xs text-gray-400">{e.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-white">{fmt(e.amount)}</span>
                  <button onClick={() => deleteExpense(e.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={modal === 'expense'} onClose={() => { setModal(null); load(); }} title={t('finance.addExpense')}>
        <ExpenseForm onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
