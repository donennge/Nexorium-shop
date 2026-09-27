// api/upload-imgur.js
// Uploads the compressed receipt to catbox.moe — free, no signup required.

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const dataUrl = String(body.dataUrl || '').trim();
  if (!dataUrl || dataUrl.indexOf('data:image/') !== 0) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid image data' });
  }

  const base64 = dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  const boundary = '----catbox' + Date.now();
  const filename = 'receipt_' + Date.now() + '.jpg';

  const parts = [];
  parts.push(Buffer.from('--' + boundary + '\r\n'));
  parts.push(Buffer.from('Content-Disposition: form-data; name="reqtype"\r\n\r\n'));
  parts.push(Buffer.from('fileupload\r\n'));
  parts.push(Buffer.from('--' + boundary + '\r\n'));
  parts.push(Buffer.from('Content-Disposition: form-data; name="fileToUpload"; filename="' + filename + '"\r\n'));
  parts.push(Buffer.from('Content-Type: image/jpeg\r\n\r\n'));
  parts.push(buffer);
  parts.push(Buffer.from('\r\n--' + boundary + '--\r\n'));

  const payload = Buffer.concat(parts);

  try {
    const catRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': payload.length
      },
      body: payload
    });

    const text = await catRes.text();

    if (!catRes.ok || !text || !/^https?:\/\//.test(text.trim())) {
      console.error('[catbox] upload failed', catRes.status, text);
      return res.status(502).json({ ok: false, error: 'Upload failed', detail: text });
    }

    return res.status(200).json({ ok: true, url: text.trim() });
  } catch (err) {
    console.error('[catbox] network error', err);
    return res.status(500).json({ ok: false, error: 'Network error' });
  }
}