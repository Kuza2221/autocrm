import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api.js';
import { Plus, Search, Edit2, Trash2, ChevronDown, FileText, Camera, Printer, X, Upload } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge.jsx';

const STATUSES = ['new', 'in_progress', 'waiting_parts', 'ready', 'done', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const lang = () => (localStorage.getItem('lang') || 'ru').slice(0,2);

function OrderForm({ initial, onSave, onClose, templateData }) {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initial || {
    client_id: '', vehicle_id: '', master_id: '', status: 'new', priority: 'normal',
    complaint: '', diagnosis: '', work_done: '', total_parts: 0, total_labor: 0,
    discount: 0, paid: 0, due_date: '', items: []
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data));
    api.get('/users').then(r => setUsers(r.data));
  }, []);

  useEffect(() => {
    if (templateData) {
      setForm(f => ({ ...f, complaint: templateData.complaint || f.complaint, items: templateData.items || f.items, total_labor: templateData.total_labor || f.total_labor }));
    }
  }, [templateData]);

  useEffect(() => {
    if (form.client_id) api.get(`/vehicles?client_id=${form.client_id}`).then(r => setVehicles(r.data));
    else setVehicles([]);
  }, [form.client_id]);

  const addItem = () => set('items', [...form.items, { type: 'service', name: '', quantity: 1, unit_price: 0, total: 0 }]);
  const updateItem = (i, k, v) => {
    const items = [...form.items];
    items[i] = { ...items[i], [k]: v };
    if (k === 'quantity' || k === 'unit_price') {
      items[i].total = Number(items[i].quantity) * Number(items[i].unit_price);
    }
    set('items', items);
  };
  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initial?.id) await api.put(`/orders/${initial.id}`, form);
    else await api.post('/orders', form);
    onSave();
  };

  const total = Number(form.total_parts) + Number(form.total_labor) - Number(form.discount);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('orders.client')}</label>
          <select className="input" value={form.client_id} onChange={e => { set('client_id', e.target.value); set('vehicle_id', ''); }}>
            <option value="">{t('common.all')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('orders.vehicle')}</label>
          <select className="input" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
            <option value="">—</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.plate && `(${v.plate})`}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('orders.master')}</label>
          <select className="input" value={form.master_id} onChange={e => set('master_id', e.target.value)}>
            <option value="">—</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('orders.dueDate')}</label>
          <input className="input" type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('orders.status')}</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{t(`orders.statuses.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('orders.priority')}</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{t(`orders.priorities.${p}`)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">{t('orders.complaint')}</label>
        <textarea className="input" rows={2} value={form.complaint} onChange={e => set('complaint', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('orders.diagnosis')}</label>
        <textarea className="input" rows={2} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('orders.workDone')}</label>
        <textarea className="input" rows={2} value={form.work_done} onChange={e => set('work_done', e.target.value)} />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">{t('orders.items')}</label>
          <button type="button" onClick={addItem} className="btn-secondary py-1 text-xs"><Plus size={12}/>{t('orders.addItem')}</button>
        </div>
        {form.items.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
              <span className="col-span-1">{t('orders.itemType')}</span>
              <span className="col-span-5">{t('orders.itemName')}</span>
              <span className="col-span-2">{t('orders.itemQty')}</span>
              <span className="col-span-2">{t('orders.itemPrice')}</span>
              <span className="col-span-1">{t('orders.itemTotal')}</span>
              <span className="col-span-1"></span>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className="input col-span-1 text-xs px-1" value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                  <option value="service">🔧</option>
                  <option value="part">📦</option>
                </select>
                <input className="input col-span-5 text-xs" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder={t('orders.itemName')} />
                <input className="input col-span-2 text-xs" type="number" min="0" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input className="input col-span-2 text-xs" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                <span className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300">{Number(item.total).toFixed(0)}</span>
                <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        {[['total_parts', t('orders.parts')], ['total_labor', t('orders.labor')], ['discount', t('orders.discount')], ['paid', t('orders.paid')]].map(([k, label]) => (
          <div key={k}>
            <label className="label">{label}</label>
            <input className="input" type="number" min="0" step="0.01" value={form[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <div className="col-span-2 flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('orders.total')}:</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{total.toFixed(2)}</span>
        </div>
        <div className="col-span-2 flex justify-between items-center text-sm">
          <span className="text-gray-500">{t('orders.debt')}:</span>
          <span className={`font-semibold ${total - Number(form.paid) > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {(total - Number(form.paid)).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

function PhotosTab({ orderId }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [type, setType] = useState('other');
  const [viewPhoto, setViewPhoto] = useState(null);
  const fileRef = useRef(null);
  const l = lang();

  const load = () => api.get(`/order-photos/${orderId}`).then(r => setPhotos(r.data));
  useEffect(() => { load(); }, [orderId]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await api.post(`/order-photos/${orderId}`, { data: ev.target.result, caption, type });
      setCaption('');
      load();
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const loadPhotoData = async (photo) => {
    const { data } = await api.get(`/order-photos/${orderId}/photo/${photo.id}`);
    setViewPhoto({ ...photo, data: data.data });
  };

  const deletePhoto = async (id) => {
    await api.delete(`/order-photos/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-32">
          <label className="label">{l==='ru'?'Подпись':'Caption'}</label>
          <input className="input text-sm" value={caption} onChange={e => setCaption(e.target.value)} />
        </div>
        <div>
          <label className="label">{l==='ru'?'Тип':'Type'}</label>
          <select className="input text-sm" value={type} onChange={e => setType(e.target.value)}>
            <option value="before">{l==='ru'?'До':'Before'}</option>
            <option value="after">{l==='ru'?'После':'After'}</option>
            <option value="other">{l==='ru'?'Другое':'Other'}</option>
          </select>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary py-2">
          <Upload size={14}/> {l==='ru'?'Загрузить':'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Camera size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{l==='ru'?'Нет фотографий':'No photos yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map(p => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square cursor-pointer" onClick={() => loadPhotoData(p)}>
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Camera size={24} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.type} {p.caption && `· ${p.caption}`}
              </div>
              <button onClick={e => { e.stopPropagation(); deletePhoto(p.id); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setViewPhoto(null)}>
          <div className="max-w-2xl max-h-screen p-4" onClick={e => e.stopPropagation()}>
            <img src={viewPhoto.data} alt={viewPhoto.caption} className="max-w-full max-h-[80vh] rounded-lg" />
            {viewPhoto.caption && <p className="text-white text-center mt-2">{viewPhoto.caption}</p>}
            <button onClick={() => setViewPhoto(null)} className="absolute top-4 right-4 text-white"><X size={24}/></button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetail({ order, onClose }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('info');
  const l = lang();
  const fmt = (n) => Number(n || 0).toLocaleString();
  const total = Number(order.total_parts) + Number(order.total_labor) - Number(order.discount);

  const tabs = [
    { id: 'info', label: l==='ru'?'Информация':'Info' },
    { id: 'photos', label: l==='ru'?'Фото':'Photos' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 w-full pb-0">
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===tb.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tb.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 no-print">
            <Printer size={14}/> {l==='ru'?'Печать':'Print'}
          </button>
        </div>
      </div>

      {tab === 'info' && (
        <div className="space-y-4 print-order">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">#{order.id}</span></div>
            <div><span className="text-gray-400">{order.created_at?.slice(0,10)}</span></div>
            {order.client_name && <div><span className="text-gray-500">{t('orders.client')}:</span> <span className="font-medium">{order.client_name}</span></div>}
            {(order.brand || order.model) && <div><span className="text-gray-500">{t('orders.vehicle')}:</span> <span className="font-medium">{order.brand} {order.model} {order.plate && `(${order.plate})`}</span></div>}
          </div>
          {order.complaint && <div><p className="text-xs text-gray-400 mb-1">{t('orders.complaint')}</p><p className="text-sm">{order.complaint}</p></div>}
          {order.diagnosis && <div><p className="text-xs text-gray-400 mb-1">{t('orders.diagnosis')}</p><p className="text-sm">{order.diagnosis}</p></div>}
          {order.work_done && <div><p className="text-xs text-gray-400 mb-1">{t('orders.workDone')}</p><p className="text-sm">{order.work_done}</p></div>}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">{t('orders.parts')}:</span><span>{fmt(order.total_parts)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t('orders.labor')}:</span><span>{fmt(order.total_labor)}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('orders.discount')}:</span><span>-{fmt(order.discount)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-1"><span>{t('orders.total')}:</span><span>{fmt(total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t('orders.paid')}:</span><span className="text-green-600">{fmt(order.paid)}</span></div>
            {total - Number(order.paid) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('orders.debt')}:</span><span className="text-red-500">{fmt(total - Number(order.paid))}</span></div>}
          </div>
        </div>
      )}

      {tab === 'photos' && <PhotosTab orderId={order.id} />}
    </div>
  );
}

function TemplatesDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const l = lang();

  const load = () => api.get('/order-templates').then(r => setTemplates(r.data));

  const toggle = () => {
    if (!open) load();
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button onClick={toggle} className="btn-secondary flex items-center gap-1.5">
        <FileText size={15}/>
        {l==='ru'?'Шаблоны':l==='es'?'Plantillas':'Templates'}
        <ChevronDown size={13} className={`transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 overflow-hidden">
          {templates.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">{l==='ru'?'Нет шаблонов':'No templates'}</p>
          ) : (
            templates.map(t => (
              <button key={t.id} onClick={() => { onSelect(t); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <p className="font-medium">{t.name}</p>
                {t.complaint && <p className="text-xs text-gray-400 truncate">{t.complaint}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    api.get(`/orders?${params}`).then(r => setOrders(r.data));
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const deleteOrder = async (id) => {
    if (!confirm(t('common.confirm') + '?')) return;
    await api.delete(`/orders/${id}`);
    load();
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    load();
  };

  const fmt = (n) => Number(n || 0).toLocaleString();

  const openNew = (tpl) => {
    setSelected(null);
    setTemplateData(tpl || null);
    setModal('form');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders.title')}</h1>
        <div className="flex items-center gap-2">
          <TemplatesDropdown onSelect={(tpl) => openNew(tpl)} />
          <button onClick={() => openNew()} className="btn-primary">
            <Plus size={16} /> {t('orders.add')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('common.search') + '...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('common.all')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`orders.statuses.${s}`)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{t('orders.client')}</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">{t('orders.vehicle')}</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden lg:table-cell">{t('orders.master')}</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">{t('orders.status')}</th>
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t('orders.priority')}</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t('orders.total')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">{t('common.noData')}</td></tr>
            )}
            {orders.map(o => {
              const total = Number(o.total_parts) + Number(o.total_labor) - Number(o.discount);
              const debt = total - Number(o.paid);
              return (
                <tr key={o.id} className="table-row">
                  <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => { setDetailOrder(o); setModal('detail'); }}>#{o.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{o.client_name || '—'}</div>
                    {o.client_phone && <div className="text-xs text-gray-400">{o.client_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{o.brand} {o.model} {o.plate && <span className="text-xs">({o.plate})</span>}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{o.master_name || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={e => changeStatus(o.id, e.target.value)}
                      className="text-xs border-0 bg-transparent cursor-pointer focus:outline-none"
                      onClick={e => e.stopPropagation()}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{t(`orders.statuses.${s}`)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><PriorityBadge priority={o.priority} /></td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <div className="font-medium text-gray-900 dark:text-white">{fmt(total)}</div>
                    {debt > 0 && <div className="text-xs text-red-500">-{fmt(debt)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setSelected(o); setTemplateData(null); setModal('form'); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => deleteOrder(o.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
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

      <Modal open={modal === 'form'} onClose={() => { setModal(null); load(); }} title={selected ? `${t('orders.edit')} #${selected.id}` : t('orders.add')} size="xl">
        <OrderForm initial={selected} templateData={templateData} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={detailOrder ? `${t('orders.title')} #${detailOrder.id}` : ''} size="lg">
        {detailOrder && <OrderDetail order={detailOrder} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
