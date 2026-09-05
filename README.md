# Octane Transport Limited — Corporate Website

A static, multi-page corporate website for **Octane Transport Limited**, a privately owned Zambian transportation, logistics and general supply company headquartered in Ndola, Zambia.

## Structure

Plain HTML/CSS/JS — no build step, no framework. Open `index.html` directly or serve the folder with any static file server.

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
  img/                     Photography sourced from the official company profile
  docs/                    Downloadable company profile PDF
```

## Local preview

```
python3 -m http.server 8080
```
Then open http://localhost:8080

## Content source

All company facts (services, industries, contact details, client list) are sourced directly from Octane Transport's official company profile document. Sections where the profile did not provide information (formal mission/vision statements, certifications, fleet specifications, project case studies) are clearly marked as available on request rather than invented.

## Next steps

- The contact form (`contact.html`) is already wired to a live Formspree endpoint (`https://formspree.io/f/mdeodwgv`) and submits via `fetch()` — no further backend work needed there.
- Supply additional company documentation (registration, HSE certificates, fleet register) to replace the "available on request" placeholders.
- Consider adding real photography of the actual fleet, premises and team once available.
- The custom domain (`www.octanetransport.com`) referenced in canonical tags, `sitemap.xml`, `robots.txt` and structured data currently has an expired SSL certificate and no `CNAME` file in this repo — the live, working copy of the site is the GitHub Pages URL. Fixing the domain is a separate, deliberately deferred task.
