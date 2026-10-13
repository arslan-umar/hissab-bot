const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function parseMessage(text) {
  const today = new Date().toISOString().split('T')[0];

  const rawKey = process.env.GROQ_API_KEY || '';
  const apiKey = Array.from(rawKey).filter(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126).join('');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a financial assistant that parses Urdu/English expense messages. Return ONLY a raw JSON object.

ACTIONS:

1. Add expense:
{"action":"add","amount":500,"category":"Food","description":"biryani","date":"${today}"}
Categories: Food, Transport, Bills, Shopping, Health, Entertainment, Other

2. Summary totals (optional category filter):
{"action":"query","period":"this_month","category":"Food"}
{"action":"query","period":"today"}
category is optional — only include if user asks about a specific category.

3. Detailed list of individual items:
{"action":"detail","period":"this_week","category":"Food"}
category is optional.

4. Unknown:
{"action":"unknown"}

PERIOD OPTIONS: today, yesterday, this_week, last_week, last_7_days, this_month, last_month

EXAMPLES:
"spent 500 on food" -> {"action":"add","amount":500,"category":"Food","description":"food","date":"${today}"}
"khaana 200 ka tha" -> {"action":"add","amount":200,"category":"Food","description":"khaana","date":"${today}"}
"petrol 1000" -> {"action":"add","amount":1000,"category":"Transport","description":"petrol","date":"${today}"}
"bijli ka bill 3000" -> {"action":"add","amount":3000,"category":"Bills","description":"bijli bill","date":"${today}"}
"medicine 500 li" -> {"action":"add","amount":500,"category":"Health","description":"medicine","date":"${today}"}

"aaj kitna kharch hua" -> {"action":"query","period":"today"}
"kal kitna kharch kiya" -> {"action":"query","period":"yesterday"}
"is hafte kitna kharch hua" -> {"action":"query","period":"this_week"}
"pichle hafte ka total" -> {"action":"query","period":"last_week"}
"is mahine kitna kharch hua" -> {"action":"query","period":"this_month"}
"pichle mahine kitna gaya" -> {"action":"query","period":"last_month"}
"total this month" -> {"action":"query","period":"this_month"}
"today's spending" -> {"action":"query","period":"today"}
"how much did I spend this week" -> {"action":"query","period":"this_week"}

"food pe kitna kharch kiya" -> {"action":"query","period":"this_month","category":"Food"}
"is mahine transport pe kitna gaya" -> {"action":"query","period":"this_month","category":"Transport"}
"how much on food this week" -> {"action":"query","period":"this_week","category":"Food"}
"shopping ka total" -> {"action":"query","period":"this_month","category":"Shopping"}
"health pe kitna kharch hua" -> {"action":"query","period":"this_month","category":"Health"}

"food ma kya kya khaya" -> {"action":"detail","period":"this_week","category":"Food"}
"aaj kya kya khaya" -> {"action":"detail","period":"today","category":"Food"}
"kal kya khaya" -> {"action":"detail","period":"yesterday","category":"Food"}
"is hafte ka sara kharch dikhao" -> {"action":"detail","period":"this_week"}
"is mahine ki sari expenses" -> {"action":"detail","period":"this_month"}
"show everything this month" -> {"action":"detail","period":"this_month"}
"list all expenses today" -> {"action":"detail","period":"today"}
"aaj kahan kahan kharch kiya" -> {"action":"detail","period":"today"}
"pichle 7 din ka detail" -> {"action":"detail","period":"last_7_days"}

Today's date: ${today}`,
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content.trim());
}
