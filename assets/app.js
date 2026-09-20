"use strict";

const $ = (id) => document.getElementById(id);
const state = {
  astros: { number: 0, people: [] },
  neo: null,
  solar: null,
  apod: null,
  neoAvg: null,
  issMap: null,
  busy: false,
  lastSync: null,
  voiceEnabled: localStorage.getItem("evaNexusVoice") !== "off",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const LOADER_HTML = `
  <div class="jload">
    <div class="jload-ring"></div>
    <div class="jload-txt">
      <span>J.A.R.V.I.S. INITIALIZING NASA CORE...</span>
      <span>CONNECTING TO PUBLIC NASA DATA SERVICES...</span>
      <span>LOADING PUBLIC SPACE DATA...</span>
    </div>
  </div>`;

const STATIC_NASA_KEY = localStorage.getItem("evaNexusNASAKey") || "DEMO_KEY";
const NASA_API = "https://api.nasa.gov";
const EONET_API = "https://eonet.gsfc.nasa.gov/api/v3";
const ISS_API = "https://api.wheretheiss.at/v1";

async function fetchJSON(url, label) {
  const r = await fetch(url, { cache: "no-store" });
  let body = {};
  try { body = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(`${label} failed (${r.status})`);
  return body;
}

async function fetchFeed(name) {
  switch (name) {
    case "apod": {
      const d = await fetchJSON(`${NASA_API}/planetary/apod?api_key=${encodeURIComponent(STATIC_NASA_KEY)}`, "NASA APOD");
      return { media_type: d.media_type, url: d.url, title: d.title || "", date: d.date || "", explanation: (d.explanation || "").slice(0, 400), source: "NASA APOD" };
    }
    case "neo": {
      const end = new Date();
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 6);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const d = await fetchJSON(`${NASA_API}/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${encodeURIComponent(STATIC_NASA_KEY)}`, "NASA NeoWs");
      const byDay = d.near_earth_objects || {};
      const today = endDate;
      const objects = byDay[today] || [];
      const digest = [];
      for (const o of objects) {
        try {
          const approach = (o.close_approach_data || [])[0];
          if (!approach) continue;
          digest.push({
            name: String(o.name || "Unknown").replace(/[()]/g, "").trim(),
            dist_km: Math.round(Number(approach.miss_distance.kilometers)),
            speed_kph: Math.round(Number(approach.relative_velocity.kilometers_per_hour)),
            hazardous: Boolean(o.is_potentially_hazardous_asteroid),
            designation: o.neo_reference_id || "",
          });
        } catch (_) {}
      }
      digest.sort((a, b) => a.dist_km - b.dist_km);
      const counts = Object.values(byDay).map(v => Array.isArray(v) ? v.length : 0);
      const avg = counts.length ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10 : null;
      return {
        date: today,
        count: Number(d.element_count || objects.length),
        hazardous: objects.filter(o => Boolean(o.is_potentially_hazardous_asteroid)).length,
        closest_name: digest[0]?.name || "N/A",
        closest_km: digest[0]?.dist_km || 0,
        objects: digest.slice(0, 5),
        avg,
        source: "NASA NeoWs",
      };
    }
    case "neo_trend":
      return { avg: state.neoAvg };
    case "solar": {
      // NASA's CCMC/DONKI endpoint is currently hosted at api.nasa.gov; NASA has announced a base-URL migration effective Sept. 30, 2026.
      const d = await fetchJSON(`${NASA_API}/DONKI/FLR?startDate=${daysAgo(7)}&endDate=${utcToday()}&api_key=${encodeURIComponent(STATIC_NASA_KEY)}`, "NASA DONKI");
      const flares = Array.isArray(d) ? d : [];
      const rank = c => ({ X: 4, M: 3, C: 2, B: 1 }[(c || " ")[0]] || 0);
      const strongest = flares.reduce((best, f) => rank(f.classType) > rank(best) ? f.classType : best, "");
      const latest = flares[flares.length - 1] || {};
      return { count: flares.length, class: latest.classType || "—", strongest: strongest || "—", peak: latest.peakTime || "", active: flares.length > 0, source: "NASA DONKI" };
    }
    case "iss": {
      const d = await fetchJSON(`${ISS_API}/satellites/25544?units=kilometers`, "ISS position feed");
      return { lat: Number(d.latitude), lon: Number(d.longitude), altitude_km: Number(d.altitude), speed_kph: Number(d.velocity), source: "Where the ISS at?" };
    }
    case "earth_events": {
      const d = await fetchJSON(`${EONET_API}/events?limit=6&status=open`, "NASA EONET");
      return (d.events || []).map(e => ({ title: e.title, cat: e.categories?.[0]?.title || "Other", closed: e.closed || null, source: "NASA EONET" }));
    }
    case "astros":
      // Open Notify is HTTP-only, so GitHub Pages cannot safely call it from an HTTPS page. Do not substitute stale or invented crew data.
      return { number: null, people: [], source: "Unavailable in static mode" };
    default:
      throw new Error(`Unknown static feed: ${name}`);
  }
}

function utcToday() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function liveContext() {
  const parts = [];
  if (state.astros.number) parts.push(`${state.astros.number} humans in space (${state.astros.people.join(", ")}).`);
  if (state.neo) parts.push(`${state.neo.count} near-Earth objects tracked today, ${state.neo.hazardous} potentially hazardous.`);
  if (state.solar) parts.push(`Solar activity: ${state.solar.count} flares in the last 7 days, strongest ${state.solar.strongest || state.solar.class || "nominal"}.`);
  if (state.apod) parts.push(`NASA APOD: ${state.apod.title} (${state.apod.date}).`);
  return parts.join(" ") || "Telemetry is still synchronizing.";
}

let localGenerator = null;
let localGeneratorPromise = null;

async function getLocalGenerator() {
  if (localGenerator) return localGenerator;
  if (localGeneratorPromise) return localGeneratorPromise;

  localGeneratorPromise = (async () => {
    addChat("JARVIS", `<div class="ai-loading"><span class="jload-ring"></span><div><b>LOCAL AI CORE</b><br><small>Loading Qwen2.5-0.5B-Instruct locally · first launch may take a while...</small></div></div>`);
    try {
      const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm");
      const model = "onnx-community/Qwen2.5-0.5B-Instruct";
      localGenerator = await pipeline("text-generation", model, {
        dtype: "q4",
        device: navigator.gpu ? "webgpu" : "wasm",
      });
      return localGenerator;
    } catch (firstError) {
      console.warn("WebGPU model load failed; retrying with WASM.", firstError);
      try {
        const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm");
        localGenerator = await pipeline("text-generation", "onnx-community/Qwen2.5-0.5B-Instruct", {
          dtype: "q4",
          device: "wasm",
        });
        return localGenerator;
      } catch (secondError) {
        localGeneratorPromise = null;
        throw secondError;
      }
    }
  })();
  return localGeneratorPromise;
}

function normalizeAIReply(text, prompt) {
  let reply = String(text || "")
    .replace(/<\|assistant\|>|<\|user\|>|<\|system\|>/gi, "")
    .replace(/^(J\.A\.R\.V\.I\.S\.?\s*[:\-]|assistant\s*[:\-])\s*/i, "")
    .trim();

  // The tiny local model can occasionally enter a repetition loop or switch scripts.
  const cjk = (reply.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const words = reply.toLowerCase().split(/\s+/).filter(Boolean);
  const repeated = words.length > 8 && words.some((w, i) => words[i + 1] === w && words[i + 2] === w);
  const malformed = cjk >= 3 || repeated;

  if (malformed) return deterministicAnswer(prompt) || "The local AI core produced an unstable generation. Please transmit the question again, Commander.";
  if (reply.length > 700) reply = reply.slice(0, 697).replace(/\s+\S*$/, "") + "…";
  return reply || deterministicAnswer(prompt) || "No usable response returned, Commander.";
}

function deterministicAnswer(prompt) {
  const p = String(prompt || "").toLowerCase().trim();
  if (/\bwhat is nasa\b|\bwhat does nasa stand for\b|\bwhat's nasa\b/.test(p)) {
    return "NASA is the United States National Aeronautics and Space Administration. It leads civilian space exploration, aeronautics research, Earth science, and a range of robotic and human spaceflight missions.";
  }
  if (/\bwho (made|created|built) you\b|\bwho is your creator\b/.test(p)) {
    return "I am J.A.R.V.I.S., the mission intelligence interface in EVA NEXUS, designed and built by Eva.";
  }
  if (/\b(graphic designer|graphic design|visual designer|visual design|design career|designer)\b/.test(p) && /\bnasa\b/.test(p)) {
    return "Yes, design-related work can be part of a NASA career. NASA has communications and public-relations roles, and federal vacancies can also use visual-information or related design classifications; the exact title and requirements vary by vacancy. Check current NASA and USAJOBS listings for graphic design, visual information, communications, multimedia, and public-affairs roles.";
  }
  if (/\bhow (do|can) i (work|join|get a job|get hired) at nasa\b|\bwork at nasa\b|\bjoin nasa\b/.test(p)) {
    return "NASA hires across many fields, including communications and public relations as well as science, engineering, IT, and business. Civil-service openings are posted through USAJOBS, while NASA also offers student programs such as Pathways and OSTEM internships.";
  }
  if (/\b(coding|programming|software|software engineer|developer|computer science|python|javascript|c\+\+|java|web development|api|machine learning|ai|artificial intelligence)\b/.test(p) && /\bnasa\b/.test(p)) {
    return "Absolutely. Software and computing support many NASA activities, including mission operations, flight and ground software, data processing, simulations, scientific research, robotics, Earth-observation systems, and web applications. NASA-related coding can involve languages such as Python, C++, JavaScript, and other tools depending on the mission and team.";
  }
  if (/\b(what can i do|what jobs|what careers|what roles)\b/.test(p) && /\bnasa\b/.test(p)) {
    return "NASA work spans science, engineering, software, AI and data, robotics, design, communications, education, operations, business, and many other specialties. The exact roles and requirements depend on the specific NASA center, contractor, internship, or federal vacancy.";
  }
  if (/\bhow.*(code|program|learn.*coding|become.*software|software engineer)\b/.test(p) && /\bnasa\b/.test(p)) {
    return "A strong NASA-oriented software path can include Python, C or C++, data structures and algorithms, Git, Linux, APIs, testing, and a few substantial projects. You can also build space-focused projects such as telemetry dashboards, orbital-data tools, simulations, robotics software, or scientific data visualizations.";
  }
  if (/\bwhat is a neo\b|\bwhat are neos\b|\bnear.?earth object/.test(p)) {
    return "A near-Earth object, or NEO, is an asteroid or comet whose orbit brings it relatively close to Earth's orbital neighborhood. NASA tracks these objects to improve scientific understanding and planetary-defense monitoring.";
  }
  if (/\bstatus\b|\bhow are we doing\b|\bcurrent telemetry\b/.test(p)) {
    const n = state.neo?.count ?? 0;
    const h = state.neo?.hazardous ?? 0;
    const crew = Number.isFinite(state.astros?.number) ? state.astros.number : null;
    const solar = state.solar?.count ?? 0;
    return `Telemetry is synchronized: ${n} near-Earth objects tracked today, ${h} flagged as potentially hazardous, ${crew === null ? "crew data unavailable in static mode" : `${crew} humans reported in space`}, and ${solar} solar flares recorded over the last seven days.`;
  }
  return null;
}

async function askJarvis(prompt, displayLabel) {
  if (state.busy) return;
  state.busy = true;
  addChat("COMMANDER", esc(displayLabel || prompt));
  const thinking = addChat("JARVIS", LOADER_HTML);
  try {
    const deterministic = deterministicAnswer(prompt);
    let reply = deterministic;

    if (!reply) {
      const generator = await getLocalGenerator();
      const system = `You are J.A.R.V.I.S., the general-purpose NASA mission and technology intelligence assistant in EVA NEXUS, created by Eva.\n` +
        `Your knowledge scope is broad: you can discuss NASA and topics connected to NASA, including spaceflight, rockets, spacecraft, satellites, astronomy, astrophysics, planetary science, Earth science, climate and weather satellites, aeronautics, robotics, AI and machine learning, software engineering, web development, cybersecurity, data science, simulations, scientific computing, mission operations, telemetry, flight software, ground systems, databases, APIs, visualization, graphic and UX design, communications, public affairs, education, internships, student programs, careers, salaries and qualifications in general terms, and the many roles that support NASA missions.\n` +
        `You may answer coding questions and explain or write example code when asked. You may discuss how software, AI, engineering, design, science, business, communications, and other professions are used at NASA. You are not limited to mission telemetry. If a question is about NASA, a NASA-related field, or a career/technology topic relevant to NASA, answer it normally. If the question is unrelated to NASA, you may still answer it briefly when it is useful, but keep your identity centered on NASA and technology.\n` +
        `Do not refuse ordinary NASA, career, education, coding, design, science, or technology questions. Do not say that a topic is outside your scope unless it is genuinely unrelated and unsafe or impossible to answer. If you are uncertain about a current NASA fact, say that the exact current detail should be checked against NASA or USAJOBS rather than inventing it.\n` +
        `Address the user as Commander. Use plain English. Keep answers concise but useful, normally 2-5 short sentences. For coding questions, you may provide a short code example when appropriate. Never output Chinese, Japanese, Korean, Arabic, role tags, or accidental repetition.\n` +
        `LIVE TELEMETRY: ${liveContext()}`;
      const output = await generator([
        { role: "system", content: system },
        { role: "user", content: String(prompt) },
      ], {
        max_new_tokens: 96,
        do_sample: false,
        repetition_penalty: 1.15,
        no_repeat_ngram_size: 3,
      });
      const generated = output?.[0]?.generated_text;
      if (Array.isArray(generated)) reply = generated[generated.length - 1]?.content || "";
      else reply = String(generated || "");
      reply = normalizeAIReply(reply, prompt);
    }

    thinking.querySelector(".chat-bbl").innerHTML = esc(reply).replace(/\n/g, "<br>");
    speak(reply);
  } catch (e) {
    console.error(e);
    const fallback = deterministicAnswer(prompt) || "Local AI core could not initialize. Confirm the site is running from http://localhost:8899 and that your browser supports WebAssembly.";
    thinking.querySelector(".chat-bbl").textContent = fallback;
    speak(fallback);
  } finally {
    state.busy = false;
  }
}

function addChat(speaker, html) {
  const log = $("chatlog");
  const row = document.createElement("div");
  row.className = "chat-row";
  if (speaker === "COMMANDER") {
    row.innerHTML = `<div class="chat-sndr su">COMMANDER</div><div class="chat-bbl cbu">${html}</div>`;
  } else {
    row.innerHTML = `<div class="chat-sndr sj">J.A.R.V.I.S.</div><div class="chat-bbl cbj">${html}</div>`;
  }
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
  return row;
}

function speak(text) {
  if (!state.voiceEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]*>/g, " "));
  const load = () => {
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => /en-GB/i.test(x.lang)) || voices.find((x) => /Daniel|Arthur|Google UK English/i.test(x.name));
    if (v) u.voice = v;
    u.lang = "en-GB";
    u.rate = 1.02;
    u.pitch = 0.88;
    u.volume = 1.0;
    if (state.voiceEnabled) window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
  } else load();
}

