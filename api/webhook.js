import { parseMessage } from '../lib/gemini.js';
import { saveExpense, getExpenseSummary } from '../lib/db.js';
import { sendMessage } from '../lib/whatsapp.js';

export default async function handler(req, res) {
  // ── Parse body if it came in as a raw string ──
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // ── Webhook verification (Meta sends a GET to confirm the URL) ──
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  // ── Incoming WhatsApp message ──
  if (req.method === 'POST') {
    if (body.object === 'whatsapp_business_account') {
      try {
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (message?.type === 'text') {
          const phone = message.from;
          const text  = message.text.body.trim();

          const parsed = await parseMessage(text);

          if (parsed.action === 'add') {
            await saveExpense(phone, parsed);
            await sendMessage(phone, formatAddReply(parsed));

          } else if (parsed.action === 'query') {
            const summary = await getExpenseSummary(phone, parsed.period);
            await sendMessage(phone, summary);

          } else {
            await sendMessage(phone,
              "I didn't understand that 🤔\n\nTry:\n" +
              "• *spent 500 on food*\n" +
              "• *paid 1500 electricity bill*\n" +
              "• *total this month*\n" +
              "• *is hafte kitna kharch hua?*"
            );
          }
        }
      } catch (err) {
        console.error('Hissab error:', err);
      }
    }

    return res.status(200).json({ status: 'ok' });
  }

  return res.status(405).end();
}

function formatAddReply({ amount, category, description, date }) {
  const emojis = {
    Food: '🍔', Transport: '🚗', Bills: '⚡',
    Shopping: '🛍️', Health: '💊', Entertainment: '🎮', Other: '📝',
  };
  const emoji = emojis[category] || '💰';
  return (
    `${emoji} *Logged!*\n\n` +
    `Amount:   *${Number(amount).toLocaleString()} PKR*\n` +
    `Category: ${category}\n` +
    `Note:     ${description}\n` +
    `Date:     ${date}`
  );
}
