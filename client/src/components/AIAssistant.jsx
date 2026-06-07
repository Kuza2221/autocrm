import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, X, Send, Loader, Sparkles } from 'lucide-react';
import api from '../api.js';

export default function AIAssistant() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(null);
  const bottomRef = useRef(null);

  const placeholder = i18n.language === 'ru'
    ? 'Спросите ассистента...'
    : i18n.language === 'es'
    ? 'Pregunta al asistente...'
    : 'Ask the assistant...';

  const greeting = i18n.language === 'ru'
    ? '👋 Привет! Я AI-ассистент AutoCRM. Могу помочь с диагностикой, заявками, клиентами и советами по ремонту.'
    : i18n.language === 'es'
    ? '👋 ¡Hola! Soy el asistente AI de AutoCRM. Puedo ayudarte con diagnósticos, órdenes y consejos de reparación.'
    : '👋 Hi! I\'m the AutoCRM AI assistant. I can help with diagnostics, work orders, and repair advice.';

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: greeting }]);
      api.get('/ai/status').then(r => setConfigured(r.data.configured)).catch(() => setConfigured(false));
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const { data } = await api.post('/ai/chat', { message: userMsg, context: { history } });
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      if (data.configured !== undefined) setConfigured(data.configured);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Ошибка подключения к AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-gray-700 rotate-90' : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-110'
        }`}
        style={{ width: 52, height: 52 }}
        title="AI Assistant"
      >
        {open ? <X size={20} className="text-white" /> : <Bot size={22} className="text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ height: 460 }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600">
            <Bot size={18} className="text-white" />
            <span className="text-white font-semibold text-sm">AI Assistant</span>
            {configured === false && (
              <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">Beta</span>
            )}
            {configured === true && (
              <span className="ml-auto flex items-center gap-1 text-xs text-white/80">
                <Sparkles size={11} /> GPT-4o
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl rounded-bl-none">
                  <Loader size={14} className="animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <input
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors">
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
