const filterEl = document.getElementById("filter");
const regionFilterEl = document.getElementById("regionFilter");
const minSevEl = document.getElementById("minSev");
const minSevValEl = document.getElementById("minSevVal");
const searchInputEl = document.getElementById("commandInput");
const summaryGridEl = document.getElementById("summaryGrid");
const hotspotListEl = document.getElementById("hotspotList");
const updatedAtEl = document.getElementById("updatedAt");
const appSubtitleEl = document.getElementById("appSubtitle");
const projectionEl = document.getElementById("projectionToggle");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

const statusBoost = { stable_threat: 0.05, frozen: 0.15, elevated: 0.25, active: 0.4 };
const HOTSPOT_DATA_CANDIDATES = ["./data/hotspots.json", "data/hotspots.json", "/data/hotspots.json"];
const COUNTRY_GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

let fullFeatureCollection = null;
let filteredFeatures = [];
let hotspotEntities = [];
let viewer;

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function computeSeverity(h) {
  const likelihood = clamp(h.likelihood ?? 0.4, 0, 1);
  const impact = clamp(h.impact ?? 0.5, 0, 1);
  const boost = statusBoost[h.status] ?? 0.15;
  return clamp(0.55 * likelihood + 0.45 * impact + boost, 0, 1);
}

function severityToColor(score) {
  const s = clamp(score, 0, 1);
  if (s <= 0.33) return "#5f7f72";
  if (s <= 0.66) return "#8f8871";
  return "#a16f6f";
}

function badgeLabel(status) {
  return {
    stable_threat: "Stable threat",
    frozen: "Frozen conflict",
    elevated: "Elevated tension",
    active: "Active conflict"
  }[status] ?? status;
}

