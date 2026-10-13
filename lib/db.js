import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveExpense(phone, { amount, category, description, date }) {
  const { error } = await supabase.from('expenses').insert({
    phone,
    amount,
    category,
    description,
    date,
  });
  if (error) throw error;
}

export async function getExpenseDetails(phone, period = 'this_week', category = null) {
  const { start, end } = getDateRange(period);

  let query = supabase
    .from('expenses')
    .select('amount, category, description, date')
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    const label = period.replace(/_/g, ' ');
    return `No expenses found for ${label} 📭`;
  }

  const label = capitalize(period.replace(/_/g, ' '));
  const catLabel = category ? ` (${category})` : '';
  let reply = `📋 *${label} Details${catLabel}*\n\n`;

  data.forEach(({ date, description, amount, category: cat }) => {
    const emoji = categoryEmoji(cat);
    reply += `${emoji} ${description} — *${Number(amount).toLocaleString()} PKR* _(${date})_\n`;
  });

  return reply.trim();
}

export async function getExpenseSummary(phone, period = 'this_month') {
  const { start, end } = getDateRange(period);

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end);

  if (error) throw error;

  if (!data || data.length === 0) {
    const label = period.replace(/_/g, ' ');
    return `No expenses found for ${label} 📭\n\nStart tracking by saying:\n*spent 500 on food*`;
  }

  const totals = {};
  let grand = 0;
  data.forEach(({ amount, category }) => {
    totals[category] = (totals[category] || 0) + parseFloat(amount);
    grand += parseFloat(amount);
  });

  const label = capitalize(period.replace(/_/g, ' '));
  let reply = `📊 *${label} Summary*\n\n`;

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      const emoji = categoryEmoji(cat);
      reply += `${emoji} ${cat}: *${amt.toLocaleString()} PKR*\n`;
    });

  reply += `\n💰 *Total: ${grand.toLocaleString()} PKR*`;
  return reply;
}

function getDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { start: today, end: today };

    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { start: start.toISOString().split('T')[0], end: today };
    }

    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: first.toISOString().split('T')[0],
        end:   last.toISOString().split('T')[0],
      };
    }

    case 'this_month':
    default: {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: first.toISOString().split('T')[0], end: today };
    }
  }
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function categoryEmoji(cat) {
  const map = {
    Food: '🍔', Transport: '🚗', Bills: '⚡',
    Shopping: '🛍️', Health: '💊', Entertainment: '🎮', Other: '📝',
  };
  return map[cat] || '💰';
}
