import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Save, Clock, CheckCircle } from 'lucide-react';
import { useApp } from '../App.jsx';

const DAYS_RU = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const DAYS_EN = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_ES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

const DEFAULT_WEEK = Array.from({length:7}, (_,i) => ({
  day_of_week: i,
  start_time: '09:00',
  end_time: '18:00',
  is_available: i < 5, // Mon-Fri default
}));

export default function Schedule() {
  const { t, i18n } = useTranslation();
  const { user } = useApp();
  const lang = i18n.language?.slice(0,2) || 'ru';
  const tl = (ru, en, es) => lang === 'ru' ? ru : lang === 'es' ? es : en;

  const [week, setWeek] = useState(DEFAULT_WEEK);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const DAYS = lang === 'en' ? DAYS_EN : lang === 'es' ? DAYS_ES : DAYS_RU;

  useEffect(() => {
    axios.get('/api/schedules/my').then(r => {
      if (r.data.length === 7) {
        setWeek(r.data.map(d => ({ ...d, is_available: !!d.is_available })));
      } else if (r.data.length > 0) {
        // Merge with defaults
        const map = {};
        r.data.forEach(d => { map[d.day_of_week] = d; });
        setWeek(DEFAULT_WEEK.map(d => map[d.day_of_week] ? { ...map[d.day_of_week], is_available: !!map[d.day_of_week].is_available } : d));
      }
    }).catch(() => {});
  }, []);

  const update = (idx, field, value) => {
    setWeek(w => w.map((d,i) => i === idx ? { ...d, [field]: value } : d));
    setSaved(false);
  };

  const save = async () => {
    setLoading(true);
    try {
      await axios.put('/api/schedules/my', { schedule: week });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tl('Мой график', 'My Schedule', 'Mi Horario')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tl('Укажите когда вы работаете — клиенты увидят ваши свободные слоты', 'Set your working hours — clients will see your available slots', 'Indique sus horarios de trabajo')}
          </p>
        </div>
        <button onClick={save} disabled={loading} className="btn-primary flex items-center gap-2">
          {saved ? <CheckCircle size={16} className="text-green-300" /> : <Save size={16} />}
          {saved ? tl('Сохранено!', 'Saved!', '¡Guardado!') : tl('Сохранить', 'Save', 'Guardar')}
        </button>
      </div>

      {/* Profile card */}
      <div className="card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{user?.name}</div>
          {user?.specialization && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{user.specialization}</div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">{tl('Механик', 'Mechanic', 'Mecánico')}</div>
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">{tl('Недельный график', 'Weekly Schedule', 'Horario Semanal')}</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {week.map((day, idx) => (
            <div key={idx} className={`flex items-center gap-4 px-5 py-4 transition-colors ${!day.is_available ? 'bg-gray-50 dark:bg-gray-800/30 opacity-60' : ''}`}>
              {/* Toggle */}
              <label className="flex items-center cursor-pointer flex-shrink-0 w-32">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={day.is_available}
                    onChange={e => update(idx, 'is_available', e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${day.is_available ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${day.is_available ? 'translate-x-5' : ''}`} />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">{DAYS[idx]}</span>
              </label>

              {/* Time inputs */}
              {day.is_available ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={day.start_time}
                    onChange={e => update(idx, 'start_time', e.target.value)}
                    className="input w-28 text-sm" />
                  <span className="text-gray-400 text-sm">—</span>
                  <input type="time" value={day.end_time}
                    onChange={e => update(idx, 'end_time', e.target.value)}
                    className="input w-28 text-sm" />
                  <span className="text-xs text-gray-400 ml-1">
                    {(() => {
                      const [sh,sm] = day.start_time.split(':').map(Number);
                      const [eh,em] = day.end_time.split(':').map(Number);
                      const h = eh*60+em - sh*60-sm;
                      if (h <= 0) return '';
                      return `${Math.floor(h/60)}${tl('ч','h','h')} ${h%60>0 ? h%60+'м':'' }`;
                    })()}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">{tl('Выходной', 'Day off', 'Descanso')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        {tl('График обновляется сразу после сохранения и виден при онлайн-записи клиентов',
          'Schedule updates immediately after saving and is visible for online bookings',
          'El horario se actualiza de inmediato y es visible para reservas en línea')}
      </p>
    </div>
  );
}
