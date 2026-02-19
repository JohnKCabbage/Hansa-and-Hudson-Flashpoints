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
const HOTSPOT_HIT_LAYER_ID = "hotspots-hit";
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
  cartoVoyager: {
    version: 8,
    name: "Carto Voyager",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      cartoVoyager: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO"
      }
    },
    layers: [{ id: "carto-voyager-layer", type: "raster", source: "cartoVoyager" }]
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
  },
  stamenTonerLite: {
    version: 8,
    name: "Stamen Toner Lite",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      stamen: {
        type: "raster",
        tiles: [
          "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap contributors"
      }
    },
    layers: [{ id: "stamen-toner-lite-layer", type: "raster", source: "stamen" }]
  },
  libreDemo: "https://demotiles.maplibre.org/style.json"
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
  },
  sudan: {
    flag: "🇸🇩",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Khartoum-skyline.jpg/1280px-Khartoum-skyline.jpg"
  },
  myanmar: {
    flag: "🇲🇲",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Yangon_downtown.jpg/1280px-Yangon_downtown.jpg"
  },
  drc_east: {
    flag: "🇨🇩",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Goma_cityscape.jpg/1280px-Goma_cityscape.jpg"
  },
  haiti: {
    flag: "🇭🇹",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Port-au-Prince.jpg/1280px-Port-au-Prince.jpg"
  },
  ethiopia_tigray_aftershock: {
    flag: "🇪🇹",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Addis_Ababa_montage.png/1280px-Addis_Ababa_montage.png"
  },
  sahel_central: {
    flag: "🇲🇱 🇳🇪 🇧🇫",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Niamey%2C_Niger.jpg/1280px-Niamey%2C_Niger.jpg"
  },
  somalia: {
    flag: "🇸🇴",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Mogadishu_Skyline.jpg/1280px-Mogadishu_Skyline.jpg"
  },
  lebanon_border: {
    flag: "🇱🇧 🇮🇱",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Blue_Line_Lebanon.jpg/1280px-Blue_Line_Lebanon.jpg"
  },
  libya: {
    flag: "🇱🇾",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Tripoli_skyline_2016.jpg/1280px-Tripoli_skyline_2016.jpg"
  },
  western_sahara: {
    flag: "🇪🇭 🇲🇦",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Laayoune_city.jpg/1280px-Laayoune_city.jpg"
  },
  cyprus: {
    flag: "🇨🇾",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Nicosia_old_city.jpg/1280px-Nicosia_old_city.jpg"
  },
  kosovo_serbia: {
    flag: "🇽🇰 🇷🇸",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Mitrovica_bridge.jpg/1280px-Mitrovica_bridge.jpg"
  },
  armenia_azerbaijan: {
    flag: "🇦🇲 🇦🇿",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/South_Caucasus_mountains.jpg/1280px-South_Caucasus_mountains.jpg"
  },
  georgia_abkhazia_ossetia: {
    flag: "🇬🇪",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Tbilisi_montage.png/1280px-Tbilisi_montage.png"
  },
  transnistria: {
    flag: "🇲🇩",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tiraspol_montage.jpg/1280px-Tiraspol_montage.jpg"
  }
};

let fullFeatureCollection = null;
let filteredFeatures = [];
let mapDataReady = false;
let activeBasemapKey = DEFAULT_BASEMAP;
let arcgisFallbackTriggered = false;
let hoverPopup = null;
let hotspotInteractionBound = false;

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

function normalizeSources(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value.split(/\s*[•,;]\s*/).filter(Boolean);
  }
  return [];
}

