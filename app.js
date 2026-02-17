const filterEl = document.getElementById("filter");
const regionFilterEl = document.getElementById("regionFilter");
const minSevEl = document.getElementById("minSev");
const minSevValEl = document.getElementById("minSevVal");
const searchInputEl = document.getElementById("searchInput");
const summaryGridEl = document.getElementById("summaryGrid");
const hotspotListEl = document.getElementById("hotspotList");
const updatedAtEl = document.getElementById("updatedAt");
const appSubtitleEl = document.getElementById("appSubtitle");
const basemapEl = document.getElementById("basemapSelect");
const projectionEl = document.getElementById("projectionToggle");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

const statusBoost = { stable_threat: 0.05, frozen: 0.15, elevated: 0.25, active: 0.4 };

const HOTSPOT_SOURCE_ID = "hotspots";
const HOTSPOT_GLOW_LAYER_ID = "hotspots-glow";
const HOTSPOT_LAYER_ID = "hotspots-layer";
const DEFAULT_BASEMAP = "arcgis";
const FALLBACK_BASEMAP = "osm";
const HOTSPOT_DATA_CANDIDATES = [
  "./data/hotspots.json",
  "data/hotspots.json",
  "/data/hotspots.json"
];

const basemapStyles = {
  arcgis: {
    version: 8,
    name: "ArcGIS World Street Map",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "esri-street": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Tiles © Esri"
      }
    },
    layers: [{ id: "esri-street-layer", type: "raster", source: "esri-street" }]
  },
  osm: {
    version: 8,
    name: "OpenStreetMap Standard",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [{ id: "osm-layer", type: "raster", source: "osm" }]
  },
  cartoDark: {
    version: 8,
    name: "Carto Dark Matter",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO"
      }
    },
    layers: [{ id: "carto-dark-layer", type: "raster", source: "carto" }]
  }
};

const hotspotEnrichment = {
  ukraine_russia: {
    flag: "🇺🇦 🇷🇺",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Bakhmut_shelling_2022.jpg/1280px-Bakhmut_shelling_2022.jpg"
  },
  gaza_israel: {
    flag: "🇵🇸 🇮🇱",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gaza_City_skyline.jpg/1280px-Gaza_City_skyline.jpg"
  },
  taiwan_strait: {
    flag: "🇹🇼 🇨🇳",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Taipei_101_from_Xiangshan_2013.jpg/1280px-Taipei_101_from_Xiangshan_2013.jpg"
  },
  kashmir_india_pakistan: {
    flag: "🇮🇳 🇵🇰",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Srinagar_Leh_highway.jpg/1280px-Srinagar_Leh_highway.jpg"
  },
  south_china_sea: {
    flag: "🇨🇳 🇵🇭 🇻🇳 🇲🇾",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/South_China_Sea_map.png/1280px-South_China_Sea_map.png"
  },
  korean_peninsula: {
    flag: "🇰🇷 🇰🇵",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Panmunjeom_DMZ.jpg/1280px-Panmunjeom_DMZ.jpg"
  },
  yemen_red_sea: {
    flag: "🇾🇪",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sana%27a_City%2C_Yemen.jpg/1280px-Sana%27a_City%2C_Yemen.jpg"
  }
};

