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
  const [loginType, setLoginType] = useState('email'); // 'email' | 'worker'
  const [regMode, setRegMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', companyName: '', inviteCode: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resendSent, setResendSent] = useState(false);
  const [createdCompany, setCreatedCompany] = useState(null);
  const [inviteValidation, setInviteValidation] = useState(null);
  const [inviteChecking, setInviteChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const lang = i18n.language?.slice(0, 2) || 'ru';
  const t = (ru, en, es) => lang === 'ru' ? ru : lang === 'es' ? es : en;

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  // Auto-validate invite code when 6 chars entered (for join registration)
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
      if (!form.name || !form.password) return setError(t('Заполните все поля', 'Fill all fields', 'Complete todos los campos'));
      if (form.password.length < 6) return setError(t('Пароль минимум 6 символов', 'Password min 6 characters', 'Contraseña mínimo 6 caracteres'));
      if (form.password !== form.confirm) return setError(t('Пароли не совпадают', 'Passwords do not match', 'Las contraseñas no coinciden'));
      if (regMode === 'create' && !form.email) return setError(t('Введите email', 'Enter email', 'Ingrese email'));
      if (regMode === 'create' && !form.companyName) return setError(t('Введите название компании', 'Enter company name', 'Ingrese el nombre de la empresa'));
      if (regMode === 'join' && !inviteValidation) return setError(t('Введите действующий код', 'Enter a valid invite code', 'Ingrese un código válido'));
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (loginType === 'worker') {
          // Worker login: name + company code + password
          const { data } = await api.post('/users/login-worker', {
            name: form.name,
            inviteCode: form.inviteCode.trim().toUpperCase(),
            password: form.password,
            rememberMe,
          });
          login(data);
        } else {
          // Owner login: email + password
          const { data } = await api.post('/users/login', { email: form.email, password: form.password, rememberMe });
          login(data);
        }
      } else {
        const payload = {
          name: form.name,
          email: regMode === 'create' ? form.email : undefined,
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
        setError(t('Неверные данные для входа', 'Invalid credentials', 'Credenciales inválidas'));
      } else if (msg.includes('exists') || msg.includes('taken')) {
        setError(t('Такое имя или email уже занято', 'Name or email already taken', 'Nombre o email ya en uso'));
      } else {
        setError(msg || t('Ошибка', 'Error', 'Error'));
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
    setLoginType('email');
    setForm({ name: '', email: '', password: '', confirm: '', companyName: '', inviteCode: '' });
    setInviteValidation(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCompany.invite_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Pending email verification screen ────────────────────────────────────
  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('Проверьте почту', 'Check your email', 'Revise su correo')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-1">
              {t('Мы отправили письмо на', 'We sent an email to', 'Enviamos un correo a')}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mb-4">{pendingEmail}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('Нажмите ссылку в письме чтобы подтвердить email и войти.', 'Click the link in the email to verify and sign in.', 'Haga clic en el enlace para verificar su email.')}
            </p>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mb-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                📧 {t('Открыть письмо', 'Open email', 'Abrir correo')}
              </a>
            )}
            {resendSent ? (
              <p className="text-green-600 text-sm mb-4">✅ {t('Письмо отправлено повторно', 'Email resent', 'Correo reenviado')}</p>
            ) : (
              <button onClick={handleResend} className="btn-secondary w-full mb-3">
                {t('Отправить повторно', 'Resend email', 'Reenviar')}
              </button>
            )}
            <button onClick={() => { setPendingEmail(null); setPreviewUrl(null); setResendSent(false); }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ← {t('Назад', 'Back', 'Volver')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Company created — show invite code ───────────────────────────────────
  if (createdCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center shadow-xl">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {t('Компания создана!', 'Company created!', '¡Empresa creada!')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">{createdCompany.company_name}</p>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              {t('Добро пожаловать в AutoCRM', 'Welcome to AutoCRM', 'Bienvenido a AutoCRM')}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {t('Код приглашения для сотрудников:', 'Invite code for employees:', 'Código de invitación para empleados:')}
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
              {t('Поделитесь этим кодом с сотрудниками, чтобы они могли зарегистрироваться', 'Share this code with employees so they can register', 'Comparta este código con sus empleados para que puedan registrarse')}
            </p>
            <button onClick={() => setCreatedCompany(null)} className="btn-primary w-full justify-center py-2.5">
              {t('Войти в систему', 'Enter the app', 'Entrar al sistema')}
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

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('Войти в AutoCRM', 'Sign in to AutoCRM', 'Iniciar sesión')}
              </h2>

              {/* Login type tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-5">
                <button
                  onClick={() => { setLoginType('email'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${loginType === 'email' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {t('Владелец / Email', 'Owner / Email', 'Propietario / Email')}
                </button>
                <button
                  onClick={() => { setLoginType('worker'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${loginType === 'worker' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {t('Сотрудник', 'Employee', 'Empleado')}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {loginType === 'email' ? (
                  <>
                    <div>
                      <label className="label">Email *</label>
                      <input className="input" type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        autoComplete="email" required autoFocus />
                    </div>
                    <div>
                      <label className="label">{t('Пароль', 'Password', 'Contraseña')} *</label>
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
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label">{t('Код СТО', 'Company code', 'Código de empresa')} *</label>
                      <input className="input font-mono tracking-widest uppercase"
                        value={form.inviteCode}
                        onChange={e => set('inviteCode', e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="XXXXXX" maxLength={6} autoFocus required />
                    </div>
                    <div>
                      <label className="label">{t('Имя', 'Name', 'Nombre')} *</label>
                      <input className="input" value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder={t('Иван Иванов', 'John Smith', 'Juan García')} required />
                    </div>
                    <div>
                      <label className="label">{t('Пароль', 'Password', 'Contraseña')} *</label>
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
                  </>
                )}

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('Не выходить 30 дней', 'Stay signed in for 30 days', 'Mantener sesión 30 días')}
                  </span>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                  {loading ? t('Загрузка...', 'Loading...', 'Cargando...') : t('Войти', 'Sign in', 'Entrar')}
                </button>
              </form>
            </>
          )}

          {/* ── REGISTER: choose ── */}
          {mode === 'register' && regMode === 'choose' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('Как вы хотите начать?', 'How would you like to start?', '¿Cómo desea comenzar?')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('Создайте свою компанию или присоединитесь к существующей', 'Create your company or join an existing one', 'Cree su empresa o únase a una existente')}
              </p>
              <div className="space-y-3">
                <button onClick={() => setRegMode('create')}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {t('Создать компанию', 'Create company', 'Crear empresa')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('Открыть новый аккаунт СТО', 'Open a new auto service account', 'Abrir una nueva cuenta de taller')}
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
                      {t('Присоединиться', 'Join company', 'Unirse')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('Есть код приглашения?', 'Have an invite code?', '¿Tienes un código de invitación?')}
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER: form ── */}
          {mode === 'register' && (regMode === 'create' || regMode === 'join') && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => { setRegMode('choose'); setError(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">←</button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {regMode === 'create'
                    ? t('Создать компанию', 'Create company', 'Crear empresa')
                    : t('Присоединиться к компании', 'Join company', 'Unirse a empresa')}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* JOIN: code first */}
                {regMode === 'join' && (
                  <div>
                    <label className="label">{t('Код СТО', 'Company code', 'Código de empresa')} *</label>
                    <input className="input font-mono tracking-widest uppercase"
                      value={form.inviteCode}
                      onChange={e => set('inviteCode', e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="XXXXXX" maxLength={6} autoFocus />
                    {inviteChecking && <p className="text-xs text-gray-400 mt-1">{t('Проверяем...', 'Checking...', 'Verificando...')}</p>}
                    {inviteValidation && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <Check size={12} /> {t('Компания:', 'Company:', 'Empresa:')} <strong>{inviteValidation.name}</strong>
                      </p>
                    )}
                    {form.inviteCode.length === 6 && !inviteChecking && !inviteValidation && (
                      <p className="text-xs text-red-500 mt-1">{t('Код не найден', 'Code not found', 'Código no encontrado')}</p>
                    )}
                  </div>
                )}

                {/* CREATE: company name */}
                {regMode === 'create' && (
                  <div>
                    <label className="label">{t('Название компании', 'Company name', 'Nombre de la empresa')} *</label>
                    <input className="input" value={form.companyName}
                      onChange={e => set('companyName', e.target.value)}
                      placeholder={t('СТО Иванов', 'Smith Auto Service', 'Taller García')}
                      required autoFocus />
                  </div>
                )}

                <div>
                  <label className="label">{t('Имя', 'Name', 'Nombre')} *</label>
                  <input className="input" value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={t('Иван Иванов', 'John Smith', 'Juan García')} required />
                </div>

                {/* Only owner needs email */}
                {regMode === 'create' && (
                  <div>
                    <label className="label">Email *</label>
                    <input className="input" type="email" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      autoComplete="email" required />
                  </div>
                )}

                <div>
                  <label className="label">{t('Пароль', 'Password', 'Contraseña')} *</label>
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
                  <label className="label">{t('Повторите пароль', 'Confirm password', 'Confirmar contraseña')} *</label>
                  <input className="input" type={showPass ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    autoComplete="new-password" required />
                </div>

                {/* Join hint */}
                {regMode === 'join' && (
                  <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    {t('Для входа используйте: Код СТО + Имя + Пароль', 'To sign in use: Company code + Name + Password', 'Para entrar use: Código + Nombre + Contraseña')}
                  </p>
                )}

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('Не выходить 30 дней', 'Stay signed in for 30 days', 'Mantener sesión 30 días')}
                  </span>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                  {loading ? t('Загрузка...', 'Loading...', 'Cargando...') : t('Зарегистрироваться', 'Register', 'Registrarse')}
                </button>
              </form>
            </>
          )}

          {/* Switch login/register */}
          <div className="mt-4 text-center">
            <button onClick={switchMode} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {mode === 'login'
                ? t('Нет аккаунта? Зарегистрироваться', "Don't have an account? Sign up", '¿No tienes cuenta? Regístrate')
                : t('Уже есть аккаунт? Войти', 'Already have an account? Sign in', '¿Ya tienes cuenta? Inicia sesión')}
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
