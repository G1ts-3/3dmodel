"use strict";

const viewer = document.querySelector("#instrument-model");
const viewerFrame = document.querySelector("#viewer-frame");
const viewerLoading = document.querySelector("#viewer-loading");
const loadingMessage = document.querySelector("#loading-message");
const anatomyHotspots = [...viewer.querySelectorAll(".hotspot")];
const actionHotspots = {
  power: document.querySelector("#model-power"),
  blank: document.querySelector("#model-blank"),
  measure: document.querySelector("#model-measure"),
};
const lidToggle = document.querySelector("#lid-toggle");
const lidLabel = document.querySelector("#lid-label");
const partCard = document.querySelector("#part-card");
const procedureCard = document.querySelector("#procedure-card");
const demoButton = document.querySelector("#demo-button");
const ui = {
  console: document.querySelector("#instrument-console"),
  power: document.querySelector("#power-button"),
  powerLabel: document.querySelector("#power-label"),
  slider: document.querySelector("#wavelength-slider"),
  sliderOutput: document.querySelector("#wavelength-output"),
  wavelengthDisplay: document.querySelector("#wavelength-display"),
  readingDisplay: document.querySelector("#reading-display"),
  readingUnit: document.querySelector("#reading-unit"),
  modeLabel: document.querySelector("#reading-mode-label"),
  modeAbs: document.querySelector("#mode-abs"),
  modeTrans: document.querySelector("#mode-trans"),
  blank: document.querySelector("#blank-button"),
  measure: document.querySelector("#measure-button"),
  lcdState: document.querySelector("#lcd-state"),
  lcdMessage: document.querySelector("#lcd-message"),
  status: document.querySelector("#status-message"),
  statusTag: document.querySelector("#status-tag"),
};

const parts = [
  { title: "Sumber Cahaya", description: "Lampu deuterium dan wolfram menyediakan cahaya untuk rentang UV dan tampak. Titik ini menandai jalur masuk cahaya ke ruang sampel.", target: "-0.014m 0.127m -0.099m", orbit: "220deg 44deg 0.28m" },
  { title: "Detektor", description: "Sensor fotodioda menerima cahaya setelah melewati sampel. Intensitas yang terukur dibandingkan dengan acuan blank.", target: "-0.158m 0.138m -0.102m", orbit: "119deg 49deg 0.27m" },
  { title: "Kuvet / Wadah Sampel", description: "Kuvet menampung larutan blank atau sampel. Sisi beningnya harus berada pada jalur cahaya saat pengukuran.", target: "-0.099m 0.133m -0.107m", orbit: "181deg 35deg 0.26m" },
  { title: "Monitor", description: "Layar pada alat mengikuti pembacaan di konsol: panjang gelombang, absorbansi atau transmitan, dan status langkah kerja.", target: "-0.295m 0.219m -0.039m", orbit: "168deg 44deg 0.28m" },
  { title: "Tombol Kontrol", description: "Tiga tombol fisik pada panel model adalah POWER, BLANK, dan UKUR. Tekan tombolnya langsung pada mode Simulasi 3D.", target: "-0.295m 0.202m -0.123m", orbit: "174deg 35deg 0.25m" },
  { title: "Penutup Ruang Sampel", description: "Penutup berengsel menutup saat pembacaan sehingga cahaya luar tidak masuk. Tombol di kiri menggerakkannya secara manual.", target: "-0.089m 0.328m 0.025m", orbit: "132deg 58deg 0.39m" },
  { title: "Ruang Sampel", description: "Dudukan tiga kuvet bergerak untuk membawa blank atau sampel ke lintasan cahaya di antara sumber dan detektor.", target: "-0.089m 0.165m -0.111m", orbit: "196deg 35deg 0.28m" },
];
const defaultCamera = { orbit: "180deg 72deg auto", target: "-0.19m 0.18m -0.06m" };
const state = {
  powered: false,
  wavelength: 500,
  mode: "abs",
  blankAt: null,
  reading: null,
  busy: false,
  demoRunning: false,
  stopDemo: false,
  lidOpen: true,
  cell: "sample",
};
let activePart = -1;
let viewMode = "components";
let modelReady = false;
let displayMaterial = null;
let lidMaterial = null;
let transmittedMaterial = null;
let lcdCanvas = null;
let lcdTimer = null;
let lcdGeneration = 0;

