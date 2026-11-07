import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

let LORAS = null;
async function loraList(force = false) {
  if (!LORAS || force) LORAS = await (await api.fetchApi("/lsb/loras")).json();
  return LORAS;
}

const CSS = `
.lsb-wrap{display:flex;flex-direction:column;gap:4px;font:12px sans-serif;color:var(--input-text,#ddd);width:100%}
.lsb-row{display:flex;align-items:center;gap:4px}
.lsb-row select{flex:1;min-width:0;background:var(--comfy-input-bg,#222);color:inherit;border:1px solid #444;border-radius:4px;padding:2px}
.lsb-row.off select,.lsb-row.off .lsb-str{opacity:.45}
.lsb-str{display:flex;align-items:center;gap:2px}
.lsb-str input{width:46px;text-align:center;background:var(--comfy-input-bg,#222);color:inherit;border:1px solid #444;border-radius:4px}
.lsb-btn{cursor:pointer;background:#333;border:1px solid #555;border-radius:4px;color:inherit;padding:1px 6px}
.lsb-btn:hover{background:#444}.lsb-i{font-weight:bold;color:#7ab7ff}
.lsb-add{align-self:flex-start;margin-top:2px}
.lsb-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center}
.lsb-dlg{background:#1e1e1e;color:#ddd;width:min(900px,92vw);max-height:88vh;overflow:auto;border-radius:10px;padding:18px 22px;font:14px sans-serif;box-shadow:0 10px 40px #000}
.lsb-dlg h2{margin:0 0 4px;font-size:18px}.lsb-dlg h3{margin:16px 0 6px;font-size:14px;color:#9ab}
.lsb-sub{color:#999;font-size:12px}
.lsb-box{background:#2a3340;border-left:3px solid #7ab7ff;padding:8px 12px;border-radius:6px}
.lsb-chip{display:inline-block;background:#333;border:1px solid #555;border-radius:12px;padding:2px 10px;margin:2px;cursor:pointer}
.lsb-chip:hover{background:#4a5}
.lsb-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.lsb-imgs img,.lsb-imgs video{width:100%;border-radius:6px;cursor:zoom-in}
.lsb-desc{line-height:1.45}.lsb-desc img{max-width:100%}.lsb-desc a{color:#7ab7ff}
.lsb-pick{flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--comfy-input-bg,#222);color:inherit;border:1px solid #444;border-radius:4px;padding:2px 6px;cursor:pointer}
.lsb-row.off .lsb-pick{opacity:.45}
.lsb-pop{position:fixed;z-index:10001;background:#252525;border:1px solid #555;border-radius:8px;box-shadow:0 8px 30px #000;display:flex;flex-direction:column;font:13px sans-serif;color:#ddd}
.lsb-pop input{margin:8px;padding:6px 8px;border-radius:6px;border:1px solid #555;background:#1a1a1a;color:#eee;font-size:13px;outline:none}
.lsb-pop .lsb-list{overflow:auto;padding:0 4px 6px}
.lsb-pop .lsb-it{padding:4px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lsb-pop .lsb-it.act{background:#3b6fd6;color:#fff}.lsb-pop .lsb-it.cur{font-weight:bold}
.lsb-pop .lsb-cnt{padding:0 10px 6px;color:#888;font-size:11px}
.lsb-x{float:right;cursor:pointer;font-size:20px}`;
const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) => k != null && e.append(k));
  return e;
}

