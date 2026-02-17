# Hansa-and-Hudson-Flashpoints

Global Flashpoints Globe is a no-backend, GitHub Pages-ready intelligence-style common operating picture built with MapLibre GL JS (globe projection) and a local dataset.

## Live site

- **GitHub Pages URL pattern:** `https://<your-github-username>.github.io/Hansa-and-Hudson-Flashpoints/`
- **Set your actual live link here after first deploy:** `https://<your-github-username>.github.io/Hansa-and-Hudson-Flashpoints/`

> This project is an educational / portfolio prototype. Severity scores are **notional analyst assessments**, not an official forecast.

## What this build includes

- Globe projection with interactive hotspot markers.
- Threat matrix scoring model (likelihood + impact + status boost).
- Green → yellow → red severity ramp.
- Modal “intel card” for each flashpoint (history, events, dates, and sources).
- Filters for status, region, and minimum severity.
- Coverage snapshot panel (counts + average severity).
- Expanded dataset covering active conflicts, elevated flashpoints, and frozen disputes across Africa, Europe, the Middle East, Asia-Pacific, and the Americas.

## Data model

Every flashpoint entry in `data/hotspots.json` includes:

- `status`: `stable_threat | elevated | frozen | active`
- `likelihood`: 0.0–1.0
- `impact`: 0.0–1.0
- `region`, `category`, date fields, narrative summary, optional dates/events/images/sources

### Severity formula

```txt
severity = clamp(0.55*likelihood + 0.45*impact + statusBoost, 0, 1)
```

Status boost values:

- `stable_threat`: +0.05
- `frozen`: +0.15
- `elevated`: +0.25
- `active`: +0.40

## Local run

Open `index.html` directly, or run a local static server:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`.

1. Push this repository to GitHub (branch `main`).
2. In GitHub repo settings, enable **Pages** and set source to **GitHub Actions**.
3. The workflow will deploy automatically on pushes to `main`.
4. Replace the placeholder URL above with your exact deployed link.

## Suggested source anchors for curation

- International Crisis Group (major conflicts to watch)
- ACLED conflict watchlists and event data
- UN Peacekeeping current operations list and mission updates

## Notes on comprehensiveness

This dataset is designed to feel globally comprehensive for strategic flashpoints, but it is not exhaustive and should be regularly curated.