function setCamera(target, orbit) {
  viewer.setAttribute("camera-target", target);
  viewer.setAttribute("camera-orbit", orbit);
}

function resetView() {
  activePart = -1;
  setCamera(defaultCamera.target, defaultCamera.orbit);
  anatomyHotspots.forEach(button => button.classList.remove("is-active"));
  document.querySelector("#navigation-count").textContent = "— / 07";
  partCard.hidden = true;
}

function focusPart(index) {
  if (viewMode !== "components") setViewMode("components");
  activePart = (index + parts.length) % parts.length;
  const part = parts[activePart];
  setCamera(part.target, part.orbit);
  anatomyHotspots.forEach((button, i) => button.classList.toggle("is-active", i === activePart));
  document.querySelector("#part-count").textContent = `BAGIAN ${String(activePart + 1).padStart(2, "0")} / 07`;
  document.querySelector("#part-title").textContent = part.title;
  document.querySelector("#part-description").textContent = part.description;
  document.querySelector("#navigation-count").textContent = `${String(activePart + 1).padStart(2, "0")} / 07`;
  partCard.hidden = false;
  if ([2, 5, 6].includes(activePart) && !state.lidOpen && !state.busy) void animateLid(true);
}

function focusOperation(step) {
  if (viewMode !== "simulation") return;
  const camera = {
    power: ["-0.22m 0.19m -0.07m", "174deg 58deg 0.90m"],
    blank: ["-0.15m 0.19m -0.09m", "183deg 56deg 0.88m"],
    measure: ["-0.15m 0.19m -0.09m", "174deg 58deg 0.89m"],
  }[step];
  if (camera) setCamera(...camera);
}

function setViewMode(mode) {
  viewMode = mode;
  const sim = mode === "simulation";
  viewerFrame.classList.toggle("is-simulation", sim);
  document.querySelector("#view-components").setAttribute("aria-pressed", String(!sim));
  document.querySelector("#view-simulator").setAttribute("aria-pressed", String(sim));
  anatomyHotspots.forEach(button => { button.hidden = sim; });
  Object.values(actionHotspots).forEach(button => { button.hidden = !sim; });
  procedureCard.hidden = !sim;
  document.querySelector("#viewer-navigation").hidden = sim;
  partCard.hidden = sim || activePart < 0;
  if (sim) resetView();
  renderGuide();
}

function setStatus(message, tag, lcd) {
  ui.status.textContent = message;
  ui.statusTag.textContent = tag;
  ui.lcdMessage.textContent = lcd;
  queueLCD();
}

function displayReading() {
  if (!state.powered || state.reading === null) return "—";
  return state.mode === "abs"
    ? state.reading.toFixed(3)
    : `${(100 * 10 ** -state.reading).toFixed(1)}%`;
}

function renderGuide() {
  const calibrated = state.blankAt === state.wavelength;
  let step, title, description;
  if (state.busy) {
    step = state.powered ? (calibrated ? "measure" : "blank") : "power";
    title = ui.statusTag.textContent;
    description = ui.status.textContent;
  } else if (!state.powered) {
    step = "power";
    title = "01 / Nyalakan alat";
    description = "Tekan POWER pada panel model. LED hijau dan layar instrumen akan menyala.";
  } else if (!calibrated) {
    step = "blank";
    title = "02 / Pasang kuvet blank";
    description = `Pilih ${state.wavelength} nm, lalu tekan BLANK. Penutup terbuka, kuvet blank terangkat dan masuk ke jalur optik sebelum kalibrasi.`;
  } else if (state.reading === null || state.reading === 0) {
    step = "measure";
    title = "03 / Ganti ke sampel";
    description = "Tekan UKUR. Penutup terbuka, kuvet sampel terangkat lalu ditempatkan di lintasan optik sebelum cahaya dibaca detektor.";
  } else {
    step = "measure";
    title = "Pengukuran selesai";
    description = `Hasil ${displayReading()} ditampilkan di konsol dan LCD model. Geser panjang gelombang untuk mengulang kalibrasi.`;
  }
  document.querySelector("#procedure-title").textContent = title;
  document.querySelector("#procedure-description").textContent = description;
  for (const name of ["power", "blank", "measure"]) {
    document.querySelector(`#step-${name}`).classList.toggle("done",
      name === "power" ? state.powered : name === "blank" ? calibrated : state.reading !== null && state.reading !== 0);
    document.querySelector(`#step-${name}`).classList.toggle("current", name === step && !state.busy);
  }
  actionHotspots.power.disabled = state.busy || state.demoRunning;
  actionHotspots.blank.disabled = !state.powered || state.busy || state.demoRunning;
  actionHotspots.measure.disabled = !state.powered || state.busy || !calibrated || state.demoRunning;
  for (const [name, hotspot] of Object.entries(actionHotspots)) {
    hotspot.classList.toggle("is-next", !hotspot.disabled && step === name && !state.demoRunning);
  }
  demoButton.disabled = !modelReady && !state.demoRunning;
  demoButton.innerHTML = state.demoRunning ? "■ Hentikan setelah langkah ini" : '<span aria-hidden="true">▶</span> Putar demo lengkap';
}

