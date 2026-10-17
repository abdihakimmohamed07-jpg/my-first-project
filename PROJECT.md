# Octane Transport — Website, Company Profile & Digital Channels

**Owner:** Abdi Hakim Mohamed, Managing Director, Octane Transport Zambia Limited
**Last updated:** 17 October 2026 (Formspree cleanup; unused images/ and profile .md source removed)
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
- [x] **Logo in the chat header** (5 Oct): the chat header is now white with the Octane logo (`assets/img/logo.png`, unchanged) and a red line; the launcher button stays orange with the chat icon. Site-only, no Worker redeploy.
- [x] **Chat animation polish** (11 Oct, from a `/review-animations` review): on laptops the chat grows out of the launcher's corner (200ms) and closes faster (150ms); on phones it slides up like a drawer (300ms) and slides down (200ms). The launcher lifts on hover only with a mouse (no more button stuck raised after a tap on a phone), and buttons give a slight press response. Visitors who turn on "reduce motion" get fades without movement. CSS only, no Worker redeploy.
- [x] **Whole-site layout check** (11 Oct): all 11 pages tested at 320, 360, 390, 414, 768, 1024 and 1366px wide, plus every internal link. Fixed: the homepage and /projects were wider than the screen on 360px phones (common Android size) and 320px phones because the coverage map image had a fixed width; the homepage heading was cut off at 320px. Also: the "Abdihakim Mohamed, Managing Director" line on /contact now matches the other contact lines, and the company profile PDF links use the site's /-style address. Every page now fits at every width tested, with no errors or broken links.
- [x] **Contact page fits on phones** (11 Oct): the long email abdihakim.mohamed@octanetransport.com could not wrap, so on phones /contact loaded about 20% wider than the screen (zoomed out, sideways scrolling). It now wraps after the @. The other pages were already fine at 390px.
- [x] **WhatsApp button hover fix** (11 Oct): the floating WhatsApp button got the same treatment as the chat launcher: lifts on hover only with a mouse (no longer stuck raised after a tap on a phone), small press response, no movement for "reduce motion".
- [x] **Privacy line** in the chat panel: chats may be reviewed to improve service.
- [x] **Daily chat summary** (PR #34): each question and answer is stored in Cloudflare KV (binding `CHAT_LOGS`, namespace `octane-chat-logs`; no IP addresses; deleted after 7 days). A cron trigger (`0 6 * * *` UTC, 08:00 Zambia) emails the previous day's chats to info@ through Resend (secret `RESEND_API_KEY`, free plan). No email on days without chats. Web3Forms cannot be used for this: its free plan refuses server-side calls.
- [x] Cloudflare setup done by Abdi on 4 Oct: KV namespace and binding (a mistyped binding name was fixed), `RESEND_API_KEY` secret, cron trigger, Worker redeployed with the final wording. Live tests passed.

### Google & company name
- [x] **Google Business Profile created and verified** (11 Oct) under the exact legal name, Octane Transport Zambia Limited, with the address shown. Already 18 customer interactions on the first day.
- [x] **Website now uses the legal name "Octane Transport Zambia Limited"** everywhere it used "Octane Transport Limited" (footers, page text, page titles and descriptions, structured data, README, company profile Markdown). The domain stays octanetransport.com; a domain doesn't need to match the legal name.
- [x] Website coordinates set to the confirmed office location -12.982864, 28.661287 (structured data and the contact-page map).
- [x] **Google pin corrected** (11 Oct): the profile now sits at -12.98287, 28.66117, about 13 m from the confirmed office point (was ~230 m off).
- [x] **Company profile PDF updated to "Octane Transport Zambia Limited"** (11 Oct): p. 3 Executive Statement (reflowed on its original four lines; "in the heart of the Copperbelt Province" shortened to "in the Copperbelt Province" so it fits, same in the Markdown) and p. 4 Legal / Trading Name. Old text removed, not covered, so search and copy-paste find only the new name. PDF title set to "Octane Transport Zambia Limited - Company Profile". All other 13 pages are pixel-identical. Same download link on the website.
- [x] **Website linked to the profile** (11 Oct): `hasMap` in the structured data on `/` and `/contact` uses the stable link https://www.google.com/maps?cid=7074308477456269480, and the contact page has an "Open in Google Maps for directions and reviews" link under the map. (The share link Abdi sent was a directions link that included his phone's location, so it was not used.)
- [x] **Square logo** (1080×1080, supplied by Abdi 11 Oct) now gives the website's browser-tab icon (swirl only, `assets/img/icon-192.png`) and phone home-screen icon (full logo, `assets/img/apple-touch-icon.png`); before, the wide header logo was squashed into those spots. The header keeps the wide logo.
- [x] Square logo uploaded as the Google profile photo (11 Oct).
- [ ] Add 5–10 real photos (plates blurred); ask 2–3 clients for Google reviews.
- [x] **Google Search Console set up** (11 Oct) under info@octanetransport.com as a **Domain** property (covers www, bare domain, http and https). Verified by a `google-site-verification=…` TXT record in Africana's cPanel Zone Editor — **never delete that record**, or Search Console access is lost. Sitemap `https://www.octanetransport.com/sitemap.xml` submitted; indexing requested for `/`, `/about` (both already indexed with the old name, now re-queued) and `/contact` (new to Google under its clean address).
- [ ] In a few days: check Search Console > Sitemaps shows Success (10 pages) and that Google results show "Octane Transport Zambia Limited" and the new icon.

### Privacy of project notes
- [x] **This file is no longer published on the website** (11 Oct): the deploy step now removes `PROJECT.md` along with `.claude/`, so octanetransport.com/PROJECT.md is a 404. It is still readable on GitHub because the repository is public; making the repository private is a separate decision (check GitHub Pages plan requirements first).

### Claude tools
- [x] **Five design skills installed in Abdi's claude.ai account** (11 Oct, all enabled): `design-taste-frontend` and `redesign-existing-projects` (taste-skill, MIT), `mobile-native`, `break-ui` and `review-animations` (Emil Kowalski's skills, MIT). They work in claude.ai chats and in Claude Code sessions. `review-animations` runs only when called with `/review-animations`. The copies briefly kept in the repo (PR #42) were removed so there is one source and no drift.

---

## 3. Pending / to do

### High priority
- [x] **Daily chat summary email verified (5 Oct).** The first scheduled run (08:00 Zambia) did not send because the Worker had no cron trigger (lost after a dashboard redeploy). Abdi re-added `0 6 * * *`; a one-off test trigger sent the email at 08:25 Zambia and it landed in the inbox, not spam. The test trigger (`25 6 * * *`) must be deleted. After ANY Worker redeploy, open Worker > Settings > Triggers and confirm `0 6 * * *` is still listed.
- [x] Temporary test cron `25 6 * * *` deleted by Abdi (5 Oct). [ ] Check the real 08:00 email arrives on 6 Oct.
- [x] **Procurement forms tested** (11 Oct): Abdi sent one live submission from each (New Customer / Existing Customer); both emails arrived. All 3 Web3Forms forms are now confirmed end to end.
- [ ] **Confirm WhatsApp Business greeting message** is switched on with the transport + supply wording.

### Housekeeping
- [x] Chatbot: spend alert at US$10 set by Abdi (11 Oct) in the Anthropic Console, on the chatbot's workspace (Limits tab > notification). Email warning only; the US$20 spend limit stays the hard cap.
- [ ] Chatbot: read the daily summaries for the first weeks and send Claude Code any wrong or awkward answers to fix in the Worker's rules.
- [ ] Optional chatbot extra: a WhatsApp button inside the chat window.
- [x] **Formspree removed from code (17 Oct):** checked all 3 forms — `contact.html`, `procurement.html` (×2) — none ever reverted to Formspree; all have posted to Web3Forms since PR #14. There was nothing left to delete on the code side. [ ] **Delete the Gmail forwarding filter** that still forwards old Formspree-style mail to info@ — that's in Abdi's Gmail settings, not the repo.
- [ ] Check the Web3Forms dashboard monthly (submissions vs 250/month limit, spam folder).
- [ ] When customers WhatsApp the personal line, redirect them once to +260 965 732 525.
- [ ] Update the business number elsewhere over time: email signatures, Google Business listing (if any), vendor/supplier files (incl. FQM), business cards, truck door stickers (some still show old numbers).
- [x] **Removed (17 Oct):** the old `images/` folder (14 files) and the `company_profile_updated.md` source. Re-confirmed unreferenced: no HTML page linked the `.md` (only the `.pdf`), and nothing but that `.md` used `images/`. Both flagged unlinked since a 27 Sep scan.

- [ ] Revisit **impeccable** later only if wanted: it downloads and runs its own program, and writes `PRODUCT.md`/`DESIGN.md` to the repo root, which this site would publish.



### Nice to have
- [ ] Professional fleet photo shoot (washed trucks, clean background, morning/evening light) to replace yard photos and the remaining stock images.
- [ ] WhatsApp Business **Catalog** with one item per truck/trailer type (no prices).
- [ ] Future: move calls to the business number when vendor forms come up for renewal.

### Security & DNS
- [ ] **Keep the Africana Solutions account paid and its login safe.** It still hosts the DNS for octanetransport.com (nameservers ns1/ns2.africana.co.zm), which carries the Google Workspace email (MX), SPF/DMARC, the website address (www → GitHub Pages) and the Search Console TXT record. If it lapses, email and the website stop. Login was recovered 11 Oct; cPanel is reached at cpanel.africana.co.zm:2083. Note the renewal date.
- [ ] Tighten DMARC from `p=none` to `quarantine` once DMARC reports to abdihakim.mohamed@ look clean (SPF/DKIM/DMARC all verified passing 28 Sep; DKIM selector `google`; DNS in Africana's cPanel Zone Editor).
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
| 5 Oct | After any Worker redeploy, re-check the cron trigger exists; Worker logs every cron outcome | The first summary email failed silently because the cron trigger was missing |
| 5 Oct | Chat layout: tap-to-ask buttons plus full screen on phones; keep the box on laptops | Phones are likely the main traffic, and a blank box does not tell visitors what to ask |
| 5 Oct | Logo in the chat header only, not on the launcher button | The logo has a white background, so it needs a white header; on the small round button it hides the chat icon |
| 5 Oct | **Every change updates PROJECT.md in the same pull request** (Abdi authorised this without asking each time) | One status file that every session starts from |
| 11 Oct | Add 5 of the 28 uploaded design skills; leave out the rest for now | The others clash on style (brutalist, minimalist, soft), are older versions, or target other tools (Swift, React Native, Codex, image generators); impeccable held back for the reasons in section 3 |
| 11 Oct | Chat opens with a short animation; messages and tap-to-ask buttons stay instant | Opening is occasional, so a quick animation helps; messages appear many times per chat, where animation would only slow it down |
| 11 Oct | Search Console as a Domain property verified by DNS TXT, not a URL-prefix property with an HTML tag | Covers every version of the domain and needs no change to the website |
| 11 Oct | Link the site to the Google profile with the place's `cid` URL, not the share link | Share links can be directions links that carry the sender's own location; the `cid` link is stable and points only at the business |
| 11 Oct | Square logo for icons and the Google profile photo; wide logo stays in the site header | The square version reads well in small square/round spots; the wide one fits the top bar |
| 11 Oct | Use the legal name "Octane Transport Zambia Limited" on the website, matching PACRA and the Google Business Profile; keep the domain | Google trusts a business more when the name matches everywhere; the domain name is unrelated to the legal name and changing it would be costly |
| 11 Oct | Keep the GitHub repository public | Making it private needs GitHub Pro (about US$4/month) and the site goes offline if that payment fails; the notes hold no secrets |
| 11 Oct | Stop publishing PROJECT.md on the website | It holds internal detail (chatbot budget and rules, which clients the bot may name, DNS host, internal decisions) that customers and competitors don't need |
| 11 Oct | Chatbot spend: US$10 email alert, US$20 hard limit unchanged | A US$10 limit would switch the chatbot off mid-month; the alert warns early without stopping it |
| 11 Oct | Keep the design skills in the claude.ai account only; remove the repo copies | The account copies already reach Claude Code sessions; two copies would drift apart |
| 4 Oct | Daily email via Resend (free), not Web3Forms | Web3Forms free plan blocks server-side sends; quote form still uses Web3Forms from the browser |
| 17 Oct | Removed `images/` folder and `company_profile_updated.md` source from the repo | Neither was referenced by any published page (only the `.md` used `images/`, and nothing linked the `.md` itself); flagged unused since 27 Sep |

---

## 5. How to work on this project

1. **Website code changes:** Claude Code, on the repo, always via branch + PR. Abdi merges.
2. **Reviews, images, documents, planning:** Cowork. Cowork can read the public repo and review PRs but cannot push.
3. After any merge: test on a phone (forms, WhatsApp button, profile download).
4. Keep this file updated in the repo as `PROJECT.md` so every session (Claude Code or Cowork) starts from the same status. **Standing rule (Abdi, 5 Oct): every pull request that changes the site, the Worker or the profile also updates this file (completed work, pending items, decisions log, last-updated line). Claude does this without asking; Abdi still reviews and merges.**
