# Octane Transport website — project memory

Context for Claude Code sessions. The site is published by
`.github/workflows/deploy-pages.yml`, which uploads the whole repo except `.git`,
`.github`, `.claude`, `PROJECT.md` and `cloudflare-worker` (removed by a workflow
step), so these are not served on the website (all still readable on GitHub,
since the repo is public). Everything else in the repo IS public (e.g. `/README.md`).
Keep secrets out of the repo.

Last updated: 2026-10-26 (security audit follow-up: `cloudflare-worker/` excluded
from the published site; `.gitignore` added).

## The site

- Static HTML/CSS/JS, no build step, no Jekyll. Deployed to **GitHub Pages** by
  the Actions workflow on every push to `main`,
  custom domain `www.octanetransport.com` (`CNAME`). The bare domain
  `octanetransport.com` redirects to `www`. HTTPS works.
- Deploys ~10–30 s after a merge to `main`; GitHub's CDN caches pages for up
  to 10 min (`cache-control: max-age=600`).
- GitHub Pages **cannot do server-side redirects (no 301s)**. Use canonical
  tags + sitemap for search engines and the address-bar script (below) for
  visitors.
- Pages: `index about services fleet industries hse why-choose-us projects
  procurement contact` (+ `404.html`). Shared `assets/css/style.css`,
  `assets/js/main.js` (loaded by every page), images in `assets/img/`.

## Working agreement with the owner (Abdi)

- Share a short plan first, then do the work on the designated branch, open a
  **PR for review — never merge it**. Abdi merges and deletes the branch, then
  asks for a check.
- **Every PR also updates `PROJECT.md`** (Abdi's standing instruction, 2026-10-05,
  no need to ask): completed work, pending items, decisions log, last-updated line.
  Keep it free of secrets; the repo is public.
- After each merge: confirm the merge commit equals the tested commit, the
  branch is gone, and verify the **live site** (curl with a `?v=` cache-buster).
  Also confirm `https://www.octanetransport.com/.claude/CLAUDE.md` and
  `https://www.octanetransport.com/PROJECT.md` are 404s.
- Verify before claiming: run browser checks (console errors, layout, mobile
  390px and desktop 1366px) and include screenshots in the PR for visual
  changes. Screenshots go in a temporary commit that is removed in the next
  commit, referenced by commit SHA from the PR body, so they never ship.
- Flag problems with the request itself up front; ask when a choice is
  genuinely the owner's (layout trade-offs etc.).

## URL rules (PR #19, #20) — don't regress these

- Clean, extensionless URLs everywhere: `/`, `/about`, `/fleet`,
  `/procurement#vendor-documentation`. GitHub Pages serves `/fleet` from
  `fleet.html`. **No `href="x.html"` links**; internal links are root-relative.
- **Never a trailing slash**: `/fleet/` is a 404 on GitHub Pages.
- Canonical tags, `og:url`, breadcrumb JSON-LD and `sitemap.xml` all use the
  clean `https://www.octanetransport.com/x` form (homepage `.../`).
- Every page except 404 has this in `<head>` right after the canonical tag; it
  rewrites old `.html` addresses in the address bar without reloading:
  `<script>if(/\.html$/.test(location.pathname))history.replaceState(null,'',location.pathname.replace(/(index)?\.html$/,'')+location.search+location.hash);</script>`
- Nav highlighting in `main.js` compares page names (`pageName()`), so `/x`,
  `/x.html` and `x.html` match; trailing-slash URLs highlight nothing.
- `404.html` uses root-relative assets (`/assets/...`) because Pages serves it
  at whatever URL was requested.
- Local preview needs a clean-URL server: `npx serve`, or
  `python3 .claude/ghpages_server.py . 8766` (mimics GitHub Pages: `/x` →
  `x.html`, `/x/` and unknown → 404 page). Plain `python -m http.server` and
  opening files directly break the links.

## Contact details (PR #15)

- **Calls: +260 973 821 013** — all `tel:` links, top bar, footers, call
  buttons, and `"telephone"` in structured data. The contact page heading says
  "Calls" (was "Mobile").
- **WhatsApp: +260 965 732 525** — `https://wa.me/260965732525?text=Hello%20Octane%20Transport%2C%20I%27d%20like%20to%20request%20a%20quote.`
  Used by the floating `.wa-float` button (injected by `main.js` on every
  page, above `.back-to-top`, icon-only <600px, hidden in print) and the
  WhatsApp item on the contact page. Owner confirmed the number works.
- Emails: info@octanetransport.com, abdihakim.mohamed@octanetransport.com.

## Forms (PR #14)

- Three forms post to **Web3Forms** (`https://api.web3forms.com/submit`):
  `#enquiry-form` (contact), `#new-customer-form` and
  `#existing-customer-form` (procurement). Each has hidden `access_key`
  (public by design), `from_name`, `subject`, and a hidden `botcheck`
  checkbox honeypot. `main.js` submits via `fetch` and checks `response.ok`.
  Owner confirmed emails arrive.
