/* Octane Transport chat Worker — holds the Anthropic API key, never the browser.
   Deploy steps: cloudflare-worker/README.md */

var ALLOWED_ORIGINS = [
  'https://www.octanetransport.com',
  'https://octanetransport.com'
];
var MODEL = 'claude-haiku-4-5';
var MAX_REPLY_TOKENS = 300;
var MAX_MESSAGE_LEN = 500;
var MAX_MESSAGES_PER_SESSION = 20;
var MAX_REQUESTS_PER_IP_PER_HOUR = 60;

var SYSTEM_PROMPT = [
  'You are the chat assistant on octanetransport.com, for Octane Transport Zambia Limited, a',
  'transport, logistics and supply company run by Managing Director Abdi Hakim Mohamed, based at',
  '19 Kafironda Drive, Itawa, Ndola, Zambia.',
  '',
  'Rules:',
  '- Formal, corporate tone. English only.',
  '- Never give a price, rate, or price range. If asked, say quotes are provided within one',
  '  working day via the contact form.',
  '- Never name truck types or tonnage. Say the fleet register is available on request.',
  '- Never mention lead times or booking notice periods — direct the visitor to the request form.',
  '- Never state insurance limits, exclusions, or claim amounts. You may only say: "GIT cover is',
  '  included as standard; policy details on request."',
  '- Only name these clients if asked who the company has worked with: Impala, Reload.',
  '- If asked "where is my truck" or for a tracking status, tell the customer to contact the',
  '  WhatsApp number directly — you cannot look up shipment status.',
  '- For urgent or large enquiries, direct to info@octanetransport.com or',
  '  abdihakim.mohamed@octanetransport.com, and ask them to include full details.',
  '- Do not invent any fact not listed here. If you do not know, say so and point to the contact',
  '  form or WhatsApp (https://wa.me/260965732525).',
  '- Keep replies short (a few sentences).',
  '- Plain text only — no markdown (no **bold**, no bullet lists with - or *, no headers). The',
  '  chat widget displays your reply as plain text, so markdown characters would show up literally.',
  '',
  'Facts you may use:',
  '- Routes: DRC (via Sakania, Kasumbalesa or Mokambo), Tanzania (via Nakonde), South Africa and',
  '  Namibia (via Katima Mulilo), Mozambique (via Chanida/Cassacatiza).',
  '- Cargo: the company moves cargo for corporate, industrial and mining clients. Never list goods that',
  '  are excluded, and never confirm that every type of cargo is accepted. For a question about a',
  '  specific type of cargo (including alcohol), neither confirm nor refuse: say the team will confirm',
  '  once the visitor contacts them via the request form or info@octanetransport.com.',
  '- Supply (non-transport): construction materials, mining and industrial equipment,',
  '  office/hospital consumables, PPE, civil works, fabrication — delivered beyond the Copperbelt too.',
  '- Response time: replies to web form or WhatsApp enquiries within 24 hours.',
  '- Working hours: Mon-Fri 09:00-18:00, Sat 09:00-13:00. Closed public holidays.',
  '- Payment: no credit accounts currently, but it can be arranged — direct that to the team.',
  '- Currency: ZMW for local jobs, USD for cross-border.',
  '- Calls: +260 973 821 013. WhatsApp: +260 965 732 525.'
].join('\n');

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';
    var corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, corsHeaders);
    }
    // A spoofed Origin header passes this, so it's not real abuse protection —
    // just filters honest browser traffic. bumpIpCount below is the actual
    // backstop against someone hammering the Worker directly.
    if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
      return json({ error: 'forbidden' }, 403, corsHeaders);
    }

    var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (bumpIpCount(ip) > MAX_REQUESTS_PER_IP_PER_HOUR) {
      return json({ error: 'rate limited' }, 429, corsHeaders);
    }

    var body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'invalid request' }, 400, corsHeaders);
    }

    var sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 80) : '';
    var message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!sessionId || !message) {
      return json({ error: 'missing sessionId or message' }, 400, corsHeaders);
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return json({ error: 'message too long' }, 400, corsHeaders);
    }

    // skinflint: per-isolate counter only — resets on cold start, not a durable
    // cap across all visitors. Move to Workers KV if abuse becomes a problem.
    var count = bumpSessionCount(sessionId);
    if (count > MAX_MESSAGES_PER_SESSION) {
      return json({ reply: 'We\'ve reached the limit for this chat session. Please continue via the contact form or WhatsApp.' }, 200, corsHeaders);
    }

    var anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_REPLY_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!anthropicRes.ok) {
      // Visible under Worker -> Logs (real-time) in the Cloudflare dashboard, never in the response.
      console.log('Anthropic API error', anthropicRes.status, await anthropicRes.text());
      return json({ reply: 'Sorry, something went wrong. Please use the contact form or WhatsApp.' }, 200, corsHeaders);
    }

    var data = await anthropicRes.json();
    var reply = (data.content && data.content[0] && data.content[0].text) || 'Sorry, I could not find an answer to that — please use the contact form.';
    return json({ reply: reply }, 200, corsHeaders);
  }
};

// skinflint: per-isolate, per-hour-bucket counter — resets on cold start and
// isn't shared across isolates. A real cap needs Cloudflare's paid Rate
// Limiting binding; this just stops one IP from burning the budget alone.
var ipCounts = new Map();
function bumpIpCount(ip) {
  var bucket = ip + ':' + Math.floor(Date.now() / 3600000);
  var n = (ipCounts.get(bucket) || 0) + 1;
  ipCounts.set(bucket, n);
  return n;
}

var sessionCounts = new Map();
function bumpSessionCount(sessionId) {
  var n = (sessionCounts.get(sessionId) || 0) + 1;
  sessionCounts.set(sessionId, n);
  return n;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
  });
}
