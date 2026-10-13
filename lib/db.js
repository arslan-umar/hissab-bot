import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveExpense(phone, { amount, category, description, date }) {
  const { error } = await supabase.from('expenses').insert({
    phone, amount, category, description, date,
  });
  if (error) throw error;
}

export async function getExpenseSummary(phone, period = 'this_month', category = null) {
  const { start, end } = getDateRange(period);

  let query = supabase
    .from('expenses')
    .select('amount, category')
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end);

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    const label = periodLabel(period);
    const catPart = category ? ` on ${category}` : '';
    return `No expenses found for ${label}${catPart} 📭\n\nStart tracking by saying:\n*spent 500 on food*`;
  }

  const totals = {};
  let grand = 0;
  data.forEach(({ amount, category: cat }) => {
    totals[cat] = (totals[cat] || 0) + parseFloat(amount);
    grand += parseFloat(amount);
  });

  const label = capitalize(periodLabel(period));
  const catPart = category ? ` — ${category}` : '';
  let reply = `📊 *${label} Summary${catPart}*\n\n`;

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      reply += `${categoryEmoji(cat)} ${cat}: *${amt.toLocaleString()} PKR*\n`;
    });

  reply += `\n💰 *Total: ${grand.toLocaleString()} PKR*`;
  return reply;
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
    const label = periodLabel(period);
    return `No expenses found for ${label} 📭`;
  }

  const label = capitalize(periodLabel(period));
  const catLabel = category ? ` (${category})` : '';
  let reply = `📋 *${label} Details${catLabel}*\n\n`;

  data.forEach(({ date, description, amount, category: cat }) => {
    reply += `${categoryEmoji(cat)} ${description} — *${Number(amount).toLocaleString()} PKR* _(${date})_\n`;
  });

  const total = data.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  reply += `\n💰 *Total: ${total.toLocaleString()} PKR*`;

  return reply.trim();
}

export async function generateReceipt(phone, period = 'this_month') {
  const { start, end } = getDateRange(period);

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category, description, date')
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    return `No expenses found for ${periodLabel(period)} 📭`;
  }

  const label = capitalize(periodLabel(period));
  const total = data.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const line = '─────────────────────────';

  let receipt = `🧾 *HISSAB RECEIPT*\n`;
  receipt += `📅 ${label}\n`;
  receipt += `${line}\n`;

  data.forEach(({ date, description, amount, category }) => {
    const shortDate = date.slice(5).replace('-', '/');
    const desc = description.length > 14 ? description.slice(0, 14) : description.padEnd(14);
    const amt = `${Number(amount).toLocaleString()} PKR`;
    receipt += `${shortDate}  ${categoryEmoji(category)} ${desc}  ${amt}\n`;
  });

  receipt += `${line}\n`;
  receipt += `💰 *TOTAL: ${total.toLocaleString()} PKR*\n`;
  receipt += `${line}\n`;
  receipt += `${data.length} item(s)  |  Hissab Bot`;

  return receipt;
}

export async function getExpenseStats(phone, period) {
  const { start, end } = getDateRange(period);
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  const count = data?.length || 0;
  const total = data?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
  const byCategory = {};
  data?.forEach(({ amount, category }) => {
    byCategory[category] = (byCategory[category] || 0) + parseFloat(amount);
  });
  return { count, total, byCategory };
}

export async function clearExpenses(phone, period) {
  const { start, end } = getDateRange(period);
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('phone', phone)
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
}

function getDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { start: today, end: today };

    case 'yesterday': {
      const d = new Date(now);
      d.setDate(now.getDate() - 1);
      const y = d.toISOString().split('T')[0];
      return { start: y, end: y };
    }

    case 'this_week': {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      return { start: d.toISOString().split('T')[0], end: today };
    }

    case 'last_7_days': {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      return { start: d.toISOString().split('T')[0], end: today };
    }

    case 'last_week': {
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay());
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
      return {
        start: startOfLastWeek.toISOString().split('T')[0],
        end: endOfLastWeek.toISOString().split('T')[0],
      };
    }

    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] };
    }

    case 'this_month':
    default: {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: first.toISOString().split('T')[0], end: today };
    }
  }
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

function categoryEmoji(cat) {
  const map = {
    Food: '🍔', Transport: '🚗', Bills: '⚡',
    Shopping: '🛍️', Health: '💊', Entertainment: '🎮', Other: '📝',
  };
  return map[cat] || '💰';
}
