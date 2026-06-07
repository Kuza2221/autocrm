import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../App.jsx';
import { Wrench, Globe, Eye, EyeOff } from 'lucide-react';
import api from '../api.js';
import i18n from '../i18n/index.js';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const T = {
  ru: {
    login: 'Войти в AutoCRM', register: 'Создать аккаунт',
    name: 'Имя', email: 'Email', password: 'Пароль',
    confirm: 'Повторите пароль',
    remember: 'Не выходить 30 дней',
    submit_login: 'Войти', submit_register: 'Зарегистрироваться',
    switch_to_register: 'Нет аккаунта? Зарегистрироваться',
    switch_to_login: 'Уже есть аккаунт? Войти',
    err_invalid: 'Неверный email или пароль',
    err_exists: 'Этот email уже занят',
    err_mismatch: 'Пароли не совпадают',
    err_short: 'Пароль минимум 6 символов',
    err_fields: 'Заполните все поля',
    loading: 'Загрузка...',
    first_admin: '👑 Первый пользователь получит права администратора',
  },
  en: {
    login: 'Sign in to AutoCRM', register: 'Create account',
    name: 'Name', email: 'Email', password: 'Password',
    confirm: 'Confirm password',
    remember: 'Stay signed in for 30 days',
    submit_login: 'Sign in', submit_register: 'Create account',
    switch_to_register: "Don't have an account? Sign up",
    switch_to_login: 'Already have an account? Sign in',
    err_invalid: 'Invalid email or password',
    err_exists: 'Email already taken',
    err_mismatch: 'Passwords do not match',
    err_short: 'Password must be at least 6 characters',
    err_fields: 'Please fill all fields',
    loading: 'Loading...',
    first_admin: '👑 First user will get admin rights',
  },
  es: {
    login: 'Iniciar sesión', register: 'Crear cuenta',
    name: 'Nombre', email: 'Email', password: 'Contraseña',
    confirm: 'Confirmar contraseña',
    remember: 'Mantener sesión 30 días',
    submit_login: 'Entrar', submit_register: 'Registrarse',
    switch_to_register: '¿No tienes cuenta? Regístrate',
    switch_to_login: '¿Ya tienes cuenta? Inicia sesión',
    err_invalid: 'Email o contraseña incorrectos',
    err_exists: 'Este email ya está en uso',
    err_mismatch: 'Las contraseñas no coinciden',
    err_short: 'La contraseña debe tener al menos 6 caracteres',
    err_fields: 'Por favor completa todos los campos',
    loading: 'Cargando...',
    first_admin: '👑 El primer usuario obtendrá permisos de administrador',
  },
};

export default function Login() {
  const { login } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lang = i18n.language?.slice(0, 2) || 'ru';
  const tx = T[lang] || T.ru;

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!form.name || !form.email || !form.password) return setError(tx.err_fields);
      if (form.password.length < 6) return setError(tx.err_short);
      if (form.password !== form.confirm) return setError(tx.err_mismatch);
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/users/login' : '/users/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password, rememberMe }
        : { name: form.name, email: form.email, password: form.password, rememberMe };
      const { data } = await api.post(endpoint, payload);
      login(data);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (mode === 'login') setError(tx.err_invalid);
      else if (msg.includes('exists')) setError(tx.err_exists);
      else setError(msg || tx.err_fields);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setForm({ name: '', email: '', password: '', confirm: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AutoCRM</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Auto Service Management</p>
        </div>

        <div className="card p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {mode === 'login' ? tx.login : tx.register}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — only for register */}
            {mode === 'register' && (
              <div>
                <label className="label">{tx.name} *</label>
                <input className="input" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder={lang === 'ru' ? 'Иван Иванов' : lang === 'es' ? 'Juan García' : 'John Smith'}
                  required autoFocus />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">{tx.email} *</label>
              <input className="input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                autoComplete="email" required
                autoFocus={mode === 'login'} />
            </div>

            {/* Password */}
            <div>
              <label className="label">{tx.password} *</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password — only register */}
            {mode === 'register' && (
              <div>
                <label className="label">{tx.confirm} *</label>
                <input className="input" type={showPass ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  autoComplete="new-password" required />
              </div>
            )}

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{tx.remember}</span>
            </label>

            {/* First-user hint for register */}
            {mode === 'register' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                {tx.first_admin}
              </p>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-2.5">
              {loading ? tx.loading : (mode === 'login' ? tx.submit_login : tx.submit_register)}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-4 text-center">
            <button onClick={switchMode}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {mode === 'login' ? tx.switch_to_register : tx.switch_to_login}
            </button>
          </div>

          {/* Language switcher */}
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