function updateVoiceButton() {
  const btn = $("voicebtn");
  if (!btn) return;
  btn.innerHTML = `<span>${state.voiceEnabled ? "◉" : "○"}</span>VOICE ${state.voiceEnabled ? "ON" : "OFF"}`;
  btn.classList.toggle("voice-off", !state.voiceEnabled);
  btn.setAttribute("aria-pressed", String(state.voiceEnabled));
  btn.title = state.voiceEnabled ? "JARVIS voice responses are enabled" : "JARVIS voice responses are muted";
}

function initVoiceToggle() {
  updateVoiceButton();
  $("voicebtn")?.addEventListener("click", () => {
    state.voiceEnabled = !state.voiceEnabled;
    localStorage.setItem("evaNexusVoice", state.voiceEnabled ? "on" : "off");
    if (!state.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
    updateVoiceButton();
    addChat("JARVIS", `<b>VOICE LINK ${state.voiceEnabled ? "ENABLED" : "MUTED"}</b><br><small>${state.voiceEnabled ? "Audio responses are active." : "JARVIS will remain silent while responding."}</small>`);
  });
}

function initMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $("micbtn");
  if (!btn) return;
  if (!SR) { btn.style.display = "none"; return; }
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let listening = false;
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (text) askJarvis(text);
  };
  rec.onend = () => { listening = false; btn.classList.remove("listening"); };
  rec.onerror = () => { listening = false; btn.classList.remove("listening"); };
  btn.addEventListener("click", () => {
    if (listening) { rec.stop(); return; }
    window.speechSynthesis?.cancel();
    listening = true;
    btn.classList.add("listening");
    rec.start();
  });
}

