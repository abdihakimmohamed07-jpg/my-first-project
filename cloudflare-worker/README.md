# Octane Transport chat Worker

Holds the Anthropic API key so it's never in the browser. Deploy this from
your own machine, not from this repo's CI — the key is a secret, not a file.

## Deploy

1. Create a separate Anthropic Console workspace for this chatbot, with a
   $20/month spend limit, and generate an API key there.
2. `npm install -g wrangler` (if you don't have it), then `wrangler login`
   with the Cloudflare account that will host this.
3. From this `cloudflare-worker/` folder: `wrangler deploy`
4. Set the key as a secret (you'll be prompted to paste it — it is never
   written to a file or committed):
   ```
   wrangler secret put ANTHROPIC_API_KEY
   ```
5. Wrangler prints the Worker's URL (`https://octane-chat.<your-subdomain>.workers.dev`).
   Put that URL into `assets/js/chat-widget.js`, in the `WORKER_URL` constant
   near the top of the file, and open a PR with that one-line change.

## Updating the knowledge base

The bot's facts and rules live in `SYSTEM_PROMPT` in `worker.js`. When the
knowledge base changes, edit it there and run `wrangler deploy` again.

## Known limits

- The per-session message cap (`MAX_MESSAGES_PER_SESSION` in `worker.js`) is
  an in-memory counter scoped to one Worker isolate — it resets on a cold
  start and isn't shared across every visitor. It's a backstop against a
  single runaway session, not abuse protection. If spend becomes a problem,
  move the counter to Workers KV.
- The bot doesn't see earlier turns in the conversation — each message is
  answered independently. Fine for FAQ-style questions; add history to the
  `messages` array in `worker.js` if multi-turn context is needed later.
