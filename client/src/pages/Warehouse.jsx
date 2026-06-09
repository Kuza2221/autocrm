import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal.jsx';

function PartForm({ initial, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || { name: '', sku: '', category: '', qty: 0, min_qty: 0, buy_price: 0, sell_price: 0, supplier: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initial?.id) await axios.put(`/api/parts/${initial.id}`, form);
    else await axios.post('/api/parts', form);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">{t('warehouse.name')} *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{t('warehouse.sku')}</label>
          <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('warehouse.category')}</label>
          <input className="input" value={form.category} onChange={e => set('category', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('warehouse.qty')}</label>
          <input className="input" type="number" min="0" value={form.qty} onChange={e => set('qty', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('warehouse.minQty')}</label>
          <input className="input" type="number" min="0" value={form.min_qty} onChange={e => set('min_qty', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('warehouse.buyPrice')}</label>
          <input className="input" type="number" min="0" step="0.01" value={form.buy_price} onChange={e => set('buy_price', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('warehouse.sellPrice')}</label>
          <input className="input" type="number" min="0" step="0.01" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">{t('warehouse.supplier')}</label>
        <input className="input" value={form.supplier} onChange={e => set('supplier', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('warehouse.notes')}</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

export default function Warehouse() {
  const { t } = useTranslation();
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (lowOnly) params.set('low_stock', 'true');
    axios.get(`/api/parts?${params}`).then(r => setParts(r.data));
  }, [search, lowOnly]);

  useEffect(() => { load(); }, [load]);

  const deletePart = async (id) => {
    if (!confirm(t('common.confirm') + '?')) return;
    await axios.delete(`/api/parts/${id}`);
    load();
  };

  const stockValue = parts.reduce((sum, p) => sum + Number(p.qty) * Number(p.buy_price), 0);
  const lowCount = parts.filter(p => p.qty <= p.min_qty && p.min_qty > 0).length;
  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('warehouse.title')}</h1>
        <button onClick={() => { setSelected(null); setModal('form'); }} className="btn-primary">
          <Plus size={16} /> {t('warehouse.add')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('warehouse.stockValue')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmt(stockValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">{t('common.total')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{parts.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-orange-500 flex items-center gap-1"><AlertTriangle size={13}/>{t('warehouse.lowStock')}</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{lowCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('warehouse.search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('warehouse.lowStock')}</span>
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">{t('warehouse.name')}</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">{t('warehouse.sku')}</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">{t('warehouse.category')}</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">{t('warehouse.qty')}</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">{t('warehouse.sellPrice')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('common.noData')}</td></tr>
            )}
            {parts.map(p => {
              const low = p.min_qty > 0 && p.qty <= p.min_qty;
              return (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                    {p.supplier && <div className="text-xs text-gray-400">{p.supplier}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${low ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {low && <AlertTriangle size={10} className="mr-1" />}
                      {p.qty} / {p.min_qty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{fmt(p.sell_price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setSelected(p); setModal('form'); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => deletePart(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <Modal open={modal === 'form'} onClose={() => { setModal(null); load(); }} title={selected ? t('warehouse.edit') : t('warehouse.add')}>
        <PartForm initial={selected} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