function showTelemetryDashboard() {
  const a = state.neo || { count: 0, hazardous: 0, closest_name: "N/A", closest_km: 0, objects: [] };
  const s = state.solar || { count: 0, class: "—", strongest: "—", active: false };
  const crew = Number.isFinite(state.astros?.number) ? state.astros.number : null;
  const synced = state.lastSync ? new Date(state.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  const monitoring = a.hazardous > 0 ? "PHA DESIGNATIONS PRESENT" : "NO PHA DESIGNATIONS IN FEED";
  const threatClass = a.hazardous > 0 ? "telemetry-warn" : "telemetry-ok";
  const objectRows = (a.objects || []).slice(0, 4).map((o, i) => `
    <div class="telemetry-row">
      <span class="tr-id">0${i + 1}</span>
      <span class="tr-name">${esc(o.name)}</span>
      <span>${o.dist_km.toLocaleString()} KM</span>
      <span class="tr-speed">${o.speed_kph.toLocaleString()} KM/H</span>
      <span class="${o.hazardous ? "tr-danger" : "tr-safe"}">${o.hazardous ? "HAZ" : "NOM"}</span>
    </div>`).join("");

  $("display").innerHTML = `
    <div class="telemetry-dashboard">
      <div class="td-hero">
        <div class="radar-scope"><div class="radar-sweep"></div><i></i><span></span></div>
        <div class="td-hero-copy">
          <div class="slbl">LIVE TELEMETRY // MULTI-SOURCE RELAY</div>
          <h3>PUBLIC SPACE DATA RELAY</h3>
          <p>Live public feeds are displayed with their source and update status. Derived values are calculated by EVA NEXUS; they are not NASA mission-control telemetry.</p>
          <div class="td-sync"><i></i>LAST SYNC ${synced} UTC <b>·</b> AUTO-REFRESH 15 MIN</div>
        </div>
      </div>
      <div class="td-grid">
        <div class="td-card"><span>NEAR-EARTH OBJECTS</span><strong>${a.count}</strong><small>${a.hazardous} PHA designations in feed</small><div class="td-bar"><i style="width:${Math.min(100, Math.max(8, a.count / 4))}%"></i></div></div>
        <div class="td-card"><span>PEOPLE IN SPACE</span><strong>${crew === null ? "—" : crew}</strong><small>${crew === null ? "Unavailable in static mode" : "Third-party crew feed"}</small><div class="td-bar violet"><i style="width:${crew === null ? 8 : Math.min(100, Math.max(8, crew * 5))}%"></i></div></div>
        <div class="td-card"><span>SOLAR FLARES · 7D</span><strong>${s.count}</strong><small>Strongest recorded: ${esc(s.strongest || s.class)}</small><div class="td-bar amber"><i style="width:${Math.min(100, Math.max(8, s.count * 6))}%"></i></div></div>
        <div class="td-card"><span>CLOSEST APPROACH</span><strong>${a.closest_km ? a.closest_km.toLocaleString() : "—"}</strong><small>${esc(a.closest_name)} · KM</small><div class="td-bar green"><i style="width:72%"></i></div></div>
      </div>
      <div class="td-status-line"><span class="${threatClass}"><i></i> NEO MONITOR: ${monitoring}</span><span>APOD: ${esc(state.apod?.title || "AWAITING IMAGE")}</span></div>
      <div class="telemetry-table-head"><span>TRACKED OBJECT</span><span>APPROACH</span><span>VELOCITY</span><span>STATUS</span></div>
      <div class="telemetry-table">${objectRows || `<div class="telemetry-empty">NO OBJECT TABLE AVAILABLE — SELECT SYNC TELEMETRY TO RETRY</div>`}</div>
    </div>`;
}

function showImage(label, url, caption) {
  $("display").innerHTML = `
    <span class="slbl">${esc(label)}</span>
    <img src="${esc(url)}" alt="${esc(label)}" loading="lazy">
    ${caption ? `<p class="dcapt">${esc(caption)}</p>` : ""}`;
}

function showISS(lat, lon) {
  $("display").innerHTML = `
    <span class="slbl">ISS ORBITAL TRACKER — REAL-TIME POSITION</span>
    <div id="issmap"></div>
    <p class="dcapt">ISS POSITION · ${lat.toFixed(2)}° · ${lon.toFixed(2)}° · SOURCE: WHERE THE ISS AT? · THIRD-PARTY TRACKING</p>`;
  if (typeof L === "undefined") return;
  if (state.issMap) { try { state.issMap.remove(); } catch (_) {} }
  const map = L.map("issmap", { zoomControl: false, attributionControl: false }).setView([lat, lon], 2);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 8 }).addTo(map);
  L.circleMarker([lat, lon], { radius: 9, color: "#0EA5E9", weight: 2, fillColor: "#38BDF8", fillOpacity: 0.85 }).addTo(map).bindTooltip(`ISS ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
  state.issMap = map;
}

function showEarthEvents(events) {
  const catCss = { "Wildfires": "ec-fire", "Severe Storms": "ec-storm", "Volcanoes": "ec-vol" };
  $("display").innerHTML = `<span class="slbl">EONET — NASA ACTIVE EARTH EVENTS</span>${events.map((ev) => `
    <div class="ev-card"><span class="ev-cat ${catCss[ev.cat] || "ec-def"}">${esc(ev.cat)}</span><span class="ev-ttl">${esc(ev.title)}</span></div>`).join("")}`;
}

function showRadar() {
  const a = state.neo || { count: 0, hazardous: 0, objects: [] };
  const s = state.solar || { count: 0, class: "—", strongest: "—", active: false };
  const threatColor = a.hazardous > 0 ? "#F87171" : "#34D399";
  const threatWord = a.hazardous > 0 ? "PHA MONITORING" : "NO PHA IN FEED";
  const objects = (a.objects || []).slice(0, 5);
  const cards = objects.length ? objects.map((o) => `
    <div class="ast-card"><div class="ast-name">${esc(o.name)}</div><div class="ast-data"><span>${o.dist_km.toLocaleString()} km</span><span>${o.speed_kph.toLocaleString()} km/h</span><span class="ast-badge ${o.hazardous ? "ast-haz" : "ast-safe"}">${o.hazardous ? "PHA" : "NOT PHA"}</span></div></div>`).join("") : `<div class="starfield"><div class="sf-center"><div class="sf-txt">DEEP SPACE SCAN ACTIVE</div><div class="sf-sub">No object rows returned — synchronize telemetry again.</div></div></div>`;
  $("display").innerHTML = `
    <span class="slbl">NEOWS — NEAR-EARTH OBJECT MONITOR</span>
    <div class="tiles">
      <div class="tile"><div class="tile-lbl">Objects Today</div><div class="tile-val" style="color:#38BDF8;">${a.count}</div><div class="tile-sub">Near-Earth flyby</div></div>
      <div class="tile"><div class="tile-lbl">PHA DESIGNATIONS</div><div class="tile-val" style="color:${threatColor};">${a.hazardous}</div><div class="tile-sub" style="color:${threatColor};opacity:.7;">${threatWord}</div></div>
      <div class="tile"><div class="tile-lbl">Solar Flares 7D</div><div class="tile-val" style="color:${s.active ? "#FBBF24" : "#34D399"};">${s.count}</div><div class="tile-sub">${s.active ? "Class " + esc(s.class) : "Nominal"}</div></div>
    </div>
    <span class="slbl">CLOSEST APPROACH — TODAY</span>${cards}`;
}

function renderStatus() {
  const a = state.neo;
  const s = state.solar;
  const hazardous = a?.hazardous || 0;
  if (a) {
    $("ms-neo").textContent = a.count;
    $("ms-neo-status").textContent = `${hazardous} PHA designations`;
    $("ms-neo-trend").textContent = state.neoAvg ? `${a.count > state.neoAvg * 1.15 ? "ABOVE" : a.count < state.neoAvg * 0.85 ? "BELOW" : "NEAR"} 7D AVG (${state.neoAvg}/day)` : "7D BASELINE";
  }
  const crew = Number.isFinite(state.astros?.number) ? state.astros.number : null;
  $("ms-crew").textContent = crew;
  $("ms-crew-level").textContent = crew === null ? "STATIC MODE" : "THIRD-PARTY FEED";
  $("ms-crew-status").textContent = crew === null ? "CREW DATA UNAVAILABLE" : "THIRD-PARTY SOURCE";
  if (s) {
    $("ms-solar").textContent = s.count;
    $("ms-solar-status").textContent = `STRONGEST ${s.strongest || s.class || "—"}`;
    $("ms-solar-detail").textContent = s.active ? `LATEST ${s.class || "—"}` : "NO FLARES IN FEED";
  }
}

function tickClock() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  $("ms-clock").textContent = `${hh}:${mm}:${ss}`;
  $("ms-date").textContent = `${now.toISOString().slice(0, 10)} · MISSION CLOCK`;
  const pc = $("pill-clock");
  if (pc) pc.textContent = `${hh}:${mm} UTC`;
}

const DIRECTIVES = {
  async apod() {
    const apod = await fetchFeed("apod");
    state.apod = apod;
    if (apod?.media_type === "image") showImage("NASA ASTRONOMY PICTURE OF THE DAY", apod.url, `${apod.title} · ${apod.date}`);
    return { prompt: `Special Directive: Optical Briefing. Title: ${apod.title}. Detail: ${apod.explanation}`, label: "Requesting Deep Space Optical Briefing..." };
  },
  async mars() {
    $("display").innerHTML = `<span class="slbl">MARS — ARCHIVED API NOTICE</span><div class="telemetry-empty">NASA's Mars Rover API is archived. EVA NEXUS intentionally does not present this source as live telemetry.<br><br>SOURCE STATUS: ARCHIVED</div>`;
    return { prompt: "Explain that NASA's Mars Rover API is archived and that this dashboard intentionally does not label it as live data.", label: "Checking Mars feed status..." };
  },
  async neo() {
    const [ast, sol] = await Promise.all([fetchFeed("neo"), fetchFeed("solar")]);
    state.neo = ast; state.solar = sol; renderStatus(); showRadar();
    return { prompt: `Special Directive: Planetary defense correlation. ${ast.count} NEOs today, ${ast.hazardous} potentially hazardous. Closest is ${ast.closest_name} at ${ast.closest_km.toLocaleString()} km. Solar activity: ${sol.count} flares over 7 days, strongest ${sol.strongest}. Give a 3-sentence telemetry assessment.`, label: "Correlating Near-Earth Object Data..." };
  },
  async iss() {
    const pos = await fetchFeed("iss"); showISS(pos.lat, pos.lon);
    return { prompt: `Special Directive: ISS position. Latitude ${pos.lat.toFixed(2)}, longitude ${pos.lon.toFixed(2)}. Give a 2-sentence orbital position report.`, label: "Executing ISS Live Position Scan..." };
  },
  async solar() {
    const sol = await fetchFeed("solar"); state.solar = sol; renderStatus();
    return { prompt: `Special Directive: Solar activity. ${sol.count} flare events in the requested seven-day window. Latest recorded class ${sol.class}, strongest recorded class ${sol.strongest}. Give a 2-sentence space-weather briefing without calling the flare count a threat level.`, label: "Analyzing Solar Activity Data..." };
  },
  async earth() {
    const events = await fetchFeed("earth_events");
    if (events?.length) {
      showEarthEvents(events);
      return { prompt: `Special Directive: EONET Earth Monitoring. Active events: ${events.map((e) => `${e.title} (${e.cat})`).join("; ")}. Give a 3-sentence Earth observation briefing.`, label: "Scanning Earth Events Monitor..." };
    }
    return { prompt: "Special Directive: EONET shows no active natural events. Give a one-sentence all-clear.", label: "Scanning Earth Events Monitor..." };
  },
};

