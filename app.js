const filterEl = document.getElementById("filter");
const regionFilterEl = document.getElementById("regionFilter");
const minSevEl = document.getElementById("minSev");
const minSevValEl = document.getElementById("minSevVal");
const summaryList = document.getElementById("summaryList");
const updatedAtEl = document.getElementById("updatedAt");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

const statusBoost = {
  stable_threat: 0.05,
  frozen: 0.15,
  elevated: 0.25,
  active: 0.4
};

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function computeSeverity(h) {
  const likelihood = clamp(h.likelihood ?? 0.4, 0, 1);
  const impact = clamp(h.impact ?? 0.5, 0, 1);
  const boost = statusBoost[h.status] ?? 0.15;
  return clamp(0.55 * likelihood + 0.45 * impact + boost, 0, 1);
}

function severityToColor(score) {
  const s = clamp(score, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const toHex = (v) => v.toString(16).padStart(2, "0");
  let r;
  let g;
  let b;
  if (s <= 0.5) {
    const t = s / 0.5;
    r = Math.round(lerp(30, 255, t));
    g = Math.round(lerp(215, 212, t));
    b = Math.round(lerp(96, 59, t));
  } else {
    const t = (s - 0.5) / 0.5;
    r = 255;
    g = Math.round(lerp(212, 59, t));
    b = Math.round(lerp(59, 48, t));
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function badgeLabel(status) {
  return {
    stable_threat: "Stable threat",
    frozen: "Frozen conflict",
    elevated: "Elevated tension",
    active: "Active conflict"
  }[status] ?? status;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function summarize(features, filtered) {
  const byStatus = filtered.reduce((acc, feature) => {
    const key = feature.properties.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const avgSeverity = filtered.length
    ? (filtered.reduce((sum, f) => sum + Number(f.properties.severity), 0) / filtered.length).toFixed(2)
    : "0.00";

  summaryList.innerHTML = `
    <li><b>${filtered.length}</b> shown of <b>${features.length}</b> hotspots</li>
    <li>Average severity: <b>${avgSeverity}</b></li>
    <li>Active: <b>${byStatus.active ?? 0}</b> · Elevated: <b>${byStatus.elevated ?? 0}</b></li>
    <li>Frozen: <b>${byStatus.frozen ?? 0}</b> · Stable threat: <b>${byStatus.stable_threat ?? 0}</b></li>
  `;
}

function setRegionOptions(features) {
  const regions = [...new Set(features.map((f) => f.properties.region).filter(Boolean))].sort();
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilterEl.appendChild(option);
  }
}

function openIntelCard(properties) {
  const sev = Number(properties.severity).toFixed(2);
  const dates = (properties.key_dates ?? [])
    .map((d) => `<li><b>${escapeHtml(d.date)}</b> — ${escapeHtml(d.note)}</li>`)
    .join("");
  const events = (properties.events ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("");
  const imgs = (properties.images ?? [])
    .slice(0, 2)
    .map(
      (img) => `
      <figure>
        <img src="${img.url}" alt="${escapeHtml(properties.name)} image" loading="lazy" />
        <figcaption><small>${escapeHtml(img.credit ?? "")}${img.license ? ` — ${escapeHtml(img.license)}` : ""}</small></figcaption>
      </figure>`
    )
    .join("");
  const actors = (properties.actors ?? []).map((actor) => `<li>${escapeHtml(actor)}</li>`).join("");
  const sourceItems = (properties.sources ?? [])
    .map((source) => {
      if (typeof source === "string") {
        return `<li>${escapeHtml(source)}</li>`;
      }
      if (source && source.name && source.url) {
        return `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a></li>`;
      }
      return "";
    })
    .join("");

  modalContent.innerHTML = `
    <div class="cardTitle">
      <h2 style="margin:0">${escapeHtml(properties.name)}</h2>
      <span class="badge">${escapeHtml(properties.region ?? "Global")}</span>
      <span class="badge" style="border-color:${properties.color};">${badgeLabel(properties.status)}</span>
      <span class="badge" style="background:${properties.color}; color:#041019; border:none;">severity ${sev}</span>
    </div>

    <div class="kv">
      <div class="box">
        <div style="opacity:.8;font-size:12px">Threat matrix</div>
        <div><b>Likelihood:</b> ${Number(properties.likelihood).toFixed(2)} · <b>Impact:</b> ${Number(properties.impact).toFixed(2)}</div>
        <div style="margin-top:6px; opacity:.85"><b>Category:</b> ${escapeHtml(properties.category ?? "flashpoint")}</div>
        ${properties.trend ? `<div style="margin-top:6px; opacity:.85"><b>Trend:</b> ${escapeHtml(properties.trend)}</div>` : ""}
      </div>
      <div class="box">
        <div style="opacity:.8;font-size:12px">Core dates</div>
        <div><b>Start:</b> ${escapeHtml(properties.start_date ?? "—")}</div>
        <div><b>Last major update:</b> ${escapeHtml(properties.last_update ?? "—")}</div>
      </div>
    </div>

    <div class="box" style="margin-bottom:10px">
      <div style="opacity:.8;font-size:12px">Short history</div>
      <div style="margin-top:6px; line-height:1.45">${escapeHtml(properties.summary ?? "")}</div>
    </div>

    ${dates ? `<div class="box"><div style="opacity:.8;font-size:12px">Key dates</div><ul>${dates}</ul></div>` : ""}
    ${events ? `<div class="box" style="margin-top:10px"><div style="opacity:.8;font-size:12px">Significant events</div><ul>${events}</ul></div>` : ""}
    ${actors ? `<div class="box" style="margin-top:10px"><div style="opacity:.8;font-size:12px">Principal actors</div><ul>${actors}</ul></div>` : ""}
    ${imgs ? `<div class="images">${imgs}</div>` : ""}

    ${sourceItems
      ? `<div class="box" style="margin-top:10px"><div style="opacity:.8;font-size:12px">Sources</div><ul>${sourceItems}</ul></div>`
      : ""}
  `;

  modalBackdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  center: [0, 20],
  zoom: 1.25,
  pitch: 0,
  bearing: 0
});

let fullFeatureCollection = null;

function applyFilters() {
  if (!fullFeatureCollection || !map.getSource("hotspots")) {
    return;
  }

  const status = filterEl.value;
  const region = regionFilterEl.value;
  const minSeverity = Number(minSevEl.value);

  const filtered = fullFeatureCollection.features.filter((feature) => {
    const props = feature.properties;
    const statusOk = status === "all" || props.status === status;
    const regionOk = region === "all" || props.region === region;
    const severityOk = Number(props.severity) >= minSeverity;
    return statusOk && regionOk && severityOk;
  });

  map.getSource("hotspots").setData({
    type: "FeatureCollection",
    features: filtered
  });

  summarize(fullFeatureCollection.features, filtered);
}

minSevEl.addEventListener("input", () => {
  minSevValEl.textContent = Number(minSevEl.value).toFixed(2);
  applyFilters();
});
filterEl.addEventListener("change", applyFilters);
regionFilterEl.addEventListener("change", applyFilters);

map.on("load", async () => {
  map.setProjection({ type: "globe" });
  map.setFog({
    range: [0.5, 10],
    color: "rgba(10, 20, 30, 0.55)",
    "horizon-blend": 0.06,
    "high-color": "rgba(20, 40, 60, 0.25)",
    "space-color": "rgba(0, 0, 0, 1)",
    "star-intensity": 0.25
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  const response = await fetch("./data/hotspots.json");
  const hotspots = await response.json();

  const features = hotspots.map((h) => {
    const severity = computeSeverity(h);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: {
        ...h,
        severity,
        color: severityToColor(severity)
      }
    };
  });

  fullFeatureCollection = { type: "FeatureCollection", features };
  updatedAtEl.textContent = `Dataset updated: ${new Date().toISOString().slice(0, 10)}`;
  setRegionOptions(features);

  map.addSource("hotspots", {
    type: "geojson",
    data: fullFeatureCollection
  });

  map.addLayer({
    id: "hotspots-layer",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 3, 6, 6, 10],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.55)",
      "circle-opacity": 0.92
    }
  });

  map.on("click", "hotspots-layer", (event) => {
    const feature = event.features?.[0];
    if (feature) {
      openIntelCard(feature.properties);
    }
  });

  map.on("mouseenter", "hotspots-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "hotspots-layer", () => {
    map.getCanvas().style.cursor = "";
  });

  applyFilters();
});
