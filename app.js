const filterEl = document.getElementById("filter");
const regionFilterEl = document.getElementById("regionFilter");
const minSevEl = document.getElementById("minSev");
const minSevValEl = document.getElementById("minSevVal");
const searchInputEl = document.getElementById("searchInput");
const summaryGridEl = document.getElementById("summaryGrid");
const hotspotListEl = document.getElementById("hotspotList");
const updatedAtEl = document.getElementById("updatedAt");
const appSubtitleEl = document.getElementById("appSubtitle");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

const statusBoost = { stable_threat: 0.05, frozen: 0.15, elevated: 0.25, active: 0.4 };

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

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

function renderSummary(features, filtered) {
  const byStatus = filtered.reduce((acc, feature) => {
    const key = feature.properties.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const avgSeverity = filtered.length
    ? (filtered.reduce((sum, f) => sum + Number(f.properties.severity), 0) / filtered.length).toFixed(2)
    : "0.00";

  summaryGridEl.innerHTML = `
    <div class="metric"><b>${filtered.length}/${features.length}</b><span>Shown hotspots</span></div>
    <div class="metric"><b>${avgSeverity}</b><span>Avg severity</span></div>
    <div class="metric"><b>${byStatus.active ?? 0}</b><span>Active</span></div>
    <div class="metric"><b>${byStatus.elevated ?? 0}</b><span>Elevated</span></div>
    <div class="metric"><b>${byStatus.frozen ?? 0}</b><span>Frozen</span></div>
    <div class="metric"><b>${byStatus.stable_threat ?? 0}</b><span>Stable threat</span></div>
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

  modalContent.innerHTML = `
    <div class="cardTitle">
      <h2 style="margin:0">${escapeHtml(properties.name)}</h2>
      <span class="badge">${escapeHtml(properties.region ?? "Global")}</span>
      <span class="badge" style="border-color:${properties.color};">${badgeLabel(properties.status)}</span>
      <span class="badge" style="background:${properties.color}; color:#111; border:none;">severity ${sev}</span>
    </div>

    <div class="kv">
      <div class="box">
        <div style="opacity:.8;font-size:12px">Threat matrix</div>
        <div><b>Likelihood:</b> ${Number(properties.likelihood).toFixed(2)} · <b>Impact:</b> ${Number(properties.impact).toFixed(2)}</div>
        <div style="margin-top:6px;"><b>Category:</b> ${escapeHtml(properties.category ?? "flashpoint")}</div>
      </div>
      <div class="box">
        <div style="opacity:.8;font-size:12px">Core dates</div>
        <div><b>Start:</b> ${escapeHtml(properties.start_date ?? "—")}</div>
        <div><b>Last update:</b> ${escapeHtml(properties.last_update ?? "—")}</div>
      </div>
    </div>

    <div class="box" style="margin-bottom:10px">
      <div style="opacity:.8;font-size:12px">Summary</div>
      <div style="margin-top:6px; line-height:1.45">${escapeHtml(properties.summary ?? "")}</div>
    </div>

    ${dates ? `<div class="box"><div style="opacity:.8;font-size:12px">Key dates</div><ul>${dates}</ul></div>` : ""}
    ${events ? `<div class="box" style="margin-top:10px"><div style="opacity:.8;font-size:12px">Significant events</div><ul>${events}</ul></div>` : ""}

    ${properties.sources?.length
      ? `<div style="margin-top:10px;opacity:.75;font-size:12px">Sources: ${escapeHtml(properties.sources.join(" • "))}</div>`
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
  zoom: 1.2
});

let fullFeatureCollection = null;
let filteredFeatures = [];

function renderHotspotList(features) {
  hotspotListEl.innerHTML = "";

  for (const feature of features.sort((a, b) => b.properties.severity - a.properties.severity)) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "hotspotBtn";
    button.type = "button";
    button.innerHTML = `
      <strong>${escapeHtml(feature.properties.name)}</strong>
      <span class="hotspotMeta">${escapeHtml(feature.properties.region)} · ${badgeLabel(feature.properties.status)} · sev ${Number(feature.properties.severity).toFixed(2)}</span>
    `;
    button.addEventListener("click", () => {
      map.flyTo({ center: feature.geometry.coordinates, zoom: 3.2, essential: true });
      openIntelCard(feature.properties);
    });
    li.appendChild(button);
    hotspotListEl.appendChild(li);
  }

  if (!features.length) {
    hotspotListEl.innerHTML = "<li class='hotspotMeta'>No hotspots match the current filters.</li>";
  }
}

function applyFilters() {
  if (!fullFeatureCollection || !map.getSource("hotspots")) {
    return;
  }

  const status = filterEl.value;
  const region = regionFilterEl.value;
  const minSeverity = Number(minSevEl.value);
  const searchTerm = searchInputEl.value.trim().toLowerCase();

  filteredFeatures = fullFeatureCollection.features.filter((feature) => {
    const props = feature.properties;
    const statusOk = status === "all" || props.status === status;
    const regionOk = region === "all" || props.region === region;
    const severityOk = Number(props.severity) >= minSeverity;
    const searchOk = !searchTerm || props.name.toLowerCase().includes(searchTerm);
    return statusOk && regionOk && severityOk && searchOk;
  });

  map.getSource("hotspots").setData({ type: "FeatureCollection", features: filteredFeatures });
  renderSummary(fullFeatureCollection.features, filteredFeatures);
  renderHotspotList(filteredFeatures);
}

minSevEl.addEventListener("input", () => {
  minSevValEl.textContent = Number(minSevEl.value).toFixed(2);
  applyFilters();
});
filterEl.addEventListener("change", applyFilters);
regionFilterEl.addEventListener("change", applyFilters);
searchInputEl.addEventListener("input", applyFilters);

map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl(), "top-right");

  const response = await fetch("./data/hotspots.json");
  const hotspots = await response.json();

  const features = hotspots.map((h) => {
    const severity = computeSeverity(h);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: { ...h, severity, color: severityToColor(severity) }
    };
  });

  fullFeatureCollection = { type: "FeatureCollection", features };
  const regionsCount = new Set(hotspots.map((h) => h.region)).size;
  appSubtitleEl.textContent = `${hotspots.length} hotspots across ${regionsCount} regions, fully loaded from JSON.`;

  const lastUpdated = hotspots
    .map((h) => h.last_update)
    .filter(Boolean)
    .sort()
    .at(-1);
  updatedAtEl.textContent = `Dataset updated: ${lastUpdated ?? "Unknown"}`;

  setRegionOptions(features);

  map.addSource("hotspots", { type: "geojson", data: fullFeatureCollection });

  map.addLayer({
    id: "hotspots-layer",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 3, 6, 6, 9],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.92
    }
  });

  map.on("click", "hotspots-layer", (event) => {
    const feature = event.features?.[0];
    if (feature) openIntelCard(feature.properties);
  });
  map.on("mouseenter", "hotspots-layer", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "hotspots-layer", () => { map.getCanvas().style.cursor = ""; });

  applyFilters();
});