function renderConsole() {
  const on = state.powered;
  ui.console.classList.toggle("is-on", on);
  ui.power.setAttribute("aria-pressed", String(on));
  ui.power.setAttribute("aria-label", on ? "Matikan alat" : "Nyalakan alat");
  ui.power.disabled = state.busy || state.demoRunning;
  ui.powerLabel.textContent = on ? "POWER ON" : "POWER OFF";
  ui.wavelengthDisplay.textContent = on ? String(state.wavelength) : "—";
  ui.sliderOutput.textContent = String(state.wavelength);
  ui.readingDisplay.textContent = displayReading();
  ui.readingUnit.textContent = state.mode === "abs" ? "Abs" : "";
  ui.modeLabel.textContent = state.mode === "abs" ? "ABSORBANSI" : "TRANSMITAN %";
  ui.modeAbs.setAttribute("aria-pressed", String(state.mode === "abs"));
  ui.modeTrans.setAttribute("aria-pressed", String(state.mode === "trans"));
  ui.slider.disabled = !on || state.busy || state.demoRunning;
  ui.blank.disabled = !on || state.busy || state.demoRunning;
  ui.measure.disabled = !on || state.busy || state.blankAt !== state.wavelength || state.demoRunning;
  ui.modeAbs.disabled = !on || state.busy || state.demoRunning;
  ui.modeTrans.disabled = !on || state.busy || state.demoRunning;
  ui.lcdState.textContent = !on ? "● STANDBY" : state.busy ? "● BUSY" : "● READY";
  lidToggle.disabled = !modelReady || state.busy || state.demoRunning;
  lidLabel.textContent = state.lidOpen ? "Tutup ruang sampel" : "Buka ruang sampel";
  renderGuide();
  queueLCD();
}

// The actual plane on the GLB receives a fresh, locally drawn texture.
// A textured off-state panel is embedded in the GLB as a fallback.
function queueLCD() {
  if (!modelReady || !displayMaterial || !viewer.createTexture) return;
  clearTimeout(lcdTimer);
  const generation = ++lcdGeneration;
  lcdTimer = setTimeout(async () => {
    if (!lcdCanvas) { lcdCanvas = document.createElement("canvas"); lcdCanvas.width = 1024; lcdCanvas.height = 512; }
    const ctx = lcdCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#081d29";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#41647a";
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, 502, 246);
    ctx.fillStyle = "#7196aa";
    ctx.fillRect(253, 66, 2, 130);
    ctx.fillStyle = "#a8c9d9";
    ctx.font = '600 22px "IBM Plex Mono", monospace';
    ctx.fillText("λ / NM", 26, 47);
    ctx.fillText(state.mode === "abs" ? "ABSORBANSI" : "TRANSMITAN %", 278, 47);
    ctx.fillStyle = state.powered ? "#ffd07e" : "#887754";
    ctx.font = '700 76px "IBM Plex Mono", monospace';
    ctx.fillText(state.powered ? String(state.wavelength) : "—", 26, 154, 212);
    ctx.textAlign = "right";
    ctx.font = state.mode === "trans" ? '700 64px "IBM Plex Mono", monospace' : '700 74px "IBM Plex Mono", monospace';
    ctx.fillText(displayReading(), 486, 154, 214);
    ctx.textAlign = "left";
    ctx.fillStyle = "#aecfe0";
    ctx.font = '600 21px "IBM Plex Mono", monospace';
    ctx.fillText(state.powered ? ui.lcdMessage.textContent.slice(0, 30) : "SISTEM MATI", 26, 223, 460);
    try {
      const texture = await viewer.createTexture(lcdCanvas.toDataURL("image/png"));
      if (generation === lcdGeneration && modelReady) {
        displayMaterial.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
      }
    } catch (error) {
      console.warn("LCD model memakai tekstur cadangan:", error);
    }
  }, 90);
}

