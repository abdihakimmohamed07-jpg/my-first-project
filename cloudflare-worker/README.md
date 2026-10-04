# Octane Transport chat Worker

Holds the Anthropic API key so it's never in the browser. Deploy this from
your own machine, not from this repo's CI — the key is a secret, not a file.

## Deploy (Cloudflare dashboard — no install needed)

1. Create a separate Anthropic Console workspace for this chatbot, with a
   $20/month spend limit, and generate an API key there.
2. On dash.cloudflare.com: **Workers & Pages** > **Create** > **Workers** >
   **Create Worker**. Name it (e.g. `octane-chat`) and deploy the default
   template.
3. Open the new Worker > **Edit code**. Delete the template code and paste
   in the contents of `worker.js` from this folder. Click **Deploy**.
4. Back on the Worker's page: **Settings** > **Variables and Secrets** >
   **Add** > name it `ANTHROPIC_API_KEY`, paste the key, and tick
   **Encrypt**. Save.
5. The Worker's URL is shown at the top of its page
   (`https://octane-chat.<your-subdomain>.workers.dev`). Put that URL into
   `assets/js/chat-widget.js`, in the `WORKER_URL` constant near the top of
   the file, and open a PR with that one-line change.

### Alternative: wrangler CLI

If you'd rather use the command line: `npm install -g wrangler`,
`wrangler login`, then from this folder `wrangler deploy`, and
`wrangler secret put ANTHROPIC_API_KEY` (paste the key when prompted — it's
never written to a file or committed). Same step 5 above for the URL.

## Updating the knowledge base

The bot's facts and rules live in `SYSTEM_PROMPT` in `worker.js`. When the
knowledge base changes, edit it there and run `wrangler deploy` again.

## Known limits

- The per-session (`MAX_MESSAGES_PER_SESSION`) and per-IP
  (`MAX_REQUESTS_PER_IP_PER_HOUR`) caps in `worker.js` are in-memory counters
  scoped to one Worker isolate — they reset on a cold start and aren't shared
  across every visitor. They're a backstop against one runaway session or one
  IP, not real abuse protection. The $20/month spend cap on the Anthropic
  workspace is the actual ceiling. If spend becomes a problem, move the
  counters to Workers KV, or add Cloudflare's Rate Limiting binding (needs a
  paid Workers plan).
- The bot doesn't see earlier turns in the conversation — each message is
  answered independently. Fine for FAQ-style questions; add history to the
  `messages` array in `worker.js` if multi-turn context is needed later.