function normalizeStructuredList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function inferFlagFromName(name) {
  const n = String(name).toLowerCase();
  if (n.includes("ukraine") || n.includes("russia")) return "🇺🇦 🇷🇺";
  if (n.includes("israel") || n.includes("gaza") || n.includes("palestin")) return "🇮🇱 🇵🇸";
  if (n.includes("taiwan") || n.includes("china")) return "🇹🇼 🇨🇳";
  if (n.includes("kashmir") || n.includes("india") || n.includes("pakistan")) return "🇮🇳 🇵🇰";
  if (n.includes("korea")) return "🇰🇷 🇰🇵";
  if (n.includes("yemen")) return "🇾🇪";
  if (n.includes("sudan")) return "🇸🇩";
  if (n.includes("myanmar")) return "🇲🇲";
  if (n.includes("congo")) return "🇨🇩";
  if (n.includes("sahel") || n.includes("mali") || n.includes("niger")) return "🇲🇱 🇳🇪";
  if (n.includes("haiti")) return "🇭🇹";
  if (n.includes("ethiopia")) return "🇪🇹";
  if (n.includes("somalia")) return "🇸🇴";
  if (n.includes("libya")) return "🇱🇾";
  if (n.includes("western sahara")) return "🇪🇭";
  if (n.includes("cyprus")) return "🇨🇾";
  if (n.includes("kosovo") || n.includes("serbia")) return "🇽🇰 🇷🇸";
  if (n.includes("armenia") || n.includes("azerbaijan")) return "🇦🇲 🇦🇿";
  if (n.includes("georgia")) return "🇬🇪";
  if (n.includes("moldova") || n.includes("transnistria")) return "🇲🇩";
  if (n.includes("peru")) return "🇵🇪";
  return "🌐";
}

