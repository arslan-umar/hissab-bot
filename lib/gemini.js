const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function parseMessage(text) {
  const today = new Date().toISOString().split('T')[0];

  // Strip any non-ASCII characters (BOM etc) from the key
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

For adding an expense: {"action":"add","amount":500,"category":"Food","description":"biryani","date":"${today}"}
For querying expenses: {"action":"query","period":"this_month"}
period options: "today", "this_week", "this_month", "last_month"
For unclear messages: {"action":"unknown"}

Categories: Food, Transport, Bills, Shopping, Health, Entertainment, Other

Examples:
"spent 500 on food" -> {"action":"add","amount":500,"category":"Food","description":"food","date":"${today}"}
"khaana 200 ka tha" -> {"action":"add","amount":200,"category":"Food","description":"khaana","date":"${today}"}
"total this month" -> {"action":"query","period":"this_month"}
"is hafte kitna kharch hua" -> {"action":"query","period":"this_week"}
"paid 1500 electricity" -> {"action":"add","amount":1500,"category":"Bills","description":"electricity","date":"${today}"}

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
