function cleanEnv(val) {
  return Array.from(val || '').filter(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126).join('');
}

export async function sendMessage(phone, text) {
  const url = `https://graph.facebook.com/v20.0/${cleanEnv(process.env.PHONE_NUMBER_ID)}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanEnv(process.env.WHATSAPP_TOKEN)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`WhatsApp send failed: ${JSON.stringify(err)}`);
  }
}