function updateLidHotspot(angle) {
  const dy = .328 - .214;
  const dz = .037 - .026;
  const y = .214 + dy * Math.cos(angle) - dz * Math.sin(angle);
  const z = .026 + dy * Math.sin(angle) + dz * Math.cos(angle);
  const position = `-0.089m ${y.toFixed(4)}m ${z.toFixed(4)}m`;
  const normal = `0m ${(-Math.sin(angle)).toFixed(4)}m ${Math.cos(angle).toFixed(4)}m`;
  if (typeof viewer.updateHotspot === "function" && modelReady) {
    viewer.updateHotspot({ name: "hotspot-6", position, normal });
  } else {
    anatomyHotspots[5].setAttribute("data-position", position);
    anatomyHotspots[5].setAttribute("data-normal", normal);
  }
  if (activePart === 5 && viewMode === "components") viewer.setAttribute("camera-target", position);
}

function lidAngleAt(name, t) {
  const closed = -Math.PI / 2;
  const ease = (v) => {
    const u = Math.max(0, Math.min(1, v));
    return u * u * u * (u * (u * 6 - 15) + 10);
  };
  let keys;
  if (name.startsWith("Lid ")) {
    keys = name.includes(" close ") || name === "Lid close off"
      ? [[0, 0], [1.55, closed]] : [[0, closed], [1.55, 0]];
  }
  if (name.startsWith("Load ")) {
    const initiallyOpen = name.endsWith(" open");
    const openedAt = initiallyOpen ? 0 : 1.30;
    const closeAt = openedAt + .16 + .58 + .75 + .58 + .15;
    keys = initiallyOpen ? [[0, 0], [closeAt, 0], [closeAt + 1.25, closed]]
      : [[0, closed], [openedAt, 0], [closeAt, 0], [closeAt + 1.25, closed]];
  }
  if (name.startsWith("Power off")) keys = name.endsWith(" open")
    ? [[0, 0], [1.80, 0]] : [[0, closed], [.55, closed], [1.80, 0]];
  if (!keys) return name === "Power on closed" || name.startsWith("Read ")
    ? closed : name === "Power on" ? 0 : state.lidOpen ? 0 : closed;
  for (let i = 1; i < keys.length; i++) {
    const [end, target] = keys[i];
    const [start, origin] = keys[i - 1];
    if (t <= end) return origin + (target - origin) * ease((t - start) / (end - start));
  }
  return keys.at(-1)[1];
}