async function runDirective(dir) {
  if (!DIRECTIVES[dir] || state.busy) return;
  try {
    const result = await DIRECTIVES[dir]();
    if (result) await askJarvis(result.prompt, result.label);
  } catch (e) {
    showError(e.message);
  }
}

function initDirectives() {
  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.dir === "close") return;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
      await runDirective(btn.dataset.dir);
    });
  });
}

function showError(msg) {
  const banner = $("errbanner");
  if (!banner) return;
  banner.textContent = msg;
  banner.classList.add("show");
  setTimeout(() => banner.classList.remove("show"), 12000);
}

async function syncTelemetry({ silent = false } = {}) {
  if (state.busy) return;
  try {
    if (!silent) $("display").innerHTML = LOADER_HTML;
    const results = await Promise.allSettled([
      fetchFeed("astros"), fetchFeed("neo"), fetchFeed("solar"), fetchFeed("apod"), fetchFeed("neo_trend"),
    ]);
    const [astros, neo, solar, apod, trend] = results;
    if (astros.status === "fulfilled") state.astros = astros.value;
    if (neo.status === "fulfilled") { state.neo = neo.value; state.neoAvg = neo.value.avg; }
    if (solar.status === "fulfilled") state.solar = solar.value;
    if (apod.status === "fulfilled") state.apod = apod.value;
    if (trend.status === "fulfilled") state.neoAvg = trend.value.avg;
    state.lastSync = Date.now();
    renderStatus();
    showTelemetryDashboard();
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) showError(`${failed.length} telemetry feed${failed.length > 1 ? "s" : ""} did not respond. Available feeds remain online.`);
    if (!silent) addChat("JARVIS", `<b>TELEMETRY SYNC COMPLETE</b><br>${liveContext()}`);
  } catch (e) {
    showError(e.message);
    if (!state.neo && !state.astros.number) showTelemetryDashboard();
  }
}

