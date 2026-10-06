/* ==========================================================
   Klassenspiele · Spielformate
   Jedes Format: prepare (Material → Aufgaben), stage (Beamer),
   control (Spielleitung), player (Handy), tick (Automatik der Spielleitung)
   ========================================================== */
(function(){
"use strict";
var KX = window.KX, esc = KX.esc, F = KX.FORMATE = {};
var db = function(){ return KX.db; };

/* ---------------- gemeinsame Bausteine ---------------- */
function itemOpts(it){ return it.typ === "wf" ? ["Wahr", "Falsch"] : (it.optionen || []); }
function itemRight(it){ return it.typ === "wf" ? (it.richtig ? 0 : 1) : it.richtig; }
function check(it, v){
  if (v == null) return false;
  if (it.typ === "mc" || it.typ === "luecke" || it.typ === "wf") return +v === itemRight(it);
  if (it.typ === "reihenfolge") return Array.isArray(v) && v.map(function(i){ return it.teile[i]; }).join(" ") === it.teile.join(" ");
  if (it.typ === "paare") return Array.isArray(v) && v.every(function(r, l){ return r != null && it.paare[r][1] === it.paare[l][1]; });
  return false;
}
function solutionText(it){
  if (it.typ === "reihenfolge") return it.teile.join(" ");
  if (it.typ === "paare") return it.paare.map(function(p){ return p[0] + " – " + p[1]; }).join(" · ");
  return itemOpts(it)[itemRight(it)];
}
function qText(it){ return it.typ === "reihenfolge" || it.typ === "paare" ? it.frage || "" : it.frage; }
function sig(el, s){ if (el._sig === s) return false; el._sig = s; return true; }
function set(el, s, html, after){ if (!sig(el, s)) return; el.innerHTML = html; if (after) after(el); }
function inc(path, by){ return db().tx(path, function(v){ return (v || 0) + by; }); }
function money(n){ return n.toLocaleString("de-DE") + " €"; }
function rankList(rows, fmt, off){
  off = off || 0;
  return '<div class="s-rank">' + rows.map(function(r, i){
    return '<div class="r' + (off ? ' rest' : '') + '" style="animation-delay:' + (i * 0.07) + 's"><span class="p">' + (i + 1 + off) + '.</span>' + (r.color ? '<i style="width:14px;height:14px;border-radius:50%;background:' + r.color + '"></i>' : '') +
      '<span class="n">' + esc(r.name) + '</span><span>' + esc(fmt ? fmt(r) : r.pts) + '</span></div>';
  }).join("") + '</div>';
}
function podium(rows, fmt){
  var p = [rows[1], rows[0], rows[2]], cls = ["p2", "p1", "p3"], med = ["🥈", "🥇", "🥉"];
  return '<div class="podium">' + p.map(function(r, i){ return r ? '<div class="' + cls[i] + '"><div class="nm">' + esc(r.name) + '</div><div style="opacity:.85;margin-bottom:6px">' + esc(fmt ? fmt(r) : r.pts) + '</div><div class="blk">' + med[i] + '</div></div>' : '<div></div>'; }).join("") + '</div>';
}
function joinScreen(s, code, title, sub){
  var names = KX.onlineIds(s).map(function(id){ return s.players[id]; });
  var teamsHTML = "";
  if (s.meta.modus !== "einzeln" && s.meta.teamCount) {
    teamsHTML = '<div class="s-teams" style="margin-top:6px">' + KX.units(s).map(function(u){
      return '<div class="s-team" style="border-color:' + u.color + '"><h4><i style="background:' + u.color + '"></i>' + esc(u.name) + '</h4><div class="m">' +
        (u.members.filter(function(id){ return s.players[id].online !== false; }).map(function(id){ return esc(s.players[id].name); }).join(", ") || '<span style="opacity:.5">noch leer</span>') + '</div></div>';
    }).join("") + '</div>';
  }
  return '<div class="s-center"><div class="s-title">' + esc(title) + '</div>' + (sub ? '<div style="opacity:.8;font-size:1.2rem">' + esc(sub) + '</div>' : '') +
    '<div class="s-join"><div class="qr" id="joinQR"></div><div style="text-align:left"><div style="opacity:.8;font-weight:700">Mitspielen mit dem Handy</div><div class="s-url">' + esc(KX.joinUrl(code).replace(/^https?:\/\//, "").replace(/\?.*$/, "")) + '</div>' +
    '<div style="opacity:.8;font-weight:700;margin-top:10px">Spielcode</div><div class="s-code">' + code + '</div></div></div>' +
    '<div class="s-pill">👥 ' + names.length + ' dabei</div>' + (teamsHTML || '<div class="s-names">' + names.map(function(p){ return '<span>' + esc(p.name) + '</span>'; }).join("") + '</div>') + '</div>';
}
function afterJoin(code){ return function(el){ var q = el.querySelector("#joinQR"); if (q) KX.qr(q, KX.joinUrl(code), 220); }; }
function stageQuestion(it, i, n, extra){
  var h = '<div class="s-q">' + (it.typ === "luecke" ? KX.gapHTML(it.frage) : esc(qText(it))) + '</div>';
  if (it.typ === "reihenfolge") h += '<div class="chips" style="margin-top:22px">' + KX.shuffle(it.teile, it.frage + i).map(function(t){ return '<span class="chip" style="background:rgba(255,255,255,.14);border-color:transparent;color:#fff;font-size:1.4rem">' + esc(t) + '</span>'; }).join("") + '</div>';
  else if (it.typ === "paare") h += '<div style="text-align:center;margin-top:16px;opacity:.8;font-size:1.2rem">Ordnet die ' + it.paare.length + ' Paare zu.</div>';
  else h += optsStage(it, extra || {});
  return h;
}
function optsStage(it, o){
  var opts = itemOpts(it), right = itemRight(it);
  return '<div class="s-opts">' + opts.map(function(t, k){
    var cls = "s-opt o" + k + (o.reveal ? (k === right ? " win" : " dim") : "") + ((o.hide || []).indexOf(k) >= 0 ? " dim" : "");
    return '<div class="' + cls + '"><span class="sh">' + KX.SHAPES[k] + '</span><span>' + esc(t) + '</span>' + (o.counts ? '<span class="cnt">' + (o.counts[k] || 0) + '</span>' : '') + '</div>';
  }).join("") + '</div>';
}
function lobbyPlayer(s, pid, extra){
  var me = s.players[pid] || {}, team = me.team ? KX.teamInfo(me.team) : null;
  return '<div class="pl-center"><div class="pl-big">👋</div><h2 style="margin:0">Hallo ' + esc(me.name) + '!</h2>' +
    (team ? '<div style="font-size:1.1rem">Du bist in <b style="color:' + team.color + '">' + esc((s.meta.teamNames && s.meta.teamNames[me.team]) || team.name) + '</b></div>' : '') +
    '<div class="muted">' + (extra || "Gleich geht’s los – schau zur Tafel.") + '</div></div>';
}
/* Spieler-Eingaben */
var UI = {};   // lokaler Zustand je Aufgabe (Reihenfolge, Paare)
function choiceButtons(it, opts, onPick, o){
  o = o || {};
  var wrap = document.createElement("div"); wrap.className = "pl-opts" + (opts.length <= 2 && !o.grid ? " one" : "");
  opts.forEach(function(op){
    var b = document.createElement("button"); b.type = "button";
    b.className = "pl-opt o" + (op.color != null ? op.color : op.k) + (o.sel === op.k ? " sel" : "") + ((o.hide || []).indexOf(op.k) >= 0 ? " off" : "");
    b.innerHTML = '<span class="sh">' + KX.SHAPES[(op.color != null ? op.color : op.k) % 4] + '</span><span>' + esc(op.t) + '</span>';
    b.onclick = function(){ onPick(op.k); };
    wrap.appendChild(b);
  });
  return wrap;
}
function orderWidget(it, key, onSubmit){
  var st = UI[key] || (UI[key] = {order:[], pool:KX.shuffle(it.teile.map(function(_, i){ return i; }), key)});
  var box = document.createElement("div"); box.style.cssText = "display:flex;flex-direction:column;gap:12px";
  function draw(){
    box.innerHTML = '<div class="slots">' + (st.order.length ? st.order.map(function(i, n){ return '<span class="chip on" data-o="' + n + '">' + esc(it.teile[i]) + '</span>'; }).join("") : '<span class="muted">Tippe die Wörter in der richtigen Reihenfolge</span>') + '</div>' +
      '<div class="chips">' + st.pool.map(function(i){ return '<span class="chip' + (st.order.indexOf(i) >= 0 ? ' used' : '') + '" data-p="' + i + '">' + esc(it.teile[i]) + '</span>'; }).join("") + '</div>' +
      '<button class="btn primary big" type="button"' + (st.order.length === it.teile.length ? '' : ' disabled') + '>Abgeben</button>';
    box.querySelector("button").onclick = function(){ onSubmit(st.order.slice()); };
  }
  box.addEventListener("click", function(e){
    var p = e.target.closest("[data-p]"), o = e.target.closest("[data-o]");
    if (p) { var i = +p.dataset.p; if (st.order.indexOf(i) < 0) st.order.push(i); draw(); }
    if (o) { st.order.splice(+o.dataset.o, 1); draw(); }
  });
  draw(); return box;
}
function pairsWidget(it, key, onSubmit){
  var st = UI[key] || (UI[key] = {match:{}, sel:null, right:KX.shuffle(it.paare.map(function(_, i){ return i; }), key)});
  var box = document.createElement("div");
  function draw(){
    var used = {}; Object.keys(st.match).forEach(function(l){ used[st.match[l]] = l; });
    box.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + it.paare.map(function(p, l){ return '<span class="chip' + (st.sel === l ? ' on' : '') + (st.match[l] != null ? ' used' : '') + '" data-l="' + l + '">' + esc(p[0]) + '</span>'; }).join("") + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + st.right.map(function(r){ return '<span class="chip' + (used[r] != null ? ' used' : '') + '" data-r="' + r + '">' + esc(it.paare[r][1]) + '</span>'; }).join("") + '</div></div>' +
      '<div class="small muted" style="margin:8px 0">' + Object.keys(st.match).map(function(l){ return esc(it.paare[l][0]) + ' → ' + esc(it.paare[st.match[l]][1]); }).join(" · ") + '</div>' +
      '<div class="row"><button class="btn ghost" type="button" data-reset>Neu</button><span style="flex:1"></span><button class="btn primary big" type="button" data-go' + (Object.keys(st.match).length === it.paare.length ? '' : ' disabled') + '>Abgeben</button></div>';
  }
  box.addEventListener("click", function(e){
    var l = e.target.closest("[data-l]"), r = e.target.closest("[data-r]");
    if (l) { st.sel = +l.dataset.l; draw(); return; }
    if (r && st.sel != null) { st.match[st.sel] = +r.dataset.r; st.sel = null; draw(); return; }
    if (e.target.closest("[data-reset]")) { st.match = {}; st.sel = null; draw(); return; }
    if (e.target.closest("[data-go]")) { var v = it.paare.map(function(_, i){ return st.match[i]; }); onSubmit(v); }
  });
  draw(); return box;
}
/* Eingabe passend zum Typ */
function answerWidget(it, key, onAnswer, o){
  if (it.typ === "reihenfolge") return orderWidget(it, key, onAnswer);
  if (it.typ === "paare") return pairsWidget(it, key, onAnswer);
  var opts = itemOpts(it).map(function(t, k){ return {t:t, k:k}; });
  return choiceButtons(it, opts, onAnswer, o);
}
function qPlayerHTML(it){ return '<div class="pl-q">' + (it.typ === "luecke" ? KX.gapHTML(it.frage).replace(/class="gap"/g, 'style="display:inline-block;min-width:3em;border-bottom:3px solid var(--accent)"') : esc(qText(it))) + '</div>'; }
function unitRows(s, scores){
  return KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){ return {id:u.id, name:u.name, color:s.meta.modus === "einzeln" ? null : u.color, pts:(scores || {})[u.id] || 0}; })
    .sort(function(a, b){ return b.pts - a.pts; });
}
function bigBtn(label, cls){ return '<button class="btn ' + (cls || "primary") + ' big" type="button" data-act>' + label + '</button>'; }
function hostPanel(phaseLabel, buttons, info){
  return '<div class="hp"><div class="hp-phase">' + phaseLabel + '</div>' + (info ? '<div class="hp-info">' + info + '</div>' : '') + '<div class="hp-btns">' + buttons + '</div></div>';
}
function L(s){ return (KX.liveS && KX.liveS.meta && s && s.meta && KX.liveS.meta.created === s.meta.created) ? KX.liveS : s; }
function bindActs(el, map){ el.querySelectorAll("[data-a]").forEach(function(b){ b.onclick = function(){ var f = map[b.dataset.a]; if (f) { b.disabled = true; Promise.resolve(f()).finally(function(){ b.disabled = false; }); } }; }); }
function btn(a, label, cls){ return '<button class="btn ' + (cls || "") + '" type="button" data-a="' + a + '">' + label + '</button>'; }

/* ==========================================================
   1 · BLITZ-QUIZ – alle gleichzeitig, Tempo-Punkte
   ========================================================== */
F.blitz = {
  name:"Blitz-Quiz", emoji:"⚡", art:"quiz", typen:["mc", "luecke", "wf", "reihenfolge"], modi:["einzeln", "paare", "gruppen"], modus:"einzeln",
  farbe:["#f59e0b", "#ef4444"], kurz:"Alle antworten gleichzeitig am Handy – Tempo zählt. Rangliste nach jeder Frage.",
  settings:[{k:"zeit", label:"Zeit pro Frage (s)", typ:"zahl", def:20, min:5, max:120}, {k:"anzahl", label:"Anzahl Fragen", typ:"zahl", def:12, min:3, max:60}, {k:"mischen", label:"Reihenfolge mischen", typ:"ja", def:true}],
  prepare:function(items, st){ var a = items.filter(function(i){ return this.typen.indexOf(i.typ) >= 0; }, this); if (st.mischen) a = KX.shuffle(a); return a.slice(0, st.anzahl || 12); },
  units:function(s){ // Rangliste nach Personen oder Team-Durchschnitt
    var sc = s.scores || {};
    if (s.meta.modus === "einzeln") return unitRows(s, sc);
    return KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){
      var sum = u.members.reduce(function(a, id){ return a + (sc[id] || 0); }, 0);
      return {id:u.id, name:u.name, color:u.color, pts:Math.round(sum / u.members.length)};
    }).sort(function(a, b){ return b.pts - a.pts; });
  },
  next:function(code, s){
    var i = (s.state.i == null ? -1 : s.state.i) + 1, n = s.content.items.length, z = s.meta.settings.zeit || 20;
    if (i >= n) return F.blitz.finish(code, s);
    return db().set(KX.sp(code, "state"), {phase:"frage", i:i, startAt:KX.now(), endsAt:KX.now() + z * 1000});
  },
  reveal:function(code, s){
    var st = s.state, i = st.i; if (st.phase !== "frage") return;
    var it = s.content.items[i], ans = (s.answers || {})[i] || {}, tot = (st.endsAt - st.startAt) || 1, up = {};
    Object.keys(ans).forEach(function(pid){
      var a = ans[pid], ok = check(it, a.v), el = Math.max(0, Math.min(tot, (a.at || st.endsAt) - st.startAt));
      var pts = ok ? Math.round(1000 - 500 * el / tot) : 0;
      up["answers/" + i + "/" + pid + "/ok"] = ok; up["answers/" + i + "/" + pid + "/pts"] = pts;
      up["scores/" + pid] = ((s.scores || {})[pid] || 0) + pts;
    });
    up["state/phase"] = "aufloesung";
    return db().update(KX.sp(code), up);
  },
  finish:function(code, s){ return db().update(KX.sp(code, "state"), {phase:"ende"}); },
  tick:function(code, s){
    var st = s.state; if (st.phase !== "frage") return;
    var ans = (s.answers || {})[st.i] || {}, on = KX.onlineIds(s);
    if (KX.now() > st.endsAt + 400 || (on.length && on.every(function(id){ return ans[id]; }))) return F.blitz.reveal(code, s);
  },
  control:function(s, el, code){
    var st = s.state, n = s.content.items.length, ph = st.phase, i = st.i;
    var ans = i != null && s.answers && s.answers[i] ? Object.keys(s.answers[i]).length : 0;
    var html;
    if (ph === "lobby") html = hostPanel("Warteraum", btn("next", "▶ Erste Frage", "primary big"), KX.onlineIds(s).length + " TN dabei");
    else if (ph === "frage") html = hostPanel("Frage " + (i + 1) + " / " + n, btn("reveal", "Auflösen", "primary big"), ans + " von " + KX.onlineIds(s).length + " haben geantwortet " + KX.timerBar(st.endsAt, s.meta.settings.zeit || 20));
    else if (ph === "aufloesung") html = hostPanel("Auflösung " + (i + 1) + " / " + n, btn("rank", "Rangliste", "primary big") + btn("next", i + 1 >= n ? "Endergebnis" : "Nächste Frage ▶"), "");
    else if (ph === "rangliste") html = hostPanel("Rangliste", btn("next", i + 1 >= n ? "🏆 Endergebnis" : "Nächste Frage ▶", "primary big"), "");
    else html = hostPanel("Spiel beendet", "", "Endstand siehe Beamer.");
    set(el, ph + i + ans + "|" + KX.onlineIds(s).length, html, function(el){ bindActs(el, {
      next:function(){ return F.blitz.next(code, L(s)); }, reveal:function(){ return F.blitz.reveal(code, L(s)); },
      rank:function(){ return db().update(KX.sp(code, "state"), {phase:"rangliste"}); } }); });
  },
  stage:function(s, el, code){
    var st = s.state, n = s.content.items.length, ph = st.phase, i = st.i, it = s.content.items[i];
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}), joinScreen(s, code, s.meta.titel, "⚡ Blitz-Quiz"), afterJoin(code));
    if (ph === "frage") {
      var ans = (s.answers || {})[i] || {};
      return set(el, "F" + i + Object.keys(ans).length, '<div class="s-top"><span class="s-badge">Frage ' + (i + 1) + ' / ' + n + '</span><span style="flex:1"></span><span class="s-pill">✋ ' + Object.keys(ans).length + ' / ' + KX.onlineIds(s).length + '</span>' + KX.timerHTML(st.endsAt, s.meta.settings.zeit || 20) + '</div>' + stageQuestion(it, i, n));
    }
    if (ph === "aufloesung") {
      var a = (s.answers || {})[i] || {}, cnt = {}, okN = 0;
      KX.vals(a).forEach(function(x){ if (typeof x.v === "number") cnt[x.v] = (cnt[x.v] || 0) + 1; if (x.ok) okN++; });
      var body = (it.typ === "reihenfolge" || it.typ === "paare") ? '<div class="s-q">' + esc(qText(it)) + '</div><div class="s-q" style="margin-top:14px;background:#d9f7e5">✓ ' + esc(solutionText(it)) + '</div>' : '<div class="s-q">' + (it.typ === "luecke" ? KX.gapHTML(it.frage) : esc(it.frage)) + '</div>' + optsStage(it, {reveal:true, counts:cnt});
      return set(el, "A" + i, '<div class="s-top"><span class="s-badge">Auflösung ' + (i + 1) + ' / ' + n + '</span><span style="flex:1"></span><span class="s-pill">✓ ' + okN + ' richtig</span></div>' + body +
        (it.erklaerung ? '<div style="margin-top:16px;font-size:1.25rem;background:rgba(255,255,255,.1);padding:14px 18px;border-radius:14px">💡 ' + esc(it.erklaerung) + '</div>' : ''));
    }
    if (ph === "rangliste") return set(el, "R" + i, '<div class="s-center"><div class="s-title">Rangliste</div>' + rankList(F.blitz.units(s).slice(0, 8), function(r){ return r.pts.toLocaleString("de-DE"); }) + '</div>');
    var rows = F.blitz.units(s);
    return set(el, "E", '<div class="s-center"><div class="s-title">🏆 Endergebnis</div>' + podium(rows, function(r){ return r.pts.toLocaleString("de-DE") + " P."; }) + rankList(rows.slice(3, 10), function(r){ return r.pts.toLocaleString("de-DE"); }, 3) + '</div>', function(e){ KX.confetti(e); KX.sound("end"); });
  },
  player:function(s, el, code, pid){
    var st = s.state, ph = st.phase, i = st.i, it = s.content.items[i], my = ((s.answers || {})[i] || {})[pid];
    if (ph === "lobby") return set(el, "L" + (s.players[pid] || {}).team, lobbyPlayer(s, pid));
    if (ph === "frage") {
      if (my) return set(el, "W" + i, '<div class="pl-center"><div class="pl-big">⏳</div><h2 style="margin:0">Antwort gespeichert</h2><div class="muted">Warte auf die Auflösung …</div></div>');
      if (!sig(el, "Q" + i)) return;
      el.innerHTML = '<div data-ends="' + st.endsAt + '" data-total="' + (s.meta.settings.zeit || 20) + '" style="height:6px;border-radius:9px;background:var(--hover);overflow:hidden"><div class="tbar" style="height:100%;background:var(--accent)"></div></div>' + qPlayerHTML(it);
      el.appendChild(answerWidget(it, code + "b" + i, function(v){ db().set(KX.sp(code, "answers", i, pid), {v:v, at:db().TS}); }));
      return;
    }
    var rank = F.blitz.units(s), me = s.meta.modus === "einzeln" ? pid : (s.players[pid] || {}).team, pos = rank.findIndex(function(r){ return r.id === me; }) + 1;
    var tot = (s.scores || {})[pid] || 0;
    if (ph === "aufloesung" || ph === "rangliste") {
      var ok = my && my.ok, pts = my && my.pts || 0;
      return set(el, "A" + i + ph + !!my, '<div class="pl-center"><div class="pl-res ' + (!my ? "neu" : ok ? "ok" : "bad") + '">' + (!my ? "Keine Antwort" : ok ? "Richtig! +" + pts : "Leider falsch") + '</div>' +
        (!ok ? '<div>Richtig ist: <b>' + esc(solutionText(it)) + '</b></div>' : '') + '<div class="muted">Platz ' + pos + ' von ' + rank.length + ' · ' + tot.toLocaleString("de-DE") + ' Punkte</div></div>', function(){ KX.sound(ok ? "ok" : "bad"); });
    }
    return set(el, "E", '<div class="pl-center"><div class="pl-big">' + (pos === 1 ? "🏆" : pos <= 3 ? "🎉" : "👏") + '</div><h2 style="margin:0">Platz ' + pos + '</h2><div class="muted">' + tot.toLocaleString("de-DE") + ' Punkte</div></div>', function(e){ if (pos <= 3) KX.confetti(e); });
  },
  summary:function(s){ return F.blitz.units(s).map(function(r){ return {name:r.name, wert:r.pts}; }); }
};

