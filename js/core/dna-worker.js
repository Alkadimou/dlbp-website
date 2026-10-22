// Prepara il filamento di DNA dello sfondo fuori dalla pagina (worker), così il telefono non si blocca
// mentre si calcola: legge assets/dna.glb, trova l'asse del filamento, costruisce i prolungamenti e, quando la pagina
// lo chiede, il tratto a sinistra (che dipende dalla forma dello schermo). Restituisce solo numeri: le geometrie
// le crea js/core/background.js.
// Messaggi: { type: 'dna', three, url } → { type: 'dna', pieces }; { type: 'left', id, pts, K } → { type: 'left', id, pieces }.
// Ogni pezzo è { pairs, pos, nor, axis, tan, prm, idx } (pairs: pioli nel colore del motto, altrimenti cromo).

let THREE = null, D = null;

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
    return { pos, nor, axis, tan, prm, idx: (copies * nl > 65535 ? Uint32Array : Uint16Array).from(index) };
}

// Prolungamenti del filamento (coordinate del modello). In basso il ricciolo finale (pioli 0-13) è tagliato e dal piolo 14
// il filamento curva piano verso il bordo destro ed esce; in alto la punta continua fino a uscire dallo schermo.
const EXTENSIONS = [
    { side: 'start', from: 14, target: [-233.7, -98.2, -23.5], ctrl: [-80.3, 13.5, -30.4], bend: 15 },
    { side: 'end', target: [-6.2, -221.2, -208.1], bend: 60 }
];

// copia dei numeri di un pezzo, pronta da spedire alla pagina (il modello resta qui per il tratto a sinistra)
const piece = (pairs, g, copy) => ({ pairs, pos: copy ? g.pos.slice() : g.pos, nor: copy ? g.nor.slice() : g.nor,
    axis: copy ? g.axis.slice() : g.axis, tan: copy ? g.tan.slice() : g.tan, prm: copy ? g.prm.slice() : g.prm, idx: copy ? g.idx.slice() : g.idx });
const buffers = (pieces) => pieces.flatMap((q) => [q.pos, q.nor, q.axis, q.tan, q.prm, q.idx].map((a) => a.buffer));

function buildDna(buf) {
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
    D = { parts, n, S, step, PERIOD: 18 * step, sMax: S[n - 1], frameAt };

    // il modello e i due prolungamenti
    const pieces = parts.map((q) => piece(q.pairs, { pos: q.pos, nor: q.nor, axis: q.axis, tan: q.tan, prm: q.prm, idx: q.idx }, true));
    EXTENSIONS.forEach((E) => {
        const atEnd = E.side === 'end', sEnd = atEnd ? D.sMax : S[E.from], f0 = frameAt(sEnd);
        const P0 = f0.p, P1 = P0.clone().addScaledVector(f0.T, atEnd ? E.bend : -E.bend), G = new THREE.Vector3(...E.target);
        const P2 = E.ctrl ? new THREE.Vector3(...E.ctrl) : G.clone().addScaledVector(P1.clone().sub(G).normalize(), G.distanceTo(P1) * 0.45);
        const curve = new THREE.CubicBezierCurve3(P0, P1, P2, G);
        parts.forEach((q) => {
            // aParam dei prolungamenti: dopo l'ultimo piolo in cima; 5000+ per quello iniziale, così il taglio del ricciolo non lo nasconde
            const g = turnAlong(THREE, D, q, curve, atEnd
                ? { from: sEnd - D.PERIOD, to: Infinity, N0: f0.N, param: (d) => (n - 1) + d / step }
                : { from: sEnd, to: sEnd + D.PERIOD, back: true, N0: f0.N, param: (d) => 5000 + d / step });
            if (g) pieces.push(piece(q.pairs, g, false));
        });
    });
    return pieces;
}

// tratto sul lato sinistro: un giro del modello copiato lungo la curva pts (4 punti di controllo), con scala K
function buildLeft(pts, K) {
    const curve = new THREE.CubicBezierCurve3(...pts.map((p) => new THREE.Vector3(...p)));
    const s0 = D.S[60], pieces = [];
    D.parts.forEach((q) => {
        const g = turnAlong(THREE, D, q, curve, { from: s0, to: s0 + D.PERIOD, K, param: (d) => d / (D.step * K) });
        if (g) pieces.push(piece(q.pairs, g, false));
    });
    return pieces;
}

self.onmessage = async (e) => {
    const m = e.data;
    try {
        if (m.type === 'dna') {
            if (!THREE) { importScripts(m.three); THREE = self.THREE; }
            const r = await fetch(m.url);
            if (!r.ok) throw new Error('dna.glb ' + r.status);
            const pieces = buildDna(await r.arrayBuffer());
            self.postMessage({ type: 'dna', pieces }, buffers(pieces));
        } else if (m.type === 'left') {
            const pieces = D ? buildLeft(m.pts, m.K) : [];
            self.postMessage({ type: 'left', id: m.id, pieces }, buffers(pieces));
        }
    } catch (err) {
        self.postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) });
    }
};
