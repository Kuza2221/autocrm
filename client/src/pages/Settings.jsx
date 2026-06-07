import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { Plus, Trash2, Globe, Moon, Sun, Calendar, Bot, Sparkles, ExternalLink, CheckCircle, AlertCircle, Key } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { useApp } from '../App.jsx';
import i18n from '../i18n/index.js';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];
const ROLES = ['admin', 'manager', 'mechanic', 'receptionist'];

function UserForm({ onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'mechanic' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      onSave();
    } catch {
      setError('Email already exists');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">{t('settings.name')} *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="label">{t('settings.email')} *</label>
        <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
      </div>
      <div>
        <label className="label">{t('settings.password')} *</label>
        <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
      </div>
      <div>
        <label className="label">{t('settings.role')}</label>
        <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{t(`settings.roles.${r}`)}</option>)}
        </select>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { user, dark, setDark } = useApp();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [gcal, setGcal] = useState({ configured: false, connected: false });
  const [aiStatus, setAiStatus] = useState({ configured: false });
  const [gcalLoading, setGcalLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const load = () => api.get('/users').then(r => setUsers(r.data));

  useEffect(() => {
    load();
    api.get('/google-calendar/status').then(r => setGcal(r.data)).catch(() => {});
    api.get('/ai/status').then(r => setAiStatus(r.data)).catch(() => {});

    // Handle Google OAuth callback result
    const google = searchParams.get('google');
    if (google === 'connected') {
      api.get('/google-calendar/status').then(r => setGcal(r.data));
    }
  }, []);

  const deleteUser = async (id) => {
    if (id === user?.id) return alert('Cannot delete yourself');
    if (!confirm(t('common.confirm') + '?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  const connectGoogle = async () => {
    setGcalLoading(true);
    try {
      const { data } = await api.get('/google-calendar/auth-url');
      window.location.href = data.url;
    } catch (e) {
      alert(e.response?.data?.error || 'Google not configured on server');
      setGcalLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Отключить Google Calendar?')) return;
    await api.delete('/google-calendar/disconnect');
    setGcal(g => ({ ...g, connected: false }));
  };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  const lang = i18n.language;
  const gcalLabel = {
    ru: { title: 'Google Calendar', connect: 'Подключить', disconnect: 'Отключить', connected: 'Подключён', notConfigured: 'Требуется настройка на сервере', syncAll: 'Синхронизировать все записи' },
    en: { title: 'Google Calendar', connect: 'Connect', disconnect: 'Disconnect', connected: 'Connected', notConfigured: 'Requires server configuration', syncAll: 'Sync all appointments' },
    es: { title: 'Google Calendar', connect: 'Conectar', disconnect: 'Desconectar', connected: 'Conectado', notConfigured: 'Requiere configuración en servidor', syncAll: 'Sincronizar todas las citas' },
  }[lang] || {};

  const syncAll = async () => {
    try {
      const { data } = await api.post('/google-calendar/sync-all');
      alert(`Синхронизировано: ${data.synced}, ошибок: ${data.errors}`);
    } catch (e) {
      alert('Ошибка синхронизации');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>

      {/* Language */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.language')}</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => changeLang(l.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                i18n.language === l.code
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}>
              <span>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          {dark ? <Moon size={18} className="text-gray-400" /> : <Sun size={18} className="text-gray-400" />}
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.theme')}</h2>
        </div>
        <div className="flex gap-3">
          {[{ val: false, icon: Sun, label: t('settings.light') }, { val: true, icon: Moon, label: t('settings.dark') }]
            .map(({ val, icon: Icon, label }) => (
              <button key={String(val)} onClick={() => setDark(val)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  dark === val
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}>
                <Icon size={15} /> {label}
              </button>
            ))}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">{gcalLabel.title}</h2>
        </div>

        {!gcal.configured ? (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">{gcalLabel.notConfigured}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Добавьте <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">GOOGLE_CLIENT_ID</code> и <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">GOOGLE_CLIENT_SECRET</code> в .env на сервере
              </p>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                console.cloud.google.com <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : gcal.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">{gcalLabel.connected}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={syncAll} className="btn-secondary text-xs py-1.5">
                <Calendar size={13} /> {gcalLabel.syncAll}
              </button>
              <button onClick={disconnectGoogle} className="btn-danger text-xs py-1.5">
                {gcalLabel.disconnect}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={connectGoogle} disabled={gcalLoading}
            className="btn-primary">
            <Calendar size={15} />
            {gcalLoading ? (lang === 'ru' ? 'Переход...' : 'Redirecting...') : gcalLabel.connect}
          </button>
        )}
      </div>

      {/* AI Assistant */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
          <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Sparkles size={10} className="mr-1" /> Beta
          </span>
        </div>
        {aiStatus.configured ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span className="text-sm">OpenAI подключён · {aiStatus.model}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Key size={15} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                  {lang === 'ru' ? 'AI не подключён' : lang === 'es' ? 'AI no conectado' : 'AI not connected'}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Добавьте <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">OPENAI_API_KEY</code> в .env для активации
                </p>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                  platform.openai.com <ExternalLink size={11} />
                </a>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              {lang === 'ru'
                ? 'Кнопка AI-ассистента (💬) доступна внизу справа — попробуй без API ключа'
                : 'AI button (💬) is available bottom-right — try it without API key'}
            </p>
          </div>
        )}
      </div>

      {/* Users */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.users')}</h2>
          <button onClick={() => setModal('user')} className="btn-primary py-1.5 text-xs">
            <Plus size={13} /> {t('settings.addUser')}
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white">{u.name}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </div>
              <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                {t(`settings.roles.${u.role}`, u.role)}
              </span>
              {u.id !== user?.id && (
                <button onClick={() => deleteUser(u.id)} className="text-gray-300 hover:text-red-500 ml-1">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={modal === 'user'} onClose={() => { setModal(null); load(); }} title={t('settings.addUser')}>
        <UserForm onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