/* ==========================================================
   2 · WER WIRD MILLIONÄR – Teams, Geldleiter, Joker
   ========================================================== */
var LADDER = [50, 100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 500000, 1000000];
function ladderFor(n){ if (n >= 15) return LADDER.slice(); var a = []; for (var k = 0; k < n; k++) a.push(LADDER[Math.round(k * 14 / Math.max(1, n - 1))]); return a; }
function safeLevels(n){ return [Math.floor(n / 3), Math.floor(2 * n / 3)].filter(function(x){ return x > 0; }); }
F.millionaer = {
  name:"Wer wird Millionär", emoji:"💰", art:"quiz", typen:["mc", "luecke", "wf"], modi:["gruppen", "paare", "einzeln"], modus:"gruppen",
  farbe:["#4338ca", "#1e1b4b"], kurz:"Teams steigen die Geldleiter hinauf. Joker 50:50 und Doppelt. Falsch → zurück zur Sicherheitsstufe.",
  settings:[{k:"zeit", label:"Zeit pro Frage (s, 0 = ohne)", typ:"zahl", def:45, min:0, max:300}, {k:"anzahl", label:"Fragen (Stufen)", typ:"zahl", def:15, min:5, max:15}],
  prepare:function(items, st){
    var a = items.filter(function(i){ return this.typen.indexOf(i.typ) >= 0; }, this);
    a = KX.shuffle(a).sort(function(x, y){ return (x.stufe || 2) - (y.stufe || 2); });
    return a.slice(0, st.anzahl || 15);
  },
  next:function(code, s){
    var i = (s.state.i == null ? -1 : s.state.i) + 1, n = s.content.items.length, z = +s.meta.settings.zeit || 0;
    if (i >= n) return db().update(KX.sp(code, "state"), {phase:"ende"});
    return db().set(KX.sp(code, "state"), {phase:"frage", i:i, startAt:KX.now(), endsAt:z ? KX.now() + z * 1000 : 0});
  },
  reveal:function(code, s){
    var st = s.state, i = st.i; if (st.phase !== "frage") return;
    var it = s.content.items[i], ans = (s.answers || {})[i] || {}, n = s.content.items.length, safe = safeLevels(n), up = {};
    KX.units(s).filter(function(u){ return u.members.length; }).forEach(function(u){
      var a = ans[u.id], lv = (s.scores || {})[u.id] || 0, to = lv;
      if (a) { if (check(it, a.v)) to = Math.min(n, lv + (a.dbl ? 2 : 1)); else { var f = 0; safe.forEach(function(x){ if (x <= lv) f = x; }); to = f; } }
      up["res/" + i + "/" + u.id] = {from:lv, to:to, ok:a ? check(it, a.v) : null};
      up["scores/" + u.id] = to;
    });
    up["state/phase"] = "aufloesung";
    return db().update(KX.sp(code), up);
  },
  tick:function(code, s){
    var st = s.state; if (st.phase !== "frage") return;
    var ans = (s.answers || {})[st.i] || {}, us = KX.units(s).filter(function(u){ return u.online; });
    if ((st.endsAt && KX.now() > st.endsAt + 400) || (us.length && us.every(function(u){ return ans[u.id] && ans[u.id].fix; }))) return F.millionaer.reveal(code, s);
  },
  control:function(s, el, code){
    var st = s.state, n = s.content.items.length, ph = st.phase, i = st.i, ans = i != null && s.answers && s.answers[i] ? Object.keys(s.answers[i]).length : 0;
    var html;
    if (ph === "lobby") html = hostPanel("Warteraum", btn("next", "▶ Erste Frage", "primary big"), KX.units(s).filter(function(u){ return u.members.length; }).length + " Teams bereit");
    else if (ph === "frage") html = hostPanel("Frage " + (i + 1) + " · " + money(ladderFor(n)[i]), btn("reveal", "Auflösen", "primary big"), ans + " Teams haben gewählt" + (st.endsAt ? KX.timerBar(st.endsAt, s.meta.settings.zeit) : ""));
    else if (ph === "aufloesung") html = hostPanel("Auflösung", btn("next", i + 1 >= n ? "🏆 Endergebnis" : "Nächste Frage ▶", "primary big"), "");
    else html = hostPanel("Spiel beendet", "", "");
    set(el, ph + i + ans + "|" + JSON.stringify(KX.units(s).map(function(u){ return u.members.length; })), html, function(el){ bindActs(el, {next:function(){ return F.millionaer.next(code, L(s)); }, reveal:function(){ return F.millionaer.reveal(code, L(s)); }}); });
  },
  ladderHTML:function(s){
    var n = s.content.items.length, L = ladderFor(n), safe = safeLevels(n), sc = s.scores || {}, us = KX.units(s).filter(function(u){ return u.members.length; });
    var h = '<div style="display:flex;flex-direction:column-reverse;gap:3px;min-width:230px">';
    for (var k = 0; k <= n; k++) {
      var here = us.filter(function(u){ return (sc[u.id] || 0) === k; });
      h += '<div style="display:flex;align-items:center;gap:8px;padding:3px 10px;border-radius:8px;font-weight:800;font-size:.95rem;' + (safe.indexOf(k) >= 0 ? 'background:rgba(246,196,69,.18);color:#f6c445' : k === n ? 'color:#f6c445' : 'opacity:.85') + '">' +
        '<span style="width:24px;opacity:.6">' + (k || "") + '</span><span style="flex:1">' + (k ? money(L[k - 1]) : "Start") + '</span>' +
        here.map(function(u){ return '<i title="' + esc(u.name) + '" style="width:14px;height:14px;border-radius:50%;background:' + u.color + ';border:2px solid #fff"></i>'; }).join("") + '</div>';
    }
    return h + '</div>';
  },
  stage:function(s, el, code){
    var st = s.state, n = s.content.items.length, ph = st.phase, i = st.i, it = s.content.items[i], L = ladderFor(n);
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}) + s.meta.teamCount, joinScreen(s, code, s.meta.titel, "💰 Wer wird Millionär"), afterJoin(code));
    if (ph === "ende") {
      var rows = KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){ var lv = (s.scores || {})[u.id] || 0; return {name:u.name, color:u.color, pts:lv, m:lv ? L[lv - 1] : 0}; }).sort(function(a, b){ return b.pts - a.pts; });
      return set(el, "E", '<div class="s-center"><div class="s-title">💰 Endstand</div>' + podium(rows, function(r){ return money(r.m); }) + '</div>', function(e){ KX.confetti(e); KX.sound("end"); });
    }
    var ans = (s.answers || {})[i] || {}, rv = ph === "aufloesung";
    var res = rv ? ((s.res || {})[i] || {}) : {};
    var teamStatus = KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){
      var a = ans[u.id], r = res[u.id];
      return '<span class="s-pill" style="background:' + u.color + '33;border:2px solid ' + u.color + '">' + esc(u.name) + ' ' + (rv ? (r && r.ok ? "✓ " + (r.to - r.from > 1 ? "⏫" : "⬆") : r && r.ok === false ? "✗ ⬇" : "–") : (a ? (a.dbl ? "✋×2" : "✋") : "…")) + '</span>';
    }).join(" ");
    set(el, ph + i + JSON.stringify(ans) + JSON.stringify(res), '<div style="display:flex;gap:26px;flex:1">' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:14px"><div class="s-top" style="margin:0"><span class="s-badge">Frage ' + (i + 1) + ' · um ' + money(L[i]) + '</span><span style="flex:1"></span>' + (st.endsAt && !rv ? KX.timerHTML(st.endsAt, s.meta.settings.zeit) : '') + '</div>' +
      '<div class="s-q">' + (it.typ === "luecke" ? KX.gapHTML(it.frage) : esc(it.frage)) + '</div>' + optsStage(it, {reveal:rv}) +
      (rv && it.erklaerung ? '<div style="font-size:1.15rem;background:rgba(255,255,255,.1);padding:12px 16px;border-radius:12px">💡 ' + esc(it.erklaerung) + '</div>' : '') +
      '<div class="row" style="gap:8px">' + teamStatus + '</div></div>' + F.millionaer.ladderHTML(s) + '</div>', function(){ if (rv) KX.sound("ok"); });
  },
  player:function(s, el, code, pid){
    var st = s.state, ph = st.phase, i = st.i, it = s.content.items[i], u = KX.unitOf(s, pid), n = s.content.items.length, L = ladderFor(n);
    var lv = (s.scores || {})[u] || 0, jk = (s.jok || {})[u] || {};
    var head = '<div class="row" style="justify-content:space-between"><b>' + esc(KX.unitName(s, u)) + '</b><span class="tag n" style="font-size:.9rem">' + (lv ? money(L[lv - 1]) : "0 €") + '</span></div>';
    if (ph === "lobby") return set(el, "L" + u, lobbyPlayer(s, pid, s.meta.modus === "einzeln" ? "" : "Ihr spielt als Team. Jede:r kann für das Team antworten."));
    if (ph === "ende") { var rows = KX.units(s).map(function(x){ return {id:x.id, pts:(s.scores || {})[x.id] || 0}; }).sort(function(a, b){ return b.pts - a.pts; }); var pos = rows.findIndex(function(r){ return r.id === u; }) + 1;
      return set(el, "E", '<div class="pl-center"><div class="pl-big">' + (pos === 1 ? "🏆" : "💰") + '</div><h2 style="margin:0">' + (lv ? money(L[lv - 1]) : "0 €") + '</h2><div class="muted">Platz ' + pos + '</div></div>', function(e){ if (pos === 1) KX.confetti(e); }); }
    if (ph === "aufloesung") { var r = ((s.res || {})[i] || {})[u] || {};
      return set(el, "A" + i, head + '<div class="pl-center"><div class="pl-res ' + (r.ok ? "ok" : r.ok === false ? "bad" : "neu") + '">' + (r.ok ? "Richtig! ⬆" : r.ok === false ? "Falsch – zurück auf " + (r.to ? money(L[r.to - 1]) : "Start") : "Keine Antwort") + '</div><div>Richtig: <b>' + esc(solutionText(it)) + '</b></div></div>', function(){ KX.sound(r.ok ? "ok" : "bad"); }); }
    var a = ((s.answers || {})[i] || {})[u], hide = jk.fifty === i ? KX.shuffle([0, 1, 2, 3].filter(function(k){ return k !== itemRight(it) && k < itemOpts(it).length; }), code + u + i).slice(0, Math.max(0, itemOpts(it).length - 2)) : [];
    if (!sig(el, "Q" + i + JSON.stringify(a || {}) + JSON.stringify(jk))) return;
    el.innerHTML = head + (st.endsAt ? '<div data-ends="' + st.endsAt + '" data-total="' + s.meta.settings.zeit + '" style="height:6px;border-radius:9px;background:var(--hover);overflow:hidden"><div class="tbar" style="height:100%;background:var(--accent)"></div></div>' : '') + qPlayerHTML(it);
    el.appendChild(choiceButtons(it, itemOpts(it).map(function(t, k){ return {t:t, k:k}; }), function(k){
      if (a && a.fix) return;
      db().update(KX.sp(code, "answers", i, u), {v:k, by:(s.players[pid] || {}).name, at:db().TS});
    }, {sel:a ? a.v : null, hide:hide, grid:true}));
    var bar = document.createElement("div"); bar.className = "row"; bar.style.justifyContent = "space-between";
    bar.innerHTML = '<div class="row" style="gap:6px"><button class="btn" data-j="fifty"' + (jk.fifty != null || itemOpts(it).length < 3 ? " disabled" : "") + '>50:50</button><button class="btn" data-j="dbl"' + (jk.dbl != null ? " disabled" : "") + ' title="Richtig = 2 Stufen hoch, falsch = Sicherheitsstufe">×2 Doppelt</button></div>' +
      (a ? '<span class="small muted">' + (a.fix ? "🔒 eingeloggt" : "gewählt von " + esc(a.by)) + '</span>' : '');
    el.appendChild(bar);
    if (a && !a.fix) { var lock = document.createElement("button"); lock.className = "btn primary big"; lock.textContent = "🔒 Antwort einloggen" + (a.dbl ? " (×2)" : ""); lock.onclick = function(){ db().update(KX.sp(code, "answers", i, u), {fix:true}); }; el.appendChild(lock); }
    bar.querySelectorAll("[data-j]").forEach(function(b){ b.onclick = function(){
      if (b.dataset.j === "fifty") db().update(KX.sp(code, "jok", u), {fifty:i});
      else { db().update(KX.sp(code, "jok", u), {dbl:i}); db().update(KX.sp(code, "answers", i, u), {dbl:true}); }
    }; });
  },
  summary:function(s){ var L = ladderFor(s.content.items.length); return KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){ var lv = (s.scores || {})[u.id] || 0; return {name:u.name, wert:lv ? L[lv - 1] : 0}; }).sort(function(a, b){ return b.wert - a.wert; }); }
};

