# Octane Transport — Website, Company Profile & Digital Channels

**Owner:** Abdi Hakim Mohamed, Managing Director, Octane Transport Zambia Limited
**Last updated:** 5 October 2026 (chat now opens with tap-to-ask buttons; full-screen on phones)
**Scope:** website (octanetransport.com), Company Profile (PDF/MD), enquiry handling, WhatsApp Business, fleet imagery, and the website chatbot.
**Out of scope:** accounts, truck statements, FQM registration, holding company, and other Octane workstreams (these stay in their own projects).

---

## 1. Current setup (source of truth)

| Item | Detail |
|---|---|
| Live site | https://www.octanetransport.com — static HTML, hosted on **GitHub Pages** (not cPanel) |
| Repository | github.com/abdihakimmohamed07-jpg/my-first-project — **the repo is the source of truth**; merging to `main` deploys the site within 1–2 minutes |
| Domain | octanetransport.com (DNS points to GitHub Pages) |
| Change process | Claude Code works on a branch → opens a PR → Abdi reviews and merges. Cowork reviews PRs and prepares briefs, images and documents |
| Chatbot | Chat widget on every page (`assets/js/chat-widget.js`) + Cloudflare Worker `octane-chat` (`cloudflare-worker/`, deployed by Abdi by pasting `worker.js` in the Cloudflare dashboard; **every `worker.js` change needs a re-paste and Deploy**). Claude model called from the Worker; key held only in Cloudflare |
| Contact form handler | **Web3Forms** (free plan, 250 submissions/month), access key registered to info@octanetransport.com |
| Calls | +260 973 821 013 (Abdi's existing line — kept for calls) |
| WhatsApp Business | +260 965 732 525 (Octane Transport business line) |
| Email | info@octanetransport.com (enquiries); abdihakim.mohamed@octanetransport.com (principal contact) |
| Address | 19 Kafironda Drive, Itawa, Ndola, Zambia |

---

## 2. Completed work

### Website
- [x] Site built with Claude Code and live on octanetransport.com (pages: Home, About, Why Choose Octane, SHE, Projects, Services, Fleet, Industries, Mining & Corporate Procurement, Contact).
- [x] Contact form verified end to end (test submissions confirmed).
- [x] **All 3 forms switched from Formspree to Web3Forms** (Contact enquiry form + 2 Vendor Documentation Request forms on Procurement page). Honeypot spam protection added. Delivery to info@ confirmed (PR #14).
- [x] **Floating WhatsApp button** on every page + WhatsApp item on Contact page (PR #14).
- [x] **WhatsApp switched to business line +260 965 732 525**; calls remain on +260 973 821 013; Contact page shows "Calls" and "WhatsApp" as separate items (PR #15).
- [x] **Fleet photo gallery** added to the Fleet page using real Octane Mercedes-Benz Actros photos (enhanced, number plates blurred, third-party truck cropped out; images in `assets/img/fleet/`).
- [x] Content clean-up: draft wording removed from profile, Mining added to Industries intro, About page purpose wording updated, README corrected (PRs up to #25).

### Company Profile
- [x] Company Profile PDF (15 pages, brochure design) and Markdown version in the repo, downloadable from the Contact page.
- [x] **Updated with WhatsApp**: cover contact bar now "CALLS / WHATSAPP"; page 11 General Enquiries shows the WhatsApp number; contact table has "Calls" and a new "WhatsApp" row (tappable wa.me link). Markdown updated to match.
- [x] Core Services table clipping fixed.

### Enquiry handling & channels
- [x] Gmail filter: Formspree emails forward from personal Gmail to info@ (now a fallback only).
- [x] WhatsApp Business profile set up: name, @octanetransport username, category, hours (Mon–Fri 09:00–18:00, Sat 09:00–13:00), description, logo profile picture.
- [x] Away message fixed to send only **outside business hours**; greeting message drafted covering both **transport** and **supply** enquiries.

### Chatbot (live)
- [x] Architecture: chat widget on the site + **Cloudflare Worker** holding the Anthropic API key (GitHub Pages cannot run server code); small low-cost Claude model; separate Anthropic workspace with **US$20/month** limit and prepaid credit (auto-reload off); Cloudflare account on info@ with 2FA.
- [x] Knowledge base and rules drafted by Cowork, gap questions answered and approved by Abdi (4 Oct).
- [x] **Widget and Worker built and live** (PRs #28–#33): launcher + chat panel on all pages, message caps (500 characters, 20 per chat), reply cap, per-IP rate limit, allowed-origin check (a deterrent only; the spend cap is the real ceiling), upstream errors logged in the Worker's Logs tab. A fresh chat starts when a visitor arrives from outside the site; reloads and moving between pages keep the chat.
- [x] **Bot rules in the Worker:** formal English; no prices ("quotes within one working day"); no truck types, tonnage or lead times ("fleet register on request"); insurance only "GIT cover is included as standard; policy details on request"; may name clients Impala and Reload only; never lists or hints at excluded cargo, and for any named cargo says the team will confirm after contact; "where is my truck" goes to WhatsApp; urgent or large enquiries go to info@ or abdihakim.mohamed@; plain text only (no markdown).
- [x] **Quote-request form in the chat** (PR #34): when a visitor wants a quote, a small form (name, phone, cargo, route) appears and is sent from the browser to Web3Forms, subject "Chatbot quote request", arriving at info@. The bot never asks for these details in the chat (wording tightened in PR #35 and verified live).
- [x] **Tap-to-ask buttons and full-screen chat on phones** (PR #38, 5 Oct): the chat opens with four buttons (Request a quote, Where do you operate, Opening hours, Track my truck). Request a quote shows the form straight away; the others send a preset question; the buttons disappear after the first message. On screens up to 600px wide the chat fills the screen with a Back button; laptops keep the small box. Site-only change, so the Worker was not touched and no Cloudflare redeploy was needed. Layout options considered: small box, buttons, full screen on phones, side panel on laptops (the side panel was not chosen).
- [x] **Privacy line** in the chat panel: chats may be reviewed to improve service.
- [x] **Daily chat summary** (PR #34): each question and answer is stored in Cloudflare KV (binding `CHAT_LOGS`, namespace `octane-chat-logs`; no IP addresses; deleted after 7 days). A cron trigger (`0 6 * * *` UTC, 08:00 Zambia) emails the previous day's chats to info@ through Resend (secret `RESEND_API_KEY`, free plan). No email on days without chats. Web3Forms cannot be used for this: its free plan refuses server-side calls.
- [x] Cloudflare setup done by Abdi on 4 Oct: KV namespace and binding (a mistyped binding name was fixed), `RESEND_API_KEY` secret, cron trigger, Worker redeployed with the final wording. Live tests passed.

---

## 3. Pending / to do

### High priority
- [ ] **Check the first daily chat summary email on 5 Oct, about 08:00 Zambia time** (it should list the test chats from 4 Oct). If it is not in the inbox, check spam, then the Worker's Logs tab for "Summary email error". Mark one as "not spam" so later ones land in the inbox.
- [ ] **Test the 2 Procurement forms** (New Customer / Existing Customer) with one live submission each and confirm arrival at info@.
- [ ] **Confirm WhatsApp Business greeting message** is switched on with the transport + supply wording.

### Housekeeping
- [ ] Chatbot: set a spend alert at US$10 in the Anthropic Console (workspace for the chatbot) as an early warning below the US$20 cap.
- [ ] Chatbot: read the daily summaries for the first weeks and send Claude Code any wrong or awkward answers to fix in the Worker's rules.
- [ ] Optional chatbot extra: a WhatsApp button inside the chat window.
- [ ] After ~1 week of real Web3Forms enquiries arriving: **delete the Formspree form** and the **Gmail forwarding filter**.
- [ ] Check the Web3Forms dashboard monthly (submissions vs 250/month limit, spam folder).
- [ ] When customers WhatsApp the personal line, redirect them once to +260 965 732 525.
- [ ] Update the business number elsewhere over time: email signatures, Google Business listing (if any), vendor/supplier files (incl. FQM), business cards, truck door stickers (some still show old numbers).
- [ ] Review and remove if still unused: the old `images/` folder and the `company_profile_updated.md` source, flagged unlinked in a 27 Sep scan (re-confirmed 4 Oct — neither is referenced from any published page).

### Nice to have
- [ ] Professional fleet photo shoot (washed trucks, clean background, morning/evening light) to replace yard photos and the remaining stock images.
- [ ] WhatsApp Business **Catalog** with one item per truck/trailer type (no prices).
- [ ] Future: move calls to the business number when vendor forms come up for renewal.

### Security & DNS
- [ ] Tighten DMARC from `p=none` to `quarantine` once DMARC reports to abdihakim.mohamed@ look clean (SPF/DKIM/DMARC all verified passing 28 Sep; DKIM selector `google`; DNS in cPanel Zone Editor at cpanel.octanetransport.com).
- [ ] Optional: move DNS off cPanel (currently `africana.co.zm` nameservers) if cancelling cPanel hosting — cPanel is still needed today because it hosts DNS, and the MX records for Google Workspace must be preserved through any move.

---

## 4. Decisions log

| Date | Decision | Reason |
|---|---|---|
| 28 Sep | Keep website on GitHub Pages; use a third-party form service | Static hosting cannot run PHP |
| 29 Sep | Formspree → Web3Forms (key on info@) | 250 vs 50 submissions/month; leads go to company inbox; better spam controls |
| 29 Sep | Chatbot backend = Cloudflare Worker | GitHub Pages can't hold API keys securely |
| 29 Sep | API spend limit US$20/month, prepaid, separate workspace | Caps cost and isolates chatbot usage |
| 30 Sep | WhatsApp → business line; calls stay on existing line | Existing line already on vendor files; changing everywhere is costly |
| 30 Sep | Profile picture: logo with wording | Abdi's choice |
| 30 Sep | Fleet gallery: exclude red Volvo; blur number plates | Worn livery hurts credibility; plate cloning risk |
| 4 Oct | Chatbot never gives prices, lead times, truck types or tonnage; never hints at excluded cargo | Abdi's rules; the team confirms specifics after contact |
| 4 Oct | Chat logs kept 7 days in Cloudflare KV, no IP addresses; daily summary to info@ | Review answers and spot leads without keeping data long |
| 5 Oct | Chat layout: tap-to-ask buttons plus full screen on phones; keep the box on laptops | Phones are likely the main traffic, and a blank box does not tell visitors what to ask |
| 5 Oct | **Every change updates PROJECT.md in the same pull request** (Abdi authorised this without asking each time) | One status file that every session starts from |
| 4 Oct | Daily email via Resend (free), not Web3Forms | Web3Forms free plan blocks server-side sends; quote form still uses Web3Forms from the browser |

---

## 5. How to work on this project

1. **Website code changes:** Claude Code, on the repo, always via branch + PR. Abdi merges.
2. **Reviews, images, documents, planning:** Cowork. Cowork can read the public repo and review PRs but cannot push.
3. After any merge: test on a phone (forms, WhatsApp button, profile download).
4. Keep this file updated in the repo as `PROJECT.md` so every session (Claude Code or Cowork) starts from the same status. **Standing rule (Abdi, 5 Oct): every pull request that changes the site, the Worker or the profile also updates this file (completed work, pending items, decisions log, last-updated line). Claude does this without asking; Abdi still reviews and merges.**
