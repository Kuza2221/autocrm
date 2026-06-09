import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TOUR_KEY_OWNER = 'autocrm_tour_owner_v2';
const TOUR_KEY_MECHANIC = 'autocrm_tour_mechanic_v2';

const OWNER_STEPS = [
  { emoji: '🏢', title: { ru: 'Добро пожаловать в AutoCRM!', en: 'Welcome to AutoCRM!', es: '¡Bienvenido!' },
    text: { ru: 'Система управления вашим автосервисом. Давайте покажем основные возможности!', en: 'Your auto service management system. Let\'s show you the key features!', es: 'Tu sistema de gestión. ¡Te mostramos las funciones clave!' } },
  { emoji: '👥', title: { ru: 'Добавьте клиента', en: 'Add a client', es: 'Agregar cliente' },
    text: { ru: 'Раздел "Клиенты" — база с историей ремонтов, напоминания, дни рождения. Нажмите кнопку "+ Клиент" чтобы начать.', en: 'Clients section — database with repair history, reminders, birthdays. Click "+ Client" to start.', es: 'Sección Clientes — historial de reparaciones, recordatorios. Haz clic en "+ Cliente".' },
    link: '/clients', linkLabel: { ru: 'Перейти к клиентам', en: 'Go to Clients', es: 'Ir a Clientes' } },
  { emoji: '🔧', title: { ru: 'Создайте заявку', en: 'Create an order', es: 'Crear orden' },
    text: { ru: 'Раздел "Заявки" — принимайте авто, добавляйте работы и запчасти. Есть шаблоны для частых услуг и таймер работы мастера.', en: 'Orders section — accept vehicles, add labor and parts. Templates for common services and work timer.', es: 'Sección Órdenes — acepta vehículos, agrega trabajos. Plantillas y cronómetro.' },
    link: '/orders', linkLabel: { ru: 'Перейти к заявкам', en: 'Go to Orders', es: 'Ir a Órdenes' } },
  { emoji: '👨‍🔧', title: { ru: 'Настройте сотрудников', en: 'Set up employees', es: 'Configurar empleados' },
    text: { ru: 'В Настройках → раздел "Сотрудники". Задайте специализацию каждому мастеру. Дайте им код приглашения для входа в систему.', en: 'In Settings → "Employees" section. Set each mechanic\'s specialization. Give them the invite code.', es: 'En Ajustes → "Empleados". Establece la especialización. Comparte el código de invitación.' },
    link: '/settings', linkLabel: { ru: 'Открыть настройки', en: 'Open Settings', es: 'Abrir Ajustes' } },
  { emoji: '📦', title: { ru: 'Склад', en: 'Warehouse', es: 'Almacén' },
    text: { ru: 'Раздел "Склад" — ведите учёт запчастей. Система предупредит о низком остатке. Запчасти добавляются к заявкам.', en: 'Warehouse section — track parts inventory. System alerts on low stock. Parts link to orders.', es: 'Almacén — control de repuestos. Alertas de stock bajo.' },
    link: '/warehouse', linkLabel: { ru: 'Открыть склад', en: 'Open Warehouse', es: 'Abrir Almacén' } },
  { emoji: '💡', title: { ru: 'Советы', en: 'Tips', es: 'Consejos' },
    text: { ru: '• Ctrl+K — быстрый поиск по всему\n• 💬 кнопка внизу — AI-ассистент\n• Финансы — доходы, расходы, долги клиентов\n• Аналитика — графики и статистика', en: '• Ctrl+K — quick search\n• 💬 button — AI assistant\n• Finance — revenue, expenses, debts\n• Analytics — charts and stats', es: '• Ctrl+K — búsqueda rápida\n• 💬 — asistente AI\n• Finanzas — ingresos, gastos\n• Análisis — estadísticas' } },
];