/* ==========================================================
   3 · TEAM-MATCH – jede:r hat nur einen Teil der Antworten
   ========================================================== */
function tmOrder(s, code, u){ return KX.shuffle(s.content.items.map(function(_, i){ return i; }), code + u); }
function tmOptions(s, code, u, q){
  var it = s.content.items[tmOrder(s, code, u)[q % s.content.items.length]], mem = (KX.units(s).filter(function(x){ return x.id === u; })[0] || {members:[]}).members.filter(function(id){ return s.players[id].online !== false; }).sort();
  var opts = itemOpts(it).map(function(t, k){ return {t:t, ok:k === itemRight(it)}; });
  if (mem.length > opts.length) {
    var pool = KX.shuffle(s.content.items.map(function(x){ return itemOpts(x)[itemRight(x)]; }).filter(function(t){ return opts.every(function(o){ return o.t !== t; }); }), code + "d" + q);
    while (opts.length < Math.min(mem.length, 8) && pool.length) opts.push({t:pool.shift(), ok:false});
  }
  opts = KX.shuffle(opts, code + u + q);
  var by = {}; mem.forEach(function(id){ by[id] = []; });
  opts.forEach(function(o, k){ if (mem.length) by[mem[k % mem.length]].push(o); });
  return {it:it, by:by, mem:mem};
}
F.teammatch = {
  name:"Team-Match", emoji:"🧩", art:"quiz", typen:["mc", "luecke"], modi:["gruppen", "paare"], modus:"gruppen",
  farbe:["#0d9488", "#155e75"], kurz:"Jede:r im Team sieht nur einen Teil der Antworten – wer hat die richtige? Sprechen ist Pflicht. Erstes Team am Ziel gewinnt.",
  settings:[{k:"ziel", label:"Richtige bis zum Ziel", typ:"zahl", def:8, min:3, max:30}, {k:"streng", label:"Fehler setzt auf 0 zurück", typ:"ja", def:false}],
  prepare:function(items, st){ return KX.shuffle(items.filter(function(i){ return this.typen.indexOf(i.typ) >= 0; }, this)); },
  tick:function(code, s){
    if (s.state.phase !== "live") return;
    var z = s.meta.settings.ziel || 8, w = KX.units(s).filter(function(u){ return ((s.pg || {})[u.id] || {}).n >= z; })[0];
    if (w) return db().update(KX.sp(code, "state"), {phase:"ende", winner:w.id});
  },
  control:function(s, el, code){
    var ph = s.state.phase;
    set(el, ph, ph === "lobby" ? hostPanel("Warteraum", btn("go", "▶ Start", "primary big"), "Tipp: 3–5 Personen pro Team") : ph === "live" ? hostPanel("Läuft", btn("end", "Beenden", "bad"), "Teams spielen im eigenen Tempo.") : hostPanel("Spiel beendet", "", ""),
      function(el){ bindActs(el, {go:function(){ return db().update(KX.sp(code, "state"), {phase:"live", startAt:KX.now()}); }, end:function(){ return db().update(KX.sp(code, "state"), {phase:"ende"}); }}); });
  },
  stage:function(s, el, code){
    var ph = s.state.phase, z = s.meta.settings.ziel || 8;
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}) + s.meta.teamCount, joinScreen(s, code, s.meta.titel, "🧩 Team-Match – redet miteinander!"), afterJoin(code));
    var us = KX.units(s).filter(function(u){ return u.members.length; }), pg = s.pg || {};
    var lanes = us.map(function(u){ var n = (pg[u.id] || {}).n || 0;
      return '<div style="display:flex;align-items:center;gap:14px"><div style="width:170px;font-weight:800;font-size:1.2rem;display:flex;align-items:center;gap:8px"><i style="width:16px;height:16px;border-radius:50%;background:' + u.color + '"></i>' + esc(u.name) + '</div>' +
        '<div class="s-bar" style="flex:1;height:34px;position:relative"><i style="width:' + (100 * n / z) + '%;background:' + u.color + '"></i><span style="position:absolute;right:12px;top:4px;font-weight:900">' + n + ' / ' + z + '</span></div></div>';
    }).join("");
    var w = s.state.winner;
    set(el, ph + JSON.stringify(pg), '<div class="s-top"><span class="s-badge">🧩 Team-Match</span><span style="flex:1"></span><span class="s-pill">Ziel: ' + z + ' richtige in Folge</span></div>' +
      (ph === "ende" && w ? '<div class="s-center" style="flex:0;margin:10px 0 24px"><div class="s-big">🏆</div><div class="s-title">' + esc(KX.unitName(s, w)) + ' gewinnt!</div></div>' : '<div style="text-align:center;font-size:1.3rem;opacity:.85;margin-bottom:22px">Jede:r hat andere Antworten auf dem Handy. Sprecht miteinander: Wer hat die richtige?</div>') +
      '<div style="display:flex;flex-direction:column;gap:16px">' + lanes + '</div>', function(e){ if (ph === "ende") { KX.confetti(e); KX.sound("end"); } });
  },
  player:function(s, el, code, pid){
    var ph = s.state.phase, u = KX.unitOf(s, pid);
    if (ph === "lobby") return set(el, "L" + u, lobbyPlayer(s, pid, "Jede:r sieht nur einen Teil der Antworten. Redet miteinander!"));
    if (ph === "ende") { var w = s.state.winner; return set(el, "E", '<div class="pl-center"><div class="pl-big">' + (w === u ? "🏆" : "👏") + '</div><h2 style="margin:0">' + (w === u ? "Gewonnen!" : esc(KX.unitName(s, w)) + " hat gewonnen") + '</h2></div>', function(e){ if (w === u) KX.confetti(e); }); }
    if (!u) return set(el, "N", '<div class="pl-center">Du bist noch keinem Team zugeteilt.</div>');
    var pg = (s.pg || {})[u] || {n:0, q:0}, q = pg.q || 0, o = tmOptions(s, code, u, q), mine = o.by[pid] || [], z = s.meta.settings.ziel || 8;
    var locked = pg.lock && KX.now() < pg.lock, last = pg.last && KX.now() - pg.last.at < 4000 ? pg.last : null;
    if (!sig(el, "Q" + q + (pg.n || 0) + mine.map(function(x){ return x.t; }).join("|") + locked + (last ? last.at : ""))) return;
    el.innerHTML = '<div class="row" style="justify-content:space-between"><b>' + esc(KX.unitName(s, u)) + '</b><span class="tag n">' + (pg.n || 0) + ' / ' + z + '</span></div>' +
      '<div class="s-bar" style="background:var(--hover);height:12px"><i style="width:' + (100 * (pg.n || 0) / z) + '%;background:var(--ok)"></i></div>' +
      (last ? '<div class="pl-res ' + (last.ok ? "ok" : "bad") + '" style="padding:10px;font-size:1rem">' + (last.ok ? "✓ Richtig – " + esc(last.by) : "✗ " + esc(last.by) + " hat „" + esc(last.t) + "“ gewählt") + '</div>' : '') + qPlayerHTML(o.it);
    if (!mine.length) { var n = document.createElement("div"); n.className = "pl-center"; n.innerHTML = '<div class="pl-big">🗣️</div><b>Diesmal hast du keine Antwort.</b><div class="muted">Lies die Frage vor und hilf deinem Team!</div>'; el.appendChild(n); return; }
    el.appendChild(choiceButtons(o.it, mine.map(function(x, k){ return {t:x.t, k:k, color:(x.t.length + k) % 4}; }), function(k){
      if (locked) return; var pick = mine[k], name = (s.players[pid] || {}).name;
      db().tx(KX.sp(code, "pg", u), function(cur){
        cur = cur || {n:0, q:0}; if ((cur.q || 0) !== q) return undefined;
        var nn = pick.ok ? (cur.n || 0) + 1 : (s.meta.settings.streng ? 0 : Math.max(0, (cur.n || 0) - 1));
        return {n:nn, q:q + 1, lock:pick.ok ? 0 : KX.now() + 1800, last:{ok:pick.ok, by:name, t:pick.t, at:KX.now()}};
      }).then(function(r){ if (r.committed) KX.sound(pick.ok ? "ok" : "bad"); });
    }, {grid:mine.length > 2}));
    if (locked) { var l = document.createElement("div"); l.className = "muted"; l.style.textAlign = "center"; l.textContent = "Kurze Pause …"; el.appendChild(l); setTimeout(function(){ el._sig = null; }, Math.max(0, pg.lock - KX.now() + 50)); }
  },
  summary:function(s){ return KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){ return {name:u.name, wert:((s.pg || {})[u.id] || {}).n || 0}; }).sort(function(a, b){ return b.wert - a.wert; }); }
};

