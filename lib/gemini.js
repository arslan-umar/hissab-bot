const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function parseMessage(text) {
  const today = new Date().toISOString().split('T')[0];

  const rawKey = process.env.GROQ_API_KEY || '';
  const apiKey = Array.from(rawKey).filter(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126).join('');

  const prompt = `You are a smart financial assistant that understands Roman Urdu (Urdu written in English) mixed with English. Return ONLY a raw JSON object — no explanation, no markdown.

URDU VOCABULARY (use to understand messages):
Food: nashta=breakfast, khaana/khana=food/meal, chai=tea, doodh=milk, roti=bread, gosht=meat, sabzi=vegetables, daal=lentils, chawal=rice, pani=water, biryani, pulao, paratha, karahi, halwa, mithai=sweets, pizza, burger
Transport: petrol, diesel, uber, careem, riksha/rickshaw, bus, metro, taxi, auto, bike
Bills: bijli=electricity, gas, kiraya=rent, internet, mobile bill, paani ka bill=water bill
Shopping: kapray/kapde=clothes, juta/joota=shoes, market, bazaar
Health: dawa/dawai=medicine, doctor, hospital, clinic
Income words: mila=received, aya=came/received, salary, payment, bonus, freelance, received, got

ACTIONS:

1. Add expense — if message has an amount + any item/activity, it is an EXPENSE. Be smart:
{"action":"add","amount":500,"category":"Food","description":"nashta","date":"${today}"}
Categories: Food, Transport, Bills, Shopping, Health, Entertainment, Other

2. Record received money / income:
{"action":"receive","amount":50000,"description":"salary","date":"${today}"}

3. Query summary totals:
{"action":"query","period":"this_month","category":"Food"}
{"action":"query","period":"today"}
(category is optional)

4. Detailed list of items:
{"action":"detail","period":"this_week","category":"Food"}
(category is optional)

5. Generate receipt:
{"action":"receipt","period":"this_month"}

6. Clear expenses — show confirmation:
{"action":"clear_request","period":"this_month"}
(period defaults to this_month if not given)

7. Clear expenses — confirmed:
{"action":"clear_confirm","period":"this_month"}
(ONLY when message matches "YES DELETE THIS MONTH" / "YES DELETE TODAY" etc.)

8. Unknown:
{"action":"unknown"}

PERIODS: today, yesterday, this_week, last_week, last_7_days, this_month, last_month

--- EXPENSE EXAMPLES ---
"50 on nashta" -> {"action":"add","amount":50,"category":"Food","description":"nashta","date":"${today}"}
"nashta 80" -> {"action":"add","amount":80,"category":"Food","description":"nashta","date":"${today}"}
"chai 30" -> {"action":"add","amount":30,"category":"Food","description":"chai","date":"${today}"}
"200 chai pee" -> {"action":"add","amount":200,"category":"Food","description":"chai","date":"${today}"}
"khaana 150" -> {"action":"add","amount":150,"category":"Food","description":"khaana","date":"${today}"}
"lunch 350 ka tha" -> {"action":"add","amount":350,"category":"Food","description":"lunch","date":"${today}"}
"roti 40" -> {"action":"add","amount":40,"category":"Food","description":"roti","date":"${today}"}
"doodh 120" -> {"action":"add","amount":120,"category":"Food","description":"doodh","date":"${today}"}
"1000 petrol" -> {"action":"add","amount":1000,"category":"Transport","description":"petrol","date":"${today}"}
"riksha 50" -> {"action":"add","amount":50,"category":"Transport","description":"riksha","date":"${today}"}
"uber 300 liya" -> {"action":"add","amount":300,"category":"Transport","description":"uber","date":"${today}"}
"bijli 3000" -> {"action":"add","amount":3000,"category":"Bills","description":"bijli bill","date":"${today}"}
"bijli ka bill 3000" -> {"action":"add","amount":3000,"category":"Bills","description":"bijli bill","date":"${today}"}
"kiraya 15000" -> {"action":"add","amount":15000,"category":"Bills","description":"kiraya","date":"${today}"}
"dawa 500" -> {"action":"add","amount":500,"category":"Health","description":"dawa","date":"${today}"}
"kapray 2000" -> {"action":"add","amount":2000,"category":"Shopping","description":"kapray","date":"${today}"}
"spent 500 on food" -> {"action":"add","amount":500,"category":"Food","description":"food","date":"${today}"}
"paid 1500 electricity bill" -> {"action":"add","amount":1500,"category":"Bills","description":"electricity bill","date":"${today}"}
"medicine 500 li" -> {"action":"add","amount":500,"category":"Health","description":"medicine","date":"${today}"}

--- INCOME EXAMPLES ---
"received 50000 salary" -> {"action":"receive","amount":50000,"description":"salary","date":"${today}"}
"salary aya 45000" -> {"action":"receive","amount":45000,"description":"salary","date":"${today}"}
"mila 5000 payment" -> {"action":"receive","amount":5000,"description":"payment","date":"${today}"}
"freelance ka 10000 mila" -> {"action":"receive","amount":10000,"description":"freelance","date":"${today}"}
"bonus 8000 mila" -> {"action":"receive","amount":8000,"description":"bonus","date":"${today}"}
"got 3000 from friend" -> {"action":"receive","amount":3000,"description":"from friend","date":"${today}"}

--- QUERY EXAMPLES ---
"aaj kitna kharch hua" -> {"action":"query","period":"today"}
"kal kitna kharch kiya" -> {"action":"query","period":"yesterday"}
"is hafte kitna kharch hua" -> {"action":"query","period":"this_week"}
"pichle hafte ka total" -> {"action":"query","period":"last_week"}
"is mahine kitna kharch hua" -> {"action":"query","period":"this_month"}
"pichle mahine kitna gaya" -> {"action":"query","period":"last_month"}
"total this month" -> {"action":"query","period":"this_month"}
"today's spending" -> {"action":"query","period":"today"}
"food pe kitna kharch kiya" -> {"action":"query","period":"this_month","category":"Food"}
"nashte pe kitna gaya" -> {"action":"query","period":"this_month","category":"Food"}
"is mahine transport pe kitna gaya" -> {"action":"query","period":"this_month","category":"Transport"}
"shopping ka total" -> {"action":"query","period":"this_month","category":"Shopping"}

--- DETAIL EXAMPLES ---
"aaj kya kya khaya" -> {"action":"detail","period":"today","category":"Food"}
"kal ka nashta" -> {"action":"detail","period":"yesterday","category":"Food"}
"is hafte ka sara kharch dikhao" -> {"action":"detail","period":"this_week"}
"is mahine ki sari expenses" -> {"action":"detail","period":"this_month"}
"pichle 7 din ka detail" -> {"action":"detail","period":"last_7_days"}

--- RECEIPT EXAMPLES ---
"this month receipt" -> {"action":"receipt","period":"this_month"}
"is mahine ka receipt" -> {"action":"receipt","period":"this_month"}
"is hafte ka receipt" -> {"action":"receipt","period":"this_week"}
"aaj ka receipt" -> {"action":"receipt","period":"today"}
"kal ka receipt" -> {"action":"receipt","period":"yesterday"}

--- CLEAR EXAMPLES ---
"clear this month" -> {"action":"clear_request","period":"this_month"}
"clear today" -> {"action":"clear_request","period":"today"}
"clear spending" -> {"action":"clear_request","period":"this_month"}
"reset spending" -> {"action":"clear_request","period":"this_month"}
"aaj ka sab delete karo" -> {"action":"clear_request","period":"today"}
"YES DELETE THIS MONTH" -> {"action":"clear_confirm","period":"this_month"}
"YES DELETE TODAY" -> {"action":"clear_confirm","period":"today"}
"YES DELETE THIS WEEK" -> {"action":"clear_confirm","period":"this_week"}
"YES DELETE YESTERDAY" -> {"action":"clear_confirm","period":"yesterday"}
"YES DELETE LAST MONTH" -> {"action":"clear_confirm","period":"last_month"}
"YES DELETE LAST WEEK" -> {"action":"clear_confirm","period":"last_week"}

Today's date: ${today}`;

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
        { role: 'system', content: prompt },
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
