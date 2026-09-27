export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  const {
    chat_id, message_id, status, statusEmoji, statusLabel,
    orderId, productName, tgUser, buyerName,
    amount, currency, paymentMethod
  } = req.body || {};

  if (!chat_id || !message_id) {
    return res.status(400).json({ ok: false, error: 'missing chat_id or message_id' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });
  }

  const text =
    `${statusEmoji} <b>Order Status: ${statusLabel}</b>\n\n` +
    `🎫 <b>Ticket:</b> <code>${orderId}</code>\n` +
    `📦 <b>Product:</b> ${productName}\n` +
    `👤 <b>Buyer:</b> ${buyerName} (${tgUser})\n` +
    `💳 <b>Payment:</b> ${paymentMethod}\n` +
    `💰 <b>Amount:</b> ${currency} ${amount}\n` +
    `📌 <b>Status:</b> ${statusEmoji} ${statusLabel}`;

  const url = `https://api.telegram.org/bot${token}/editMessageText`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chat_id),
        message_id: Number(message_id),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await r.json();

    if (!data.ok && /not modified/i.test(data.description || '')) {
      return res.status(200).json({ ok: true, unchanged: true });
    }
    if (!data.ok) {
      return res.status(200).json({ ok: false, error: data.description });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'network error' });
  }
}