/* ==========================================================
   4 · TEAM-RALLYE – Stationen im eigenen Tempo
   ========================================================== */
F.rallye = {
  name:"Team-Rallye", emoji:"🏁", art:"quiz", typen:["mc", "luecke", "wf", "reihenfolge", "paare"], modi:["gruppen", "paare", "einzeln"], modus:"gruppen",
  farbe:["#16a34a", "#065f46"], kurz:"Teams lösen alle Stationen im eigenen Tempo: Zuordnen, Satzbau, Lücken. 3 Punkte beim ersten Versuch, 1 beim zweiten.",
  settings:[{k:"dauer", label:"Zeitlimit (Min., 0 = ohne)", typ:"zahl", def:15, min:0, max:90}, {k:"anzahl", label:"Anzahl Stationen", typ:"zahl", def:15, min:3, max:80}, {k:"mischen", label:"Reihenfolge mischen", typ:"ja", def:false}],
  prepare:function(items, st){ var a = items.filter(function(i){ return this.typen.indexOf(i.typ) >= 0; }, this); if (st.mischen) a = KX.shuffle(a); return a.slice(0, st.anzahl || 15); },
  rows:function(s){ var pg = s.pg || {}, n = s.content.items.length;
    return KX.units(s).filter(function(u){ return u.members.length; }).map(function(u){ var p = pg[u.id] || {}; return {id:u.id, name:u.name, color:s.meta.modus === "einzeln" ? "#2f4fd1" : u.color, pts:p.pts || 0, i:Math.min(p.i || 0, n), fin:p.fin || 0}; })
      .sort(function(a, b){ return b.pts - a.pts || (a.fin || 9e15) - (b.fin || 9e15); }); },
  tick:function(code, s){
    if (s.state.phase !== "live") return;
    var rows = F.rallye.rows(s), n = s.content.items.length;
    if ((s.state.endsAt && KX.now() > s.state.endsAt) || (rows.length && rows.every(function(r){ return r.i >= n; }))) return db().update(KX.sp(code, "state"), {phase:"ende"});
  },
  control:function(s, el, code){
    var ph = s.state.phase, d = +s.meta.settings.dauer || 0;
    set(el, ph, ph === "lobby" ? hostPanel("Warteraum", btn("go", "▶ Rallye starten", "primary big"), "") : ph === "live" ? hostPanel("Rallye läuft", btn("end", "Beenden", "bad"), s.state.endsAt ? KX.timerBar(s.state.endsAt, d * 60) : "") : hostPanel("Rallye beendet", "", ""),
      function(el){ bindActs(el, {go:function(){ return db().update(KX.sp(code, "state"), {phase:"live", startAt:KX.now(), endsAt:d ? KX.now() + d * 60000 : 0}); }, end:function(){ return db().update(KX.sp(code, "state"), {phase:"ende"}); }}); });
  },
  stage:function(s, el, code){
    var ph = s.state.phase, n = s.content.items.length;
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}) + s.meta.teamCount, joinScreen(s, code, s.meta.titel, "🏁 Team-Rallye · " + n + " Stationen"), afterJoin(code));
    var rows = F.rallye.rows(s);
    if (ph === "ende") return set(el, "E", '<div class="s-center"><div class="s-title">🏁 Ziel!</div>' + podium(rows, function(r){ return r.pts + " P."; }) + rankList(rows.slice(3), function(r){ return r.pts + " P."; }, 3) + '</div>', function(e){ KX.confetti(e); KX.sound("end"); });
    set(el, "R" + JSON.stringify(rows), '<div class="s-top"><span class="s-badge">🏁 Team-Rallye · ' + n + ' Stationen</span><span style="flex:1"></span>' + (s.state.endsAt ? KX.timerHTML(s.state.endsAt, (s.meta.settings.dauer || 1) * 60) : '') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' + rows.map(function(r, k){
        return '<div style="display:flex;align-items:center;gap:14px;font-weight:800;font-size:1.2rem"><span style="width:28px;opacity:.7">' + (k + 1) + '.</span><span style="width:190px;display:flex;align-items:center;gap:8px;overflow:hidden;white-space:nowrap"><i style="width:14px;height:14px;border-radius:50%;flex:none;background:' + r.color + '"></i>' + esc(r.name) + '</span>' +
          '<div class="s-bar" style="flex:1;position:relative"><i style="width:' + (100 * r.i / n) + '%;background:' + r.color + '"></i></div><span style="width:90px;text-align:right">' + (r.i >= n ? "🏁 " : r.i + "/" + n + " ") + '</span><span style="width:70px;text-align:right">' + r.pts + ' P.</span></div>';
      }).join("") + '</div>');
  },
  player:function(s, el, code, pid){
    var ph = s.state.phase, u = KX.unitOf(s, pid), n = s.content.items.length;
    if (ph === "lobby") return set(el, "L" + u, lobbyPlayer(s, pid, s.meta.modus === "einzeln" ? "" : "Ihr löst die Stationen gemeinsam – jede:r kann antworten."));
    var pg = (s.pg || {})[u] || {i:0, pts:0, tries:0}, i = pg.i || 0, rows = F.rallye.rows(s), pos = rows.findIndex(function(r){ return r.id === u; }) + 1;
    if (ph === "ende" || i >= n) return set(el, "E" + ph + pg.pts + pos, '<div class="pl-center"><div class="pl-big">🏁</div><h2 style="margin:0">' + (ph === "ende" ? "Platz " + pos : "Geschafft!") + '</h2><div class="muted">' + (pg.pts || 0) + ' Punkte' + (ph !== "ende" ? " · warte auf die anderen" : "") + '</div></div>', function(e){ if (ph === "ende" && pos === 1) KX.confetti(e); });
    if (!u) return set(el, "N", '<div class="pl-center">Du bist noch keinem Team zugeteilt.</div>');
    var it = s.content.items[i], last = pg.last && KX.now() - pg.last.at < 4000 ? pg.last : null;
    if (!sig(el, "Q" + i + (pg.tries || 0) + (last ? last.at : ""))) return;
    el.innerHTML = '<div class="row" style="justify-content:space-between"><b>Station ' + (i + 1) + ' / ' + n + '</b><span class="tag n">' + (pg.pts || 0) + ' P.</span></div>' +
      '<div class="s-bar" style="background:var(--hover);height:10px"><i style="width:' + (100 * i / n) + '%;background:var(--ok)"></i></div>' +
      (last ? '<div class="pl-res ' + (last.ok ? "ok" : "bad") + '" style="padding:10px;font-size:1rem">' + (last.ok ? "✓ Richtig! +" + last.p : last.sol ? "✗ Lösung: " + esc(last.sol) : "✗ Noch ein Versuch!") + '</div>' : '') +
      (pg.tries ? '<div class="small muted" style="text-align:center">2. Versuch – noch 1 Punkt möglich</div>' : '') + qPlayerHTML(it);
    el.appendChild(answerWidget(it, code + "r" + u + i + "t" + (pg.tries || 0), function(v){
      var ok = check(it, v), maxT = 2;
      db().tx(KX.sp(code, "pg", u), function(cur){
        cur = cur || {i:0, pts:0, tries:0}; if ((cur.i || 0) !== i) return undefined;
        var t = cur.tries || 0;
        if (ok) return {i:i + 1, pts:(cur.pts || 0) + (t === 0 ? 3 : 1), tries:0, fin:i + 1 >= n ? KX.now() : 0, last:{ok:true, p:t === 0 ? 3 : 1, at:KX.now()}};
        if (t + 1 >= maxT) return {i:i + 1, pts:cur.pts || 0, tries:0, fin:i + 1 >= n ? KX.now() : 0, last:{ok:false, sol:solutionText(it), at:KX.now()}};
        return {i:i, pts:cur.pts || 0, tries:t + 1, last:{ok:false, at:KX.now()}};
      }).then(function(r){ if (r.committed) KX.sound(ok ? "ok" : "bad"); });
    }));
  },
  summary:function(s){ return F.rallye.rows(s).map(function(r){ return {name:r.name, wert:r.pts}; }); }
};