let fullFeatureCollection = null;
let filteredFeatures = [];
let mapDataReady = false;
let activeBasemapKey = DEFAULT_BASEMAP;

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
    r = Math.round(lerp(58, 236, t));
    g = Math.round(lerp(126, 207, t));
    b = Math.round(lerp(98, 87, t));
  } else {
    const t = (s - 0.5) / 0.5;
    r = Math.round(lerp(236, 250, t));
    g = Math.round(lerp(207, 109, t));
    b = Math.round(lerp(87, 78, t));
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

function buildAnalysis(properties) {
  const statusText = badgeLabel(properties.status).toLowerCase();
  const severity = Number(properties.severity);
  const severityBand = severity > 0.8
    ? "This flashpoint is in the highest risk band and could cascade quickly if deterrence weakens."
    : severity > 0.6
      ? "This flashpoint sits in a high-risk band where tactical incidents could outpace diplomatic response."
      : "This flashpoint remains comparatively contained but still needs active risk management to avoid drift.";

  return `${properties.summary} Current indicators classify the situation as ${statusText}, with likelihood at ${Number(properties.likelihood).toFixed(2)} and potential impact at ${Number(properties.impact).toFixed(2)}. ${severityBand}`;
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
  regionFilterEl.innerHTML = '<option value="all">All regions</option>';
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
    <div class="cardHero">
      <img src="${escapeHtml(properties.image)}" alt="${escapeHtml(properties.name)} context image" referrerpolicy="no-referrer" />
    </div>
    <div class="cardTitle">
      <h2 style="margin:0">${escapeHtml(properties.flag)} ${escapeHtml(properties.name)}</h2>
      <span class="badge">${escapeHtml(properties.region ?? "Global")}</span>
      <span class="badge" style="border-color:${properties.color};">${badgeLabel(properties.status)}</span>
      <span class="badge severityPill" style="background:${properties.color};">severity ${sev}</span>
    </div>

    <div class="kv">
      <div class="box">
        <div class="eyebrow">Threat matrix</div>
        <div><b>Likelihood:</b> ${Number(properties.likelihood).toFixed(2)} · <b>Impact:</b> ${Number(properties.impact).toFixed(2)}</div>
        <div style="margin-top:6px;"><b>Category:</b> ${escapeHtml(properties.category ?? "flashpoint")}</div>
      </div>
      <div class="box">
        <div class="eyebrow">Core dates</div>
        <div><b>Start:</b> ${escapeHtml(properties.start_date ?? "—")}</div>
        <div><b>Last update:</b> ${escapeHtml(properties.last_update ?? "—")}</div>
      </div>
    </div>

    <div class="box" style="margin-bottom:10px">
      <div class="eyebrow">Analysis</div>
      <div style="margin-top:6px; line-height:1.55">${escapeHtml(properties.analysis)}</div>
    </div>

    ${dates ? `<div class="box"><div class="eyebrow">Key dates</div><ul>${dates}</ul></div>` : ""}
    ${events ? `<div class="box" style="margin-top:10px"><div class="eyebrow">Significant events</div><ul>${events}</ul></div>` : ""}

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

function getBasemapStyle(styleKey) {
  const style = basemapStyles[styleKey] ?? basemapStyles[DEFAULT_BASEMAP];
  return JSON.parse(JSON.stringify(style));
}
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [5, 24],
  zoom: 1.45,
  projection: "globe"
});

function setBasemap(map, styleKey) {
  activeBasemapKey = basemapStyles[styleKey] ? styleKey : DEFAULT_BASEMAP;
  basemapEl.value = activeBasemapKey;
  map.setStyle(getBasemapStyle(activeBasemapKey));
}

function renderHotspotList(features, map) {
  hotspotListEl.innerHTML = "";

  for (const feature of [...features].sort((a, b) => b.properties.severity - a.properties.severity)) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "hotspotBtn";
    button.type = "button";
    button.innerHTML = `
      <strong>${escapeHtml(feature.properties.flag)} ${escapeHtml(feature.properties.name)}</strong>
      <span class="hotspotMeta">${escapeHtml(feature.properties.region)} · ${badgeLabel(feature.properties.status)} · sev ${Number(feature.properties.severity).toFixed(2)}</span>
    `;
    button.addEventListener("click", () => {
      map.flyTo({ center: feature.geometry.coordinates, zoom: 3.3, essential: true });
      openIntelCard(feature.properties);
    });
    li.appendChild(button);
    hotspotListEl.appendChild(li);
  }

  if (!features.length) {
    hotspotListEl.innerHTML = "<li class='hotspotMeta'>No hotspots match the current filters.</li>";
  }
}

function ensureHotspotLayers(map) {
  if (!map.getSource(HOTSPOT_SOURCE_ID)) {
    map.addSource(HOTSPOT_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }

  if (!map.getLayer(HOTSPOT_GLOW_LAYER_ID)) {
    map.addLayer({
      id: HOTSPOT_GLOW_LAYER_ID,
      type: "circle",
      source: HOTSPOT_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 4, 14, 6, 20],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.24,
        "circle-blur": 0.7
      }
    });
  }

  if (!map.getLayer(HOTSPOT_LAYER_ID)) {
    map.addLayer({
      id: HOTSPOT_LAYER_ID,
      type: "circle",
      source: HOTSPOT_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 3, 7, 6, 11],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.96
      }
    });

    map.on("click", HOTSPOT_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (feature) {
        map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 3), essential: true });
        openIntelCard(feature.properties);
      }
    });

    map.on("mouseenter", HOTSPOT_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", HOTSPOT_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  }
}

