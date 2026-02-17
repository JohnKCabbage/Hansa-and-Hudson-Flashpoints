# Hansa-and-Hudson-Flashpoints

An interactive tool for strategic awareness regarding potential and ongoing global conflicts.

Work In Progress

## Live site

[https://johnkcabbage.github.io/Hansa-and-Hudson-Flashpoints/
](https://johnkcabbage.github.io/Hansa-and-Hudson-Flashpoints/)

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
