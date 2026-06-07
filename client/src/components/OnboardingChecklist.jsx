import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KEY = 'autocrm_checklist_v1';
const TASKS = [
  { id: 'client', ru: 'Добавь первого клиента', en: 'Add first client', es: 'Agrega primer cliente', path: '/clients' },
  { id: 'order', ru: 'Создай первую заявку', en: 'Create first order', es: 'Crea primera orden', path: '/orders' },
  { id: 'calendar', ru: 'Посмотри календарь', en: 'Check the calendar', es: 'Revisa el calendario', path: '/calendar' },
  { id: 'warehouse', ru: 'Добавь запчасть на склад', en: 'Add part to warehouse', es: 'Agrega repuesto', path: '/warehouse' },
  { id: 'settings', ru: 'Настрой систему', en: 'Configure system', es: 'Configura el sistema', path: '/settings' },
];

export default function OnboardingChecklist() {
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } });
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const navigate = useNavigate();
  const lang = (localStorage.getItem('lang')||'ru').slice(0,2);

  const check = (id) => {
    const next = done.includes(id) ? done.filter(x=>x!==id) : [...done, id];
    setDone(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  if (hidden || TASKS.every(t => done.includes(t.id))) return null;
  const completed = TASKS.filter(t => done.includes(t.id)).length;
  const pct = Math.round((completed/TASKS.length)*100);

  return (
    <div className="mx-2 mb-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/10 dark:to-transparent overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" onClick={() => setOpen(o=>!o)}>
        <Rocket size={13} className="text-indigo-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex-1">
          {lang==='ru'?'Быстрый старт':lang==='es'?'Inicio rápido':'Quick start'}
        </span>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
        {open ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />}
        <button onClick={e=>{e.stopPropagation();setHidden(true)}} className="text-indigo-300 hover:text-indigo-500 ml-0.5"><X size={12}/></button>
      </div>
      {open && (
        <>
          <div className="mx-3 mb-2 h-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
            <div className="h-1 bg-indigo-500 rounded-full transition-all duration-500" style={{width:`${pct}%`}} />
          </div>
          <div className="px-3 pb-3 space-y-1">
            {TASKS.map(task => {
              const isDone = done.includes(task.id);
              return (
                <div key={task.id} className="flex items-center gap-2 group">
                  <button onClick={() => check(task.id)} className="flex-shrink-0 transition-transform hover:scale-110">
                    {isDone
                      ? <CheckCircle2 size={14} className="text-green-500" />
                      : <Circle size={14} className="text-indigo-300 dark:text-indigo-600" />}
                  </button>
                  <button onClick={() => { check(task.id); navigate(task.path); }}
                    className={`text-xs text-left transition-colors ${isDone ? 'line-through text-gray-400' : 'text-indigo-700 dark:text-indigo-300 hover:underline'}`}>
                    {task[lang] || task.ru}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