function initRefresh() {
  $("refreshbtn")?.addEventListener("click", () => syncTelemetry());
  setInterval(() => syncTelemetry({ silent: true }), 900000);
}

function initCommandPalette() {
  const overlay = $("commandOverlay");
  const input = $("commandSearch");
  const open = () => { overlay.classList.add("open"); input?.focus(); };
  const close = () => overlay.classList.remove("open");
  $("commandbtn")?.addEventListener("click", open);
  $("closeCommand")?.addEventListener("click", close);
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  input?.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll("#commandList button").forEach((b) => b.style.display = b.textContent.toLowerCase().includes(q) ? "flex" : "none");
  });
  document.querySelectorAll("#commandList button[data-dir]").forEach((b) => b.addEventListener("click", async () => { close(); await runDirective(b.dataset.dir); }));
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    if (e.key === "Escape") close();
  });
}

function initPromptChips() {
  document.querySelectorAll(".prompt-chip").forEach((btn) => btn.addEventListener("click", () => askJarvis(btn.dataset.prompt)));
}

function initMatrix() {
  const canvas = $("matrix");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, cols = 0, drops = [];
  const resize = () => {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cols = Math.ceil(window.innerWidth / 22);
    drops = Array.from({ length: cols }, () => Math.random() * -40);
  };
  const chars = "01<>[]{}//\\$#@*+";
  const draw = () => {
    ctx.fillStyle = "rgba(2,4,10,.09)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = "10px Space Mono, monospace";
    for (let i = 0; i < drops.length; i++) {
      const x = i * 22;
      const y = drops[i] * 14;
      ctx.fillStyle = i % 9 === 0 ? "rgba(103,247,177,.22)" : "rgba(56,189,248,.10)";
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
      if (y > window.innerHeight && Math.random() > .975) drops[i] = Math.random() * -20;
      drops[i] += .35;
    }
    requestAnimationFrame(draw);
  };
  window.addEventListener("resize", resize);
  resize(); draw();
}

