import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_KEY = 'autocrm_tour_v1';

const STEPS = [
  { emoji: '🚗', title: { ru: 'Добро пожаловать в AutoCRM!', en: 'Welcome to AutoCRM!', es: '¡Bienvenido a AutoCRM!' },
    text: { ru: 'Система управления вашим автосервисом. Давайте быстро покажем что здесь есть!', en: 'Your auto service management system. Let\'s take a quick tour!', es: 'Tu sistema de gestión. ¡Hagamos un recorrido rápido!' } },
  { emoji: '📊', title: { ru: 'Дашборд', en: 'Dashboard', es: 'Panel' },
    text: { ru: 'Главная страница: активные заявки, выручка за месяц, напоминания о днях рождения клиентов и быстрые действия.', en: 'Home page: active orders, monthly revenue, client birthday reminders and quick actions.', es: 'Página principal: órdenes activas, ingresos del mes, recordatorios de cumpleaños y acciones rápidas.' } },
  { emoji: '👥', title: { ru: 'Клиенты', en: 'Clients', es: 'Clientes' },
    text: { ru: 'Полная база клиентов с историей ремонтов. Нажмите на клиента → его авто, все заявки, напоминания. Можно добавить день рождения.', en: 'Full client database with repair history. Click a client → their vehicles, all orders, reminders. Add birthday too.', es: 'Base completa con historial. Haz clic en un cliente → vehículos, órdenes, recordatorios.' } },
  { emoji: '🔧', title: { ru: 'Заявки', en: 'Orders', es: 'Órdenes' },
    text: { ru: 'Создавайте заявки, добавляйте запчасти и работы. Есть шаблоны для частых услуг (замена масла, ТО). Прикрепляйте фото до/после.', en: 'Create orders, add parts and labor. Templates for common services (oil change, service). Attach before/after photos.', es: 'Crea órdenes, agrega partes. Plantillas para servicios comunes. Adjunta fotos.' } },
  { emoji: '📅', title: { ru: 'Календарь', en: 'Calendar', es: 'Calendario' },
    text: { ru: 'Визуальный календарь всех записей. Планируйте нагрузку мастеров. Можно синхронизировать с Google Calendar в Настройках.', en: 'Visual calendar of all appointments. Plan master workload. Sync with Google Calendar in Settings.', es: 'Calendario visual. Planifica. Sincroniza con Google Calendar en Configuración.' } },
  { emoji: '📦', title: { ru: 'Склад', en: 'Warehouse', es: 'Almacén' },
    text: { ru: 'Остатки запчастей. Система предупредит когда заканчивается. Запчасти привязываются к заявкам автоматически.', en: 'Parts inventory. System alerts when stock is low. Parts link to orders automatically.', es: 'Inventario de repuestos. Alertas de stock bajo. Repuestos vinculados a órdenes.' } },
  { emoji: '💡', title: { ru: 'Советы', en: 'Tips', es: 'Consejos' },
    text: { ru: '• Ctrl+K — быстрый поиск по всему\n• Кнопка 💬 внизу справа — AI-ассистент\n• Настройки → Google Calendar + AI\n• Первый пользователь — всегда Admin', en: '• Ctrl+K — quick search everywhere\n• 💬 button bottom-right — AI assistant\n• Settings → Google Calendar + AI\n• First user is always Admin', es: '• Ctrl+K — búsqueda rápida\n• Botón 💬 — asistente AI\n• Configuración → Google Calendar + AI' } },
];

export default function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const lang = (localStorage.getItem('lang') || 'ru').slice(0,2);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setTimeout(() => setShow(true), 1200);
  }, []);

  const close = () => { localStorage.setItem(TOUR_KEY, '1'); setShow(false); };
  const next = () => step < STEPS.length - 1 ? setStep(s => s+1) : close();
  const prev = () => setStep(s => s-1);

  if (!show) return null;
  const s = STEPS[step];
  const t = (obj) => obj[lang] || obj.ru;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
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
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{t(s.text)}</p>
        </div>
        <div className="flex items-center justify-between px-6 pb-6">
          <div className="flex gap-1">
            {STEPS.map((_,i) => (
              <div key={i} onClick={() => setStep(i)} className={`cursor-pointer rounded-full transition-all ${i===step?'w-4 h-2 bg-blue-600':'w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`} />
            ))}
          </div>
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
