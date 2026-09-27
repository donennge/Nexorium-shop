// api/send-announce.js
// Sends an admin announcement to Telegram.
// If imageUrl is provided, sends a photo with caption. Otherwise sends plain text.

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

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const message  = String(body.message  || '').trim();
  const imageUrl = String(body.imageUrl || '').trim();

  if (!message && !imageUrl) {
    return res.status(400).json({ ok: false, error: 'Message or image is required' });
  }

  const apiBase = 'https://api.telegram.org/bot' + BOT_TOKEN;

  // Escape HTML so admin text with < or > doesn't break parse_mode
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  try {
    let tgRes, tgData;

    if (imageUrl) {
      // sendPhoto — image with caption
      tgRes = await fetch(apiBase + '/sendPhoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          photo: imageUrl,
          caption: safeMessage || '',
          parse_mode: 'HTML'
        })
      });
      tgData = await tgRes.json().catch(function () { return {}; });

      // If sendPhoto failed (bad image), fall back to sendMessage so nothing is lost
      if (!tgRes.ok || !tgData.ok) {
        console.warn('[announce] sendPhoto failed, falling back to sendMessage', tgData);
        tgRes = await fetch(apiBase + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: safeMessage || imageUrl,
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        });
        tgData = await tgRes.json().catch(function () { return {}; });
      }
    } else {
      // sendMessage — text only
      tgRes = await fetch(apiBase + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: safeMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      });
      tgData = await tgRes.json().catch(function () { return {}; });
    }

    if (!tgRes.ok || !tgData.ok) {
      return res.status(502).json({ ok: false, error: 'Telegram send failed', detail: tgData });
    }

    return res.status(200).json({ ok: true, method: imageUrl ? 'sendPhoto' : 'sendMessage' });
  } catch (err) {
    console.error('[announce] network error', err);
    return res.status(500).json({ ok: false, error: 'Network error' });
  }
}