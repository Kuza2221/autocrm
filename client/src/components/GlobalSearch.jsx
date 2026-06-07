import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, ClipboardList, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const lang = (localStorage.getItem('lang') || 'ru').slice(0,2);
  const label = { ru: 'Поиск', en: 'Search', es: 'Buscar' }[lang] || 'Search';
  const placeholder = { ru: 'Клиент, VIN, госномер, №заявки...', en: 'Client, VIN, plate, order #...', es: 'Cliente, VIN, matrícula...' }[lang] || 'Search...';

  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const { data } = await api.get('/search', { params: { q } }); setResults(data); } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const openSearch = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const close = () => { setOpen(false); setQ(''); setResults(null); };
  const goto = (path) => { close(); navigate(path); };
  const total = results ? results.clients.length + results.orders.length + results.vehicles.length : 0;

  return (
    <>
      <button onClick={openSearch} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full">
        <Search size={14} className="flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded hidden sm:block">Ctrl+K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50" onClick={close}>
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                onKeyDown={e => e.key === 'Escape' && close()} />
              {q && <button onClick={() => setQ('')}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>}
              <kbd onClick={close} className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded cursor-pointer">Esc</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && <div className="p-6 text-center text-gray-400 text-sm">...</div>}

              {!loading && q.length >= 2 && total === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {lang === 'ru' ? 'Ничего не найдено' : 'No results found'}
                </div>
              )}

              {!loading && results && total > 0 && (
                <div className="py-2">
                  {results.clients.length > 0 && <>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{lang==='ru'?'Клиенты':'Clients'}</p>
                    {results.clients.map(c => (
                      <button key={c.id} onClick={() => goto('/clients')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone || c.email}</p>
                        </div>
                      </button>
                    ))}
                  </>}

                  {results.orders.length > 0 && <>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{lang==='ru'?'Заявки':'Orders'}</p>
                    {results.orders.map(o => (
                      <button key={o.id} onClick={() => goto('/orders')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <ClipboardList size={14} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">#{o.id} · {o.client_name}</p>
                          <p className="text-xs text-gray-400 truncate">{o.complaint} {o.plate && `· ${o.plate}`}</p>
                        </div>
                      </button>
                    ))}
                  </>}

                  {results.vehicles.length > 0 && <>
                    <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{lang==='ru'?'Автомобили':'Vehicles'}</p>
                    {results.vehicles.map(v => (
                      <button key={v.id} onClick={() => goto('/clients')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Car size={14} className="text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{v.brand} {v.model} {v.plate && `(${v.plate})`}</p>
                          <p className="text-xs text-gray-400">{v.client_name} {v.vin && `· ${v.vin}`}</p>
                        </div>
                      </button>
                    ))}
                  </>}
                </div>
              )}

              {!q && (
                <div className="p-8 text-center text-gray-400">
                  <Search size={28} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{lang === 'ru' ? 'Введите имя, номер заявки, VIN или госномер' : 'Type a name, order #, VIN or plate'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
