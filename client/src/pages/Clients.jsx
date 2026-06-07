import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, Car, ChevronRight, Phone, Mail } from 'lucide-react';
import Modal from '../components/Modal.jsx';

function ClientForm({ initial, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || { name: '', phone: '', email: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initial?.id) await axios.put(`/api/clients/${initial.id}`, form);
    else await axios.post('/api/clients', form);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">{t('clients.name')} *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('clients.phone')}</label>
          <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('clients.email')}</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">{t('clients.notes')}</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

function VehicleForm({ clientId, initial, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || { brand: '', model: '', year: '', vin: '', plate: '', color: '', mileage: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initial?.id) await axios.put(`/api/vehicles/${initial.id}`, form);
    else await axios.post('/api/vehicles', { ...form, client_id: clientId });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('vehicles.brand')} *</label>
          <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('vehicles.model')} *</label>
          <input className="input" value={form.model} onChange={e => set('model', e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('vehicles.year')}</label>
          <input className="input" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('vehicles.plate')}</label>
          <input className="input" value={form.plate} onChange={e => set('plate', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('vehicles.vin')}</label>
          <input className="input" value={form.vin} onChange={e => set('vin', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('vehicles.color')}</label>
          <input className="input" value={form.color} onChange={e => set('color', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('vehicles.mileage')}</label>
          <input className="input" type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">{t('vehicles.notes')}</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

export default function Clients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'detail' | 'vehicle'
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => axios.get(`/api/clients?search=${search}`).then(r => setClients(r.data));
  useEffect(() => { load(); }, [search]);

  const openDetail = async (c) => {
    const { data } = await axios.get(`/api/clients/${c.id}`);
    setDetail(data);
    setModal('detail');
  };

  const deleteClient = async (id) => {
    if (!confirm(t('clients.confirmDelete'))) return;
    await axios.delete(`/api/clients/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('clients.title')}</h1>
        <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> {t('clients.add')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder={t('clients.search')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t('clients.name')}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t('clients.phone')}</th>
              <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">{t('clients.vehicles')}</th>
              <th className="text-center px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">{t('clients.orders')}</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t('clients.noClients')}</td></tr>
            )}
            {clients.map(c => (
              <tr key={c.id} className="table-row">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                  {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                </td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{c.phone || '—'}</td>
                <td className="px-5 py-3 text-center hidden md:table-cell">
                  <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{c.vehicle_count}</span>
                </td>
                <td className="px-5 py-3 text-center hidden md:table-cell">
                  <span className="badge bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">{c.order_count}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openDetail(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => { setSelected(c); setModal('edit'); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Client */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => { setModal(null); load(); }} title={modal === 'add' ? t('clients.add') : t('clients.edit')}>
        <ClientForm initial={selected} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>

      {/* Detail */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={detail?.name} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {detail.phone && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Phone size={14}/>{detail.phone}</div>}
              {detail.email && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Mail size={14}/>{detail.email}</div>}
            </div>
            {detail.notes && <p className="text-sm text-gray-500">{detail.notes}</p>}

            {/* Vehicles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{t('clients.vehicles')}</h3>
                <button onClick={() => setModal('vehicle')} className="btn-secondary py-1 text-xs"><Plus size={13}/>{t('vehicles.add')}</button>
              </div>
              {detail.vehicles.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {detail.vehicles.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <Car size={16} className="text-gray-400" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">{v.brand} {v.model}</span>
                        <span className="text-gray-400 ml-2 text-xs">{v.year} {v.plate && `· ${v.plate}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders history */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('clients.orders')}</h3>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-gray-400">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                      <span className="text-gray-500">#{o.id}</span>
                      <span className="flex-1 mx-3 text-gray-700 dark:text-gray-300 truncate">{o.complaint || '—'}</span>
                      <span className="text-gray-400 text-xs">{o.created_at?.slice(0,10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add vehicle modal */}
      <Modal open={modal === 'vehicle'} onClose={() => setModal('detail')} title={t('vehicles.add')}>
        <VehicleForm clientId={detail?.id} onSave={async () => {
          const { data } = await axios.get(`/api/clients/${detail.id}`);
          setDetail(data);
          setModal('detail');
        }} onClose={() => setModal('detail')} />
      </Modal>
    </div>
  );
}