function sanitize(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((n) => {
    [...n.attributes].forEach((a) => {
      if (a.name.startsWith("on") || (/^(href|src)$/.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    });
    if (n.tagName === "A") { n.target = "_blank"; n.rel = "noopener"; }
  });
  return doc.body;
}

function strengthHints(htmlText) {
  const txt = new DOMParser().parseFromString(htmlText || "", "text/html").body.textContent || "";
  return txt.split(/(?<=[.!?\n])\s+/)
    .filter((s) => s.length < 300 && !/\b(cfg|sampling steps|steps of|sampler|scheduler)\b/i.test(s) && (/(strength|weight|stärke|gewicht|scale)s?\s*(of|:|=|at|von|auf|bei|around|between)?\s*[~≈-]?\s*\d/i.test(s) || /(best results|recommend|empfohlen|suggest|use (it )?at|works best|optimal)[^.]*(strength|weight|stärke|gewicht)/i.test(s) || /<lora:[^>]*:\s*-?\d/i.test(s)))
    .slice(0, 5);
}

function usageText(u) {
  if (!u) return null;
  const p = [];
  if (u.strength != null) p.push(`Stärke ${u.strength}`);
  if (u.strength_min != null || u.strength_max != null) p.push(`Bereich ${u.strength_min ?? "?"} – ${u.strength_max ?? "?"}`);
  if (u.clip_strength != null) p.push(`CLIP ${u.clip_strength}`);
  if (u.text) p.push(u.text);
  return p.length ? p.join(" · ") : null;
}

async function showInfo(name, refresh = false) {
  const ov = el("div", { className: "lsb-ov" });
  const dlg = el("div", { className: "lsb-dlg" }, "Lade Infos …");
  ov.append(dlg); document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  const d = await (await api.fetchApi(`/lsb/info?name=${encodeURIComponent(name)}${refresh ? "&refresh=1" : ""}`)).json();
  dlg.innerHTML = "";
  const x = el("span", { className: "lsb-x", textContent: "✕", onclick: () => ov.remove() });
  if (d.source === "none") {
    dlg.append(x, el("h2", { textContent: name }), el("p", { textContent: d.error || "Keine Infos gefunden." }),
      el("button", { className: "lsb-btn", textContent: "Von Civitai holen", onclick: () => { ov.remove(); showInfo(name, true); } }));
    return;
  }
  dlg.append(x, el("h2", { textContent: d.name || name }),
    el("div", { className: "lsb-sub", textContent: [d.version, d.base_model, `Quelle: ${d.source}`].filter(Boolean).join(" · ") }));

  dlg.append(el("h3", { textContent: "Empfohlene Stärke" }));
  const u = usageText(d.usage), hints = strengthHints((d.description || "") + "\n" + (d.version_description || ""));
  const box = el("div", { className: "lsb-box" });
  if (u) box.append(el("div", { innerHTML: `<b>${u}</b>` }));
  hints.forEach((h) => box.append(el("div", { textContent: "„" + h.trim() + "“" })));
  if (!u && !hints.length) box.append("Keine Angabe gefunden – siehe Beschreibung.");
  dlg.append(box);

  dlg.append(el("h3", { textContent: "Trigger" }));
  const tw = (d.trained_words || []).flatMap((w) => String(w).split(",")).map((w) => w.trim()).filter(Boolean);
  dlg.append(tw.length
    ? el("div", {}, tw.map((w) => el("span", { className: "lsb-chip", textContent: w, title: "Klicken = kopieren",
        onclick: (e) => { navigator.clipboard.writeText(w); e.target.textContent = "✓ kopiert"; setTimeout(() => (e.target.textContent = w), 900); } })))
    : el("div", { className: "lsb-box", textContent: "Keine Trigger nötig (keine hinterlegt)." }));

  if (d.notes) dlg.append(el("h3", { textContent: "Eigene Notizen" }), el("div", { textContent: d.notes }));

  if (d.images?.length) {
    dlg.append(el("h3", { textContent: "Beispielbilder" }));
    dlg.append(el("div", { className: "lsb-imgs" }, d.images.map((im) => im.type === "video"
      ? el("video", { src: im.url, muted: true, loop: true, autoplay: true, playsInline: true })
      : el("img", { src: im.url, loading: "lazy", onclick: () => window.open(im.url, "_blank") }))));
  }
  if (d.description) dlg.append(el("h3", { textContent: "Beschreibung" }), el("div", { className: "lsb-desc" }, ...sanitize(d.description).childNodes));
  if (d.version_description) dlg.append(el("h3", { textContent: "Versionshinweise" }), el("div", { className: "lsb-desc" }, ...sanitize(d.version_description).childNodes));
  const foot = el("p", {});
  if (d.url) foot.append(el("a", { href: d.url, target: "_blank", textContent: "Auf Civitai öffnen ↗", style: "color:#7ab7ff;margin-right:14px" }));
  foot.append(el("button", { className: "lsb-btn", textContent: "Neu von Civitai laden", onclick: () => { ov.remove(); showInfo(name, true); } }));
  dlg.append(foot);
}


const pretty = (n) => (n || "").replace(/\.safetensors$/, "");

function pickLora(anchor, list, current, onPick) {
  document.querySelector(".lsb-pop")?.remove();
  const rc = anchor.getBoundingClientRect();
  const w = Math.max(rc.width, 360), top = Math.min(rc.bottom + 4, window.innerHeight - 200);
  const pop = el("div", { className: "lsb-pop" });
  Object.assign(pop.style, { left: Math.min(rc.left, window.innerWidth - w - 8) + "px", top: top + "px", width: w + "px",
    maxHeight: Math.max(200, window.innerHeight - top - 12) + "px" });
  const inp = el("input", { type: "text", placeholder: "LoRA suchen …" });
  const cnt = el("div", { className: "lsb-cnt" }), box = el("div", { className: "lsb-list" });
  pop.append(inp, cnt, box); document.body.append(pop);
  let items = [], act = 0;
  const close = () => { pop.remove(); document.removeEventListener("pointerdown", outside, true); };
  const outside = (e) => { if (!pop.contains(e.target) && e.target !== anchor) close(); };
  document.addEventListener("pointerdown", outside, true);
  const choose = (v) => { onPick(v); close(); };
  const draw = () => {
    const words = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
    items = ["", ...list.filter((n) => words.every((w) => n.toLowerCase().includes(w)))];
    if (words.length) items.shift();
    act = Math.max(0, Math.min(act, items.length - 1));
    cnt.textContent = `${items.filter(Boolean).length} von ${list.length}`;
    box.innerHTML = "";
    items.forEach((n, i) => box.append(el("div", { className: "lsb-it" + (i === act ? " act" : "") + (n === current ? " cur" : ""),
      textContent: n ? pretty(n) : "— keine —", title: n, onclick: () => choose(n) })));
    box.children[act]?.scrollIntoView({ block: "nearest" });
  };
  inp.oninput = () => { act = 0; draw(); };
  pop.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "ArrowDown") { act++; draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { act--; draw(); e.preventDefault(); }
    else if (e.key === "Enter") { if (items[act] !== undefined) choose(items[act]); e.preventDefault(); }
    else if (e.key === "Escape") close();
  });
  ["pointerdown", "mousedown", "wheel"].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));
  act = Math.max(0, list.indexOf(current) + 1); draw(); inp.focus();
}