- Possible follow-ups: restrict submissions to the domain in the Web3Forms
  dashboard; check the free-plan monthly limit.

## Content changes so far

- Procurement page callout is "Compliance Documentation" (was "Honesty note").
- Fleet page: "Our Fleet" gallery in the Transport Fleet tab (photos in
  `assets/img/fleet/`, plates already blurred). Side view full width first,
  then two Actros fronts, then flatbed front centred; capped at 900px. The
  Cargo Trucks & Trailers section image is `octane-actros-flatbed-side.webp`
  (owner chose to keep it duplicated in the gallery). `hero-truck-sunset.webp`
  is still used on home/about/why-choose-us and social share tags — keep it.
- Company profile: `company_profile_updated.pdf` at the repo root (linked
  from home, contact, procurement). Contact lines show Calls + WhatsApp. The
  PDF was patched directly (PR #17: row 05 of the Core Services table moved
  from page 6 to page 7); the design source file is not in the repo, so the
  page break must also be fixed there before re-exporting. The `.md` source
  and the `images/` folder it alone referenced were removed 17 Oct — neither
  was linked from any published page.
- Mining industry card: second on home (`/`) and `/industries`. Home grid is
  now `grid-3` (2×3); on /industries the "Your Sector Not Listed?" CTA spans
  the full row under the six cards. Photo `assets/img/industry-mining.webp` is
  "One truck again" by Phil Scoville (Flickr 3622997168, CC BY 2.0, cropped;
  Kennecott mine, Utah — never name it on the site). CC BY requires the
  visible `.photo-credit` line on every page that shows it — keep it.
- Company profile PDF (same PR): Mining is row 2 of "Selected Industries
  Served" (pp. 9–10; Plastics + Logistics moved to p. 10; still 15 pages),
  with the same photo and a linked CC BY credit. No design source exists (the
  PDF was printed from HTML that was never committed), so it was edited
  directly with `.claude/tools/profile_add_mining_row.py`: original rows are
  reused as region-filtered vector copies, only the Mining row is new. When
  the profile is re-exported from a design source, add Mining + credit there.
