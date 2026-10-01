# Octane Transport Limited — Corporate Website

A static, multi-page corporate website for **Octane Transport Limited**, a privately owned Zambian transportation, logistics and general supply company headquartered in Ndola, Zambia.

## Structure

Plain HTML/CSS/JS — no build step, no framework. Internal links use extensionless URLs (`/fleet`, `/contact`), which GitHub Pages serves from `fleet.html`, `contact.html`. To preview locally, use a static server that supports clean URLs, e.g. `npx serve` — opening the files directly or using `python -m http.server` will break the links.

```
index.html            Home
about.html             About Us
services.html          Our Services
fleet.html              Fleet & Equipment
industries.html         Industries We Serve
hse.html                 Safety, Health & Environment
why-choose-us.html      Why Choose Octane
projects.html            Projects & Portfolio
procurement.html         Mining & Corporate Procurement
contact.html              Contact

assets/
  css/style.css          Shared design system & styles
  js/main.js              Nav, form handling, small UX behaviours
  img/                     Photography (fleet photos in img/fleet/)

company_profile_updated.pdf / .md   Downloadable company profile
```

## Local preview

```
npx serve
```
(it prints the local URL), or, to mimic GitHub Pages exactly (clean URLs, 404 handling):
```
python3 .claude/ghpages_server.py . 8766
```
then open http://127.0.0.1:8766

## Content source

All company facts (services, industries, contact details, client list) are sourced directly from Octane Transport's official company profile document. Where details are not published — certifications and compliance documents, the detailed fleet schedule, and project case studies — the website and profile state that they are available on request rather than inventing them.

## Next steps

- The contact and procurement forms post to Web3Forms (`https://api.web3forms.com/submit`) via `fetch()` — no further backend work needed there.
- Keep the "available on request" wording for the fleet schedule, registration, HSE and compliance documents: it is deliberate disclosure for supplier registration, procurement due diligence and tenders, not a placeholder. Publish specific details only once management approves them for external release.
- The company profile PDF has no editable design source in this repository (it was exported from a layout that was never committed and has since been edited directly). Obtain or recreate the source before the next major revision; it must carry the current content, including the Mining row and its photo credit.
- Fleet photos are on the fleet page; consider adding photography of premises and team once available.
- The site is served by GitHub Pages at `https://www.octanetransport.com` (custom domain set in `CNAME`).
