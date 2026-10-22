// Sfondo del sito: filamento di DNA in cromo che gira piano su sé stesso (Three.js) e, in home, il cuore che batte
// con le cellule lontane. Dal 22/10/2026 il fondo è nero e quattro luci invisibili, una per colore del motto, girano
// attorno alla scena: si vedono solo i loro riflessi colorati che scorrono su cromo, cuore e cellule. Il colore del
// sito (--mood su <html>) e la parola sotto il motto seguono la luce che si riflette di più.
// Modelli (CC BY 4.0, crediti nel footer): DNA "DNA Procedural EEVEE" di Troy (assets/dna.glb),
// cuore "Anatomical Heart" di Mox3DModels (assets/heart-80k.glb, heart-30k.glb sui telefoni),
// cellula "Neutrophil" di Physio CG (assets/cellula-8k.glb).
// Si attiva su ogni elemento .site-background della pagina:
// - data-heart (home): cuore e cellule lontane al centro della composizione;
// - data-lite (scanner): versione leggera, senza cuore;
// - data-dim: sfondo più scuro;
// - data-tap (pagine pubbliche): cursore a croce su tutta la pagina tranne link, bottoni e campi (css/identity.css),
//   un clic dove c'è la croce dà un battito forte; lì si sente anche il battito (js/core/heart-sound.js).
// Battito "tum-tum" a BPM: fa battere il cuore e le cellule (non c'è più lo zoom della scena).
// Sugli schermi a 120 Hz o più disegna al massimo circa 60 fotogrammi al secondo, per consumare meno batteria.
// Carica anche no-zoom.js (niente ingrandimento su telefono), perché questo file c'è in ogni pagina.

import './no-zoom.js';
import { startHeartSound } from './heart-sound.js';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
const asset = (name) => new URL('../../assets/' + name, import.meta.url).href;
const DNA_URL = asset('dna.glb');

export const MOODS = {
    brace:    { word: 'drink',   hex: 0xff4a1c, deep: 0x3a0802 }, // brace (dal 21/10/2026 al posto del rosso strobo)
    magenta:  { word: 'love',    hex: 0x8a2c80, deep: 0x250a24 }, // bordeaux violaceo
    breathe:  { word: 'breathe', hex: 0x1fa39a, deep: 0x062f35 }, // petrolio
    ghiaccio: { word: 'peace',   hex: 0xcfe6ff, deep: 0x34506e }  // ghiaccio, luce del mattino
};
const ORDER = ['brace', 'magenta', 'breathe', 'ghiaccio']; // le quattro luci, nell'ordine del motto
const BPM = 30;         // battito tum-tum
const SPIN = 0.12;      // rotazione del filamento su sé stesso, in radianti al secondo (un giro ogni ~52 s)
const ORBIT = 0.22;     // giro delle luci attorno alla scena, in radianti al secondo (un giro ogni ~29 s)
const FOLLOW_HOLD = 2000; // la luce che dà il colore al sito cambia solo se un'altra resta più forte per 2 secondi
const FOLLOW_FADE = 0.8;  // secondi della dissolvenza del colore del sito verso la nuova luce

const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');