const MECHANIC_STEPS = [
  { emoji: '👋', title: { ru: 'Привет! Ты в AutoCRM', en: 'Hi! You\'re in AutoCRM', es: '¡Hola! Estás en AutoCRM' },
    text: { ru: 'Система для работы мастера автосервиса. Вот что тебе доступно!', en: 'Auto service management system for mechanics. Here\'s what you have access to!', es: 'Sistema para mecánicos. ¡Aquí lo que tienes disponible!' } },
  { emoji: '🔧', title: { ru: 'Мои заявки', en: 'My Orders', es: 'Mis Órdenes' },
    text: { ru: 'Раздел "Заявки" — здесь твои задачи. Нажми на заявку чтобы открыть, посмотреть детали, запустить таймер работы, добавить примечания.', en: 'Orders section — your tasks. Click an order to open it, see details, start work timer, add notes.', es: 'Órdenes — tus tareas. Haz clic para abrir, ver detalles, iniciar temporizador.' },
    link: '/orders', linkLabel: { ru: 'Мои заявки', en: 'My Orders', es: 'Mis Órdenes' } },
  { emoji: '⏱️', title: { ru: 'Таймер работы', en: 'Work Timer', es: 'Temporizador' },
    text: { ru: 'В заявке нажми ▶ Старт — таймер начнёт считать время. Когда закончил — нажми Стоп. Руководитель видит сколько времени ушло на каждую работу.', en: 'In an order click ▶ Start — timer counts your time. When done — click Stop. Manager sees time spent.', es: 'En una orden haz clic en ▶ Iniciar. Al terminar — Detener. El gerente ve el tiempo.' } },
  { emoji: '📦', title: { ru: 'Склад', en: 'Warehouse', es: 'Almacén' },
    text: { ru: 'Раздел "Склад" — можешь посмотреть наличие запчастей. Добавление и редактирование только у администратора.', en: 'Warehouse section — you can check parts availability. Adding/editing is admin-only.', es: 'Almacén — puedes ver disponibilidad de repuestos. Solo el admin puede editar.' },
    link: '/warehouse', linkLabel: { ru: 'Открыть склад', en: 'Open Warehouse', es: 'Abrir Almacén' } },
  { emoji: '📅', title: { ru: 'Мой график', en: 'My Schedule', es: 'Mi Horario' },
    text: { ru: 'Раздел "Мой график" — укажи когда ты работаешь по дням недели. Клиенты увидят твои свободные слоты при онлайн-записи.', en: 'My Schedule section — set your working hours by day. Clients will see your free slots for online booking.', es: 'Mi Horario — establece tus horas de trabajo. Los clientes verán tus horarios libres.' },
    link: '/schedule', linkLabel: { ru: 'Настроить график', en: 'Set Schedule', es: 'Configurar Horario' } },
  { emoji: '✅', title: { ru: 'Готово!', en: 'All set!', es: '¡Listo!' },
    text: { ru: 'Если что-то непонятно — нажми кнопку 💬 внизу справа, там AI-ассистент. Удачи в работе! 🔧', en: 'If you have questions — click 💬 button bottom-right, that\'s the AI assistant. Good luck! 🔧', es: 'Si tienes dudas — haz clic en 💬 abajo a la derecha, es el asistente AI. ¡Buena suerte! 🔧' } },
];

export default function OnboardingTour({ role = 'admin' }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const lang = (localStorage.getItem('lang') || 'ru').slice(0,2);

  const isMechanic = role === 'mechanic';
  const STEPS = isMechanic ? MECHANIC_STEPS : OWNER_STEPS;
  const KEY = isMechanic ? TOUR_KEY_MECHANIC : TOUR_KEY_OWNER;

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setTimeout(() => setShow(true), 1200);
  }, [KEY]);

  const close = () => { localStorage.setItem(KEY, '1'); setShow(false); };
  const next = () => step < STEPS.length - 1 ? setStep(s => s+1) : close();
  const prev = () => setStep(s => s-1);
  const t = (obj) => obj[lang] || obj.ru;

  const goTo = (link) => { close(); navigate(link); };

  if (!show) return null;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${((step+1)/STEPS.length)*100}%` }} />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-4xl">{s.emoji}</span>
            <button onClick={close} className="text-gray-300 hover:text-gray-500"><X size={18} /></button>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t(s.title)}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mb-4">{t(s.text)}</p>

          {/* Action button to navigate */}
          {s.link && (
            <button onClick={() => goTo(s.link)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium transition-colors border border-blue-100 dark:border-blue-800">
              {t(s.linkLabel)} <ArrowRight size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          {/* Dots */}
          <div className="flex gap-1">
            {STEPS.map((_,i) => (
              <div key={i} onClick={() => setStep(i)}
                className={`cursor-pointer rounded-full transition-all ${i===step?'w-4 h-2 bg-blue-600':'w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`} />
            ))}
          </div>
          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && <button onClick={prev} className="btn-secondary py-1.5 px-3 text-sm"><ChevronLeft size={14} /></button>}
            <button onClick={next} className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1">
              {step < STEPS.length-1
                ? <>{lang==='ru'?'Далее':lang==='es'?'Siguiente':'Next'} <ChevronRight size={14} /></>
                : lang==='ru'?'Начать! 🎉':lang==='es'?'¡Empezar! 🎉':'Start! 🎉'}
            </button>
          </div>
        </div>

        <div className="pb-4 text-center">
          <button onClick={close} className="text-xs text-gray-400 hover:text-gray-600">
            {lang==='ru'?'Пропустить':lang==='es'?'Saltar':'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
