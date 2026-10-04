# Octane Transport — Website, Company Profile & Digital Channels

**Owner:** Abdi Hakim Mohamed, Managing Director, Octane Transport Zambia Limited
**Last updated:** 4 October 2026 (Owner title corrected to Managing Director)
**Scope:** website (octanetransport.com), Company Profile (PDF/MD), enquiry handling, WhatsApp Business, fleet imagery, and the planned website chatbot.
**Out of scope:** accounts, truck statements, FQM registration, holding company, and other Octane workstreams (these stay in their own projects).

---

## 1. Current setup (source of truth)

| Item | Detail |
|---|---|
| Live site | https://www.octanetransport.com — static HTML, hosted on **GitHub Pages** (not cPanel) |
| Repository | github.com/abdihakimmohamed07-jpg/my-first-project — **the repo is the source of truth**; merging to `main` deploys the site within 1–2 minutes |
| Domain | octanetransport.com (DNS points to GitHub Pages) |
| Change process | Claude Code works on a branch → opens a PR → Abdi reviews and merges. Cowork reviews PRs and prepares briefs, images and documents |
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

### Chatbot preparation
- [x] Architecture agreed: chat widget on the site + **Cloudflare Worker** holding the Anthropic API key (GitHub Pages cannot run server code); small low-cost Claude model; per-visitor message cap.
- [x] Anthropic Console account ready; recommended separate "Octane Website Chatbot" workspace with **US$20/month** limit and prepaid credit (auto-reload off).
- [x] Cloudflare account created on info@octanetransport.com with **2FA enabled** (setup key regenerated after accidental exposure).
- [x] Scheduled Cowork session (Sunday 4 Oct, 10:00 CAT) to draft the chatbot knowledge base and rules.

---

## 3. Pending / to do

### High priority
- [ ] **Chatbot — foundation:** review the draft "Octane Chatbot — Knowledge Base & Rules" doc and answer the gap questions (routes/borders covered, lead times, cargo not carried, truck types/capacities, working hours, languages, escalation contact, common FAQs).
- [ ] **Chatbot — build:** after the knowledge base is approved, give Claude Code the build brief (widget + Cloudflare Worker + rate limit + spend cap). Create the API key **only inside the chatbot workspace**, and paste it straight into Cloudflare as a secret — never into a chat.
- [ ] **Test the 2 Procurement forms** (New Customer / Existing Customer) with one live submission each and confirm arrival at info@.
- [ ] **Confirm WhatsApp Business greeting message** is switched on with the transport + supply wording.

### Housekeeping
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

---

## 5. How to work on this project

1. **Website code changes:** Claude Code, on the repo, always via branch + PR. Abdi merges.
2. **Reviews, images, documents, planning:** Cowork. Cowork can read the public repo and review PRs but cannot push.
3. After any merge: test on a phone (forms, WhatsApp button, profile download).
4. Keep this file updated in the repo as `PROJECT.md` so every session (Claude Code or Cowork) starts from the same status.
