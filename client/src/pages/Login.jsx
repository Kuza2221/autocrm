import React, { useState, useEffect } from 'react';
import { useApp } from '../App.jsx';
import { Wrench, Globe, Eye, EyeOff, Building2, KeyRound, Copy, Check } from 'lucide-react';
import api from '../api.js';
import i18n from '../i18n/index.js';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function Login() {
  const { login } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [regMode, setRegMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', companyName: '', inviteCode: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resendSent, setResendSent] = useState(false);
  const [createdCompany, setCreatedCompany] = useState(null); // { invite_code, company_name }
  const [inviteValidation, setInviteValidation] = useState(null); // { id, name } or null
  const [inviteChecking, setInviteChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const lang = i18n.language?.slice(0, 2) || 'ru';

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  // Auto-validate invite code when 6 chars entered
  useEffect(() => {
    const code = form.inviteCode.trim().toUpperCase();
    if (code.length === 6) {
      setInviteChecking(true);
      api.get(`/companies/validate-code/${code}`)
        .then(r => setInviteValidation(r.data))
        .catch(() => setInviteValidation(null))
        .finally(() => setInviteChecking(false));
    } else {
      setInviteValidation(null);
    }
  }, [form.inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!form.name || !form.email || !form.password) return setError(lang === 'ru' ? 'Заполните все поля' : 'Fill all fields');
      if (form.password.length < 6) return setError(lang === 'ru' ? 'Пароль минимум 6 символов' : 'Password min 6 characters');
      if (form.password !== form.confirm) return setError(lang === 'ru' ? 'Пароли не совпадают' : 'Passwords do not match');
      if (regMode === 'create' && !form.companyName) return setError(lang === 'ru' ? 'Введите название компании' : 'Enter company name');
      if (regMode === 'join' && !inviteValidation) return setError(lang === 'ru' ? 'Введите действующий код приглашения' : 'Enter a valid invite code');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/users/login', { email: form.email, password: form.password, rememberMe });
        login(data);
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          rememberMe,
          mode: regMode === 'join' ? 'join' : 'create',
          companyName: regMode === 'create' ? form.companyName : undefined,
          inviteCode: regMode === 'join' ? form.inviteCode.trim().toUpperCase() : undefined,
        };
        const { data } = await api.post('/users/register', payload);
        if (data.pending) {
          setPendingEmail(data.email);
          setPreviewUrl(data.previewUrl || null);
        } else if (data.invite_code) {
          // Company created — show invite code screen
          setCreatedCompany({ invite_code: data.invite_code, company_name: data.company_name });
          login(data);
        } else {
          login(data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || '';
      const code = err.response?.data?.code || '';
      const errEmail = err.response?.data?.email || form.email;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(errEmail);
      } else if (mode === 'login') {
        setError(lang === 'ru' ? 'Неверный email или пароль' : 'Invalid email or password');
      } else if (msg.includes('exists')) {
        setError(lang === 'ru' ? 'Этот email уже занят' : 'Email already taken');
      } else {
        setError(msg || (lang === 'ru' ? 'Ошибка' : 'Error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { data } = await api.post('/users/resend-verification', { email: pendingEmail });
      setResendSent(true);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
    } catch {}
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setRegMode('choose');
    setForm({ name: '', email: '', password: '', confirm: '', companyName: '', inviteCode: '' });
    setInviteValidation(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCompany.invite_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pending email verification screen
  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {lang === 'ru' ? 'Проверьте почту' : lang === 'es' ? 'Revise su correo' : 'Check your email'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-1">
              {lang === 'ru' ? 'Мы отправили письмо на' : lang === 'es' ? 'Enviamos un correo a' : 'We sent an email to'}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mb-4">{pendingEmail}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {lang === 'ru' ? 'Нажмите ссылку в письме чтобы подтвердить email и войти.' : lang === 'es' ? 'Haga clic en el enlace del correo para verificar su email.' : 'Click the link in the email to verify your email and sign in.'}
            </p>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mb-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                📧 {lang === 'ru' ? 'Открыть письмо' : lang === 'es' ? 'Abrir correo' : 'Open email'}
              </a>
            )}
            {resendSent ? (
              <p className="text-green-600 text-sm mb-4">{lang === 'ru' ? '✅ Письмо отправлено повторно' : '✅ Email resent'}</p>
            ) : (
              <button onClick={handleResend} className="btn-secondary w-full mb-3">
                {lang === 'ru' ? 'Отправить повторно' : lang === 'es' ? 'Reenviar' : 'Resend email'}
              </button>
            )}
            <button onClick={() => { setPendingEmail(null); setPreviewUrl(null); setResendSent(false); }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ← {lang === 'ru' ? 'Назад' : lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Company created — show invite code
  if (createdCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {lang === 'ru' ? 'Компания создана!' : lang === 'es' ? '¡Empresa creada!' : 'Company created!'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">{createdCompany.company_name}</p>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              {lang === 'ru' ? 'Добро пожаловать в AutoCRM' : lang === 'es' ? 'Bienvenido a AutoCRM' : 'Welcome to AutoCRM'}
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {lang === 'ru' ? 'Код приглашения для сотрудников:' : lang === 'es' ? 'Código de invitación para empleados:' : 'Invite code for employees:'}
              </p>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="text-3xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400">
                  {createdCompany.invite_code}
                </span>
                <button onClick={copyCode} className="text-gray-400 hover:text-blue-600 transition-colors" title="Copy">
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {lang === 'ru'
                ? 'Поделитесь этим кодом с сотрудниками, чтобы они могли зарегистрироваться'
                : lang === 'es'
                ? 'Comparta este código con sus empleados para que puedan registrarse'
                : 'Share this code with employees so they can register'}
            </p>

            <button onClick={() => setCreatedCompany(null)} className="btn-primary w-full justify-center py-2.5">
              {lang === 'ru' ? 'Войти в систему' : lang === 'es' ? 'Entrar al sistema' : 'Enter the app'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {lang === 'ru' ? 'Войти в AutoCRM' : lang === 'es' ? 'Iniciar sesión' : 'Sign in to AutoCRM'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    autoComplete="email" required autoFocus />
                </div>
                <div>
                  <label className="label">{lang === 'ru' ? 'Пароль' : lang === 'es' ? 'Contraseña' : 'Password'} *</label>
                  <div className="relative">
                    <input className="input pr-10" type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'ru' ? 'Не выходить 30 дней' : lang === 'es' ? 'Mantener sesión 30 días' : 'Stay signed in for 30 days'}
                  </span>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                  {loading ? (lang === 'ru' ? 'Загрузка...' : 'Loading...') : (lang === 'ru' ? 'Войти' : lang === 'es' ? 'Entrar' : 'Sign in')}
                </button>
              </form>
            </>
          ) : regMode === 'choose' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {lang === 'ru' ? 'Как вы хотите начать?' : lang === 'es' ? '¿Cómo desea comenzar?' : 'How would you like to start?'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {lang === 'ru' ? 'Создайте свою компанию или присоединитесь к существующей' : lang === 'es' ? 'Cree su empresa o únase a una existente' : 'Create your company or join an existing one'}
              </p>
              <div className="space-y-3">
                <button onClick={() => setRegMode('create')}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {lang === 'ru' ? 'Создать компанию' : lang === 'es' ? 'Crear empresa' : 'Create company'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'ru' ? 'Открыть новый аккаунт СТО' : lang === 'es' ? 'Abrir una nueva cuenta de taller' : 'Open a new auto service account'}
                    </div>
                  </div>
                </button>
                <button onClick={() => setRegMode('join')}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <KeyRound size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {lang === 'ru' ? 'Присоединиться' : lang === 'es' ? 'Unirse' : 'Join company'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'ru' ? 'Есть код приглашения?' : lang === 'es' ? '¿Tienes un código de invitación?' : 'Have an invite code?'}
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => { setRegMode('choose'); setError(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  ←
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {regMode === 'create'
                    ? (lang === 'ru' ? 'Создать компанию' : lang === 'es' ? 'Crear empresa' : 'Create company')
                    : (lang === 'ru' ? 'Присоединиться к компании' : lang === 'es' ? 'Unirse a empresa' : 'Join company')}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {regMode === 'create' && (
                  <div>
                    <label className="label">{lang === 'ru' ? 'Название компании' : lang === 'es' ? 'Nombre de la empresa' : 'Company name'} *</label>
                    <input className="input" value={form.companyName}
                      onChange={e => set('companyName', e.target.value)}
                      placeholder={lang === 'ru' ? 'СТО Иванов' : lang === 'es' ? 'Taller García' : 'Smith Auto Service'}
                      required autoFocus />
                  </div>
                )}
                {regMode === 'join' && (
                  <div>
                    <label className="label">{lang === 'ru' ? 'Код приглашения' : lang === 'es' ? 'Código de invitación' : 'Invite code'} *</label>
                    <input className="input font-mono tracking-widest uppercase"
                      value={form.inviteCode}
                      onChange={e => set('inviteCode', e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="XXXXXX"
                      maxLength={6}
                      autoFocus />
                    {inviteChecking && <p className="text-xs text-gray-400 mt-1">{lang === 'ru' ? 'Проверяем...' : 'Checking...'}</p>}
                    {inviteValidation && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <Check size={12} /> {lang === 'ru' ? 'Компания:' : 'Company:'} <strong>{inviteValidation.name}</strong>
                      </p>
                    )}
                    {form.inviteCode.length === 6 && !inviteChecking && !inviteValidation && (
                      <p className="text-xs text-red-500 mt-1">{lang === 'ru' ? 'Код не найден' : 'Code not found'}</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="label">{lang === 'ru' ? 'Имя' : lang === 'es' ? 'Nombre' : 'Name'} *</label>
                  <input className="input" value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={lang === 'ru' ? 'Иван Иванов' : lang === 'es' ? 'Juan García' : 'John Smith'}
                    required />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    autoComplete="email" required />
                </div>
                <div>
                  <label className="label">{lang === 'ru' ? 'Пароль' : lang === 'es' ? 'Contraseña' : 'Password'} *</label>
                  <div className="relative">
                    <input className="input pr-10" type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">{lang === 'ru' ? 'Повторите пароль' : lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'} *</label>
                  <input className="input" type={showPass ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    autoComplete="new-password" required />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'ru' ? 'Не выходить 30 дней' : lang === 'es' ? 'Mantener sesión 30 días' : 'Stay signed in for 30 days'}
                  </span>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                  {loading ? (lang === 'ru' ? 'Загрузка...' : 'Loading...') : (lang === 'ru' ? 'Зарегистрироваться' : lang === 'es' ? 'Registrarse' : 'Register')}
                </button>
              </form>
            </>
          )}

          {/* Switch mode */}
          <div className="mt-4 text-center">
            <button onClick={switchMode} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {mode === 'login'
                ? (lang === 'ru' ? 'Нет аккаунта? Зарегистрироваться' : lang === 'es' ? '¿No tienes cuenta? Regístrate' : "Don't have an account? Sign up")
                : (lang === 'ru' ? 'Уже есть аккаунт? Войти' : lang === 'es' ? '¿Ya tienes cuenta? Inicia sesión' : 'Already have an account? Sign in')}
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