function boot() {
  $("display").innerHTML = LOADER_HTML;
  addChat("JARVIS", LOADER_HTML);
  syncTelemetry({ silent: true }).then(() => {
    $("chatlog").innerHTML = "";
    addChat("JARVIS", `<b>ALL SYSTEMS ONLINE — NASA CORE ACTIVE</b><br><br>Good day. I am J.A.R.V.I.S., the mission intelligence interface designed and built by Eva.<br><br><b>LIVE MISSION STATUS</b><br>· <b>${state.astros.number}</b> humans currently in space<br>· <b>${state.neo?.count ?? 0}</b> near-Earth objects tracked today<br>· Solar activity: <b>${state.solar?.count ?? 0}</b> flares in the last 7 days<br><br>Telemetry is live. Select a mission directive or transmit a question.`);
  });
}

$("chatform")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("chatinput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  askJarvis(text);
});

initDirectives();
initMic();
initVoiceToggle();
initRefresh();
initCommandPalette();
initPromptChips();
initMatrix();
tickClock();
setInterval(tickClock, 1000);
boot();



/* === DUAL CHATBOT CONTROLLER === */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const generalForm = byId("general-chat-form");
  const nasaForm = byId("nasa-chat-form");
  if (!generalForm || !nasaForm) return;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c])).replace(/\n/g, "<br>");

  const addMessage = (log, role, text) => {
    const el = document.createElement("div");
    el.className = `dual-message ${role}`;
    el.innerHTML = escapeHTML(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const fastGeneralAnswer = q => {
    const s = q.trim().toLowerCase();
    if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(s))
      return "Hello! I can help with general questions, coding, schoolwork, writing, mathematics, and technology.";
    if (/what is (html|css|javascript|python)\b/.test(s)) {
      const topic = s.match(/what is (html|css|javascript|python)\b/)[1];
      return {
        html:"HTML structures webpage content using elements such as headings, paragraphs, links, forms, and sections.",
        css:"CSS controls webpage presentation, including layout, spacing, colors, typography, responsiveness, and animation.",
        javascript:"JavaScript adds behavior and interactivity to webpages, including events, dynamic content, and API requests.",
        python:"Python is a general-purpose programming language used for automation, data science, AI, web development, and education."
      }[topic];
    }
    if (/what is an api|what is api\b/.test(s))
      return "An API is an application programming interface: a defined contract that lets software systems communicate through requests, responses, and agreed data formats.";
    const arithmetic = s.match(/^(-?\d+(?:\.\d+)?)\s*([\+\-*\/])\s*(-?\d+(?:\.\d+)?)$/);
    if (arithmetic) {
      const a = Number(arithmetic[1]), op = arithmetic[2], b = Number(arithmetic[3]);
      if (op === "/" && b === 0) return "Division by zero is undefined.";
      const result = op === "+" ? a+b : op === "-" ? a-b : op === "*" ? a*b : a/b;
      return `Result: ${result}`;
    }
    return "";
  };

  const localModelAnswer = async (question, systemPrompt, maxTokens) => {
    if (typeof getLocalGenerator !== "function")
      throw new Error("The local model loader is unavailable.");
    const generator = await getLocalGenerator();
    const result = await generator([
      {role:"system", content:systemPrompt},
      {role:"user", content:question}
    ], {max_new_tokens:maxTokens, do_sample:false, repetition_penalty:1.08});
    const generated = result?.[0]?.generated_text;
    const answer = Array.isArray(generated)
      ? generated[generated.length - 1]?.content || ""
      : String(generated || "");
    return answer.trim();
  };

  const nasaFetchContext = async question => {
    const q = question.toLowerCase();
    const key = typeof STATIC_NASA_KEY !== "undefined" ? STATIC_NASA_KEY : "DEMO_KEY";
    const pieces = [];
    const today = new Date().toISOString().slice(0,10);
    const earlier = new Date(Date.now() - 14*86400000).toISOString().slice(0,10);
    const getJSON = async url => {
      const response = await fetch(url, {cache:"no-store"});
      if (!response.ok) throw new Error(`NASA request failed: ${response.status}`);
      return response.json();
    };

    if (/asteroid|neo|near earth|pha|miss distance/.test(q)) {
      const end = new Date();
      const start = new Date(end.getTime() - 2*86400000);
      const startDate = start.toISOString().slice(0,10);
      const endDate = end.toISOString().slice(0,10);
      const data = await getJSON(`${NASA_API}/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${encodeURIComponent(key)}`);
      const objects = Object.values(data.near_earth_objects || {}).flat();
      const simplified = objects.map(item => {
        const approach = item.close_approach_data?.[0] || {};
        return {
          name:item.name,
          potentially_hazardous:!!item.is_potentially_hazardous_asteroid,
          miss_distance_km:approach.miss_distance?.kilometers,
          velocity_kph:approach.relative_velocity?.kilometers_per_hour,
          approach_date:approach.close_approach_date_full || approach.close_approach_date
        };
      });
      const distances = simplified.map(x => Number(x.miss_distance_km)).filter(Number.isFinite);
      pieces.push(JSON.stringify({
        source:"NASA NeoWs",
        retrieval_utc:new Date().toISOString(),
        object_count:simplified.length,
        potentially_hazardous_designations:simplified.filter(x=>x.potentially_hazardous).length,
        minimum_miss_distance_km:distances.length ? Math.min(...distances) : null,
        mean_miss_distance_km:distances.length ? distances.reduce((a,b)=>a+b,0)/distances.length : null,
        objects:simplified.slice(0,40)
      }, null, 2));
    }

    if (/solar|sun|flare|cme|coronal|space weather/.test(q)) {
      const data = await getJSON(`${NASA_API}/DONKI/FLR?startDate=${earlier}&endDate=${today}&api_key=${encodeURIComponent(key)}`);
      const flares = Array.isArray(data) ? data : [];
      pieces.push(JSON.stringify({
        source:"NASA DONKI",
        retrieval_utc:new Date().toISOString(),
        period:`${earlier} through ${today}`,
        flare_count:flares.length,
        flares:flares.slice(-40)
      }, null, 2));
    }

    if (/apod|picture of the day|astronomy picture/.test(q)) {
      const data = await getJSON(`${NASA_API}/planetary/apod?api_key=${encodeURIComponent(key)}`);
      pieces.push(JSON.stringify({source:"NASA APOD",retrieval_utc:new Date().toISOString(),data}, null, 2));
    }

    if (/earth event|wildfire|volcano|flood|natural event/.test(q)) {
      const data = await getJSON("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50");
      pieces.push(JSON.stringify({source:"NASA EONET",retrieval_utc:new Date().toISOString(),events:data.events || []}, null, 2));
    }

    return pieces.length ? pieces.join("\n\n") : "No specialized live NASA feed was selected. Answer using stable background knowledge only and clearly state that no current dataset was retrieved.";
  };

  const run = async (kind, question, log) => {
    const q = question.trim();
    if (!q) return;
    addMessage(log, "user", q);
    const responseNode = addMessage(log, "bot", kind === "nasa" ? "Retrieving relevant NASA data..." : "Thinking...");
    try {
      if (kind === "general") {
        const immediate = fastGeneralAnswer(q);
        const answer = immediate || await localModelAnswer(q,
          "You are the General Instant Chatbot. Answer non-NASA questions clearly and efficiently. Help with everyday knowledge, coding, schoolwork, writing, mathematics, and technology. Do not claim live web access or invent current facts.",
          320);
        responseNode.innerHTML = escapeHTML(answer || "I couldn't generate an answer. Please try rephrasing your question.");
      } else {
        const context = await nasaFetchContext(q).catch(error =>
          `Live NASA retrieval failed: ${error.message}. Do not invent current facts or numbers.`
        );
        responseNode.textContent = "Analyzing retrieved NASA context...";
        const answer = await localModelAnswer(q,
          `You are the NASA Research Core Chatbot. Produce a detailed research-oriented response. Use the supplied context as the current-data source. Clearly distinguish retrieved facts, derived calculations, background knowledge, assumptions, and limitations. Never invent statistics, dates, sources, or citations. Include headings and a Sources and Limitations section. Supplied NASA context:\n${context}`,
          700);
        responseNode.innerHTML = escapeHTML(answer || "The NASA research response was empty. Please try again.");
      }
    } catch (error) {
      console.error(error);
      responseNode.textContent = "The local model is still loading or unavailable. Please wait briefly and try again.";
    }
  };

  generalForm.addEventListener("submit", event => {
    event.preventDefault();
    const input = byId("general-chat-input");
    const value = input.value;
    input.value = "";
    run("general", value, byId("general-chat-log"));
  });

  nasaForm.addEventListener("submit", event => {
    event.preventDefault();
    const input = byId("nasa-chat-input");
    const value = input.value;
    input.value = "";
    run("nasa", value, byId("nasa-chat-log"));
  });
})();