- Profile text cleanup (PR #25): 1.2 Corporate Identity intro is now
  "Purpose, Direction & Values. …" (p. 3; old carry-over removed from p. 4,
  rest of p. 4 moved up) and the 2.2 fleet note is the "available on request"
  wording (p. 7). Edited directly with `.claude/tools/profile_cleanup_text.py`
  (recurses into nested forms: p. 7 is built from forms by the PR #17 patch).
  The two "Suggested Asset" placeholder images were removed from the `.md`
  (this file was itself removed 17 Oct — see above).
- `README.md` is publicly reachable at `/README.md` (raw markdown, not
  linked from any page) — write it as if customers might read it.
- Structured data (PR #21): home and contact pages describe one
  `LocalBusiness` with `@id https://www.octanetransport.com/#business`,
  `legalName`, `alternateName` ["Octane Transport", "Octane Transport
  Zambia"], Copperbelt Province, geo -12.982864, 28.661287 (owner-confirmed).
- **Legal name is "Octane Transport Zambia Limited"** (PACRA; same on the
  Google Business Profile). The site used "Octane Transport Limited" until
  2026-10-11 — never reintroduce it. Domain stays octanetransport.com. The
  profile PDF and MD use it too (p. 3, p. 4), edited with
  `.claude/tools/profile_legal_name.py` (removes old text runs, keeps all
  graphics clipped per band, redraws in Liberation Sans). No `sameAs` yet — add LinkedIn/Facebook URLs
  only once those profiles exist.

## Open items (owner's side unless noted)

1. ~~Google Business Profile~~ — created and verified 2026-10-11 (legal
   name, address shown, logo, pin corrected). Linked from the site via
   `hasMap` + contact-page link: https://www.google.com/maps?cid=7074308477456269480
   (never paste a maps.app share link — they can be directions links that
   embed the sender's location). Pending: photos, reviews.
2. ~~Google Search Console~~ — Domain property verified 2026-10-11 via DNS TXT
   (`google-site-verification=…`, keep it), sitemap submitted, indexing
   requested. **DNS is still hosted by Africana Solutions** (cPanel Zone
   Editor, cpanel.africana.co.zm:2083; nameservers ns1/ns2.africana.co.zm):
   it carries MX (Google Workspace), SPF, DMARC, www → GitHub and the TXT.
   Never tell the owner cPanel is obsolete — only the website moved.
3. Run the homepage through Google's Rich Results Test.
4. LinkedIn / Facebook pages → then add `sameAs` to the LocalBusiness JSON-LD
   (two-line change).
5. Consistent listings in Zambian directories / chamber; links from clients.
6. **Profile design source is missing** (maintenance task, also in README):
   obtain or recreate it before the next major revision, carrying the
   Core Services page-break fix, the Mining row + photo credit and the
   PR #25 wording. Until then, edit the PDF only with `.claude/tools/`.

## Testing notes

- Playwright is preinstalled at `/opt/node22/lib/node_modules/playwright`
  (Chromium at `/opt/pw-browsers`). Block non-local requests in local tests.
- The sandbox's HTTPS proxy can break browser loads of external hosts
  (Google Fonts cert errors, `ERR_TOO_MANY_RETRIES`): retry, or verify with
  `curl` — these are not site bugs.
- When killing processes, don't `pkill -f`/`pgrep -f` with a pattern that also
  matches your own shell command (it kills the shell, exit 144).

## History

| PR | Change |
|---|---|
| #14 | Formspree → Web3Forms on 3 forms; WhatsApp contact item; floating WhatsApp button |
| #15 | WhatsApp number → +260 965 732 525; "Mobile" → "Calls"; simplified WhatsApp item |
| #16 | Replaced company profile PDF/MD (Calls + WhatsApp) |
| #17 | Fixed clipped Core Services table row in the profile PDF |
| #18 | Fleet photo gallery + real section photo; "Compliance Documentation" note |
| #19 | Homepage is `/` (links, canonical, sitemap, address-bar rewrite) |
| #20 | Clean URLs site-wide (`/hse`, `/fleet`, …); 404 page asset paths |
| #21 | Structured data: LocalBusiness, legal/alternate names, shared `@id` |
| #22 | This project memory file, `.claude/ghpages_server.py`, README corrections |
| #23 | Deploy workflow: stop publishing `.claude/`; deploy only from `main` |
| #24 | Mining industry card (home + /industries) and company profile PDF/MD, licensed photo + credit, Copperbelt section wording |
| #25 | Profile cleanup: Corporate Identity intro, fleet-schedule note (PDF + MD), placeholder images removed from MD; /industries intro lists Mining; README to-do corrected |
| #28–#37 | Chatbot: widget, Cloudflare Worker, daily chat summary email, quote form in chat, prompt tightening (see PROJECT.md) |
| #38 | Chat opens with tap-to-ask buttons; full-screen chat on phones |
| #42 | Five design skills added to `.claude/skills/` (design-taste-frontend, redesign-existing-projects, mobile-native, break-ui, review-animations) |
| #43 | Repo copies of the design skills removed (they live in Abdi's claude.ai account) |
| #44 | Chat widget motion: panel open/close animation (corner scale on laptops, drawer on phones), mouse-only launcher hover lift, press feedback, reduced-motion support |
| #45 | `.wa-float` gets the same mouse-only hover lift, opacity-faded shadow, press feedback and reduced-motion rule |
| — | /contact fits at 390px: long email wraps after the @ (`<wbr>`, `overflow-wrap:anywhere`, `min-width:0` in `.contact-card .item`). Check new long emails/URLs on phones |
| — | Site-wide check at 320–1366px: map image `max-width:min(…,100%)` (fixed px max-widths beat `img{max-width:100%}`), home hero h1 smaller below 360px, contact director line in a `<p>`, PDF links root-relative. Re-run a width sweep after layout changes |
| — | Deploy workflow also removes `PROJECT.md` before publishing (internal notes: chatbot budget and rules, DNS host, decisions) |
| #50 | Legal name → "Octane Transport Zambia Limited" site-wide; coordinates 28.661287 |
| #51 | Site icons: `icon-192.png` (swirl crop of the square logo) for `rel=icon`, `apple-touch-icon.png` (full square logo, 180px); root-relative links on all 11 pages. Header keeps `logo.png` |
| #52 | `hasMap` (Google profile cid link) on `/` + `/contact` JSON-LD; "Open in Google Maps" link under the contact map (`.map-link`) |
| #53 | Profile PDF: legal name on p. 3 (Executive Statement, "in the heart of" dropped to keep 4 lines) and p. 4 (Legal / Trading Name); PDF Title/Author metadata; MD synced |
| — | Search Console Domain property (DNS TXT at Africana); sitemap submitted |
| — | Note: design skills live in Abdi's claude.ai account; don't re-add them to the repo. Their advice is general; the URL, contact and photo-credit rules above still win |
| #54 | Repo cleanup: confirmed no Formspree form remains in code (all 3 forms on Web3Forms since #14); removed unused `images/` folder and `company_profile_updated.md` source, neither linked from any published page |
| #56 | Read-only security audit follow-up: deploy workflow also excludes `cloudflare-worker/` (was being published); added `.gitignore` (`.graph-indexer/`, `.env`, `.claude/`, `node_modules/`). CORS/rate-limiting in the Worker left as-is — intentional, already documented in code |
