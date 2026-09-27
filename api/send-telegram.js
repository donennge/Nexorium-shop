// api/send-telegram.js
// Sends the styled "NEW ORDER" notification to Telegram using sendPhoto.

export const config = {
  api: { bodyParser: { sizeLimit: '256kb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  const BANNER    = process.env.TELEGRAM_BANNER_URL || 'https://i.imgur.com/4gTSMcl.jpeg';

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const orderId       = String(body.orderId       || '').trim();
  const tgUser        = String(body.tgUser        || '').trim();
  const buyerName     = String(body.buyerName     || '').trim();
  const productName   = String(body.productName   || '').trim();
  const duration      = String(body.duration      || '').trim();
  const amount        = String(body.amount        || '').trim();
  const currency      = String(body.currency      || 'PHP').trim();
  const paymentMethod = String(body.paymentMethod || '').trim();
  const receiptRef    = String(body.receiptRef    || '').trim();
  const status        = String(body.status        || 'PENDING REVIEW').trim();
  const shopUrl       = String(body.shopUrl       || '').trim();

  if (!orderId || !tgUser || !buyerName || !productName) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  const caption =
    '\u2705 <b>APPROVED ORDER</b>\n\n' +
    '<b>Order ID:</b> ' + esc(orderId) + '\n' +
    '<b>User:</b> ' + esc(tgUser) + '\n' +
    '<b>Name:</b> ' + esc(buyerName) + '\n' +
    '<b>Product:</b> ' + esc(productName) + '\n' +
    (duration ? '<b>Duration:</b> ' + esc(duration) + '\n' : '') +
    '<b>Amount:</b> ' + esc(currency) + ' ' + esc(amount) + '\n' +
    '<b>Payment Method:</b> ' + esc(paymentMethod) + '\n\n' +
    '<b>Receipt:</b> ' + esc(receiptRef || '—') + '\n\n' +
    '<b>Status:</b> ' + esc(status) + '\n' +
    '<b>SHOP:</b> ' + esc(shopUrl || '—');

  const apiBase = 'https://api.telegram.org/bot' + BOT_TOKEN;

  try {
    const photoRes = await fetch(apiBase + '/sendPhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, photo: BANNER, caption: caption, parse_mode: 'HTML' })
    });
    const photoData = await photoRes.json().catch(function () { return {}; });
    if (photoRes.ok && photoData.ok) {
      return res.status(200).json({ ok: true, method: 'sendPhoto' });
    }

    const msgRes = await fetch(apiBase + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: caption, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const msgData = await msgRes.json().catch(function () { return {}; });
    if (!msgRes.ok || !msgData.ok) {
      return res.status(502).json({ ok: false, error: 'Telegram send failed', detail: msgData });
    }
    return res.status(200).json({ ok: true, method: 'sendMessage' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Network error' });
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}