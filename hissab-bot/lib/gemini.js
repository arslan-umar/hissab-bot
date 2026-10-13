import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function parseMessage(text) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a financial assistant that parses Urdu/English expense messages.

Given a user message, return ONLY a raw JSON object (no markdown, no explanation, no code blocks).

For adding an expense:
{"action":"add","amount":500,"category":"Food","description":"biryani","date":"${today}"}

For querying expenses:
{"action":"query","period":"this_month"}
period options: "today", "this_week", "this_month", "last_month"

For unclear messages:
{"action":"unknown"}

Categories: Food, Transport, Bills, Shopping, Health, Entertainment, Other

Examples:
"spent 500 on food" → {"action":"add","amount":500,"category":"Food","description":"food","date":"${today}"}
"khaana 200 ka tha" → {"action":"add","amount":200,"category":"Food","description":"khaana","date":"${today}"}
"total this month" → {"action":"query","period":"this_month"}
"is hafte kitna kharch hua" → {"action":"query","period":"this_week"}
"paid 1500 electricity" → {"action":"add","amount":1500,"category":"Bills","description":"electricity","date":"${today}"}

Today's date: ${today}

Message: "${text}"`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
}