// luminanza relativa (WCAG) di un colore 0xRRGGBB
function luminance(n) {
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

// colore del sito (0xRRGGBB): lo usa il CSS come --mood, --mood-deep e --on-mood (testo dei bottoni pieni)
function setCssColor(hex, deep) {
    const root = document.documentElement.style;
    root.setProperty('--mood', cssHex(hex));
    root.setProperty('--mood-deep', cssHex(deep));
    root.setProperty('--on-mood', luminance(hex) < 0.18 ? '#f3f2ee' : '#050508');
}

// mood: la luce che in questo momento dà il colore al sito; moodAt: quando è cambiata (per la sequenza sotto il motto);
// beat/ph: forza (0-1) e fase (secondi) del battito; lights: quanto si vede ogni luce, lo scrive la scena a ogni fotogramma
const state = { mood: 'breathe', moodAt: performance.now(), beat: 0, ph: 0, nucBeat: 0, kickAt: -1e9, lights: null };
document.documentElement.dataset.mood = state.mood;
setCssColor(MOODS[state.mood].hex, MOODS[state.mood].deep);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// battito: un colpo che sale subito e si spegne; il "tum-tum" ne fa due, il secondo più debole
const pulse = (t, decay) => (t < 0 ? 0 : (1 - Math.exp(-t / 0.014)) * Math.exp(-t / decay));
const BEAT_GAP = Math.min(60 / BPM * 0.34, 0.24); // secondi fra il "tum" e il secondo "tum"
function beatAt(sec) {
    const ph = sec % (60 / BPM);
    return Math.min(1, pulse(ph, 0.075) + 0.6 * pulse(ph - BEAT_GAP, 0.07));
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
const loadThree = () => (window.THREE ? Promise.resolve(window.THREE) : loadScript(THREE_URL).then(() => window.THREE));

const ENV_VERT = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// "Studio" nero con strisce di luce bianca: è quello che il cromo riflette (i colori arrivano dalle luci che girano)
const ENV_FRAG = `
varying vec3 vDir;
float band(float x, float c, float w){ return 1.0 - smoothstep(0.0, w, abs(x - c)); }
void main(){
  vec3 d = normalize(vDir);
  vec3 c = vec3(0.003);
  c += vec3(7.0) * smoothstep(0.88, 0.97, d.y);
  c += vec3(3.0) * band(d.y, 0.38, 0.045);
  c += vec3(3.5) * band(d.x, 0.78, 0.05) * step(-0.25, d.y);
  c += vec3(1.6) * band(d.x, -0.72, 0.035) * step(0.05, d.y);
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
}`;

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// Passaggio finale: leggera separazione dei colori ai bordi, righe del monitor, grana, vignetta
const POST_FRAG = `
uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uDim;
varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 fc = vUv - 0.5;
  vec2 ca = fc * 0.006;
  vec3 col = vec3(texture2D(tDiffuse, vUv + ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - ca).b);
  col *= 0.94 + 0.06 * sin(vUv.y * uRes.y * 1.5708);
  col += (rnd(vUv * uRes + fract(uTime * 0.37)) - 0.5) * 0.04;
  col *= smoothstep(1.05, 0.3, length(fc * vec2(1.0, 1.15)) * 1.25);
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
}`;

// Riflesso delle quattro luci che girano: uLD è la direzione di ogni luce vista dalla camera, uLC il suo colore.
// Il metallo le riflette come fari nel buio: la luce non si vede, il riflesso scorre sugli oggetti mentre gira.
const LIGHTS_GLSL = `
uniform vec3 uLD[4]; uniform vec3 uLC[4];
vec3 lightsRefl(vec3 n, vec3 vpos){
  vec3 r = reflect(normalize(-vpos), normalize(n)); vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) { float d = max(dot(r, uLD[i]), 0.0); c += uLC[i] * (pow(d, 6.0) * 1.1 + pow(d, 60.0) * 3.5); }
  return c;
}
`;
const LIGHTS_ADD = 'gl_FragColor.rgb += lightsRefl(normal, -vViewPosition);\n#include <tonemapping_fragment>';

// rumore per la dissolvenza con cui il filamento compare
const NOISE = `
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

// ---------- modello del DNA ----------

// Legge assets/dna.glb: 3 mesh senza trasformazioni, "Pairs" (pioli, nel colore del motto) e "Struts" (filamenti, in cromo).
// Posizioni e normali sono intercalate nello stesso blocco di dati.
function parseGlb(buf) {
    const jsonLen = new DataView(buf).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    const bin = 20 + jsonLen + 8;
    const read = (i, n) => {
        const a = json.accessors[i], bv = json.bufferViews[a.bufferView], off = bin + (bv.byteOffset || 0);
        if (a.componentType !== 5126) return new (a.componentType === 5125 ? Uint32Array : Uint16Array)(buf, off + (a.byteOffset || 0), a.count).slice();
        const stride = (bv.byteStride || n * 4) / 4, src = new Float32Array(buf, off, bv.byteLength / 4), out = new Float32Array(a.count * n);
        for (let k = 0, o = (a.byteOffset || 0) / 4; k < a.count; k++, o += stride) for (let c = 0; c < n; c++) out[k * n + c] = src[o + c];
        return out;
    };
    return json.nodes.filter((nd) => nd.mesh !== undefined).map((nd) => {
        const p = json.meshes[nd.mesh].primitives[0];
        return { pos: read(p.attributes.POSITION, 3), nor: read(p.attributes.NORMAL, 3), idx: read(p.indices, 1), pairs: json.materials[p.material].name === 'Pairs' };
    });
}

// Asse del filamento. I pioli interi (lunghi ~15, da un filamento all'altro) hanno un pomello da un lato solo e si alternano,
// quindi i loro punti medi stanno su due binari ai lati dell'asse: si ordinano lungo il filamento (Dijkstra sul grafo dei vicini)
// e si fa la media dei pioli vicini. Ogni vertice prende poi il punto (aAxis), la direzione (aTan) e la posizione lungo l'asse
// (aParam, in pioli) più vicini: lì ruota per girare su sé stesso.
function computeAxis(THREE, parts) {
    const pr = parts.find((q) => q.pairs), P = pr.pos, idx = pr.idx, count = P.length / 3;
    const ids = new Map(), vid = new Int32Array(count);
    for (let i = 0; i < count; i++) {
        const k = Math.round(P[i * 3] * 1000) + ',' + Math.round(P[i * 3 + 1] * 1000) + ',' + Math.round(P[i * 3 + 2] * 1000);
        if (!ids.has(k)) ids.set(k, ids.size);
        vid[i] = ids.get(k);
    }
    const par = Int32Array.from({ length: ids.size }, (_, i) => i);
    const f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let t = 0; t < idx.length; t += 3) { const a = f(vid[idx[t]]); par[f(vid[idx[t + 1]])] = a; par[f(vid[idx[t + 2]])] = a; }
    const pieces = new Map();
    for (let i = 0; i < count; i++) {
        const r = f(vid[i]);
        if (!pieces.has(r)) pieces.set(r, []);
        pieces.get(r).push(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
    }
    const rungs = [...pieces.values()].map((pts) => {
        const far = (from) => pts.reduce((best, q) => (q.distanceToSquared(from) > best.distanceToSquared(from) ? q : best), pts[0]);
        const e1 = far(pts[0]), e2 = far(e1);
        return { mid: e1.clone().add(e2).multiplyScalar(0.5), len: e1.distanceTo(e2) };
    });
    const maxLen = Math.max(...rungs.map((r) => r.len));
    const pts = rungs.filter((r) => r.len > maxLen * 0.66).map((r) => r.mid);
    const nn = pts.map((p, i) => Math.min(...pts.map((q, j) => (i === j ? Infinity : p.distanceTo(q)))));
    const step = nn.slice().sort((x, y) => x - y)[nn.length >> 1];
    const nb = pts.map((p, i) => pts.map((q, j) => (i !== j && p.distanceTo(q) < step * 1.8 ? j : -1)).filter((j) => j >= 0));
    const geo = (src, allowed) => {
        const d = new Array(pts.length).fill(Infinity), done = new Uint8Array(pts.length);
        d[src] = 0;
        for (;;) {
            let x = -1;
            allowed.forEach((i) => { if (!done[i] && d[i] < Infinity && (x < 0 || d[i] < d[x])) x = i; });
            if (x < 0) return d;
            done[x] = 1;
            nb[x].forEach((y) => { const nd = d[x] + pts[x].distanceTo(pts[y]); if (nd < d[y]) d[y] = nd; });
        }
    };
    // il gruppo di pioli collegati più grande è il filamento
    const seen = new Uint8Array(pts.length);
    let comp = [];
    for (let s0 = 0; s0 < pts.length; s0++) {
        if (seen[s0]) continue;
        const c = [], stack = [s0];
        seen[s0] = 1;
        while (stack.length) { const x = stack.pop(); c.push(x); nb[x].forEach((y) => { if (!seen[y]) { seen[y] = 1; stack.push(y); } }); }
        if (c.length > comp.length) comp = c;
    }
    const d0 = geo(comp[0], comp);
    const end = comp.reduce((b, i) => (d0[i] > d0[b] ? i : b), comp[0]);
    const g = geo(end, comp);
    const order = comp.slice().sort((x, y) => g[x] - g[y]);
    const L = order.map((i) => {
        const acc = new THREE.Vector3(); let n = 0;
        order.forEach((j) => { if (Math.abs(g[j] - g[i]) <= step * 1.6) { acc.add(pts[j]); n++; } });
        return acc.multiplyScalar(1 / n);
    });
    const T = L.map((q, i) => L[Math.min(i + 2, L.length - 1)].clone().sub(L[Math.max(i - 2, 0)]).normalize());

    // per ogni vertice il segmento dell'asse più vicino (cicli su numeri semplici: sono ~140 mila vertici)
    const m = L.length - 1, ax = new Float32Array(m * 3), sg = new Float32Array(m * 3), sl = new Float32Array(m);
    for (let j = 0; j < m; j++) {
        ax[j * 3] = L[j].x; ax[j * 3 + 1] = L[j].y; ax[j * 3 + 2] = L[j].z;
        sg[j * 3] = L[j + 1].x - L[j].x; sg[j * 3 + 1] = L[j + 1].y - L[j].y; sg[j * 3 + 2] = L[j + 1].z - L[j].z;
        sl[j] = sg[j * 3] ** 2 + sg[j * 3 + 1] ** 2 + sg[j * 3 + 2] ** 2;
    }
    // griglia a celle di lato R: ogni cella conosce i segmenti a meno di R da lei, così per ogni vertice se ne provano pochi.
    // Se nessuno è a meno di R (non succede: il filamento ha raggio ~7) si provano tutti, quindi il risultato è sempre esatto.
    const R = 12, cellKey = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512), grid = new Map();
    for (let j = 0; j < m; j++) {
        const k = j * 3, lo = [0, 1, 2].map((c) => Math.floor((Math.min(ax[k + c], ax[k + c] + sg[k + c]) - R) / R));
        const hi = [0, 1, 2].map((c) => Math.floor((Math.max(ax[k + c], ax[k + c] + sg[k + c]) + R) / R));
        for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
            const key = cellKey(x, y, z);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(j);
        }
    }
    const all = Array.from({ length: m }, (_, j) => j);
    parts.forEach((q) => {
        const pos = q.pos, n = pos.length / 3;
        q.axis = new Float32Array(n * 3); q.tan = new Float32Array(n * 3); q.prm = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const vx = pos[i * 3], vy = pos[i * 3 + 1], vz = pos[i * 3 + 2];
            let best = Infinity, bj = 0, bt = 0;
            const near = (list) => {
                for (let s = 0; s < list.length; s++) {
                    const j = list[s], k = j * 3, wx = vx - ax[k], wy = vy - ax[k + 1], wz = vz - ax[k + 2];
                    const t = Math.min(1, Math.max(0, (wx * sg[k] + wy * sg[k + 1] + wz * sg[k + 2]) / sl[j]));
                    const dx = wx - sg[k] * t, dy = wy - sg[k + 1] * t, dz = wz - sg[k + 2] * t, d = dx * dx + dy * dy + dz * dz;
                    if (d < best) { best = d; bj = j; bt = t; }
                }
            };
            near(grid.get(cellKey(Math.floor(vx / R), Math.floor(vy / R), Math.floor(vz / R))) || []);
            if (best > R * R) near(all);
            const k = bj * 3, a = T[bj], b = T[bj + 1];
            q.axis[i * 3] = ax[k] + sg[k] * bt; q.axis[i * 3 + 1] = ax[k + 1] + sg[k + 1] * bt; q.axis[i * 3 + 2] = ax[k + 2] + sg[k + 2] * bt;
            q.tan[i * 3] = a.x + (b.x - a.x) * bt; q.tan[i * 3 + 1] = a.y + (b.y - a.y) * bt; q.tan[i * 3 + 2] = a.z + (b.z - a.z) * bt;
            q.prm[i] = bj + bt;
        }
    });
    return { L, T };
}

// cornici senza torsione (doppia riflessione) lungo una linea di punti
function rmfFrames(pts, tans, N0) {
    const Ns = [N0.clone()], Bs = [tans[0].clone().cross(N0)];
    for (let i = 1; i < pts.length; i++) {
        const v1 = pts[i].clone().sub(pts[i - 1]), c1 = v1.dot(v1) || 1e-9;
        const rL = Ns[i - 1].clone().sub(v1.clone().multiplyScalar(2 / c1 * v1.dot(Ns[i - 1])));
        const tL = tans[i - 1].clone().sub(v1.clone().multiplyScalar(2 / c1 * v1.dot(tans[i - 1])));
        const v2 = tans[i].clone().sub(tL), c2 = v2.dot(v2);
        const r = c2 < 1e-9 ? rL : rL.sub(v2.clone().multiplyScalar(2 / c2 * v2.dot(rL)));
        Ns.push(r.normalize()); Bs.push(tans[i].clone().cross(Ns[i]));
    }
    return { Ns, Bs };
}

// normale qualsiasi perpendicolare alla direzione t
function anyNormal(THREE, t) {
    const n = new THREE.Vector3(0, 1, 0);
    if (Math.abs(n.dot(t)) > 0.9) n.set(1, 0, 0);
    return n.sub(t.clone().multiplyScalar(n.dot(t))).normalize();
}

function makeGeometry(THREE, pos, nor, axis, tan, prm, index) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
    geo.setAttribute('aTan', new THREE.BufferAttribute(tan, 3));
    geo.setAttribute('aParam', new THREE.BufferAttribute(prm, 1));
    geo.setIndex(Array.isArray(index) ? index : new THREE.BufferAttribute(index, 1));
    return geo;
}

// L'elica del modello è regolarissima (un giro ogni 18 pioli): per allungare il filamento o farne un altro pezzo si copia
// un giro intero (i pezzi con la posizione lungo l'asse fra from e to) uno dopo l'altro lungo curve, con scala K e cornici
// senza torsione, così le copie si attaccano senza salti e girano su sé stesse come il resto.
// back: il nuovo percorso va all'indietro rispetto al modello (prolungamento dell'inizio); N0: normale di partenza;
// param(d): valore di aParam a distanza d lungo la curva.
function turnAlong(THREE, D, part, curve, { from, to, K = 1, back = false, N0, param }) {
    const { step, PERIOD, frameAt, sMax } = D;
    const P = part.pos, NO = part.nor, PR = part.prm, idx = part.idx, n = P.length / 3;
    const keep = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const sv = PR[i] * step; keep[i] = sv >= from && sv < to ? 1 : 0; }
    const tri = [];
    for (let t = 0; t < idx.length; t += 3) if (keep[idx[t]] && keep[idx[t + 1]] && keep[idx[t + 2]]) tri.push(idx[t], idx[t + 1], idx[t + 2]);
    if (!tri.length) return null;
    const used = [...new Set(tri)], remap = new Map(used.map((v, i) => [v, i]));
    const v = new THREE.Vector3(), nr = new THREE.Vector3();
    // coordinate di ogni vertice rispetto alla cornice dell'asse
    const loc = used.map((vi) => {
        const sv = Math.min(sMax, Math.max(0, PR[vi] * step)), f = frameAt(sv);
        v.set(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]).sub(f.p);
        nr.set(NO[vi * 3], NO[vi * 3 + 1], NO[vi * 3 + 2]);
        return { s: sv - from, c: v.dot(f.T), a: v.dot(f.N), b: v.dot(f.B), nc: nr.dot(f.T), na: nr.dot(f.N), nb: nr.dot(f.B) };
    });
    const M = 800, pts = curve.getSpacedPoints(M), len = curve.getLength();
    const tans = pts.map((q, i) => pts[Math.min(i + 1, M)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
    const NB = rmfFrames(pts, tans, N0 || anyNormal(THREE, tans[0]));
    // la curva in numeri semplici: punto, tangente (nel verso del modello) e normale a ogni campione
    const sign = back ? -1 : 1, tab = new Float32Array((M + 1) * 9);
    pts.forEach((p, i) => tab.set([p.x, p.y, p.z, tans[i].x * sign, tans[i].y * sign, tans[i].z * sign, NB.Ns[i].x, NB.Ns[i].y, NB.Ns[i].z], i * 9));
    const nl = loc.length, tri2 = tri.map((v) => remap.get(v));
    const copies = Math.ceil(len / (PERIOD * K)) + 1;
    const pos = new Float32Array(copies * nl * 3), nor = new Float32Array(copies * nl * 3), axis = new Float32Array(copies * nl * 3);
    const tan = new Float32Array(copies * nl * 3), prm = new Float32Array(copies * nl), index = [], dist = new Float32Array(nl);
    const f = new Float32Array(12); // punto, tangente, normale, binormale della curva alla distanza d
    const at = (d) => {
        const u = Math.min(M, Math.max(0, d / len * M)), i = Math.min(M - 1, Math.floor(u)), w = u - i, o = i * 9;
        for (let c = 0; c < 9; c++) f[c] = tab[o + c] + (tab[o + 9 + c] - tab[o + c]) * w;
        const tl = Math.hypot(f[3], f[4], f[5]) || 1, nlen = Math.hypot(f[6], f[7], f[8]) || 1;
        f[3] /= tl; f[4] /= tl; f[5] /= tl; f[6] /= nlen; f[7] /= nlen; f[8] /= nlen;
        f[9] = f[4] * f[8] - f[5] * f[7]; f[10] = f[5] * f[6] - f[3] * f[8]; f[11] = f[3] * f[7] - f[4] * f[6];
    };
    for (let k = 0; k < copies; k++) {
        const base = k * nl;
        for (let i = 0; i < nl; i++) {
            const q = loc[i];
            dist[i] = (back ? (k + 1) * PERIOD - q.s : q.s + k * PERIOD) * K;
            const d = Math.min(len, Math.max(0, dist[i])), o = (base + i) * 3;
            at(d);
            for (let c = 0; c < 3; c++) {
                pos[o + c] = f[c] + (f[3 + c] * q.c + f[6 + c] * q.a + f[9 + c] * q.b) * K;
                nor[o + c] = f[3 + c] * q.nc + f[6 + c] * q.na + f[9 + c] * q.nb;
                axis[o + c] = f[c];
                tan[o + c] = f[3 + c];
            }
            const nn = Math.hypot(nor[o], nor[o + 1], nor[o + 2]) || 1;
            nor[o] /= nn; nor[o + 1] /= nn; nor[o + 2] /= nn;
            prm[base + i] = param(d);
        }
        const ok = (i) => dist[i] >= 0 && dist[i] <= len;
        for (let t = 0; t < tri2.length; t += 3) {
            const a = tri2[t], b = tri2[t + 1], c = tri2[t + 2];
            if (ok(a) && ok(b) && ok(c)) index.push(base + a, base + b, base + c);
        }
    }
    if (!index.length) return null;
    return makeGeometry(THREE, pos, nor, axis, tan, prm, index);
}

// Prolungamenti del filamento (coordinate del modello). In basso il ricciolo finale (pioli 0-13) è tagliato e dal piolo 14
// il filamento curva piano verso il bordo destro ed esce; in alto la punta continua fino a uscire dallo schermo.
const EXTENSIONS = [
    { side: 'start', from: 14, target: [-233.7, -98.2, -23.5], ctrl: [-80.3, 13.5, -30.4], bend: 15 },
    { side: 'end', target: [-6.2, -221.2, -208.1], bend: 60 }
];
const CUT = 14;

// Scarica il modello e prepara tutto quello che non dipende dallo schermo (una volta sola per pagina)
let dnaPromise = null;
function loadDna(THREE) {
    if (dnaPromise) return dnaPromise;
    dnaPromise = fetch(DNA_URL).then((r) => {
        if (!r.ok) throw new Error('dna.glb ' + r.status);
        return r.arrayBuffer();
    }).then((buf) => {
        const parts = parseGlb(buf);
        // centro del modello in 0
        const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        parts.forEach((q) => { for (let i = 0; i < q.pos.length; i++) { lo[i % 3] = Math.min(lo[i % 3], q.pos[i]); hi[i % 3] = Math.max(hi[i % 3], q.pos[i]); } });
        const c = lo.map((l, k) => (l + hi[k]) / 2);
        parts.forEach((q) => { for (let i = 0; i < q.pos.length; i++) q.pos[i] -= c[i % 3]; });

        const { L, T } = computeAxis(THREE, parts);
        const n = L.length, S = [0];
        for (let i = 1; i < n; i++) S.push(S[i - 1] + L[i].distanceTo(L[i - 1]));
        const F = rmfFrames(L, T, anyNormal(THREE, T[0]));
        const frameAt = (s) => { // posizione, tangente e cornice sull'asse del modello
            let j = 0, hi = n - 2; // ultimo segmento che inizia prima di s
            while (j < hi) { const mid = (j + hi + 1) >> 1; if (S[mid] < s) j = mid; else hi = mid - 1; }
            const t = Math.min(1, Math.max(0, (s - S[j]) / (S[j + 1] - S[j])));
            return { p: L[j].clone().lerp(L[j + 1], t), T: T[j].clone().lerp(T[j + 1], t).normalize(), N: F.Ns[j].clone().lerp(F.Ns[j + 1], t).normalize(), B: F.Bs[j].clone().lerp(F.Bs[j + 1], t).normalize() };
        };
        const step = S[n - 1] / (n - 1);
        const D = { parts, n, S, step, PERIOD: 18 * step, sMax: S[n - 1], frameAt };

        // geometrie del filamento: il modello e i due prolungamenti
        D.main = parts.map((q) => ({ pairs: q.pairs, geo: makeGeometry(THREE, q.pos, q.nor, q.axis, q.tan, q.prm, q.idx) }));
        EXTENSIONS.forEach((E) => {
            const atEnd = E.side === 'end', sEnd = atEnd ? D.sMax : S[E.from], f0 = frameAt(sEnd);
            const P0 = f0.p, P1 = P0.clone().addScaledVector(f0.T, atEnd ? E.bend : -E.bend), G = new THREE.Vector3(...E.target);
            const P2 = E.ctrl ? new THREE.Vector3(...E.ctrl) : G.clone().addScaledVector(P1.clone().sub(G).normalize(), G.distanceTo(P1) * 0.45);
            const curve = new THREE.CubicBezierCurve3(P0, P1, P2, G);
            parts.forEach((q) => {
                // aParam dei prolungamenti: dopo l'ultimo piolo in cima; 5000+ per quello iniziale, così il taglio del ricciolo non lo nasconde
                const geo = turnAlong(THREE, D, q, curve, atEnd
                    ? { from: sEnd - D.PERIOD, to: Infinity, N0: f0.N, param: (d) => (n - 1) + d / step }
                    : { from: sEnd, to: sEnd + D.PERIOD, back: true, N0: f0.N, param: (d) => 5000 + d / step });
                if (geo) D.main.push({ pairs: q.pairs, geo });
            });
        });
        return D;
    });
    return dnaPromise;
}

// ---------- composizione ----------
// Il filamento intero parte grande in basso e si allontana in alto a destra, girando su sé stesso.
// Il centro (dove nella prova c'era il cuore) resta libero per il motto.
const POSE = { rot: [0.3, 0.3, 2.25], k: 0.1, portrait: [4, 0, -4], landscape: [4.8, 0, -4] };
// Secondo tratto sul lato sinistro: entra dal bordo in alto ed esce dal bordo sinistro. Curva in punti dello schermo:
// [x, y] da -1 a 1 e distanza dalla camera, così si adatta a telefono e computer.
const LEFT = {
    portrait: [[-0.35, 1.35, 16], [-0.5, 0.75, 18], [-0.8, 0.25, 20], [-1.45, 0.0, 22]],
    landscape: [[-0.3, 1.4, 16], [-0.45, 0.75, 18], [-0.75, 0.25, 20], [-1.4, 0.0, 22]]
};

// Cuore e cellule lontane (solo in home, data-heart): composizione approvata nella prova del 21/10/2026
const HEART_SCALE = 7.5;
const FAR_SCALE = 2.6;
// cellule lontane: punti dello schermo [x, y da -1 a 1, distanza dalla camera, grandezza]
const FAR = {
    portrait: [[-0.6, -0.48, 70, 0.74], [0.68, 0.58, 95, 0.81], [-0.45, 0.8, 125, 0.88], [0.5, -0.7, 62, 0.61], [0.1, -0.88, 150, 0.94], [-0.82, 0.12, 160, 0.94], [0.86, -0.08, 130, 0.81]],
    landscape: [[-0.6, -0.55, 70, 0.74], [0.6, 0.6, 95, 0.81], [-0.38, 0.8, 125, 0.88], [0.68, -0.68, 62, 0.61], [0.15, -0.86, 150, 0.94], [-0.86, 0.2, 160, 0.94], [0.9, 0.05, 130, 0.81]]
};
// sui telefoni e sui dispositivi poco potenti il cuore più leggero (30 mila triangoli invece di 80 mila)
const HEART_URL = asset(Math.min(screen.width, screen.height) < 700 || (navigator.hardwareConcurrency || 8) <= 4 ? 'heart-30k.glb' : 'heart-80k.glb');

// Scarica cuore e cellula (una volta sola per pagina), con il GLTFLoader di three r128
let organsPromise = null;
function loadOrgans(THREE) {
    if (organsPromise) return organsPromise;
    organsPromise = (THREE.GLTFLoader ? Promise.resolve() : loadScript(GLTF_URL)).then(() => {
        const loader = new THREE.GLTFLoader();
        const get = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
        return Promise.all([get(HEART_URL), get(asset('cellula-8k.glb'))]);
    }).then(([h, c]) => {
        let heart = null;
        h.scene.updateMatrixWorld(true);
        h.scene.traverse((o) => { if (o.isMesh && !heart) heart = o.geometry.clone().applyMatrix4(o.matrixWorld); });
        heart.center();
        const cell = {};
        c.scene.updateMatrixWorld(true);
        c.scene.traverse((o) => { if (o.isMesh) cell[o.material.name] = o.geometry.clone().applyMatrix4(o.matrixWorld); });
        cell.membrana.computeBoundingBox();
        const k = cell.membrana.boundingBox.getCenter(new THREE.Vector3());
        cell.membrana.translate(-k.x, -k.y, -k.z);
        cell.nucleo.translate(-k.x, -k.y, -k.z);
        return { heart, cell };
    });
    return organsPromise;
}

function createView(THREE, host) {
    const lite = host.hasAttribute('data-lite');
    const withHeart = host.hasAttribute('data-heart') && !lite;
    const dim = parseFloat(host.dataset.dim || '1');
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);

    let renderer;
    try {
        // con "riduci movimento" si disegna un solo fotogramma: preserveDrawingBuffer lo tiene sullo schermo
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: reduce, powerPreference: lite ? 'low-power' : 'high-performance' });
    } catch (e) {
        canvas.remove();
        return null;
    }
    const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const mood = MOODS[state.mood];
    const scene = new THREE.Scene();
    // nebbia nera: il filamento che si allontana sfuma nel buio
    scene.fog = new THREE.Fog(0, 34, 190);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);

    // il riflesso dello studio (fatto una volta sola); i colori arrivano dalle luci che girano
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: ENV_VERT, fragmentShader: ENV_FRAG })));
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    envScene.children[0].geometry.dispose();
    envScene.children[0].material.dispose();
    pmrem.dispose();

    // le quattro luci del motto: luci vere (accendono i pioli e i nuclei) e, per il cromo, direzione e colore del riflesso
    const lamps = ORDER.map((m) => { const l = new THREE.PointLight(MOODS[m].hex, 0, 40, 1.5); scene.add(l); return l; });
    const lightU = { uLD: { value: ORDER.map(() => new THREE.Vector3(0, 0, 1)) }, uLC: { value: ORDER.map(() => new THREE.Color(0)) } };
    const lampColor = ORDER.map((m) => linear(MOODS[m].hex));

    // Cromo del filamento: ogni punto gira attorno all'asse (aAxis/aTan) e il filamento ruota su sé stesso restando fermo;
    // compare con una dissolvenza a macchie dal bordo acceso nel colore del motto. cut: sotto questo aParam non si vede.
    const spinU = { value: 0 }, revealU = { value: 0 }, edgeU = { value: linear(mood.hex) };
    function strand(mat, key, cut) {
        mat.onBeforeCompile = (sh) => {
            Object.assign(sh.uniforms, { uSpin: spinU, uReveal: revealU, uEdge: edgeU }, lightU);
            sh.vertexShader = 'attribute vec3 aAxis; attribute vec3 aTan; attribute float aParam; uniform float uSpin; varying float vParam; varying vec3 vWp;\n' +
                'vec3 rotAx(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }\n' +
                sh.vertexShader
                    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = rotAx(objectNormal, normalize(aTan), uSpin);')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = aAxis + rotAx(position - aAxis, normalize(aTan), uSpin);\n' +
                        'vParam = aParam;\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            sh.fragmentShader = 'uniform float uReveal; uniform vec3 uEdge; varying float vParam; varying vec3 vWp;\n' + NOISE + LIGHTS_GLSL + sh.fragmentShader
                .replace('void main() {', 'void main() {\n' +
                    '  float dz = 0.65 * vn(vWp * 1.5) + 0.35 * vn(vWp * 4.2);\n' +
                    '  float thr = uReveal * 1.15 - 0.075;\n' +
                    '  if (dz > thr) discard;\n' +
                    (cut ? '  if (vParam < ' + cut.toFixed(1) + ') discard;\n' : '') +
                    '  float edgeAmt = (1.0 - smoothstep(0.0, 0.07, thr - dz)) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));')
                .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb += uEdge * edgeAmt * 6.0;\n' + LIGHTS_ADD);
        };
        // three r128 riusa lo stesso programma per i materiali con lo stesso onBeforeCompile: serve una chiave diversa
        mat.customProgramCacheKey = () => key;
        return mat;
    }
    const chromeMat = () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, side: THREE.DoubleSide });
    // pioli nel colore del motto
    const moodMat = () => new THREE.MeshStandardMaterial({ color: linear(mood.hex), emissive: linear(mood.hex), emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.18, side: THREE.DoubleSide });
    const mats = {
        chrome: strand(chromeMat(), 'dna-chrome', CUT), mood: strand(moodMat(), 'dna-mood', CUT),
        chromeL: strand(chromeMat(), 'dna-chrome-l', 0), moodL: strand(moodMat(), 'dna-mood-l', 0)
    };
    const dnaModel = new THREE.Group(), dnaLeft = new THREE.Group();
    dnaModel.visible = dnaLeft.visible = false;
    dnaModel.rotation.set(...POSE.rot);
    dnaModel.scale.setScalar(POSE.k);
    scene.add(dnaModel, dnaLeft);
    let D = null, readyAt = null;

    // gocce di metallo liquido che fluttuano attorno al centro, come nella prova (superficie che ondeggia come metallo fuso)
    const timeU = { value: 0 };
    const dropMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
    dropMat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = timeU;
        Object.assign(sh.uniforms, lightU);
        sh.fragmentShader = LIGHTS_GLSL + sh.fragmentShader.replace('#include <tonemapping_fragment>', LIGHTS_ADD);
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\n' +
            'vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;\n' +
            'float w = sin(wp.y * 2.1 + uTime * 1.5) * 0.5 + sin(wp.x * 3.7 - wp.z * 2.9 + uTime * 1.1) * 0.35 + sin(wp.y * 6.5 - uTime * 2.4) * 0.18;\n' +
            'transformed += normal * w * 0.05;');
    };
    dropMat.customProgramCacheKey = () => 'drop';
    const drops = new THREE.Group();
    for (let d = 0; d < (lite ? 0 : 12); d++) {
        const size = 0.05 + Math.random() * 0.17;
        const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), dropMat);
        drop.userData = { r: 3.4 + Math.random() * 1.8, y: (Math.random() - 0.5) * 6, a: Math.random() * Math.PI * 2, v: 0.12 + Math.random() * 0.25 };
        drops.add(drop);
    }
    drops.visible = false;
    scene.add(drops);

    // Cuore di metallo fuso (home): ondeggia come metallo liquido, si contrae sul battito (di più in basso, dove ci sono
    // i ventricoli) e un'onda corre dalla punta verso l'alto; compare con la stessa dissolvenza del filamento.
    // Cellule lontane: membrana di vetro-cromo (si vede soprattutto il bordo) e nucleo nel colore del sito, un attimo dopo.
    const beatU = { value: 0 }, waveU = { value: 0 }, nucBeatU = { value: 0 };
    function organ(mat, key, { amount, heart = false, swell = 0, beat = beatU, veil = false }) {
        mat.onBeforeCompile = (sh) => {
            Object.assign(sh.uniforms, { uTime: timeU, uBeat: beat, uWave: waveU, uReveal: revealU, uEdge: edgeU }, lightU);
            sh.vertexShader = 'uniform float uTime; uniform float uBeat; uniform float uWave; varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>',
                '#include <begin_vertex>\n' +
                'vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;\n' +
                'float w = sin(wp0.y * 2.1 + uTime * 1.5) * 0.5 + sin(wp0.x * 3.7 - wp0.z * 2.9 + uTime * 1.1) * 0.35 + sin(wp0.y * 6.5 - uTime * 2.4) * 0.18;\n' +
                'transformed += normal * w * ' + amount.toFixed(4) + ';\n' +
                (swell ? 'transformed *= 1.0 + uBeat * ' + swell.toFixed(3) + ';\n' : '') +
                (heart ? 'float low = smoothstep(0.35, -0.45, position.y);\n' +
                    'transformed *= 1.0 - uBeat * (0.035 + 0.075 * low);\n' +
                    'float ring = exp(-pow((position.y + 0.5) - uWave * 1.4, 2.0) * 60.0);\n' +
                    'transformed += normal * ring * 0.012 * step(0.001, uWave) * (1.0 - uWave);\n' : '') +
                'vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            sh.fragmentShader = 'uniform float uReveal; uniform vec3 uEdge; varying vec3 vWp;\n' + NOISE + LIGHTS_GLSL + sh.fragmentShader
                .replace('void main() {', 'void main() {\n' +
                    '  float dz = 0.65 * vn(vWp * 1.5) + 0.35 * vn(vWp * 4.2);\n' +
                    '  float thr = uReveal * 1.15 - 0.075;\n' +
                    '  if (dz > thr) discard;\n' +
                    '  float edgeAmt = (1.0 - smoothstep(0.0, 0.07, thr - dz)) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));')
                .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb += uEdge * edgeAmt * 6.0;\n' + LIGHTS_ADD);
            if (veil) sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>',
                'float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2);\n' +
                'gl_FragColor.a = clamp(max(mix(0.12, 1.0, fr), dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 0.9), 0.0, 1.0);\n' +
                '#include <tonemapping_fragment>');
        };
        mat.customProgramCacheKey = () => key;
        return mat;
    }
    const holder = new THREE.Group(), heartPivot = new THREE.Group(), farCells = new THREE.Group();
    holder.add(heartPivot);
    scene.add(holder, farCells);
    const heartMat = organ(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 }), 'heart', { amount: 0.0035, heart: true });
    const farMem = organ(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, transparent: true, depthWrite: false }), 'far-mem', { amount: 0.006, swell: 0.04, veil: true });
    const farCore = organ(new THREE.MeshStandardMaterial({ color: linear(mood.hex), emissive: linear(mood.hex), metalness: 0.55, roughness: 0.18, emissiveIntensity: 0.45 }), 'far-core', { amount: 0.004, swell: 0.025, beat: nucBeatU });
    let organs = null, farAspect = 0;
    function placeFar() {
        if (!organs || Math.abs(camera.aspect - farAspect) < 0.001) return;
        farAspect = camera.aspect;
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        farCells.clear();
        FAR[camera.aspect > 1 ? 'landscape' : 'portrait'].forEach(([x, y, d, k], i) => {
            const g = new THREE.Group();
            g.position.copy(ndcAt(x, y, d));
            g.scale.setScalar(FAR_SCALE * k);
            g.rotation.set(i * 1.7, i * 2.3, i * 0.9);
            g.userData = { y0: i * 2.3, spin: (i % 2 ? 1 : -1) * (0.08 + 0.03 * i) };
            const front = new THREE.Mesh(organs.cell.membrana, farMem);
            front.renderOrder = 3;
            g.add(new THREE.Mesh(organs.cell.nucleo, farCore), front);
            farCells.add(g);
        });
    }

    // polvere di dati
    const count = lite ? 250 : 700;
    const pos = new Float32Array(count * 3);
    for (let p = 0; p < count; p++) {
        const rr = 1.5 + Math.random() * 7, aa = Math.random() * Math.PI * 2;
        pos[p * 3] = Math.cos(aa) * rr; pos[p * 3 + 1] = (Math.random() - 0.5) * 16; pos[p * 3 + 2] = Math.sin(aa) * rr - 1.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustMat = new THREE.PointsMaterial({ color: linear(mood.hex), size: 0.035, transparent: true, opacity: 0.75, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    const dust2 = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.022, transparent: true, opacity: 0.5, depthWrite: false }));
    dust2.rotation.y = 1.7;
    scene.add(dust, dust2);

    const RT = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget && !lite ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    const rt = new RT(4, 4);
    rt.texture.encoding = THREE.sRGBEncoding;
    const post = new THREE.ShaderMaterial({
        vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
        uniforms: { tDiffuse: { value: rt.texture }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(4, 4) }, uDim: { value: dim } }
    });
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // punto del mondo che sullo schermo sta in [x, y] (da -1 a 1), a una certa distanza dalla camera
    const ndcAt = (x, y, dist) => {
        const v = new THREE.Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
        return camera.position.clone().addScaledVector(v, dist / -v.z);
    };
    // il tratto a sinistra dipende dalla forma dello schermo: si rifà solo se cambia abbastanza
    // (su telefono la barra dell'indirizzo che compare e sparisce cambia di poco l'altezza)
    let leftAspect = 0, leftTimer = 0;
    function placeLeft() {
        if (!D || (Math.abs(camera.aspect - leftAspect) < leftAspect * 0.03 && (camera.aspect > 1) === (leftAspect > 1))) return;
        leftAspect = camera.aspect;
        camera.zoom = 1; // i punti dello schermo sono pensati senza la pulsazione
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const curve = new THREE.CubicBezierCurve3(...LEFT[camera.aspect > 1 ? 'landscape' : 'portrait'].map((q) => ndcAt(...q)));
        dnaLeft.children.forEach((m) => m.geometry.dispose());
        dnaLeft.clear();
        const s0 = D.S[60], K = POSE.k;
        D.parts.forEach((q) => {
            const geo = turnAlong(THREE, D, q, curve, { from: s0, to: s0 + D.PERIOD, K, param: (d) => d / (D.step * K) });
            if (geo) dnaLeft.add(new THREE.Mesh(geo, q.pairs ? mats.moodL : mats.chromeL));
        });
    }

    // centro della composizione e camera come nella prova: sul telefono la camera si allontana per far stare tutto
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
        post.uniforms.uRes.value.set(w * dpr, h * dpr);
        camera.aspect = w / h;
        const landscape = w > h;
        drops.position.set(0, landscape ? 0 : 0.4, 0);
        holder.position.copy(drops.position);
        dnaModel.position.copy(drops.position).add(new THREE.Vector3(...POSE[landscape ? 'landscape' : 'portrait']));
        camera.position.set(0, 0, landscape ? 19 : Math.max(18, 10.5 / (0.611 * camera.aspect)));
        camera.updateProjectionMatrix();
        clearTimeout(leftTimer);
        leftTimer = setTimeout(() => { placeLeft(); placeFar(); }, leftAspect ? 250 : 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // il filamento (e in home il cuore) compaiono insieme, appena è arrivato tutto
    let ready = { dna: false, organs: !withHeart };
    function maybeReveal() {
        if (!ready.dna || !ready.organs) return;
        dnaModel.visible = dnaLeft.visible = true;
        // prepara subito gli shader, così la scena non scatta quando compare
        renderer.compile(scene, camera);
        readyAt = reduce ? -1e9 : performance.now();
        // "riduci movimento": non c'è l'animazione, quindi il fotogramma fermo si ridisegna qui con tutto dentro
        if (reduce) requestAnimationFrame(() => view.render(2600));
    }
    if (withHeart) {
        loadOrgans(THREE).then((o) => {
            organs = o;
            const heart = new THREE.Mesh(o.heart, heartMat);
            heart.scale.setScalar(HEART_SCALE);
            heartPivot.add(heart);
            farAspect = 0;
            placeFar();
        }).catch(() => { /* resta il DNA senza cuore */ }).then(() => { ready.organs = true; maybeReveal(); });
    }

    const lampDir = new THREE.Vector3();
    const view = {
        setDna(data) {
            D = data;
            D.main.forEach((q) => dnaModel.add(new THREE.Mesh(q.geo, q.pairs ? mats.mood : mats.chrome)));
            placeLeft();
            ready.dna = true;
            maybeReveal();
        },
        // colore del sito in questo momento (dissolvenza verso la luce più forte): pioli, nuclei, polvere, bordo della dissolvenza
        setColor(c) {
            [mats.mood, mats.moodL, farCore].forEach((mt) => { mt.color.copy(c); mt.emissive.copy(c); });
            edgeU.value.copy(c);
            dustMat.color.copy(c);
        },
        render(t) {
            const sec = t / 1000, b = state.beat;
            spinU.value = SPIN * sec;
            // il filamento e il cuore compaiono a macchie fra 0,3 e 1,7 secondi dopo essere arrivati
            revealU.value = readyAt === null ? 0 : Math.min(1, Math.max(0, ((t - readyAt) / 1000 - 0.3) / 1.4));
            const shown = revealU.value > 0;
            dnaModel.visible = dnaLeft.visible = holder.visible = farCells.visible = shown;
            // cuore e cellule battono; un'onda corre sul cuore a ogni colpo
            beatU.value = b;
            nucBeatU.value = state.nucBeat;
            waveU.value = Math.min(1, state.ph / Math.min(60 / BPM, 0.6));
            heartPivot.rotation.set(Math.sin(sec * 0.17) * 0.08, Math.sin(sec * 0.22) * 0.55, 0);
            farCells.children.forEach((g) => { g.rotation.y = g.userData.y0 + g.userData.spin * sec; });
            timeU.value = sec;
            drops.visible = revealU.value > 0.5;
            drops.children.forEach((dr) => {
                const q = dr.userData, ang = q.a + sec * q.v;
                dr.position.set(Math.cos(ang) * q.r, q.y + Math.sin(sec * 0.6 + q.a) * 0.3, Math.sin(ang) * q.r);
            });
            dust.rotation.y = sec * 0.03;
            dust2.rotation.y = 1.7 - sec * 0.02;
            dust.position.y = (sec * 0.15) % 2;
            // le quattro luci girano attorno alla scena; per il cromo conta da dove arriva ogni luce vista dalla camera,
            // per il colore del sito quanto ogni riflesso si vede (luce accesa e dalla parte della camera)
            camera.updateMatrixWorld();
            const weights = lamps.map((l, i) => {
                const ang = sec * ORBIT + i * Math.PI / 2;
                l.position.set(holder.position.x + Math.cos(ang) * 11, holder.position.y + Math.sin(ang) * 8, 3 - Math.sin(ang) * 4);
                l.intensity = 2.4 + 0.6 * Math.sin(sec * 0.7 + i * 1.3);
                lampDir.copy(l.position).sub(holder.position).normalize().transformDirection(camera.matrixWorldInverse);
                lightU.uLD.value[i].copy(lampDir);
                lightU.uLC.value[i].copy(lampColor[i]).multiplyScalar(l.intensity * 0.8);
                return l.intensity * Math.pow(Math.max(0, lampDir.z) + 0.15, 2);
            });
            state.lights = weights;
            post.uniforms.uTime.value = sec;
            renderer.setRenderTarget(rt);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCam);
        }
    };
    return view;
}

// Sequenza di DNA che si decifra nella parola del motto (solo dove c'è #dna-seq): la parola della luce che dà il
// colore al sito, 0,7 secondi dopo che è cambiata
function startSequence(el) {
    const BASES = 'ATCG', NOISE = '#/\\<>▓░_=+*', LEN = 26;
    const seq = Array.from({ length: LEN }, () => BASES[(Math.random() * 4) | 0]);
    function tick() {
        seq.shift();
        seq.push(BASES[(Math.random() * 4) | 0]);
        const out = seq.slice();
        const word = MOODS[state.mood].word.toUpperCase();
        const since = performance.now() - state.moodAt;
        if (since > 700) {
            const start = ((LEN - word.length) / 2) | 0;
            const shown = Math.min(word.length, Math.floor((since - 700) / 90));
            for (let k = 0; k < word.length; k++) out[start + k] = k < shown ? word[k] : NOISE[(Math.random() * NOISE.length) | 0];
            out[start - 1] = '·';
            out[start + word.length] = '·';
        }
        el.textContent = out.join(' ');
    }
    tick();
    if (!reduce) setInterval(() => { if (!document.hidden) tick(); }, 110);
}

async function init() {
    const hosts = document.querySelectorAll('.site-background');
    const seqEl = document.getElementById('dna-seq');
    if (seqEl) startSequence(seqEl);
    if (!hosts.length) return;

    let THREE;
    try {
        THREE = await loadThree();
    } catch (e) {
        return; // resta la sfumatura CSS
    }
    const views = [];
    hosts.forEach((host) => {
        const view = createView(THREE, host);
        if (view) {
            views.push(view);
            host.classList.add('ready');
        }
    });
    if (!views.length) return;

    // il filamento arriva dopo: fino ad allora si vedono la polvere e le gocce
    const dna = loadDna(THREE).then((D) => views.forEach((v) => v.setDna(D))).catch(() => { /* resta lo sfondo senza filamento */ });

    // Il colore del sito segue la luce che si riflette di più: passa piano verso quella luce (FOLLOW_FADE) e la parola
    // sotto il motto cambia solo se un'altra luce resta più forte di almeno il 15% per FOLLOW_HOLD millisecondi
    const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const toHex = (c) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
    const tint = { col: rgb(MOODS[state.mood].hex), deep: rgb(MOODS[state.mood].deep), last: 0, css: 0, hex: MOODS[state.mood].hex };
    const sceneColor = new THREE.Color();
    function followLight(t, instant) {
        const w = state.lights;
        if (!w) return;
        let best = 0;
        w.forEach((x, i) => { if (x > w[best]) best = i; });
        const cur = ORDER.indexOf(state.mood);
        if (best !== cur && (instant || (w[best] > w[cur] * 1.15 && t - state.moodAt > FOLLOW_HOLD))) {
            state.mood = ORDER[best];
            state.moodAt = t;
            document.documentElement.dataset.mood = state.mood;
        }
        const M = MOODS[state.mood], a = instant ? 1 : 1 - Math.exp(-Math.min(0.1, (t - tint.last) / 1000) / FOLLOW_FADE);
        tint.last = t;
        const to = rgb(M.hex), toDeep = rgb(M.deep);
        tint.col = tint.col.map((v, i) => v + (to[i] - v) * a);
        tint.deep = tint.deep.map((v, i) => v + (toDeep[i] - v) * a);
        sceneColor.setHex(toHex(tint.col)).convertSRGBToLinear();
        views.forEach((v) => v.setColor(sceneColor));
        // il CSS si aggiorna al massimo ogni 80 ms e solo se il colore è cambiato: la dissolvenza resta morbida
        // e la pagina non ricalcola gli stili a ogni fotogramma
        const hex = toHex(tint.col);
        if (hex === tint.hex || (!instant && t - tint.css < 80)) return;
        tint.css = t;
        tint.hex = hex;
        setCssColor(hex, toHex(tint.deep));
    }

    if (reduce) {
        // "riduci movimento": un fotogramma fermo, con il colore della luce che si vede di più
        const still = () => requestAnimationFrame(() => { views.forEach((v) => v.render(2600)); followLight(performance.now(), true); views.forEach((v) => v.render(2600)); });
        still();
        dna.then(still);
        return;
    }

    const t0 = performance.now();
    const tap = [...hosts].some((h) => h.hasAttribute('data-tap'));
    // il suono del battito, solo sulle pagine pubbliche
    const sound = tap ? startHeartSound({ bpm: BPM, gap: BEAT_GAP, t0 }) : null;
    let running = false;
    let lastDraw = 0;
    function frame(t) {
        if (document.hidden) { running = false; return; }
        // Schermi a 120 Hz o più: disegna un fotogramma sì e uno no, così restano almeno 60 al secondo
        // (a 60 e 90 Hz non cambia nulla). Il movimento dipende da t: velocità, battito e luci restano uguali.
        if (t - lastDraw < 10) { requestAnimationFrame(frame); return; }
        lastDraw = t;
        const bsec = Math.max(0, (t - t0) / 1000), kick = (t - state.kickAt) / 1000;
        state.ph = bsec % (60 / BPM);
        state.beat = Math.min(1, Math.max(beatAt(bsec), pulse(kick, 0.13) * 1.2));
        // il nucleo delle cellule risponde un attimo dopo la membrana
        state.nucBeat = Math.min(1, Math.max(beatAt(Math.max(0, bsec - 0.07)), pulse(kick - 0.07, 0.13) * 1.2));
        views.forEach((v) => v.render(t));
        followLight(t, false);
        if (sound) sound.tick(t);
        requestAnimationFrame(frame);
    }
    function start() {
        if (running || document.hidden) return;
        running = true;
        requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', start);
    start();

    if (tap) {
        // clic dove il cursore è una croce: un battito forte in più, anche del cuore
        document.addEventListener('click', (e) => {
            if (!(e.target instanceof Element) || getComputedStyle(e.target).cursor !== 'crosshair') return;
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) return;
            state.kickAt = performance.now();
            if (sound) sound.kick();
        });
    }
}

// parte dopo il caricamento della pagina, così non rallenta il resto
if (document.readyState === 'complete') init();
else window.addEventListener('load', init, { once: true });
