import React, { useState, useEffect } from 'react';
import { useApp } from '../App.jsx';
import { Wrench, Globe, Eye, EyeOff, Building2, KeyRound, Copy, Check, UserCog, Wrench as MechanicIcon } from 'lucide-react';
import api from '../api.js';
import i18n from '../i18n/index.js';

const LANGS = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function Login() {
  const { login } = useApp();

  // screen: 'choose' | 'owner-login' | 'owner-register' | 'worker-login' | 'worker-register'
  const [screen, setScreen] = useState('choose');
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

  const changeLang = (code) => { i18n.changeLanguage(code); localStorage.setItem('lang', code); };

  const reset = (s) => {
    setScreen(s);
    setError('');
    setForm({ name: '', email: '', password: '', confirm: '', companyName: '', inviteCode: '' });
    setInviteValidation(null);
  };

  // Auto-validate invite code
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
    setLoading(true);
    try {
      if (screen === 'owner-login') {
        const { data } = await api.post('/users/login', { email: form.email, password: form.password, rememberMe });
        login(data);

      } else if (screen === 'owner-register') {
        if (!form.name || !form.email || !form.password) return setError(t('Заполните все поля', 'Fill all fields', 'Complete todos los campos'));
        if (form.password.length < 6) return setError(t('Пароль минимум 6 символов', 'Password min 6 chars', 'Contraseña mínimo 6'));
        if (form.password !== form.confirm) return setError(t('Пароли не совпадают', 'Passwords do not match', 'Las contraseñas no coinciden'));
        if (!form.companyName) return setError(t('Введите название СТО', 'Enter company name', 'Ingrese nombre de empresa'));
        const { data } = await api.post('/users/register', { name: form.name, email: form.email, password: form.password, companyName: form.companyName, rememberMe });
        if (data.pending) { setPendingEmail(data.email); setPreviewUrl(data.previewUrl || null); }
        else login(data);

      } else if (screen === 'worker-register') {
        if (!form.inviteCode || !form.name || !form.email) return setError(t('Заполните все поля', 'Fill all fields', 'Complete todos los campos'));
        if (!inviteValidation) return setError(t('Введите действующий код', 'Enter a valid code', 'Ingrese un código válido'));
        const { data } = await api.post('/users/register-worker', {
          inviteCode: form.inviteCode.trim().toUpperCase(),
          name: form.name,
          email: form.email,
          rememberMe,
        });
        login(data);

      } else if (screen === 'worker-login') {
        if (!form.inviteCode || !form.name || !form.email) return setError(t('Заполните все поля', 'Fill all fields', 'Complete todos los campos'));
        const { data } = await api.post('/users/login-worker', {
          inviteCode: form.inviteCode.trim().toUpperCase(),
          name: form.name,
          email: form.email,
          rememberMe,
        });
        login(data);
      }
    } catch (err) {
      const msg = err.response?.data?.error || '';
      const code = err.response?.data?.code || '';
      const errEmail = err.response?.data?.email || form.email;
      if (code === 'EMAIL_NOT_VERIFIED') { setPendingEmail(errEmail); }
      else if (msg.includes('exists') || msg.includes('taken')) setError(t('Такое имя или email уже занято', 'Name or email already taken', 'Nombre o email en uso'));
      else if (msg.includes('not found') || msg.includes('Invalid')) setError(t('Данные не найдены. Сначала зарегистрируйтесь.', 'Not found. Please register first.', 'No encontrado. Regístrese primero.'));
      else setError(msg || t('Ошибка', 'Error', 'Error'));
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

  const copyCode = () => {
    navigator.clipboard.writeText(createdCompany.invite_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Pending email verification ────────────────────────────────────────────
  if (pendingEmail) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center shadow-xl">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('Проверьте почту', 'Check your email', 'Revise su correo')}</h2>
          <p className="text-gray-500 mb-1">{t('Мы отправили письмо на', 'We sent an email to', 'Enviamos un correo a')}</p>
          <p className="font-semibold text-gray-900 dark:text-white mb-4">{pendingEmail}</p>
          <p className="text-sm text-gray-500 mb-6">{t('Нажмите ссылку в письме чтобы войти.', 'Click the link in the email to sign in.', 'Haga clic en el enlace para iniciar sesión.')}</p>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full mb-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">📧 {t('Открыть письмо', 'Open email', 'Abrir correo')}</a>}
          {resendSent
            ? <p className="text-green-600 text-sm mb-4">✅ {t('Письмо отправлено повторно', 'Email resent', 'Correo reenviado')}</p>
            : <button onClick={handleResend} className="btn-secondary w-full mb-3">{t('Отправить повторно', 'Resend', 'Reenviar')}</button>}
          <button onClick={() => { setPendingEmail(null); setPreviewUrl(null); setResendSent(false); }} className="text-sm text-blue-600 hover:underline">← {t('Назад', 'Back', 'Volver')}</button>
        </div>
      </div>
    </div>
  );

  // ── Company created ───────────────────────────────────────────────────────
  if (createdCompany) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center shadow-xl">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('Компания создана!', 'Company created!', '¡Empresa creada!')}</h2>
          <p className="text-gray-500 mb-6 text-sm">{createdCompany.company_name}</p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-4">
            <p className="text-sm text-gray-500 mb-2">{t('Код для сотрудников:', 'Employee invite code:', 'Código para empleados:')}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400">{createdCompany.invite_code}</span>
              <button onClick={copyCode} className="text-gray-400 hover:text-blue-600">{copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}</button>
            </div>
          </div>
          <button onClick={() => setCreatedCompany(null)} className="btn-primary w-full justify-center py-2.5">{t('Войти в систему', 'Enter app', 'Entrar')}</button>
        </div>
      </div>
    </div>
  );

  const langBar = (
    <div className="mt-6 flex items-center justify-center gap-3">
      <Globe size={14} className="text-gray-400" />
      {LANGS.map(l => (
        <button key={l.code} onClick={() => changeLang(l.code)}
          className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${i18n.language === l.code ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );

  const logo = (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
        <Wrench size={32} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AutoCRM</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Auto Service Management</p>
    </div>
  );

  // ── CHOOSE screen ─────────────────────────────────────────────────────────
  if (screen === 'choose') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {logo}
        <div className="card p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">{t('Кто вы?', 'Who are you?', '¿Quién es usted?')}</h2>
          <div className="space-y-3">
            <button onClick={() => reset('owner-login')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <UserCog size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{t('Владелец СТО', 'Shop Owner', 'Propietario del taller')}</div>
                <div className="text-sm text-gray-500">{t('Вход или регистрация компании', 'Sign in or register company', 'Entrar o registrar empresa')}</div>
              </div>
            </button>
            <button onClick={() => reset('worker-login')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all text-left">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <MechanicIcon size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{t('Сотрудник / Механик', 'Employee / Mechanic', 'Empleado / Mecánico')}</div>
                <div className="text-sm text-gray-500">{t('Войти по коду СТО', 'Sign in with shop code', 'Entrar con código del taller')}</div>
              </div>
            </button>
          </div>
          {langBar}
        </div>
      </div>
    </div>
  );

  // ── WORKER LOGIN / REGISTER ───────────────────────────────────────────────
  if (screen === 'worker-login' || screen === 'worker-register') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {logo}
        <div className="card p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => reset('choose')} className="text-gray-400 hover:text-gray-600">←</button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {screen === 'worker-login' ? t('Вход — Сотрудник', 'Employee Sign In', 'Entrada — Empleado') : t('Регистрация — Сотрудник', 'Employee Register', 'Registro — Empleado')}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('Код СТО', 'Shop code', 'Código del taller')} *</label>
              <input className="input font-mono tracking-widest uppercase"
                value={form.inviteCode}
                onChange={e => set('inviteCode', e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX" maxLength={6} autoFocus required />
              {inviteChecking && <p className="text-xs text-gray-400 mt-1">{t('Проверяем...', 'Checking...', 'Verificando...')}</p>}
              {inviteValidation && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={12} /> {inviteValidation.name}</p>}
              {form.inviteCode.length === 6 && !inviteChecking && !inviteValidation && <p className="text-xs text-red-500 mt-1">{t('Код не найден', 'Code not found', 'Código no encontrado')}</p>}
            </div>
            <div>
              <label className="label">{t('Имя', 'Name', 'Nombre')} *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('Иван Иванов', 'John Smith', 'Juan García')} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            {screen === 'worker-login' && (
              <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                {t('Используйте данные с которыми вы регистрировались', 'Use the same details you registered with', 'Use los datos con los que se registró')}
              </p>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('Не выходить 30 дней', 'Stay signed in 30 days', 'Mantener sesión 30 días')}</span>
            </label>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
              {loading ? t('Загрузка...', 'Loading...', 'Cargando...') : screen === 'worker-login' ? t('Войти', 'Sign in', 'Entrar') : t('Зарегистрироваться', 'Register', 'Registrarse')}
            </button>
          </form>

          <div className="mt-4 text-center">
            {screen === 'worker-login'
              ? <button onClick={() => reset('worker-register')} className="text-sm text-blue-600 hover:underline">{t('Первый раз? Зарегистрироваться', 'First time? Register', '¿Primera vez? Regístrese')}</button>
              : <button onClick={() => reset('worker-login')} className="text-sm text-blue-600 hover:underline">{t('Уже есть аккаунт? Войти', 'Already registered? Sign in', '¿Ya registrado? Entrar')}</button>}
          </div>
          {langBar}
        </div>
      </div>
    </div>
  );

  // ── OWNER LOGIN / REGISTER ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {logo}
        <div className="card p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => reset('choose')} className="text-gray-400 hover:text-gray-600">←</button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {screen === 'owner-login' ? t('Вход — Владелец', 'Owner Sign In', 'Entrada — Propietario') : t('Регистрация СТО', 'Register Shop', 'Registrar Taller')}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {screen === 'owner-register' && (
              <>
                <div>
                  <label className="label">{t('Название СТО', 'Shop name', 'Nombre del taller')} *</label>
                  <input className="input" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder={t('СТО Иванов', 'Smith Auto', 'Taller García')} required autoFocus />
                </div>
                <div>
                  <label className="label">{t('Ваше имя', 'Your name', 'Su nombre')} *</label>
                  <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
              </>
            )}
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" required autoFocus={screen === 'owner-login'} />
            </div>
            <div>
              <label className="label">{t('Пароль', 'Password', 'Contraseña')} *</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} autoComplete={screen === 'owner-login' ? 'current-password' : 'new-password'} required />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {screen === 'owner-register' && (
              <div>
                <label className="label">{t('Повторите пароль', 'Confirm password', 'Confirmar contraseña')} *</label>
                <input className="input" type={showPass ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('Не выходить 30 дней', 'Stay signed in 30 days', 'Mantener sesión 30 días')}</span>
            </label>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
              {loading ? t('Загрузка...', 'Loading...', 'Cargando...') : screen === 'owner-login' ? t('Войти', 'Sign in', 'Entrar') : t('Зарегистрироваться', 'Register', 'Registrarse')}
            </button>
          </form>

          <div className="mt-4 text-center">
            {screen === 'owner-login'
              ? <button onClick={() => reset('owner-register')} className="text-sm text-blue-600 hover:underline">{t('Нет аккаунта? Зарегистрировать СТО', 'No account? Register shop', '¿Sin cuenta? Registrar taller')}</button>
              : <button onClick={() => reset('owner-login')} className="text-sm text-blue-600 hover:underline">{t('Уже есть аккаунт? Войти', 'Already have account? Sign in', '¿Ya tiene cuenta? Entrar')}</button>}
          </div>
          {langBar}
        </div>
      </div>
    </div>
  );
}
