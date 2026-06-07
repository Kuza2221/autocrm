import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../App.jsx';
import { Wrench, Globe } from 'lucide-react';
import api from '../api.js';
import i18n from '../i18n/index.js';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function Login() {
  const { t } = useTranslation();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/users/login', { email, password, rememberMe });
      login(data);
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AutoCRM</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Auto Service Management</p>
        </div>

        <div className="card p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('login.title')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('login.email')}</label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">{t('login.password')}</label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {i18n.language === 'ru' ? 'Не выходить 30 дней' :
                  i18n.language === 'es' ? 'Mantener sesión 30 días' :
                  'Stay signed in for 30 days'}
              </span>
            </label>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-2.5">
              {loading ? t('common.loading') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Globe size={14} className="text-gray-400" />
            {LANGS.map(l => (
              <button key={l.code} onClick={() => changeLang(l.code)}
                className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  i18n.language === l.code
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
