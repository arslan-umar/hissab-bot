const CRICAPI_URL = 'https://api.cricapi.com/v1/currentMatches';

export async function getLiveScores(filter = null) {
  const rawKey = process.env.CRICKET_API_KEY || '';
  const apiKey = Array.from(rawKey).filter(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126).join('');

  const res = await fetch(`${CRICAPI_URL}?apikey=${apiKey}&offset=0`);
  if (!res.ok) throw new Error(`Cricket API error: ${res.status}`);

  const data = await res.json();

  if (data.status !== 'success' || !data.data?.length) {
    return '🏏 No live matches right now. Check back later!';
  }

  let matches = data.data;

  if (filter) {
    const f = filter.toLowerCase();
    matches = matches.filter(m =>
      m.name?.toLowerCase().includes(f) ||
      m.teams?.some(t => t.toLowerCase().includes(f))
    );
    if (!matches.length) {
      return `🏏 No current matches found for *${filter}*.\n\nSay *live score* to see all matches.`;
    }
  }

  const lines = [`🏏 *Live Cricket Scores*\n`];

  matches.forEach(match => {
    const name = match.name || 'Unknown Match';
    const status = match.status || 'In Progress';
    const matchType = match.matchType?.toUpperCase() || '';

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📌 *${name}*${matchType ? ` (${matchType})` : ''}`);

    if (match.score?.length) {
      match.score.forEach(s => {
        const runs = s.r !== undefined ? s.r : '—';
        const wickets = s.w !== undefined ? `/${s.w}` : '';
        const overs = s.o !== undefined ? ` (${s.o} ov)` : '';
        lines.push(`  🏏 ${s.inning}: *${runs}${wickets}${overs}*`);
      });
    } else {
      lines.push(`  Status: ${status}`);
    }

    if (status && status !== 'In Progress') {
      lines.push(`  📢 ${status}`);
    }
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Updated just now · Say *live score* to refresh_`);

  return lines.join('\n');
}
