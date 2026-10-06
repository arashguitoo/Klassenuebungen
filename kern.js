/* ==========================================================
   Klassenspiele · Kern
   Gemeinsame Basis für Konsole, Spieler-Seite und Beamer.
   Daten: Firebase Realtime Database (Projekt lern-deutsch-arash), Bereich /kx
   Testmodus: ?mock=1 → lokale Nachbildung über localStorage (mehrere Tabs)
   ========================================================== */
(function(){
"use strict";
var KX = window.KX = {};

KX.FB = {
  apiKey: "AIzaSyBDChXlm34Kr7Gg0Dw458GiiwoLnWJAnxM",
  authDomain: "lern-deutsch-arash.firebaseapp.com",
  databaseURL: "https://lern-deutsch-arash-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lern-deutsch-arash",
  storageBucket: "lern-deutsch-arash.firebasestorage.app",
  messagingSenderId: "845503292114",
  appId: "1:845503292114:web:f76ab5fcde1e978d00c30b"
};
KX.ROOT = "kx";
KX.MOCK = /[?&]mock=1\b/.test(location.search) || !!window.KX_MOCK;

/* ---------------- Hilfen ---------------- */
KX.$ = function(id){ return document.getElementById(id); };
KX.esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
KX.uid = function(n){ var a = "abcdefghijkmnpqrstuvwxyz23456789", s = ""; for (var i = 0; i < (n || 10); i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
KX.param = function(k){ return new URLSearchParams(location.search).get(k); };
KX.clone = function(o){ return o == null ? o : JSON.parse(JSON.stringify(o)); };
KX.rng = function(seed){
  var h = 1779033703 ^ String(seed).length;
  for (var i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  var a = h >>> 0;
  return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
KX.shuffle = function(arr, seed){
  var a = arr.slice(), r = seed == null ? Math.random : KX.rng(seed);
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
KX.vals = function(o){ return o ? Object.keys(o).map(function(k){ return o[k]; }) : []; };
KX.toast = function(msg, ms){
  var t = document.querySelector(".kx-toast");
  if (!t) { t = document.createElement("div"); t.className = "kx-toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(KX.toast._t);
  KX.toast._t = setTimeout(function(){ t.classList.remove("show"); }, ms || 2600);
};
KX.SHAPES = ["▲", "◆", "●", "■"];
KX.TEAMS = [
  {name:"Rot", color:"#e2464f"}, {name:"Blau", color:"#2f6fe0"}, {name:"Gelb", color:"#e0a10d"}, {name:"Grün", color:"#23a55a"},
  {name:"Lila", color:"#8b4fd6"}, {name:"Türkis", color:"#14a3a3"}, {name:"Orange", color:"#ee7a1c"}, {name:"Pink", color:"#d9468f"},
  {name:"Braun", color:"#8d6748"}, {name:"Grau", color:"#6b7280"}, {name:"Marine", color:"#1e3a8a"}, {name:"Oliv", color:"#6b7c1f"}
];
KX.teamInfo = function(tid){ var i = parseInt(String(tid).replace("t", ""), 10) || 0; var t = KX.TEAMS[i % KX.TEAMS.length]; return {id:tid, name:"Team " + t.name, short:t.name, color:t.color}; };

/* ---------------- Datenbank-Adapter ---------------- */
function splitPath(p){ return String(p).split("/").filter(Boolean); }
function getAt(root, parts){ var o = root; for (var i = 0; i < parts.length; i++) { if (o == null || typeof o !== "object") return null; o = o[parts[i]]; } return o === undefined ? null : o; }
function setAt(root, parts, val){
  if (!parts.length) return val == null ? {} : val;
  var o = root;
  for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
  if (val == null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = val;
  return root;
}
function prune(o){
  if (o == null || typeof o !== "object") return o;
  Object.keys(o).forEach(function(k){ o[k] = prune(o[k]); if (o[k] == null || (typeof o[k] === "object" && !Array.isArray(o[k]) && !Object.keys(o[k]).length)) delete o[k]; });
  return o;
}
function resolveTS(v, now){
  if (v && typeof v === "object") { if (v[".sv"] === "timestamp") return now; Object.keys(v).forEach(function(k){ v[k] = resolveTS(v[k], now); }); }
  return v;
}

function mockAdapter(){
  var KEY = "kx.mock.db", listeners = [], discs = [];
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } }
  function store(root){ localStorage.setItem(KEY, JSON.stringify(prune(root))); notify(); }
  function notify(){
    var root = load();
    listeners.forEach(function(l){
      var v = getAt(root, splitPath(l.path)), s = JSON.stringify(v);
      if (s !== l.last) { l.last = s; try { l.cb(KX.clone(v)); } catch(e){ console.error(e); } }
    });
  }
  window.addEventListener("storage", function(e){ if (e.key === KEY) notify(); });
  function write(path, val){ var root = load(); setAt(root, splitPath(path), resolveTS(KX.clone(val), Date.now())); store(root); }
  window.addEventListener("pagehide", function(){ discs.forEach(function(d){ write(d.path, d.val); }); });
  return {
    mock:true, TS:{".sv":"timestamp"},
    get:function(p){ return Promise.resolve(KX.clone(getAt(load(), splitPath(p)))); },
    set:function(p, v){ write(p, v); return Promise.resolve(); },
    update:function(p, o){ var root = load(); Object.keys(o).forEach(function(k){ setAt(root, splitPath(p).concat(splitPath(k)), resolveTS(KX.clone(o[k]), Date.now())); }); store(root); return Promise.resolve(); },
    remove:function(p){ write(p, null); return Promise.resolve(); },
    push:function(p, v){ var k = Date.now().toString(36) + KX.uid(4); write(p + "/" + k, v); return k; },
    on:function(p, cb){ var l = {path:p, cb:cb, last:undefined}; listeners.push(l); setTimeout(notify, 0); return function(){ listeners = listeners.filter(function(x){ return x !== l; }); }; },
    tx:function(p, fn){
      var root = load(), cur = KX.clone(getAt(root, splitPath(p))), nv = fn(cur);
      if (nv === undefined) return Promise.resolve({committed:false, value:cur});
      setAt(root, splitPath(p), resolveTS(KX.clone(nv), Date.now())); store(root);
      return Promise.resolve({committed:true, value:nv});
    },
    onDisconnect:function(p){ return { set:function(v){ discs.push({path:p, val:v}); }, remove:function(){ discs.push({path:p, val:null}); }, cancel:function(){ discs = discs.filter(function(d){ return d.path !== p; }); } }; },
    now:function(){ return Date.now(); },
    connected:function(cb){ cb(true); }
  };
}

function firebaseAdapter(){
  if (!window.firebase) throw new Error("Firebase nicht geladen");
  if (!firebase.apps.length) firebase.initializeApp(KX.FB);
  var db = firebase.database(), off = 0;
  db.ref(".info/serverTimeOffset").on("value", function(s){ off = s.val() || 0; });
  return {
    mock:false, TS:firebase.database.ServerValue.TIMESTAMP,
    get:function(p){ return db.ref(p).once("value").then(function(s){ return s.val(); }); },
    set:function(p, v){ return db.ref(p).set(v); },
    update:function(p, o){ return db.ref(p).update(o); },
    remove:function(p){ return db.ref(p).remove(); },
    push:function(p, v){ var r = db.ref(p).push(); r.set(v); return r.key; },
    on:function(p, cb){ var r = db.ref(p), h = function(s){ cb(s.val()); }; r.on("value", h); return function(){ r.off("value", h); }; },
    tx:function(p, fn){ return db.ref(p).transaction(function(c){ return fn(c); }).then(function(r){ return {committed:r.committed, value:r.snapshot.val()}; }); },
    onDisconnect:function(p){ var od = db.ref(p).onDisconnect(); return { set:function(v){ od.set(v); }, remove:function(){ od.remove(); }, cancel:function(){ od.cancel(); } }; },
    now:function(){ return Date.now() + off; },
    connected:function(cb){ db.ref(".info/connected").on("value", function(s){ cb(!!s.val()); }); }
  };
}

KX.init = function(){
  if (KX.db) return KX.db;
  try { KX.db = KX.MOCK ? mockAdapter() : firebaseAdapter(); }
  catch(e){ console.error(e); KX.db = null; }
  return KX.db;
};
KX.path = function(){ return [KX.ROOT].concat([].slice.call(arguments)).join("/"); };
KX.sp = function(code){ return KX.path("s", code) + ([].slice.call(arguments, 1).length ? "/" + [].slice.call(arguments, 1).join("/") : ""); };

/* Verbindungsanzeige */
KX.connBadge = function(el){
  if (!el || !KX.db) return;
  KX.db.connected(function(ok){ el.classList.toggle("off", !ok); el.innerHTML = '<i></i>' + (ok ? "verbunden" : "keine Verbindung …"); });
};

/* ---------------- Zeit ---------------- */
KX.now = function(){ return KX.db ? KX.db.now() : Date.now(); };
KX.left = function(endsAt){ return Math.max(0, (endsAt - KX.now()) / 1000); };
/* Elemente mit data-ends="<ms>" data-total="<s>" werden laufend aktualisiert */
(function ticker(){
  var els = document.querySelectorAll("[data-ends]");
  for (var i = 0; i < els.length; i++) {
    var el = els[i], ends = +el.getAttribute("data-ends"), tot = +el.getAttribute("data-total") || 1, l = KX.left(ends);
    var b = el.querySelector("b"); if (b) b.textContent = l >= 60 ? Math.floor(l / 60) + ":" + String(Math.ceil(l) % 60).padStart(2, "0") : Math.ceil(l);
    var c = el.querySelector("circle.fg"); if (c) { var len = 2 * Math.PI * 42; c.style.strokeDasharray = len; c.style.strokeDashoffset = len * (1 - l / tot); c.style.stroke = l < 5 ? "#ff6b6b" : ""; }
    var bar = el.querySelector(".tbar"); if (bar) bar.style.width = (100 * l / tot) + "%";
  }
  requestAnimationFrame(function(){ setTimeout(ticker, 150); });
})();
KX.timerHTML = function(endsAt, total){
  return '<div class="s-timer" data-ends="' + endsAt + '" data-total="' + total + '"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="8"/><circle class="fg" cx="48" cy="48" r="42" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg><b></b></div>';
};
KX.timerBar = function(endsAt, total){
  return '<div data-ends="' + endsAt + '" data-total="' + total + '" style="display:flex;align-items:center;gap:10px"><div style="flex:1;height:10px;border-radius:9px;background:var(--hover);overflow:hidden"><div class="tbar" style="height:100%;background:var(--accent);transition:width .2s linear"></div></div><b style="min-width:42px;text-align:right;font-variant-numeric:tabular-nums"></b></div>';
};

/* ---------------- Material ---------------- */
KX.FERTIGKEITEN = ["Grammatik", "Wortschatz", "Sprechen", "Lesen", "Hören", "Schreiben", "Landeskunde", "Prüfung"];
KX.NIVEAUS = ["A1", "A2", "B1", "B2", "C1"];
KX.loadIndex = function(){
  var repo = fetch("material/index.json?ts=" + Math.floor(Date.now() / 60000), {cache:"no-store"}).then(function(r){ return r.ok ? r.json() : {pakete:[]}; }).catch(function(){ return {pakete:[]}; });
  var own = KX.db ? KX.db.get(KX.path("lib")).catch(function(){ return null; }) : Promise.resolve(null);
  return Promise.all([repo, own]).then(function(r){
    var list = (r[0].pakete || []).map(function(p){ p.quelle = "repo"; return p; });
    KX.vals(r[1]).forEach(function(p){
      if (!p || !p.id) return;
      var typen = {}; (p.inhalt || []).forEach(function(i){ var t = i.typ || p.art; typen[t] = (typen[t] || 0) + 1; });
      list = list.filter(function(x){ return x.id !== p.id; });
      list.push({id:p.id, titel:p.titel, beschreibung:p.beschreibung || "", art:p.art, etiketten:p.etiketten || {}, anzahl:(p.inhalt || []).length, typen:typen, quelle:"eigen"});
    });
    return list;
  });
};
KX.loadPaket = function(entry){
  if (entry.quelle === "eigen") return KX.db.get(KX.path("lib", entry.id));
  return fetch(entry.datei + "?ts=" + Math.floor(Date.now() / 60000), {cache:"no-store"}).then(function(r){ if (!r.ok) throw new Error("Datei fehlt: " + entry.datei); return r.json(); });
};
KX.validate = function(p){
  var E = [], W = [];
  if (!p || typeof p !== "object") return {errors:["Kein JSON-Objekt."], warnings:[]};
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id || "")) E.push("„id“ fehlt oder enthält ungültige Zeichen (nur a–z, 0–9, Bindestrich).");
  if (!p.titel) E.push("„titel“ fehlt.");
  if (["quiz", "karten", "begriffe"].indexOf(p.art) < 0) E.push("„art“ muss quiz, karten oder begriffe sein.");
  var e = p.etiketten || {};
  if (!Array.isArray(e.fertigkeit) || !e.fertigkeit.length) W.push("etiketten.fertigkeit fehlt.");
  (e.fertigkeit || []).forEach(function(f){ if (KX.FERTIGKEITEN.indexOf(f) < 0) W.push("Unbekannte Fertigkeit: " + f); });
  if (!Array.isArray(e.niveau) || !e.niveau.length) W.push("etiketten.niveau fehlt.");
  (e.niveau || []).forEach(function(n){ if (KX.NIVEAUS.indexOf(n) < 0) W.push("Unbekanntes Niveau: " + n); });
  if (!Array.isArray(p.inhalt) || !p.inhalt.length) E.push("„inhalt“ ist leer.");
  (p.inhalt || []).forEach(function(it, i){
    var n = "Eintrag " + (i + 1) + ": ";
    if (p.art === "quiz") {
      if (["mc", "luecke", "wf", "reihenfolge", "paare"].indexOf(it.typ) < 0) { E.push(n + "unbekannter typ „" + it.typ + "“."); return; }
      if (!it.frage) E.push(n + "„frage“ fehlt.");
      if (it.typ === "mc" || it.typ === "luecke") {
        if (!Array.isArray(it.optionen) || it.optionen.length < 2 || it.optionen.length > 4) E.push(n + "2–4 optionen nötig.");
        else if (!(it.richtig >= 0 && it.richtig < it.optionen.length)) E.push(n + "„richtig“ zeigt auf keine Option.");
        if (it.typ === "luecke" && !/___/.test(it.frage || "")) W.push(n + "Lücke ohne ___.");
      }
      if (it.typ === "wf" && typeof it.richtig !== "boolean") E.push(n + "„richtig“ muss true/false sein.");
      if (it.typ === "reihenfolge" && (!Array.isArray(it.teile) || it.teile.length < 2)) E.push(n + "mind. 2 teile nötig.");
      if (it.typ === "paare" && (!Array.isArray(it.paare) || it.paare.length < 2)) E.push(n + "mind. 2 paare nötig.");
    } else if (p.art === "karten") {
      if (!it.titel) E.push(n + "„titel“ fehlt.");
      if (!it.impuls && !(it.rolleA && it.rolleB)) E.push(n + "„impuls“ oder rolleA + rolleB nötig.");
    } else if (p.art === "begriffe") {
      if (!it.wort) E.push(n + "„wort“ fehlt.");
      if (!Array.isArray(it.tabu) || it.tabu.length < 2) W.push(n + "weniger als 2 Tabu-Wörter.");
    }
  });
  return {errors:E, warnings:W};
};
/* Etiketten als HTML */
KX.tagsHTML = function(e, opt){
  e = e || {}; var h = "";
  (e.niveau || []).forEach(function(n){ h += '<span class="tag n">' + KX.esc(n) + '</span>'; });
  (e.fertigkeit || []).forEach(function(f){ h += '<span class="tag f-' + KX.esc(f) + '">' + KX.esc(f) + '</span>'; });
  if (!opt || !opt.kurz) {
    if (e.thema) h += '<span class="tag">' + KX.esc(e.thema) + '</span>';
    if (e.lehrwerk) h += '<span class="tag">' + KX.esc(e.lehrwerk) + (e.lektion ? ' · L' + KX.esc(e.lektion) : '') + '</span>';
    (e.grammatik || []).forEach(function(g){ h += '<span class="tag">' + KX.esc(g) + '</span>'; });
  }
  return h;
};

/* ---------------- Sitzungen ---------------- */
KX.newCode = function(){
  function attempt(n){
    var code = String(1000 + Math.floor(Math.random() * 9000));
    return KX.db.get(KX.sp(code, "meta")).then(function(m){
      if (m && m.status !== "ende" && KX.now() - (m.created || 0) < 36 * 3600e3 && n < 30) return attempt(n + 1);
      return code;
    });
  }
  return attempt(0);
};
KX.createSession = function(o){
  return KX.newCode().then(function(code){
    var meta = {format:o.format, titel:o.titel, pakete:o.pakete || [], modus:o.modus, teamCount:o.teamCount || 0, settings:o.settings || {},
      kurs:o.kurs || "", etiketten:o.etiketten || {}, created:KX.db.TS, status:"lobby", v:1};
    var s = {meta:meta, content:{items:o.items}, state:o.state || {phase:"lobby"}};
    return KX.db.set(KX.sp(code), s).then(function(){ return code; });
  });
};
KX.endSession = function(code, summary){
  var tasks = [KX.db.update(KX.sp(code, "meta"), {status:"ende", ended:KX.db.TS})];
  if (summary) tasks.push(KX.db.set(KX.path("h", code + "-" + Date.now().toString(36)), summary));
  return Promise.all(tasks);
};
/* Aufräumen: Sitzungen älter als 2 Tage */
KX.cleanup = function(){
  return KX.db.get(KX.path("s")).then(function(all){
    if (!all) return 0; var n = 0, lim = KX.now() - 48 * 3600e3, up = {};
    Object.keys(all).forEach(function(c){ var m = all[c] && all[c].meta; if (!m || (m.created || 0) < lim) { up[c] = null; n++; } });
    return n ? KX.db.update(KX.path("s"), up).then(function(){ return n; }) : 0;
  }).catch(function(){ return 0; });
};

/* ---------------- Teilnahme ---------------- */
function pidKey(code){ return "kx.pid." + code; }
KX.myPid = function(code, tabOnly){ try { return sessionStorage.getItem(pidKey(code)) || (tabOnly ? null : localStorage.getItem(pidKey(code))); } catch(e){ return null; } };
KX.join = function(code, name){
  name = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) return Promise.reject(new Error("Bitte Namen eingeben."));
  return KX.db.get(KX.sp(code)).then(function(s){
    if (!s || !s.meta) throw new Error("Diesen Spielcode gibt es nicht.");
    if (s.meta.status === "ende") throw new Error("Dieses Spiel ist schon beendet.");
    var players = s.players || {}, mine = KX.myPid(code), pid = null;
    if (mine && players[mine] && players[mine].name.toLowerCase() === name.toLowerCase()) pid = mine;
    if (!pid) {
      Object.keys(players).forEach(function(id){ if (!pid && players[id].name.toLowerCase() === name.toLowerCase() && !players[id].online) pid = id; });
    }
    var finalName = name;
    if (!pid) {
      var taken = {}; KX.vals(players).forEach(function(p){ taken[p.name.toLowerCase()] = 1; });
      var k = 2; while (taken[finalName.toLowerCase()]) finalName = name + " " + (k++);
      pid = "p" + KX.uid(8);
    } else finalName = players[pid].name;
    var team = players[pid] && players[pid].team || KX.autoTeam(s, pid);
    var rec = {name:finalName, team:team || null, online:true, lastSeen:KX.db.TS};
    if (!players[pid]) rec.joined = KX.db.TS;
    try { sessionStorage.setItem(pidKey(code), pid); localStorage.setItem(pidKey(code), pid); } catch(e){}
    return KX.db.update(KX.sp(code, "players", pid), rec).then(function(){ KX.presence(code, pid); return pid; });
  });
};
KX.presence = function(code, pid){
  var base = KX.sp(code, "players", pid);
  KX.db.onDisconnect(base + "/online").set(false);
  KX.db.connected(function(ok){ if (ok) { KX.db.update(base, {online:true, lastSeen:KX.db.TS}); KX.db.onDisconnect(base + "/online").set(false); } });
  clearInterval(KX.presence._t);
  KX.presence._t = setInterval(function(){ KX.db.update(base, {online:true, lastSeen:KX.db.TS}); }, 25000);
};
/* Team automatisch: kleinstes Team (bei Gruppen/Paaren) */
KX.autoTeam = function(s, pid){
  var m = s.meta || {}; if (m.modus === "einzeln" || !m.teamCount || m.teamAssign === "manuell") return null;
  var cnt = {}; for (var i = 0; i < m.teamCount; i++) cnt["t" + i] = 0;
  KX.vals(s.players).forEach(function(p){ if (p.team && cnt[p.team] != null) cnt[p.team]++; });
  var best = null; Object.keys(cnt).forEach(function(t){ if (best == null || cnt[t] < cnt[best]) best = t; });
  return best;
};
/* Alle Online-TN neu und ausgewogen auf Teams verteilen */
KX.shuffleTeams = function(code, s, teamCount){
  var ids = KX.shuffle(Object.keys(s.players || {}).filter(function(id){ return s.players[id].online !== false; })), up = {};
  ids.forEach(function(id, i){ up["players/" + id + "/team"] = "t" + (i % teamCount); });
  Object.keys(s.players || {}).forEach(function(id){ if (ids.indexOf(id) < 0) up["players/" + id + "/team"] = null; });
  up["meta/teamCount"] = teamCount;
  return KX.db.update(KX.sp(code), up);
};
/* Einheiten: einzeln → jede Person; sonst → Teams */
KX.units = function(s){
  var m = s.meta || {}, pl = s.players || {};
  if (m.modus === "einzeln") return Object.keys(pl).map(function(id){ return {id:id, name:pl[id].name, color:"#2f4fd1", members:[id], online:pl[id].online !== false}; });
  var out = [];
  for (var i = 0; i < (m.teamCount || 0); i++) {
    var tid = "t" + i, ti = KX.teamInfo(tid), mem = Object.keys(pl).filter(function(id){ return pl[id].team === tid; });
    out.push({id:tid, name:(m.teamNames && m.teamNames[tid]) || (m.modus === "paare" ? "Paar " + ti.short : ti.name), color:ti.color, members:mem, online:mem.some(function(id){ return pl[id].online !== false; })});
  }
  return out;
};
KX.unitOf = function(s, pid){ var m = s.meta || {}; if (m.modus === "einzeln") return pid; var p = (s.players || {})[pid]; return p && p.team || null; };
KX.unitName = function(s, uid){ var u = KX.units(s).filter(function(x){ return x.id === uid; })[0]; return u ? u.name : "–"; };
KX.onlineIds = function(s){ var pl = s.players || {}; return Object.keys(pl).filter(function(id){ return pl[id].online !== false; }); };

/* Paare bilden (Kugellager-Prinzip: möglichst neue Partner) */
KX.makePairs = function(ids, met){
  met = met || {}; var best = null, bestScore = 1e9;
  for (var tr = 0; tr < 80; tr++) {
    var a = KX.shuffle(ids), groups = [], sc = 0;
    for (var i = 0; i + 1 < a.length; i += 2) groups.push([a[i], a[i + 1]]);
    if (a.length % 2 === 1) { if (groups.length) groups[groups.length - 1].push(a[a.length - 1]); else groups.push([a[a.length - 1]]); }
    groups.forEach(function(g){ for (var x = 0; x < g.length; x++) for (var y = x + 1; y < g.length; y++) sc += met[[g[x], g[y]].sort().join("|")] || 0; });
    if (sc < bestScore) { best = groups; bestScore = sc; if (!sc) break; }
  }
  return best || [];
};

/* ---------------- QR, Konfetti, Beitritts-Adresse ---------------- */
KX.joinUrl = function(code){ var u = new URL("spielen.html", location.href); u.search = "?c=" + code + (KX.MOCK ? "&mock=1" : ""); return u.href; };
KX.qr = function(el, text, size){
  function draw(){ el.innerHTML = ""; new window.QRCode(el, {text:text, width:size || 256, height:size || 256, colorDark:"#0f1b3d", colorLight:"#ffffff", correctLevel:window.QRCode.CorrectLevel.M}); }
  if (window.QRCode) return draw();
  var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload = draw;
  s.onerror = function(){ el.textContent = ""; }; document.head.appendChild(s);
};
KX.confetti = function(host){
  var c = document.createElement("div"); c.className = "confetti"; var cols = ["#f6c445", "#e2464f", "#2f6fe0", "#23a55a", "#ffffff", "#8b4fd6"], h = "";
  for (var i = 0; i < 90; i++) h += '<i style="left:' + Math.random() * 100 + '%;background:' + cols[i % cols.length] + ';animation-duration:' + (2.2 + Math.random() * 2.5) + 's;animation-delay:' + (Math.random() * 1.2) + 's"></i>';
  c.innerHTML = h; (host || document.body).appendChild(c); setTimeout(function(){ c.remove(); }, 6000);
};
KX.sound = function(kind){
  try {
    var A = window.AudioContext || window.webkitAudioContext; if (!A) return; var ctx = KX._ac || (KX._ac = new A());
    var seq = {ok:[[660, .0], [880, .09]], bad:[[220, 0], [180, .12]], tick:[[1200, 0]], end:[[523, 0], [659, .12], [784, .24], [1046, .36]]}[kind] || [[600, 0]];
    seq.forEach(function(n){ var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = n[0]; o.connect(g); g.connect(ctx.destination);
      var t = ctx.currentTime + n[1]; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.15, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .22); o.start(t); o.stop(t + .25); });
  } catch(e){}
};

/* ---------------- Konsolen-Passwort ---------------- */
var te = new TextEncoder();
function hex(buf){ return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2, "0"); }).join(""); }
function pbkdf2(pw, salt){
  return crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function(k){
    return crypto.subtle.deriveBits({name:"PBKDF2", salt:te.encode(salt), iterations:150000, hash:"SHA-256"}, k, 256);
  }).then(hex);
}
KX.pwState = function(){ return KX.db.get(KX.path("config", "pw")); };
KX.setPw = function(pw){ var salt = KX.uid(16); return pbkdf2(pw, salt).then(function(h){ return KX.db.set(KX.path("config", "pw"), {salt:salt, hash:h}).then(function(){ return h; }); }); };
KX.checkPw = function(pw, rec){ return pbkdf2(pw, rec.salt).then(function(h){ return h === rec.hash ? h : null; }); };

/* Text mit Lücke hübsch */
KX.gapHTML = function(t){ return KX.esc(t).replace(/_{3,}/g, '<span class="gap">&nbsp;</span>'); };
})();