function applyFilters(map) {
  if (!fullFeatureCollection || !map.getSource(HOTSPOT_SOURCE_ID)) {
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

  map.getSource(HOTSPOT_SOURCE_ID).setData({ type: "FeatureCollection", features: filteredFeatures });
  renderSummary(fullFeatureCollection.features, filteredFeatures);
  renderHotspotList(filteredFeatures, map);
}

function wireFilterHandlers(map) {
  minSevEl.addEventListener("input", () => {
    minSevValEl.textContent = Number(minSevEl.value).toFixed(2);
    applyFilters(map);
  });
  filterEl.addEventListener("change", () => applyFilters(map));
  regionFilterEl.addEventListener("change", () => applyFilters(map));
  searchInputEl.addEventListener("input", () => applyFilters(map));
}

function setProjection(map) {
  const projectionName = projectionEl.checked ? "globe" : "mercator";
  map.setProjection({ type: projectionName });
  if (projectionName === "globe") {
    map.setFog({ color: "rgb(15, 23, 42)", "high-color": "rgb(59,130,246)", "space-color": "rgb(3, 7, 18)" });
  } else {
    map.setFog(null);
  }
}

async function loadHotspotsFromJson() {
  let hotspots = null;
  let lastError = null;

  for (const url of HOTSPOT_DATA_CANDIDATES) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`Failed to load ${url} (${response.status})`);
        continue;
      }
      hotspots = await response.json();
      console.info(`Hotspot dataset loaded from: ${url}`);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!hotspots) {
    throw lastError ?? new Error("Unable to load hotspot dataset from known paths.");
  }
map.on("load", async () => {
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.setFog({ color: "rgb(15, 23, 42)", "high-color": "rgb(59,130,246)", "space-color": "rgb(3, 7, 18)" });

async function loadHotspotsFromJson() {
  const response = await fetch("./data/hotspots.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load hotspots.json (${response.status})`);
  }

  const hotspots = await response.json();
  const features = hotspots.map((h) => {
    const severity = computeSeverity(h);
    const enrichment = hotspotEnrichment[h.id] ?? {};
    const image = enrichment.image ?? "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png";
    const flag = enrichment.flag ?? "🌐";
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: {
        ...h,
        severity,
        color: severityToColor(severity),
        flag,
        image,
        analysis: h.analysis ?? buildAnalysis({ ...h, severity })
      }
    };
  });

  fullFeatureCollection = { type: "FeatureCollection", features };
  setRegionOptions(features);

  const regionsCount = new Set(hotspots.map((h) => h.region)).size;
  appSubtitleEl.textContent = `${hotspots.length} hotspots across ${regionsCount} regions, loaded directly from JSON.`;
  appSubtitleEl.textContent = `${hotspots.length} hotspots across ${regionsCount} regions, loaded with geospatial risk metadata.`;

  const lastUpdated = hotspots
    .map((h) => h.last_update)
    .filter(Boolean)
    .sort()
    .at(-1);
  updatedAtEl.textContent = `Dataset updated: ${lastUpdated ?? "Unknown"}`;
}

async function init() {
  const map = new maplibregl.Map({
    container: "map",
    style: getBasemapStyle(DEFAULT_BASEMAP),
    style: basemapStyles.arcgis,
    center: [5, 24],
    zoom: 1.45,
    projection: "mercator"
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  wireFilterHandlers(map);

  projectionEl.addEventListener("change", () => setProjection(map));

  basemapEl.addEventListener("change", () => {
    setBasemap(map, basemapEl.value);
  });

  map.on("error", (event) => {
    const message = event?.error?.message ?? "";
    const failedArcgisLoad = activeBasemapKey === "arcgis" && /tile|source|request|403|404|5\d\d/i.test(message);

    if (failedArcgisLoad) {
      console.warn("ArcGIS basemap failed, falling back to OSM basemap.", event.error);
      setBasemap(map, FALLBACK_BASEMAP);
    }
  });

  map.on("style.load", () => {
    ensureHotspotLayers(map);
    setProjection(map);
    if (mapDataReady) {
      applyFilters(map);
  map.addSource("hotspots", { type: "geojson", data: fullFeatureCollection });

  map.addLayer({
    id: "hotspots-glow",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 4, 14, 6, 20],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.24,
      "circle-blur": 0.7
    }
  });

  map.addLayer({
    id: "hotspots-layer",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 3, 7, 6, 11],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 1.2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.96
    }
  });

  map.on("click", "hotspots-layer", (event) => {
    const feature = event.features?.[0];
    if (feature) {
      map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 3), essential: true });
      openIntelCard(feature.properties);
    }
  });

  await new Promise((resolve) => map.once("load", resolve));

  await loadHotspotsFromJson();
  mapDataReady = true;
  ensureHotspotLayers(map);
  applyFilters(map);
}

init().catch((error) => {
  console.error(error);
  appSubtitleEl.textContent = "Failed to load hotspot data (deploy path issue). Check console for details.";
  updatedAtEl.textContent = "Dataset updated: unavailable";
  hotspotListEl.innerHTML = "<li class='hotspotMeta'>Dataset failed to load. Verify the deployed path includes data/hotspots.json.</li>";
  appSubtitleEl.textContent = "Failed to load hotspot data. Check console for details.";
});