function buildWidget(node, inputName) {
  let rows = [];
  const wrap = el("div", { className: "lsb-wrap" });
  const stop = (e) => e.stopPropagation();
  ["pointerdown", "mousedown", "wheel", "keydown"].forEach((t) => wrap.addEventListener(t, stop));

  const resize = () => requestAnimationFrame(() => {
    const s = node.computeSize?.(); if (s) node.setSize([Math.max(node.size[0], s[0]), s[1]]);
    node.graph?.setDirtyCanvas(true, true);
  });

  async function render() {
    const list = await loraList();
    wrap.innerHTML = "";
    rows.forEach((r, i) => {
      const sel = el("button", { className: "lsb-pick", textContent: pretty(r.lora) || "— LoRA wählen —", title: r.lora || "" });
      sel.onclick = () => pickLora(sel, list, r.lora, (v) => { r.lora = v; sel.textContent = pretty(v) || "— LoRA wählen —"; sel.title = v; });
      const num = el("input", { type: "number", step: "0.05", value: r.strength });
      num.onchange = () => { r.strength = parseFloat(num.value) || 0; };
      const step = (d) => { r.strength = Math.round((r.strength + d) * 100) / 100; num.value = r.strength; };
      const on = el("input", { type: "checkbox", checked: r.on, title: "an/aus" });
      const row = el("div", { className: "lsb-row" + (r.on ? "" : " off") }, on, sel,
        el("span", { className: "lsb-str" },
          el("button", { className: "lsb-btn", textContent: "◀", onclick: () => step(-0.05) }), num,
          el("button", { className: "lsb-btn", textContent: "▶", onclick: () => step(0.05) })),
        el("button", { className: "lsb-btn lsb-i", textContent: "i", title: "Infos von Civitai / LoRA Manager",
          onclick: () => r.lora && showInfo(r.lora) }),
        el("button", { className: "lsb-btn", textContent: "✕", title: "Zeile entfernen", onclick: () => { rows.splice(i, 1); render(); } }));
      on.onchange = () => { r.on = on.checked; row.classList.toggle("off", !r.on); };
      wrap.append(row);
    });
    wrap.append(el("button", { className: "lsb-btn lsb-add", textContent: "+ LoRA",
      onclick: () => { rows.push({ on: true, lora: "", strength: 1.0 }); render(); } }));
    resize();
  }

  const widget = node.addDOMWidget(inputName, "LSB_ROWS", wrap, {
    getValue: () => JSON.stringify(rows),
    setValue: (v) => { try { rows = typeof v === "string" ? JSON.parse(v) : (v || []); } catch { rows = []; } render(); },
    getMinHeight: () => 34 + rows.length * 28,
    getHeight: () => 34 + rows.length * 28,
  });
  render();
  return { widget };
}

app.registerExtension({
  name: "waldbeat.LoraStackBypass",
  getCustomWidgets() {
    return { LSB_ROWS: (node, inputName) => buildWidget(node, inputName) };
  },
});
