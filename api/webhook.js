import { parseMessage } from '../lib/gemini.js';
import { saveExpense, getExpenseSummary, getExpenseDetails, generateReceipt, getExpenseStats, clearExpenses } from '../lib/db.js';
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
            const summary = await getExpenseSummary(phone, parsed.period, parsed.category || null);
            await sendMessage(phone, summary);

          } else if (parsed.action === 'detail') {
            const details = await getExpenseDetails(phone, parsed.period, parsed.category || null);
            await sendMessage(phone, details);

          } else if (parsed.action === 'receipt') {
            const receipt = await generateReceipt(phone, parsed.period);
            await sendMessage(phone, receipt);

          } else if (parsed.action === 'clear_request') {
            const period = parsed.period || 'this_month';
            const { count, total, byCategory } = await getExpenseStats(phone, period);
            if (count === 0) {
              await sendMessage(phone, `No expenses found for ${periodLabel(period)} 📭`);
            } else {
              const phrase = confirmPhrase(period);
              const catLines = Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => `  • ${cat}: ${amt.toLocaleString()} PKR`)
                .join('\n');
              await sendMessage(phone,
                `⚠️ *Clear ${capitalize(periodLabel(period))} Expenses?*\n\n` +
                `*${count} expense(s)* will be deleted:\n${catLines}\n\n` +
                `💰 *Total: ${total.toLocaleString()} PKR*\n\n` +
                `This cannot be undone. To confirm, reply:\n*${phrase}*\n\n` +
                `Or ignore to cancel.`
              );
            }

          } else if (parsed.action === 'clear_confirm') {
            const period = parsed.period || 'this_month';
            await clearExpenses(phone, period);
            await sendMessage(phone,
              `✅ *Done!* All ${capitalize(periodLabel(period))} expenses have been cleared.\n\n` +
              `Start fresh by saying:\n*spent 500 on food*`
            );

          } else {
            await sendMessage(phone,
              "I didn't understand that 🤔\n\nTry:\n" +
              "• *spent 500 on food*\n" +
              "• *total this month*\n" +
              "• *is hafte kitna kharch hua?*\n" +
              "• *clear this month*"
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

function periodLabel(period) {
  const map = {
    today: 'today', yesterday: 'yesterday',
    this_week: 'this week', last_week: 'last week', last_7_days: 'last 7 days',
    this_month: 'this month', last_month: 'last month',
  };
  return map[period] || period.replace(/_/g, ' ');
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function confirmPhrase(period) {
  const map = {
    today: 'YES DELETE TODAY',
    yesterday: 'YES DELETE YESTERDAY',
    this_week: 'YES DELETE THIS WEEK',
    last_week: 'YES DELETE LAST WEEK',
    last_7_days: 'YES DELETE LAST 7 DAYS',
    this_month: 'YES DELETE THIS MONTH',
    last_month: 'YES DELETE LAST MONTH',
  };
  return map[period] || 'YES DELETE';
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
