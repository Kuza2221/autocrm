import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, addDays } from 'date-fns';

function AppForm({ initial, onSave, onClose }) {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initial || {
    client_id: '', vehicle_id: '', master_id: '', title: '', description: '',
    start_time: '', end_time: '', status: 'scheduled'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    axios.get('/api/clients').then(r => setClients(r.data));
    axios.get('/api/users').then(r => setUsers(r.data));
  }, []);
  useEffect(() => {
    if (form.client_id) axios.get(`/api/vehicles?client_id=${form.client_id}`).then(r => setVehicles(r.data));
  }, [form.client_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initial?.id) await axios.put(`/api/appointments/${initial.id}`, form);
    else await axios.post('/api/appointments', form);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">{t('calendar.appointmentTitle')} *</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('calendar.client')}</label>
          <select className="input" value={form.client_id} onChange={e => { set('client_id', e.target.value); set('vehicle_id', ''); }}>
            <option value="">—</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('calendar.vehicle')}</label>
          <select className="input" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
            <option value="">—</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('calendar.master')}</label>
          <select className="input" value={form.master_id} onChange={e => set('master_id', e.target.value)}>
            <option value="">—</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('orders.status')}</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="scheduled">{t('orders.statuses.new')}</option>
            <option value="completed">{t('orders.statuses.done')}</option>
            <option value="cancelled">{t('orders.statuses.cancelled')}</option>
          </select>
        </div>
        <div>
          <label className="label">{t('calendar.startTime')} *</label>
          <input className="input" type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('calendar.endTime')} *</label>
          <input className="input" type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">{t('calendar.description')}</label>
        <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

const STATUS_COLORS = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [daySelected, setDaySelected] = useState(null);

  const load = () => {
    const from = format(startOfMonth(current), "yyyy-MM-dd'T'00:00:00");
    const to = format(endOfMonth(current), "yyyy-MM-dd'T'23:59:59");
    axios.get(`/api/appointments?from=${from}&to=${to}`).then(r => setAppointments(r.data));
  };

  useEffect(() => { load(); }, [current]);

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const firstDay = (getDay(days[0]) + 6) % 7; // Mon=0

  const getApps = (day) => appointments.filter(a => isSameDay(new Date(a.start_time), day));

  const deleteApp = async (id) => {
    await axios.delete(`/api/appointments/${id}`);
    load();
    setDaySelected(null);
  };

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('calendar.title')}</h1>
        <button onClick={() => { setSelected(null); setModal('form'); }} className="btn-primary">
          <Plus size={16} /> {t('calendar.add')}
        </button>
      </div>

      <div className="card p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {format(current, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const apps = getApps(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                onClick={() => setDaySelected(day)}
                className={`min-h-[70px] p-1.5 rounded-lg cursor-pointer transition-colors border ${
                  isToday ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {apps.slice(0, 2).map(a => (
                    <div key={a.id} className={`text-white text-xs px-1 py-0.5 rounded truncate ${STATUS_COLORS[a.status] || 'bg-blue-500'}`}>
                      {a.title}
                    </div>
                  ))}
                  {apps.length > 2 && <div className="text-xs text-gray-400">+{apps.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail sidebar/modal */}
      {daySelected && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">{format(daySelected, 'dd MMMM yyyy')}</h3>
            <button onClick={() => setDaySelected(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
          </div>
          {getApps(daySelected).length === 0 ? (
            <p className="text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {getApps(daySelected).map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[a.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{a.title}</div>
                    <div className="text-xs text-gray-400">{a.start_time?.slice(11,16)} – {a.end_time?.slice(11,16)} · {a.master_name || '—'}</div>
                    {a.client_name && <div className="text-xs text-gray-500">{a.client_name} · {a.brand} {a.model}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(a); setModal('form'); }} className="text-xs text-blue-500 hover:text-blue-700">{t('common.edit')}</button>
                    <button onClick={() => deleteApp(a.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'form'} onClose={() => { setModal(null); load(); }} title={selected ? t('common.edit') : t('calendar.add')}>
        <AppForm initial={selected} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