/* ==========================================================
   5 · SPRECHDUELL – Paare mit Rollenkarten, Partnerwechsel
   ========================================================== */
F.sprechduell = {
  name:"Sprechduell", emoji:"🗣️", art:"karten", typen:null, modi:["paare"], modus:"paare",
  farbe:["#e11d48", "#7c2d12"], kurz:"Paare bekommen Rollenkarten aufs Handy, sprechen auf Zeit und bewerten sich. Jede Runde neue Partner:innen.",
  settings:[{k:"lesezeit", label:"Lesezeit (s)", typ:"zahl", def:45, min:0, max:300}, {k:"sprechzeit", label:"Sprechzeit (s, 0 = wie Karte)", typ:"zahl", def:0, min:0, max:900},
    {k:"gleich", label:"Alle Paare gleiche Karte", typ:"ja", def:false}, {k:"bewerten", label:"Gegenseitig bewerten", typ:"ja", def:true}],
  prepare:function(items){ return KX.shuffle(items); },
  cardFor:function(s, g){ var st = s.state, n = s.content.items.length; return s.content.items[(st.gleich ? st.round : st.round * 7 + g) % n]; },
  newRound:function(code, s){
    var st = s.state, met = KX.clone(st.met) || {}, ids = KX.onlineIds(s);
    if (ids.length < 2) { KX.toast("Mindestens 2 TN nötig."); return; }
    var pairs = KX.makePairs(ids, met), r = (st.round == null ? -1 : st.round) + 1, lz = +s.meta.settings.lesezeit || 0;
    pairs.forEach(function(g){ for (var x = 0; x < g.length; x++) for (var y = x + 1; y < g.length; y++) { var k = [g[x], g[y]].sort().join("|"); met[k] = (met[k] || 0) + 1; } });
    return db().set(KX.sp(code, "state"), {phase:lz ? "lesen" : "sprechen", round:r, pairs:pairs, met:met, gleich:!!s.meta.settings.gleich,
      endsAt:KX.now() + (lz || F.sprechduell.talkTime(s, pairs, r)) * 1000, total:lz || F.sprechduell.talkTime(s, pairs, r)});
  },
  talkTime:function(s, pairs, r){
    var sz = +s.meta.settings.sprechzeit; if (sz) return sz;
    var c = s.content.items[(s.meta.settings.gleich ? r : r * 7) % s.content.items.length] || {}; return c.dauer || 180;
  },
  tick:function(code, s){
    var st = s.state; if (!st.endsAt || KX.now() < st.endsAt + 300) return;
    if (st.phase === "lesen") { var t = F.sprechduell.talkTime(s, st.pairs, st.round); return db().update(KX.sp(code, "state"), {phase:"sprechen", endsAt:KX.now() + t * 1000, total:t}); }
    if (st.phase === "sprechen") return db().update(KX.sp(code, "state"), {phase:s.meta.settings.bewerten ? "bewerten" : "pause", endsAt:0});
  },
  stars:function(s){ var sc = {}; KX.vals(s.rt).forEach(function(round){ KX.vals(round).forEach(function(r){ Object.keys(r || {}).forEach(function(t){ sc[t] = (sc[t] || 0) + r[t]; }); }); }); return sc; },
  control:function(s, el, code){
    var st = s.state, ph = st.phase, rated = ph === "bewerten" ? Object.keys(((s.rt || {})[st.round]) || {}).length : 0;
    var html;
    if (ph === "lobby") html = hostPanel("Warteraum", btn("round", "▶ Erste Runde: Paare bilden", "primary big"), KX.onlineIds(s).length + " TN · ungerade Zahl → eine Dreiergruppe");
    else if (ph === "lesen" || ph === "sprechen") html = hostPanel("Runde " + (st.round + 1) + " · " + (ph === "lesen" ? "Karten lesen" : "Sprechen"), btn("skip", ph === "lesen" ? "Jetzt sprechen ▶" : "Zeit beenden", "primary big") + btn("plus", "+30 s"), KX.timerBar(st.endsAt, st.total || 60));
    else if (ph === "bewerten") html = hostPanel("Runde " + (st.round + 1) + " · Bewerten", btn("pause", "Weiter ▶", "primary big"), rated + " von " + KX.onlineIds(s).length + " haben bewertet");
    else if (ph === "pause") html = hostPanel("Pause nach Runde " + (st.round + 1), btn("round", "▶ Neue Runde, neue Paare", "primary big") + btn("end", "Beenden", "bad"), "");
    else html = hostPanel("Beendet", "", "");
    set(el, ph + st.round + rated + "|" + KX.onlineIds(s).length, html, function(el){ bindActs(el, {
      round:function(){ return F.sprechduell.newRound(code, L(s)); },
      skip:function(){ return db().update(KX.sp(code, "state"), {endsAt:KX.now()}); },
      plus:function(){ return db().update(KX.sp(code, "state"), {endsAt:L(s).state.endsAt + 30000, total:(L(s).state.total || 60) + 30}); },
      pause:function(){ return db().update(KX.sp(code, "state"), {phase:"pause"}); },
      end:function(){ return db().update(KX.sp(code, "state"), {phase:"ende"}); } }); });
  },
  stage:function(s, el, code){
    var st = s.state, ph = st.phase, nm = function(id){ return (s.players[id] || {}).name || "?"; };
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}), joinScreen(s, code, s.meta.titel, "🗣️ Sprechduell – Paare mit Rollenkarten"), afterJoin(code));
    if (ph === "ende") { var sc = F.sprechduell.stars(s), rows = Object.keys(sc).map(function(id){ return {name:nm(id), pts:sc[id]}; }).sort(function(a, b){ return b.pts - a.pts; });
      return set(el, "E", '<div class="s-center"><div class="s-title">🗣️ Danke fürs Sprechen!</div><div style="font-size:1.3rem;opacity:.85">' + ((st.round || 0) + 1) + ' Runden</div>' + (rows.length ? '<div style="opacity:.8;margin-top:10px">⭐ Meiste Sterne</div>' + rankList(rows.slice(0, 5), function(r){ return "⭐ " + r.pts; }) : '') + '</div>', function(e){ KX.confetti(e); }); }
    var pairsHTML = '<div class="s-teams">' + (st.pairs || []).map(function(g, k){ var c = F.sprechduell.cardFor(s, k);
      return '<div class="s-team"><h4>' + g.map(function(id){ return esc(nm(id)); }).join(' <span style="opacity:.5">↔</span> ') + '</h4><div class="m" style="opacity:.75">' + esc(c.titel) + '</div></div>'; }).join("") + '</div>';
    if (ph === "lesen" || ph === "sprechen") {
      var c0 = F.sprechduell.cardFor(s, 0);
      return set(el, ph + st.round + st.endsAt, '<div class="s-top"><span class="s-badge">Runde ' + (st.round + 1) + '</span><span class="s-badge">' + (ph === "lesen" ? "📖 Karte lesen" : "🗣️ Sprechen!") + '</span><span style="flex:1"></span>' + KX.timerHTML(st.endsAt, st.total || 60) + '</div>' +
        (st.gleich ? '<div class="s-q" style="text-align:left;font-size:1.6rem">' + esc(c0.titel) + '<div style="font-weight:600;font-size:1.1rem;margin-top:8px;color:#47506a">' + esc(c0.situation || c0.impuls || "") + '</div></div><div style="height:18px"></div>' : '<div style="font-size:1.25rem;opacity:.85;margin-bottom:12px">Findet eure Partnerin / euren Partner:</div>') + pairsHTML);
    }
    if (ph === "bewerten") return set(el, "B" + st.round + Object.keys(((s.rt || {})[st.round]) || {}).length, '<div class="s-center"><div class="s-big">⭐</div><div class="s-title">Bewertet eure Partner:innen</div><div class="s-pill">' + Object.keys(((s.rt || {})[st.round]) || {}).length + ' / ' + KX.onlineIds(s).length + '</div></div>');
    return set(el, "P" + st.round, '<div class="s-center"><div class="s-title">Runde ' + (st.round + 1) + ' geschafft 👏</div><div style="font-size:1.3rem;opacity:.85">Gleich: neue Karte, neue Partner:innen</div></div>');
  },
  player:function(s, el, code, pid){
    var st = s.state, ph = st.phase, nm = function(id){ return (s.players[id] || {}).name || "?"; };
    if (ph === "lobby") return set(el, "L", lobbyPlayer(s, pid, "Du bekommst gleich eine Rollenkarte und eine:n Partner:in."));
    if (ph === "ende") return set(el, "E", '<div class="pl-center"><div class="pl-big">🎉</div><h2 style="margin:0">Danke fürs Mitmachen!</h2><div class="muted">⭐ ' + (F.sprechduell.stars(s)[pid] || 0) + ' Sterne gesammelt</div></div>');
    if (ph === "pause") return set(el, "P" + st.round, '<div class="pl-center"><div class="pl-big">☕</div><h2 style="margin:0">Kurze Pause</h2><div class="muted">Gleich neue:r Partner:in</div></div>');
    var g = -1, pos = -1; (st.pairs || []).forEach(function(p, k){ var x = p.indexOf(pid); if (x >= 0) { g = k; pos = x; } });
    if (g < 0) return set(el, "X" + st.round, '<div class="pl-center"><div class="pl-big">⏳</div><b>Du bist in der nächsten Runde dabei.</b></div>');
    var grp = st.pairs[g], others = grp.filter(function(x){ return x !== pid; }), c = F.sprechduell.cardFor(s, g);
    if (ph === "bewerten") {
      var mine = (((s.rt || {})[st.round]) || {})[pid];
      if (mine) return set(el, "BD" + st.round, '<div class="pl-center"><div class="pl-big">✅</div><b>Danke für deine Bewertung!</b></div>');
      if (!sig(el, "B" + st.round)) return;
      var val = {};
      el.innerHTML = '<div class="pl-center" style="gap:22px"><h2 style="margin:0">Wie hat … gesprochen?</h2>' + others.map(function(o){
        return '<div><div style="font-weight:800;font-size:1.2rem;margin-bottom:6px">' + esc(nm(o)) + '</div><div class="stars" data-t="' + o + '">' + [1, 2, 3].map(function(k){ return '<button type="button" data-v="' + k + '">⭐</button>'; }).join("") + '</div></div>'; }).join("") +
        '<div class="small muted">1 = noch üben · 2 = gut · 3 = super</div><button class="btn primary big" type="button" disabled>Senden</button></div>';
      var send = el.querySelector(".btn.primary");
      el.querySelectorAll(".stars").forEach(function(row){ row.addEventListener("click", function(e){ var b = e.target.closest("[data-v]"); if (!b) return; val[row.dataset.t] = +b.dataset.v;
        row.querySelectorAll("button").forEach(function(x){ x.classList.toggle("on", +x.dataset.v <= +b.dataset.v); }); send.disabled = Object.keys(val).length < others.length; }); });
      send.onclick = function(){ db().set(KX.sp(code, "rt", st.round, pid), val); };
      return;
    }
    var role = c.impuls ? null : (pos === 0 ? c.rolleA : pos === 1 ? c.rolleB : null), colors = ["#2f6fe0", "#e2464f", "#6b7280"];
    var obs = pos >= 2 && !c.impuls;
    set(el, "C" + st.round + ph, '<div class="row" style="justify-content:space-between"><span class="tag n">Runde ' + (st.round + 1) + ' · ' + (ph === "lesen" ? "Lesen" : "Sprechen") + '</span><b>mit ' + others.map(function(o){ return esc(nm(o)); }).join(" & ") + '</b></div>' +
      KX.timerBar(st.endsAt, st.total || 60) +
      '<div class="rolecard"><div class="rh" style="background:' + colors[Math.min(pos, 2)] + '">' + esc(c.titel) + (role ? ' · Du bist: ' + esc(role.name) : obs ? ' · Du beobachtest' : '') + '</div><div class="rb">' +
      (c.situation ? '<h5>Situation</h5><div>' + esc(c.situation) + '</div>' : '') +
      (c.impuls ? '<h5>Impuls</h5><div style="font-size:1.15rem;font-weight:700">' + esc(c.impuls) + '</div>' : '') +
      (role ? '<h5>Deine Aufgabe</h5><div>' + esc(role.aufgabe) + '</div>' : '') +
      (obs ? '<h5>' + esc(c.rolleA.name) + '</h5><div>' + esc(c.rolleA.aufgabe) + '</div><h5>' + esc(c.rolleB.name) + '</h5><div>' + esc(c.rolleB.aufgabe) + '</div><h5>Deine Aufgabe</h5><div>Hör gut zu. Welche Redemittel benutzen die beiden? Danach bewertest du.</div>' : '') +
      (c.redemittel && c.redemittel.length ? '<h5>Redemittel</h5><ul>' + c.redemittel.map(function(r){ return '<li>' + esc(r) + '</li>'; }).join("") + '</ul>' : '') + '</div></div>');
  },
  summary:function(s){ var sc = F.sprechduell.stars(s); return Object.keys(sc).map(function(id){ return {name:(s.players[id] || {}).name, wert:sc[id]}; }).sort(function(a, b){ return b.wert - a.wert; }); }
};

