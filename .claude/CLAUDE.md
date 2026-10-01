# Octane Transport website — project memory

Context for Claude Code sessions. The site is published by
`.github/workflows/deploy-pages.yml`, which uploads the whole repo except `.git`,
`.github` and `.claude` (removed by a workflow step), so this file is not served
on the website. Everything else in the repo IS public (e.g. `/README.md`,
`/company_profile_updated.md`). Keep secrets out of the repo.

Last updated: 2026-10-01 (profile text cleanup).

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
- After each merge: confirm the merge commit equals the tested commit, the
  branch is gone, and verify the **live site** (curl with a `?v=` cache-buster).
  Also confirm `https://www.octanetransport.com/.claude/CLAUDE.md` is a 404.
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
- Company profile: `company_profile_updated.pdf` / `.md` at the repo root
  (linked from home, contact, procurement). Contact lines show Calls +
  WhatsApp. The PDF was patched directly (PR #17: row 05 of the Core Services
  table moved from page 6 to page 7); the design source file is not in the
  repo, so the page break must also be fixed there before re-exporting. The
  `.md` references two placeholder images that don't exist (pre-existing).
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
  Still in the public `.md` only: two "Suggested Asset" placeholder images.
- Structured data (PR #21): home and contact pages describe one
  `LocalBusiness` with `@id https://www.octanetransport.com/#business`,
  `legalName`, `alternateName` ["Octane Transport", "Octane Transport
  Zambia"], Copperbelt Province. No `sameAs` yet — add LinkedIn/Facebook URLs
  only once those profiles exist.

## Open items (owner's side unless noted)

1. Create and verify a **Google Business Profile** (biggest lever vs the
   same-name Canadian company).
2. **Google Search Console**: verify the domain, submit `sitemap.xml`, request
   indexing (also speeds up the clean-URL switch).
3. Run the homepage through Google's Rich Results Test.
4. LinkedIn / Facebook pages → then add `sameAs` to the LocalBusiness JSON-LD
   (two-line change).
5. Consistent listings in Zambian directories / chamber; links from clients.
6. Fix the Core Services page break in the profile's design source file
   (and add the Mining row + photo credit and the PR #25 text there too).

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
| #25 | Profile cleanup: Corporate Identity intro, fleet-schedule note (PDF + MD); /industries intro lists Mining |