function buildAnalysis(properties) {
  const statusText = badgeLabel(properties.status).toLowerCase();
  return `${properties.summary} Current indicators classify this flashpoint as ${statusText}. Likelihood ${Number(properties.likelihood).toFixed(2)}, impact ${Number(properties.impact).toFixed(2)}.`;
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

function openIntelCard(properties) {
  const sev = Number(properties.severity).toFixed(2);
  modalContent.innerHTML = `
    <div class="cardTitle">
      <h2 style="margin:0">${escapeHtml(properties.name)}</h2>
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

function renderHotspotList(features) {
  hotspotListEl.innerHTML = "";
  for (const feature of [...features].sort((a, b) => b.properties.severity - a.properties.severity)) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "hotspotBtn";
    button.type = "button";
    button.innerHTML = `
      <strong>${escapeHtml(feature.properties.name)}</strong>
      <span class="hotspotMeta">${escapeHtml(feature.properties.region)} · ${badgeLabel(feature.properties.status)} · sev ${Number(feature.properties.severity).toFixed(2)}</span>
    `;
    button.addEventListener("click", () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(feature.geometry.coordinates[0], feature.geometry.coordinates[1], 1800000)
      });
      openIntelCard(feature.properties);
    });
    li.appendChild(button);
    hotspotListEl.appendChild(li);
  }

  if (!features.length) {
    hotspotListEl.innerHTML = "<li class='hotspotMeta'>No hotspots match the current filters.</li>";
  }
}

function clearHotspotEntities() {
  hotspotEntities.forEach((entity) => viewer.entities.remove(entity));
  hotspotEntities = [];
}

function renderHotspotsOnGlobe(features) {
  clearHotspotEntities();
  for (const feature of features) {
    const [lon, lat] = feature.geometry.coordinates;
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 10,
        color: Cesium.Color.fromCssColorString(feature.properties.color),
        outlineColor: Cesium.Color.fromCssColorString("#d8dccf"),
        outlineWidth: 1.2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      },
      properties: feature.properties
    });
    hotspotEntities.push(entity);
  }
}

function applyFilters() {
  if (!fullFeatureCollection) return;
  const status = filterEl.value;
  const region = regionFilterEl.value;
  const minSeverity = Number(minSevEl.value);
  const searchTerm = searchInputEl ? searchInputEl.value.trim().toLowerCase() : "";

  filteredFeatures = fullFeatureCollection.features.filter((feature) => {
    const props = feature.properties;
    const statusOk = status === "all" || props.status === status;
    const regionOk = region === "all" || props.region === region;
    const severityOk = Number(props.severity) >= minSeverity;
    const searchOk = !searchTerm || props.name.toLowerCase().includes(searchTerm);
    return statusOk && regionOk && severityOk && searchOk;
  });

  renderHotspotsOnGlobe(filteredFeatures);
  renderSummary(fullFeatureCollection.features, filteredFeatures);
  renderHotspotList(filteredFeatures);
}

function wireFilterHandlers() {
  minSevEl.addEventListener("input", () => {
    minSevValEl.textContent = Number(minSevEl.value).toFixed(2);
    applyFilters();
  });
  filterEl.addEventListener("change", applyFilters);
  regionFilterEl.addEventListener("change", applyFilters);
  if (searchInputEl) searchInputEl.addEventListener("input", applyFilters);
}

async function loadHotspotsFromJson() {
  let hotspots = null;
  for (const url of HOTSPOT_DATA_CANDIDATES) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      hotspots = await response.json();
      break;
    } catch {
      // continue
    }
  }

  if (!hotspots) throw new Error("Unable to load hotspot dataset from known paths.");

  const features = hotspots.map((h) => {
    const severity = computeSeverity(h);
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: {
        ...h,
        severity,
        color: severityToColor(severity),
        analysis: h.analysis ?? buildAnalysis({ ...h, severity })
      }
    };
  });

  fullFeatureCollection = { type: "FeatureCollection", features };
  filteredFeatures = features;
  setRegionOptions(features);

  const lastUpdated = hotspots.map((h) => h.last_update).filter(Boolean).sort().at(-1);
  updatedAtEl.textContent = `Dataset updated: ${lastUpdated ?? "Unknown"}`;
}

async function addCountriesLayer() {
  const countries = await Cesium.GeoJsonDataSource.load(COUNTRY_GEOJSON_URL, {
    stroke: Cesium.Color.fromCssColorString("#7cbf90"),
    strokeWidth: 1.1,
    fill: Cesium.Color.fromCssColorString("#5c6369").withAlpha(0.36),
    clampToGround: true
  });

  viewer.dataSources.add(countries);
  for (const entity of countries.entities.values) {
    if (entity.polygon) {
      entity.polygon.material = Cesium.Color.fromCssColorString("#596169").withAlpha(0.34);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString("#7cbf90");
      entity.polygon.outlineWidth = 1.0;
    }
  }
}

function setProjectionMode() {
  if (projectionEl.checked) {
    viewer.scene.morphTo3D(0.8);
  } else {
    viewer.scene.morphTo2D(0.8);
  }
}

function wireEntityPick() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.position);
    if (!Cesium.defined(pickedObject) || !pickedObject.id?.properties) return;
    const props = pickedObject.id.properties;
    openIntelCard({
      name: props.name?.getValue(),
      region: props.region?.getValue(),
      status: props.status?.getValue(),
      severity: props.severity?.getValue(),
      color: props.color?.getValue(),
      likelihood: props.likelihood?.getValue(),
      impact: props.impact?.getValue(),
      category: props.category?.getValue(),
      start_date: props.start_date?.getValue(),
      last_update: props.last_update?.getValue(),
      analysis: props.analysis?.getValue(),
      summary: props.summary?.getValue()
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

async function init() {
  viewer = new Cesium.Viewer("map", {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: true,
    infoBox: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    selectionIndicator: false,
    skyBox: false,
    skyAtmosphere: false,
    baseLayer: false
  });

  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#12385a");
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#102336");
  viewer.scene.globe.enableLighting = false;

  await addCountriesLayer();
  await loadHotspotsFromJson();
  wireFilterHandlers();
  applyFilters();
  wireEntityPick();

  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(12, 24, 22000000) });

  projectionEl.addEventListener("change", setProjectionMode);
  setProjectionMode();
}

init().catch((error) => {
  console.error(error);
  appSubtitleEl.textContent = "Failed to initialize Cesium world view. Check console for details.";
  updatedAtEl.textContent = "Dataset updated: unavailable";
});
