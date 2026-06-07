const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

require('dotenv').config();

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// ── AI Status ────────────────────────────────────────────────────────────────
router.get('/status', verifyToken, (req, res) => {
  res.json({ configured: !!OPENAI_KEY, model: 'gpt-4o-mini' });
});

// ── Chat endpoint ────────────────────────────────────────────────────────────
router.post('/chat', verifyToken, async (req, res) => {
  const { message, context = {} } = req.body;

  if (!OPENAI_KEY) {
    return res.json({
      reply: '🤖 AI-ассистент пока не подключён. Добавьте OPENAI_API_KEY в настройках сервера.',
      configured: false
    });
  }

  // Build system context from CRM data
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM clients) as clients,
      (SELECT COUNT(*) FROM orders WHERE status IN ('new','in_progress','waiting_parts')) as active_orders,
      (SELECT COUNT(*) FROM parts WHERE qty <= min_qty AND min_qty > 0) as low_stock
  `).get();

  const systemPrompt = `Ты AI-ассистент для автосервиса AutoCRM.
Текущая статистика: ${stats.clients} клиентов, ${stats.active_orders} активных заявок, ${stats.low_stock} позиций мало на складе.
Отвечай кратко и по делу. Помогай с заявками, клиентами, диагностикой, советами по ремонту.
Язык ответа: определи по вопросу пользователя (русский, английский или испанский).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(context.history || []),
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!data.choices?.[0]) throw new Error(data.error?.message || 'No response');

    res.json({
      reply: data.choices[0].message.content,
      configured: true,
      tokens: data.usage?.total_tokens
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Diagnose order (AI suggestion) ───────────────────────────────────────────
router.post('/diagnose/:orderId', verifyToken, async (req, res) => {
  const order = db.prepare(`
    SELECT o.*, v.brand, v.model, v.year, v.mileage, c.name as client_name
    FROM orders o
    LEFT JOIN vehicles v ON v.id = o.vehicle_id
    LEFT JOIN clients c ON c.id = o.client_id
    WHERE o.id = ?
  `).get(req.params.orderId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!OPENAI_KEY) {
    return res.json({
      suggestion: 'Подключите AI-ассистента (OPENAI_API_KEY) для получения диагностических подсказок.',
      configured: false
    });
  }

  const prompt = `Автомобиль: ${order.brand} ${order.model} ${order.year || ''}, пробег: ${order.mileage || 'неизвестен'} км.
Жалоба клиента: ${order.complaint || 'не указана'}
Диагноз (если есть): ${order.diagnosis || 'не поставлен'}

Предложи: 1) вероятные причины, 2) что проверить, 3) возможные запчасти. Кратко.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты опытный автомеханик-диагност. Давай конкретные технические советы.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400
      })
    });
    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || 'Не удалось получить ответ';
    db.prepare('UPDATE orders SET ai_notes=? WHERE id=?').run(suggestion, order.id);
    res.json({ suggestion, configured: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
