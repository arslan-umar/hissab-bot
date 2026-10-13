import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').replace(/[^\x20-\x7E]/g, '') });

export async function parseMessage(text) {
  const today = new Date().toISOString().split('T')[0];

  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      {
        role: 'system',
        content: `You are a financial assistant that parses Urdu/English expense messages. Return ONLY a raw JSON object (no markdown, no explanation, no code blocks).

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

Today's date: ${today}`
      },
      { role: 'user', content: text }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content.trim();
  return JSON.parse(raw);
}