/* ==========================================================
   6 · TABU – erklären ohne verbotene Wörter
   ========================================================== */
F.tabu = {
  name:"Tabu", emoji:"🚫", art:"begriffe", typen:null, modi:["gruppen"], modus:"gruppen",
  farbe:["#7c3aed", "#312e81"], kurz:"Eine Person erklärt, das eigene Team rät. Die Gegner passen am Handy auf und drücken „Tabu!“.",
  settings:[{k:"zeit", label:"Zeit pro Zug (s)", typ:"zahl", def:60, min:20, max:180}, {k:"runden", label:"Züge pro Team", typ:"zahl", def:3, min:1, max:10}],
  prepare:function(items){ return KX.shuffle(items); },
  teams:function(s){ return KX.units(s).filter(function(u){ return u.members.length; }); },
  nextTurn:function(code, s){
    var st = s.state, ts = F.tabu.teams(s), turn = (st.turn == null ? -1 : st.turn) + 1;
    if (!ts.length) { KX.toast("Erst Teams bilden."); return; }
    if (turn >= ts.length * (s.meta.settings.runden || 3)) return db().update(KX.sp(code, "state"), {phase:"ende"});
    var t = ts[turn % ts.length], mem = t.members.filter(function(id){ return s.players[id].online !== false; }).sort(), exI = ((st.exI || {})[t.id] || 0);
    var ex = mem[exI % Math.max(1, mem.length)];
    var exMap = KX.clone(st.exI) || {}; exMap[t.id] = exI + 1;
    return db().update(KX.sp(code, "state"), {phase:"bereit", turn:turn, team:t.id, ex:ex || null, exI:exMap, endsAt:0, log:null, w:st.w || 0});
  },
  startTurn:function(code, s){ var z = s.meta.settings.zeit || 60; return db().update(KX.sp(code, "state"), {phase:"zug", endsAt:KX.now() + z * 1000}); },
  mark:function(code, s, res, by){
    var st = s.state, w = st.w || 0, team = st.team;
    return db().tx(KX.sp(code, "state"), function(cur){
      if (!cur || cur.phase !== "zug" || (cur.w || 0) !== w) return undefined;
      cur.w = w + 1; cur.log = (cur.log || []).concat([{w:w, r:res, by:by || ""}]); return cur;
    }).then(function(r){ if (r.committed && res !== "skip") return inc(KX.sp(code, "scores", team), res === "ok" ? 1 : -1); });
  },
  tick:function(code, s){ var st = s.state; if (st.phase === "zug" && KX.now() > st.endsAt + 300) return db().update(KX.sp(code, "state"), {phase:"pause"}); },
  word:function(s, w){ var it = s.content.items; return it[(w || 0) % it.length]; },
  control:function(s, el, code){
    var st = s.state, ph = st.phase, nm = function(id){ return (s.players[id] || {}).name || "?"; };
    var html;
    if (ph === "lobby") html = hostPanel("Warteraum", btn("next", "▶ Erster Zug", "primary big"), "2–4 Teams empfohlen");
    else if (ph === "bereit") html = hostPanel(esc(KX.unitName(s, st.team)) + " · " + esc(nm(st.ex)) + " erklärt", btn("start", "Zeit starten", "primary big") + btn("next", "Andere Person"), "Die erklärende Person kann auch selbst am Handy starten.");
    else if (ph === "zug") html = hostPanel("Zug läuft · " + esc(KX.unitName(s, st.team)), btn("ok", "✓ Richtig", "ok big") + btn("tabu", "✕ Tabu", "bad") + btn("skip", "⏭"), KX.timerBar(st.endsAt, s.meta.settings.zeit || 60) + '<div style="margin-top:6px">Begriff: <b>' + esc(F.tabu.word(s, st.w).wort) + '</b></div>');
    else if (ph === "pause") html = hostPanel("Zug vorbei", btn("next", "▶ Nächster Zug", "primary big") + btn("end", "Beenden", "bad"), "");
    else html = hostPanel("Beendet", "", "");
    set(el, ph + st.turn + st.w + st.ex, html, function(el){ bindActs(el, {
      next:function(){ return F.tabu.nextTurn(code, L(s)); }, start:function(){ return F.tabu.startTurn(code, L(s)); },
      ok:function(){ return F.tabu.mark(code, L(s), "ok", "Spielleitung"); }, tabu:function(){ return F.tabu.mark(code, L(s), "tabu", "Spielleitung"); }, skip:function(){ return F.tabu.mark(code, L(s), "skip"); },
      end:function(){ return db().update(KX.sp(code, "state"), {phase:"ende"}); } }); });
  },
  stage:function(s, el, code){
    var st = s.state, ph = st.phase, nm = function(id){ return (s.players[id] || {}).name || "?"; }, ts = F.tabu.teams(s), sc = s.scores || {};
    if (ph === "lobby") return set(el, "L" + JSON.stringify(s.players || {}) + s.meta.teamCount, joinScreen(s, code, s.meta.titel, "🚫 Tabu"), afterJoin(code));
    var board = '<div class="s-teams">' + ts.map(function(t){ return '<div class="s-team" style="border-color:' + t.color + (t.id === st.team && ph !== "ende" ? ';background:' + t.color + '44' : '') + '"><h4><i style="background:' + t.color + '"></i>' + esc(t.name) + '<span style="margin-left:auto;font-size:1.5rem">' + (sc[t.id] || 0) + '</span></h4></div>'; }).join("") + '</div>';
    if (ph === "ende") { var rows = ts.map(function(t){ return {name:t.name, pts:sc[t.id] || 0}; }).sort(function(a, b){ return b.pts - a.pts; });
      return set(el, "E", '<div class="s-center"><div class="s-title">🚫 Tabu – Endstand</div>' + podium(rows, function(r){ return r.pts + " P."; }) + '</div>', function(e){ KX.confetti(e); KX.sound("end"); }); }
    var log = st.log || [], last = log[log.length - 1];
    var mid = ph === "bereit" ? '<div class="s-center"><div class="s-title">' + esc(KX.unitName(s, st.team)) + ' ist dran</div><div class="s-big" style="font-size:3.5rem">🎤 ' + esc(nm(st.ex)) + '</div><div style="font-size:1.3rem;opacity:.85">erklärt – gleich geht die Zeit los</div></div>'
      : ph === "zug" ? '<div class="s-center"><div class="s-top" style="margin:0;justify-content:center;gap:24px">' + KX.timerHTML(st.endsAt, s.meta.settings.zeit || 60) + '<div style="text-align:left"><div class="s-title">' + esc(KX.unitName(s, st.team)) + '</div><div style="font-size:1.2rem;opacity:.85">🎤 ' + esc(nm(st.ex)) + ' erklärt</div></div></div>' +
        '<div class="s-pill" style="font-size:1.4rem">✓ ' + log.filter(function(x){ return x.r === "ok"; }).length + ' &nbsp; ✕ ' + log.filter(function(x){ return x.r === "tabu"; }).length + '</div>' +
        (last ? '<div style="font-size:1.3rem;opacity:.9">' + (last.r === "ok" ? "✓ " + esc(F.tabu.word(s, last.w).wort) : last.r === "tabu" ? "🚫 Tabu! " + esc(last.by) : "⏭ " + esc(F.tabu.word(s, last.w).wort)) + '</div>' : '') + '</div>'
      : '<div class="s-center"><div class="s-title">Zug vorbei</div><div class="s-names">' + log.map(function(x){ return '<span style="background:' + (x.r === "ok" ? "#23a55a" : x.r === "tabu" ? "#e2464f" : "rgba(255,255,255,.15)") + '">' + esc(F.tabu.word(s, x.w).wort) + '</span>'; }).join("") + '</div></div>';
    set(el, ph + st.turn + log.length + st.ex, '<div class="s-top"><span class="s-badge">🚫 Tabu · Zug ' + ((st.turn || 0) + 1) + '</span></div>' + mid + board);
  },
  player:function(s, el, code, pid){
    var st = s.state, ph = st.phase, u = KX.unitOf(s, pid), nm = function(id){ return (s.players[id] || {}).name || "?"; }, me = (s.players[pid] || {}).name;
    if (ph === "lobby") return set(el, "L" + u, lobbyPlayer(s, pid, "Eine:r erklärt, das Team rät. Die anderen passen auf!"));
    if (ph === "ende") return set(el, "E", '<div class="pl-center"><div class="pl-big">🏁</div><h2 style="margin:0">Spiel vorbei</h2><div class="muted">' + esc(KX.unitName(s, u)) + ': ' + ((s.scores || {})[u] || 0) + ' Punkte</div></div>');
    if (ph === "pause") return set(el, "P" + st.turn, '<div class="pl-center"><div class="pl-big">⏸</div><b>Zug vorbei</b><div class="muted">Gleich ist das nächste Team dran.</div></div>');
    var isEx = st.ex === pid, myTeam = u === st.team, card = F.tabu.word(s, st.w);
    if (ph === "bereit") {
      if (!isEx) return set(el, "R" + st.turn, '<div class="pl-center"><div class="pl-big">' + (myTeam ? "👂" : "👀") + '</div><b>' + esc(nm(st.ex)) + ' erklärt gleich</b><div class="muted">' + (myTeam ? "Du rätst mit!" : "Pass auf verbotene Wörter auf!") + '</div></div>');
      return set(el, "R" + st.turn + "x", '<div class="pl-center"><div class="pl-big">🎤</div><h2 style="margin:0">Du erklärst!</h2><div class="muted">Dein Team rät. Verbotene Wörter nicht benutzen.</div><button class="btn primary big" type="button" data-go>Los geht’s</button></div>',
        function(e){ e.querySelector("[data-go]").onclick = function(){ F.tabu.startTurn(code, s); }; });
    }
    if (myTeam && !isEx) return set(el, "G" + st.turn, '<div class="pl-center"><div class="pl-big">🤔</div><h2 style="margin:0">Rate!</h2><div class="muted">' + esc(nm(st.ex)) + ' erklärt einen Begriff. Ruft eure Ideen laut!</div></div>');
    var cardHTML = '<div class="tabucard"><div class="w">' + esc(card.wort) + '</div><ul>' + (card.tabu || []).map(function(t){ return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></div>';
    if (isEx) return set(el, "X" + st.turn + st.w, KX.timerBar(st.endsAt, s.meta.settings.zeit || 60) + cardHTML +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><button class="btn bad big" data-r="tabu">✕ Tabu</button><button class="btn big" data-r="skip">⏭ Weiter</button><button class="btn ok big" data-r="ok">✓ Richtig</button></div>',
      function(e){ e.querySelectorAll("[data-r]").forEach(function(b){ b.onclick = function(){ F.tabu.mark(code, s, b.dataset.r, me); KX.sound(b.dataset.r === "ok" ? "ok" : "tick"); }; }); });
    return set(el, "O" + st.turn + st.w, '<div class="small muted" style="text-align:center">Aufpassen! ' + esc(nm(st.ex)) + ' darf diese Wörter nicht sagen:</div>' + cardHTML +
      '<button class="btn bad big" style="height:80px;font-size:1.6rem" data-r="tabu">🚫 Tabu!</button>',
      function(e){ e.querySelector("[data-r]").onclick = function(){ F.tabu.mark(code, s, "tabu", me); KX.sound("bad"); }; });
  },
  summary:function(s){ return F.tabu.teams(s).map(function(t){ return {name:t.name, wert:(s.scores || {})[t.id] || 0}; }).sort(function(a, b){ return b.wert - a.wert; }); }
};

KX.formatList = ["millionaer", "blitz", "teammatch", "rallye", "sprechduell", "tabu"];
KX.formatsFor = function(entry){ return KX.formatList.filter(function(id){ var f = F[id];
  if (f.art !== entry.art) return false; if (!f.typen) return true;
  return Object.keys(entry.typen || {}).some(function(t){ return f.typen.indexOf(t) >= 0; }); }); };
KX.checkAnswer = check; KX.solutionText = solutionText;
})();