// A single finite glTF clip drives every moving node, including the original
// glass cuvette holder. Each clip explicitly includes the entire pose.
async function playInstrumentClip(name) {
  if (!modelReady || typeof viewer.play !== "function") return;
  if (!viewer.availableAnimations?.includes(name)) {
    console.error(`Klip animasi tidak ditemukan: ${name}`);
    return;
  }
  viewer.animationCrossfadeDuration = 0;
  viewer.animationName = name;
  if (viewer.updateComplete) await viewer.updateComplete;
  viewer.currentTime = 0;
  await new Promise(resolve => {
    let finished = false;
    let fallback;
    const finish = () => {
      if (finished) return;
      finished = true;
      viewer.removeEventListener("finished", finish);
      clearTimeout(fallback);
      resolve();
    };
    viewer.addEventListener("finished", finish);
    viewer.play({ repetitions: 1 });
    const duration = Number(viewer.duration) || 2.5;
    fallback = setTimeout(finish, (duration + 1.0) * 1000);
    const follow = () => {
      if (finished) return;
      updateLidHotspot(lidAngleAt(name, viewer.currentTime || 0));
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  });
}

async function animateLid(open) {
  if (state.busy || state.lidOpen === open) return;
  state.busy = true;
  lidLabel.textContent = open ? "Membuka…" : "Menutup…";
  renderConsole();
  const clip = state.powered ? `Lid ${open ? "open" : "close"} ${state.cell}` : `Lid ${open ? "open" : "close"} off`;
  await playInstrumentClip(clip);
  state.lidOpen = open;
  updateLidHotspot(open ? 0 : -Math.PI / 2);
  state.busy = false;
  renderConsole();
}

function setCutaway(active) {
  viewerFrame.classList.toggle("is-measuring", active);
  if (!lidMaterial) return;
  // Educational cutaway: the lid stays physically closed during the scan.
  lidMaterial.setAlphaMode(active ? "BLEND" : "OPAQUE");
  lidMaterial.pbrMetallicRoughness.setBaseColorFactor(active ? [.316, .316, .316, .23] : [.316, .316, .316, 1]);
}

async function setPower(on) {
  if (state.busy || state.powered === on) return false;
  state.busy = true;
  focusOperation("power");
  setStatus(on ? "Menekan tombol Power pada model…" : "Mematikan alat dan membuka penutup…", on ? "POWER ON" : "POWER OFF", on ? "BOOTING…" : "SHUTDOWN…");
  renderConsole();
  const clip = on ? (state.lidOpen ? "Power on" : "Power on closed")
    : `Power off ${state.cell} ${state.lidOpen ? "open" : "closed"}`;
  await playInstrumentClip(clip);
  state.powered = on;
  state.blankAt = null;
  state.reading = null;
  if (!on) {
    state.cell = "sample";
    state.lidOpen = true;
    setCutaway(false);
    updateLidHotspot(0);
  }
  state.busy = false;
  setStatus(on ? "Alat siap. Atur panjang gelombang, lalu tekan Blank." : "Alat mati. Tekan Power untuk memulai.",
    on ? "BLANK DIPERLUKAN" : "OFFLINE", on ? "TEKAN BLANK" : "SISTEM MATI");
  renderConsole();
  return true;
}

// Illustrative visible absorption maximum near 540 nm and a weaker UV band.
function sampleAbsorbance(nm) {
  const gaussian = (center, spread) => Math.exp(-.5 * ((nm - center) / spread) ** 2);
  const noise = (Math.random() - .5) * .008;
  return Math.max(0, Math.min(2.5, .028 + 1.18 * gaussian(540, 61) + .23 * gaussian(312, 42) + noise));
}

async function blankProcedure() {
  if (!state.powered || state.busy) return false;
  state.busy = true;
  state.blankAt = null;
  state.reading = null;
  focusOperation("blank");
  setStatus("Membuka penutup, mengangkat kuvet blank, lalu menggeser dudukan…", "PASANG BLANK", "MEMASANG BLANK");
  renderConsole();
  await playInstrumentClip(`Load blank from ${state.cell} ${state.lidOpen ? "open" : "closed"}`);
  state.cell = "blank";
  state.lidOpen = false;
  updateLidHotspot(-Math.PI / 2);
  setStatus("Penutup tertutup. Cahaya melewati blank untuk menetapkan baseline…", "KALIBRASI", "BLANKING…");
  renderConsole();
  setCutaway(true);
  await playInstrumentClip("Read blank");
  setCutaway(false);
  state.blankAt = state.wavelength;
  state.reading = 0;
  state.busy = false;
  setStatus(`Blank selesai pada ${state.wavelength} nm. Tekan Ukur untuk mengganti kuvet dengan sampel.`, "SIAP UKUR", "BASELINE TERSIMPAN");
  renderConsole();
  return true;
}

async function measureProcedure() {
  if (!state.powered || state.busy || state.blankAt !== state.wavelength) return false;
  state.busy = true;
  state.reading = null;
  focusOperation("measure");
  setStatus("Membuka penutup, mengangkat kuvet sampel, lalu menempatkannya…", "PASANG SAMPEL", "MEMASANG SAMPEL");
  renderConsole();
  await playInstrumentClip(`Load sample from ${state.cell} ${state.lidOpen ? "open" : "closed"}`);
  state.cell = "sample";
  state.lidOpen = false;
  updateLidHotspot(-Math.PI / 2);
  const result = sampleAbsorbance(state.wavelength);
  const transmittance = 10 ** -result;
  if (transmittedMaterial) transmittedMaterial.setEmissiveFactor([.08 + .92 * transmittance, .05 + .4 * transmittance, .01]);
  setStatus("Mengukur… Cahaya diteruskan sampel dan diterima fotodioda.", "MENGUKUR", "MEMBACA SAMPEL…");
  renderConsole();
  setCutaway(true);
  await playInstrumentClip("Read sample");
  setCutaway(false);
  state.reading = result;
  state.busy = false;
  setStatus(`Pengukuran selesai pada ${state.wavelength} nm. Hasil tampil pada LCD model.`, "SELESAI", "HASIL TERSEDIA");
  renderConsole();
  return true;
}

async function runDemo() {
  if (state.demoRunning) { state.stopDemo = true; demoButton.textContent = "Menghentikan setelah langkah ini…"; return; }
  if (!modelReady || state.busy) return;
  setViewMode("simulation");
  state.demoRunning = true;
  state.stopDemo = false;
  renderConsole();
  try {
    if (!state.powered) await setPower(true);
    if (!state.stopDemo) await blankProcedure();
    if (!state.stopDemo) await measureProcedure();
  } finally {
    state.demoRunning = false;
    state.stopDemo = false;
    renderConsole();
  }
}

// All controls call the same operations, whether pressed on the model or
// on the hardware-style console beneath it.
ui.power.addEventListener("click", () => { setViewMode("simulation"); void setPower(!state.powered); });
actionHotspots.power.addEventListener("click", event => { event.stopPropagation(); void setPower(!state.powered); });
ui.blank.addEventListener("click", () => { setViewMode("simulation"); void blankProcedure(); });
actionHotspots.blank.addEventListener("click", event => { event.stopPropagation(); void blankProcedure(); });
ui.measure.addEventListener("click", () => { setViewMode("simulation"); void measureProcedure(); });
actionHotspots.measure.addEventListener("click", event => { event.stopPropagation(); void measureProcedure(); });
ui.slider.addEventListener("input", event => {
  state.wavelength = Number(event.target.value);
  state.blankAt = null;
  state.reading = null;
  setStatus(`Panjang gelombang ${state.wavelength} nm. Lakukan Blank ulang.`, "BLANK DIPERLUKAN", "TEKAN BLANK");
  renderConsole();
});
ui.modeAbs.addEventListener("click", () => { state.mode = "abs"; renderConsole(); });
ui.modeTrans.addEventListener("click", () => { state.mode = "trans"; renderConsole(); });
lidToggle.addEventListener("click", () => { void animateLid(!state.lidOpen); });
demoButton.addEventListener("click", () => { void runDemo(); });
document.querySelector("#view-components").addEventListener("click", () => setViewMode("components"));
document.querySelector("#view-simulator").addEventListener("click", () => setViewMode("simulation"));
document.querySelector("#reset-view").addEventListener("click", resetView);
document.querySelector("#previous-part").addEventListener("click", () => focusPart(activePart < 0 ? 6 : activePart - 1));
document.querySelector("#next-part").addEventListener("click", () => focusPart(activePart + 1));

for (const [index, button] of anatomyHotspots.entries()) {
  button.addEventListener("click", event => { event.stopPropagation(); focusPart(index); });
}
let pointerStart = null;
viewer.addEventListener("pointerdown", event => {
  if (event.composedPath().some(node => node instanceof HTMLElement && (node.classList.contains("hotspot") || node.classList.contains("action-hotspot")))) return;
  pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
viewer.addEventListener("pointerup", event => {
  if (!pointerStart || pointerStart.id !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (moved < 7 && !event.composedPath().some(node => node instanceof HTMLElement && (node.classList.contains("hotspot") || node.classList.contains("action-hotspot")))) resetView();
});
viewer.addEventListener("pointercancel", () => { pointerStart = null; });

viewer.addEventListener("load", () => {
  modelReady = true;
  viewerLoading.hidden = true;
  displayMaterial = viewer.model?.materials?.find(material => material.name === "LiveInstrumentLCD") || null;
  lidMaterial = viewer.model?.materials?.find(material => material.name === "LidShellCutaway") || null;
  transmittedMaterial = viewer.model?.materials?.find(material => material.name === "TransmittedBeam") || null;
  renderConsole();
});
viewer.addEventListener("error", () => {
  loadingMessage.textContent = "Model 3D tidak dapat dimuat. Periksa berkas dan muat ulang halaman.";
  viewerLoading.querySelector(".loading-spinner").hidden = true;
});
window.setTimeout(() => {
  if (!modelReady && !customElements.get("model-viewer")) {
    loadingMessage.textContent = "Viewer 3D belum tersedia. Periksa koneksi internet, lalu muat ulang.";
    viewerLoading.querySelector(".loading-spinner").hidden = true;
  }
}, 12000);
renderConsole();