function buildAnalysis(properties) {
  const statusText = badgeLabel(properties.status).toLowerCase();
  const severity = Number(properties.severity);
  const severityBand = severity > 0.8
    ? "The flashpoint is in the highest risk band, where localized shocks can cascade into cross-border escalation within short timelines."
    : severity > 0.6
      ? "The flashpoint is in a high-risk band where tactical events can outpace formal diplomacy and crisis-management channels."
      : "The flashpoint remains relatively contained, but unresolved structural drivers still require active monitoring and preventive diplomacy.";

  const regionalContext = {
    Europe: "Regional security architecture and alliance signaling materially shape escalation pathways.",
    "Middle East": "Proxy networks and deterrence signaling create rapid second-order escalation risks.",
    Africa: "Governance fragmentation, displacement patterns, and cross-border armed mobility remain key multipliers.",
    "Asia-Pacific": "Maritime/airspace encounters and force-posture signaling are central to near-term risk swings.",
    Americas: "State-capacity stress and armed-group adaptation influence durability and spillover risk."
  }[properties.region] ?? "Geopolitical competition, governance conditions, and coercive signaling remain core risk drivers.";

  return `${properties.summary} Current indicators classify this as ${statusText} with likelihood ${Number(properties.likelihood).toFixed(2)} and impact ${Number(properties.impact).toFixed(2)}. ${severityBand} ${regionalContext}`;
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
  const keyDates = normalizeStructuredList(properties.key_dates);
  const eventsList = normalizeStructuredList(properties.events);
  const sev = Number(properties.severity).toFixed(2);
  const dates = keyDates
    .map((d) => `<li><b>${escapeHtml(d.date)}</b> — ${escapeHtml(d.note)}</li>`)
    .join("");
  const events = eventsList.map((e) => `<li>${escapeHtml(e)}</li>`).join("");

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

    ${normalizeSources(properties.sources).length
      ? `<div style="margin-top:10px;opacity:.75;font-size:12px">Sources: ${escapeHtml(normalizeSources(properties.sources).join(" • "))}</div>`
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
  return typeof style === "string" ? style : JSON.parse(JSON.stringify(style));
}

function setBasemap(map, styleKey) {
  activeBasemapKey = basemapStyles[styleKey] ? styleKey : DEFAULT_BASEMAP;
  arcgisFallbackTriggered = false;
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
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 10, 4, 18, 6, 26],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.26,
        "circle-blur": 0.75
      }
    });
  }

  if (!map.getLayer(HOTSPOT_LAYER_ID)) {
    map.addLayer({
      id: HOTSPOT_LAYER_ID,
      type: "circle",
      source: HOTSPOT_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 3, 8, 6, 12],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 1.3,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.97
      }
    });
  }

  if (!map.getLayer(HOTSPOT_HIT_LAYER_ID)) {
    map.addLayer({
      id: HOTSPOT_HIT_LAYER_ID,
      type: "circle",
      source: HOTSPOT_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 14, 3, 18, 6, 22],
        "circle-color": "#000000",
        "circle-opacity": 0
      }
    });
  }

  if (!hotspotInteractionBound) {
    hotspotInteractionBound = true;

    map.on("click", (event) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: [HOTSPOT_HIT_LAYER_ID, HOTSPOT_LAYER_ID] })?.[0];
      if (feature) {
        map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 3), essential: true });
        openIntelCard(feature.properties);
      }
    });

    map.on("mousemove", (event) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: [HOTSPOT_HIT_LAYER_ID, HOTSPOT_LAYER_ID] })?.[0];
      if (!feature) {
        map.getCanvas().style.cursor = "";
        if (hoverPopup) hoverPopup.remove();
        return;
      }

      map.getCanvas().style.cursor = "pointer";
      const p = feature.properties;
      const html = `<div class="mapTooltip"><strong>${escapeHtml(p.name)}</strong><br><span>${badgeLabel(p.status)} · severity ${Number(p.severity).toFixed(2)}</span></div>`;
      if (!hoverPopup) {
        hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "hotspotTooltip" });
      }
      hoverPopup.setLngLat(feature.geometry.coordinates).setHTML(html).addTo(map);
    });

    map.on("mouseout", () => {
      map.getCanvas().style.cursor = "";
      if (hoverPopup) hoverPopup.remove();
    });
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
  const features = hotspots.map((h) => {
    const severity = computeSeverity(h);
    const enrichment = hotspotEnrichment[h.id] ?? {};
    const regionFallbackImage = {
      Europe: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Europe_satellite_globe.jpg/1280px-Europe_satellite_globe.jpg",
      "Middle East": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Jerusalem_BW_14.JPG/1280px-Jerusalem_BW_14.JPG",
      Africa: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/African_Union_headquarters.jpg/1280px-African_Union_headquarters.jpg",
      "Asia-Pacific": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Singapore_skyline_2019.jpg/1280px-Singapore_skyline_2019.jpg",
      Americas: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Bogota_CBD.jpg/1280px-Bogota_CBD.jpg"
    }[h.region];
    const image = enrichment.image ?? regionFallbackImage ?? "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png";
    const flag = enrichment.flag ?? inferFlagFromName(h.name);
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
    center: [5, 24],
    zoom: 1.45,
    projection: "mercator"
  });

  window.__flashpointsMap = map;

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  wireFilterHandlers(map);

  projectionEl.addEventListener("change", () => setProjection(map));

  basemapEl.addEventListener("change", () => {
    setBasemap(map, basemapEl.value);
  });

  map.on("error", (event) => {
    const message = String(event?.error?.message ?? "");
    const sourceId = String(event?.sourceId ?? "");
    const arcgisRequestFailure = /arcgis|esri|world_street_map|rest\/services\/world_street_map/i.test(message + sourceId)
      && /(403|404|5\d\d|failed|fetch|tile)/i.test(message);

    const shouldFallback = activeBasemapKey === "arcgis" && !arcgisFallbackTriggered && !mapDataReady && arcgisRequestFailure;
    if (shouldFallback) {
      arcgisFallbackTriggered = true;
      console.warn("ArcGIS basemap request failed in this environment; falling back to OSM.", event.error);
      setBasemap(map, FALLBACK_BASEMAP);
    }
  });

  map.on("style.load", () => {
    ensureHotspotLayers(map);
    setProjection(map);
    if (mapDataReady) {
      applyFilters(map);
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
});
