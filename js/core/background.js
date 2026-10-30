// Sfondo del sito: filamento di DNA in cromo che gira piano su sé stesso (Three.js) e, in home, il cuore che batte
// con le cellule lontane e le gocce. Dal 30/10/2026 tutti i modelli sono cromo in una stanza buia e quattro luci, una
// per colore del motto, girano attorno alla scena (un giro ogni 15 secondi): si vedono solo i loro riflessi colorati.
// Il tema del sito è fisso bianco (css/identity.css), non segue più le luci.
// Modelli (CC BY 4.0, crediti nel footer): DNA "DNA Procedural EEVEE" di Troy (assets/dna.glb),
// cuore "Anatomical Heart" di Mox3DModels (assets/heart-30k.glb),
// cellula "Neutrophil" di Physio CG (assets/cellula-3k.glb, semplificata da cellula-8k.glb).
// Il filamento si prepara in js/core/dna-worker.js, così il caricamento non blocca la pagina.
// Si attiva su ogni elemento .site-background della pagina:
// - data-heart (home): cuore e cellule lontane al centro della composizione;
// - data-lite (scanner): versione leggera, senza cuore;
// - data-dim: sfondo più scuro;
// - data-tap (pagine pubbliche): cursore a croce su tutta la pagina tranne link, bottoni e campi (css/identity.css);
//   lì si sente anche il battito (js/core/heart-sound.js). Dal 22/10/2026 il clic non dà più un battito in più.
// Battito "tum-tum" a BPM: fa battere il cuore e le cellule (non c'è più lo zoom della scena).
// Sugli schermi a 120 Hz o più disegna al massimo circa 60 fotogrammi al secondo, per consumare meno batteria.
// Qualità (QUALITY): parte leggera e, se il dispositivo non tiene il ritmo, si abbassa da sola.
// Carica anche no-zoom.js (niente ingrandimento su telefono), perché questo file c'è in ogni pagina.

import './no-zoom.js';
import { startHeartSound } from './heart-sound.js';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
const asset = (name) => new URL('../../assets/' + name, import.meta.url).href;
const DNA_URL = asset('dna.glb');

// colori del motto (le quattro luci, le particelle). Dal 30/10/2026 Love è il rosso puro #FF0000 e Peace il bianco puro
// #FFFFFF (prima Tizzone #E0281C e ghiaccio #CFE6FF)
const MOODS = {
    magenta:  { hex: 0x8a2c80 }, // Drink, bordeaux violaceo (dal 23/10/2026)
    brace:    { hex: 0xff0000 }, // Love, rosso puro
    breathe:  { hex: 0x1fa39a }, // Breathe, petrolio
    ghiaccio: { hex: 0xffffff }  // Peace, bianco puro
};
// Le quattro luci partono dai quattro angoli e girano nell'ordine del motto: Love in basso a destra, Peace in alto a
// sinistra, Drink in basso a sinistra, Breathe in alto a destra. LAMP_POWER: intensità di ognuna.
const LAMPS = [
    { mood: 'brace', at: [11, -6.5] }, { mood: 'ghiaccio', at: [-11, 7.5] },
    { mood: 'magenta', at: [-11, -6.5] }, { mood: 'breathe', at: [11, 7.5] }
];
const LAMP_POWER = 0.6;
// giro su un'ellisse 11 x 8 attorno al cuore, passando davanti e dietro: ogni luce parte dal punto vicino al suo angolo
const LAMP_START = LAMPS.map(({ at }) => Math.atan2(at[1] / 8, at[0] / 11));
const BPM = 30;         // battito tum-tum
const SPIN = Math.PI * 2 / 60; // rotazione del filamento su sé stesso, un giro ogni 60 s come le cellule
const ORBIT = Math.PI * 2 / 15; // giro delle luci attorno alla scena, un giro ogni 15 secondi

// Livelli di qualità, dal più bello al più leggero: ratio = pixel disegnati per ogni punto dello schermo (al massimo),
// msaa = bordi lisciati, fps = fotogrammi al secondo. I computer partono dal primo (il più nitido), i telefoni dal terzo,
// lo scanner dal quarto; se per 2 secondi i fotogrammi arrivano in ritardo si scende di un livello e non si risale più
// (vedi frame in init).
const QUALITY = [
    { ratio: 2, msaa: true, fps: 60 },
    { ratio: 1.5, msaa: false, fps: 60 },
    { ratio: 1.25, msaa: false, fps: 60 },
    { ratio: 1, msaa: false, fps: 60 },
    { ratio: 1, msaa: false, fps: 30 }
];
const PHONE = Math.min(screen.width, screen.height) < 700;
const SLOW = 1.3; // i fotogrammi sono "in ritardo" se arrivano in media il 30% più tardi del previsto
const firstLevel = (host) => (host.hasAttribute('data-lite') ? 3 : PHONE ? 2 : 0);

// beat/ph: forza (0-1) e fase (secondi) del battito, li scrive frame in init
const state = { beat: 0, ph: 0 };

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// battito: un colpo che sale subito e si spegne; il "tum-tum" ne fa due, il secondo più debole
// il colpo sale e scende piano, come se il cuore spingesse contro un liquido (dal 29/10/2026; prima salita 0,014 s)
const RISE = 0.06;
const pulseRaw = (t, decay) => (t < 0 ? 0 : (1 - Math.exp(-t / RISE)) * Math.exp(-t / decay));
// diviso per il suo massimo, così il colpo resta forte come prima
const pulse = (t, decay) => { const tp = RISE * Math.log(1 + decay / RISE); return pulseRaw(t, decay) / pulseRaw(tp, decay); };
const BEAT_GAP = Math.min(60 / BPM * 0.34, 0.24); // secondi fra il "tum" e il secondo "tum"
function beatAt(sec) {
    const ph = sec % (60 / BPM);
    return Math.min(1, pulse(ph, 0.16) + 0.6 * pulse(ph - BEAT_GAP, 0.15));
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
// La stanza buia che il cromo riflette: due rettangoli di luce neutra (in basso a destra e in alto a sinistra) con il
// centro più chiaro e un filo freddo in alto. I colori arrivano dalle quattro luci che girano.
const ENV_FRAG = `
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  vec3 c = vec3(0.0016, 0.0019, 0.0023);
  float win = smoothstep(0.62, 0.72, d.x) * (1.0 - smoothstep(0.26, 0.38, abs(d.y + 0.48))) * (1.0 - smoothstep(0.30, 0.45, abs(d.z)))
            + smoothstep(-0.62, -0.72, d.x) * (1.0 - smoothstep(0.26, 0.38, abs(d.y - 0.55))) * (1.0 - smoothstep(0.30, 0.45, abs(d.z)));
  float core = smoothstep(0.74, 0.84, d.x) * (1.0 - smoothstep(0.10, 0.26, abs(d.y + 0.48)))
             + smoothstep(-0.74, -0.84, d.x) * (1.0 - smoothstep(0.10, 0.26, abs(d.y - 0.55)));
  c += vec3(0.4, 0.4, 0.42) * 0.6 * win + vec3(0.8, 0.8, 0.82) * 0.5 * core;
  c += vec3(0.55, 0.62, 0.75) * 1.2 * smoothstep(0.92, 0.99, d.y);
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
}`;

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// Passaggio finale: leggera separazione dei colori ai bordi, righe del monitor, grana, vignetta, effetto liquido
const POST_FRAG = `
uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uDim;
varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  // l'immagine ondeggia piano e in modo irregolare, come vista attraverso un liquido denso
  float t = uTime;
  vec2 w = vec2(sin(vUv.y * 7.0 + t * 0.55) + 0.6 * sin(vUv.y * 15.0 - t * 0.8 + vUv.x * 4.0),
                cos(vUv.x * 6.0 - t * 0.45) + 0.6 * cos(vUv.x * 13.0 + t * 0.7 + vUv.y * 5.0));
  vec2 uv = vUv + w * 0.003;
  vec2 fc = vUv - 0.5;
  vec2 ca = fc * 0.006;
  vec3 col = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
  col *= 0.94 + 0.06 * sin(vUv.y * uRes.y * 1.5708);
  col += (rnd(vUv * uRes + fract(uTime * 0.37)) - 0.5) * 0.04;
  col *= smoothstep(1.05, 0.3, length(fc * vec2(1.0, 1.15)) * 1.25);
  col *= uDim * 0.75; // tutta la scena un po' più buia
  gl_FragColor = vec4(col, 1.0);
}`;

// Riflesso delle quattro luci che girano: uLD è la direzione di ogni luce vista dalla camera, uLC il suo colore.
// Il metallo le riflette come fari nel buio: la luce non si vede, il riflesso scorre sugli oggetti mentre gira.
const LIGHTS_GLSL = `
uniform vec3 uLD[4]; uniform vec3 uLC[4];
vec3 lightsRefl(vec3 n, vec3 vpos){
  // raggio riflesso dalla camera al punto e poi rimbalzato: il riflesso cade dalla parte della luce
  vec3 r = reflect(normalize(vpos), normalize(n)); vec3 c = vec3(0.0);
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

// Dissolvenza a macchie con cui compaiono filamento, cuore e cellule (bordo acceso bianco, edgeAmt).
// Il rumore si calcola solo durante l'entrata: dopo (uReveal = 1) ogni punto dello schermo salta questo conto.
const REVEAL_GLSL = `
  float edgeAmt = 0.0;
  if (uReveal < 0.999) {
    float dz = 0.65 * vn(vWp * 1.5) + 0.35 * vn(vWp * 4.2);
    float thr = uReveal * 1.15 - 0.075;
    if (dz > thr) discard;
    edgeAmt = (1.0 - smoothstep(0.0, 0.07, thr - dz)) * step(0.001, uReveal);
  }
`;

// ---------- modello del DNA ----------
// Il filamento si prepara in js/core/dna-worker.js, fuori dalla pagina: sono calcoli lunghi (~140 mila vertici) che qui
// bloccherebbero tocchi e scorrimento per qualche istante, soprattutto sui telefoni. Il worker manda solo numeri.

const CUT = 14; // sotto questo piolo il ricciolo finale del modello non si vede (cut dei materiali)

function makeGeometry(THREE, q) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(q.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(q.nor, 3));
    geo.setAttribute('aAxis', new THREE.BufferAttribute(q.axis, 3));
    geo.setAttribute('aTan', new THREE.BufferAttribute(q.tan, 3));
    geo.setAttribute('aParam', new THREE.BufferAttribute(q.prm, 1));
    geo.setIndex(new THREE.BufferAttribute(q.idx, 1));
    return geo;
}

// Avvia il worker e scarica il modello (una volta sola per pagina): restituisce i pezzi del filamento
// (modello e prolungamenti); buildLeft chiede poi al worker il tratto a sinistra per la forma dello schermo.
let dnaPromise = null, worker = null, leftId = 0;
const leftWait = new Map();
function loadDna() {
    if (dnaPromise) return dnaPromise;
    dnaPromise = new Promise((resolve, reject) => {
        worker = new Worker(new URL('./dna-worker.js?v=1', import.meta.url));
        worker.onmessage = (e) => {
            const m = e.data;
            if (m.type === 'dna') resolve(m.pieces);
            else if (m.type === 'left' || m.id) { const done = leftWait.get(m.id); leftWait.delete(m.id); if (done) done(m.pieces || []); }
            else reject(new Error(m.message));
        };
        worker.onerror = (e) => { reject(e); leftWait.forEach((done) => done([])); leftWait.clear(); };
        worker.postMessage({ type: 'dna', three: THREE_URL, url: DNA_URL });
    });
    return dnaPromise;
}
function buildLeft(pts, K) {
    return new Promise((resolve) => {
        const id = ++leftId;
        leftWait.set(id, resolve);
        worker.postMessage({ type: 'left', id, pts, K });
    });
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
    // il quinto numero è il numero della cellula (da 0), che decide asse e verso del giro (CELL_AXIS); dal 29/10/2026
    // quattro cellule, una aggiunta a sinistra e la settima spostata verso il centro per vederla meglio
    portrait: [[-0.6, -0.48, 70, 0.74, 0], [0.68, 0.58, 95, 0.81, 1], [0.62, -0.25, 84, 0.8, 6], [-0.62, 0.28, 74, 0.85, 7]],
    landscape: [[-0.6, -0.55, 70, 0.74, 0], [0.6, 0.6, 95, 0.81, 1], [0.62, -0.22, 70, 0.85, 6], [-0.55, 0.1, 56, 0.95, 7]]
};
// dal 22/10/2026 il cuore leggero (30 mila triangoli) e la cellula leggera (meno di 3 mila) su tutti i dispositivi;
// sui computer la nitidezza arriva dai pixel (QUALITY)
const HEART_URL = asset('heart-30k.glb');
const CELL_URL = asset('cellula-3k.glb');

// Scarica cuore e cellula (una volta sola per pagina), con il GLTFLoader di three r128
let organsPromise = null;
function loadOrgans(THREE) {
    if (organsPromise) return organsPromise;
    organsPromise = (THREE.GLTFLoader ? Promise.resolve() : loadScript(GLTF_URL)).then(() => {
        const loader = new THREE.GLTFLoader();
        const get = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
        return Promise.all([get(HEART_URL), get(CELL_URL)]);
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
    let quality = QUALITY[firstLevel(host)];
    let dpr = Math.min(window.devicePixelRatio || 1, quality.ratio);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const scene = new THREE.Scene();
    // nebbia nera: il filamento che si allontana sfuma nel buio
    scene.fog = new THREE.Fog(0, 34, 190);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);

    // la stanza riflessa (fatta una volta sola)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envMat = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: ENV_VERT, fragmentShader: ENV_FRAG });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), envMat));
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    envScene.children[0].geometry.dispose();
    envMat.dispose();
    pmrem.dispose();

    // le quattro luci del motto: luci vere (fanno brillare il cromo) e, per lightsRefl, direzione e colore del riflesso
    const lamps = LAMPS.map(({ mood }) => { const l = new THREE.PointLight(MOODS[mood].hex, LAMP_POWER, 40, 1.5); scene.add(l); return l; });
    const lightU = { uLD: { value: lamps.map(() => new THREE.Vector3(0, 0, 1)) },
        uLC: { value: LAMPS.map(({ mood }) => linear(MOODS[mood].hex).multiplyScalar(LAMP_POWER * 0.8)) } };

    // lo stesso cromo per tutti i modelli (cuore, DNA, cellule, gocce), dal 29/10/2026; extra: side, transparent...
    const makeMat = (extra = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, ...extra });

    // Cromo del filamento: ogni punto gira attorno all'asse (aAxis/aTan) e il filamento ruota su sé stesso restando fermo;
    // compare con una dissolvenza a macchie dal bordo acceso. cut: sotto questo aParam non si vede.
    const spinU = { value: 0 }, revealU = { value: 0 }, edgeU = { value: new THREE.Color(1, 1, 1) };
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
                    (cut ? '  if (vParam < ' + cut.toFixed(1) + ') discard;\n' : '') + REVEAL_GLSL)
                .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb += uEdge * edgeAmt * 6.0;\n' + LIGHTS_ADD);
        };
        // three r128 riusa lo stesso programma per i materiali con lo stesso onBeforeCompile: serve una chiave diversa
        mat.customProgramCacheKey = () => key;
        return mat;
    }
    // filamenti e pioli nello stesso cromo: un materiale per il modello (senza il ricciolo finale) e uno per il tratto a sinistra
    const mats = {
        chrome: strand(makeMat({ side: THREE.DoubleSide }), 'dna-chrome', CUT),
        chromeL: strand(makeMat({ side: THREE.DoubleSide }), 'dna-chrome-l', 0)
    };
    const dnaModel = new THREE.Group(), dnaLeft = new THREE.Group();
    dnaModel.visible = dnaLeft.visible = false;
    dnaModel.rotation.set(...POSE.rot);
    dnaModel.scale.setScalar(POSE.k);
    scene.add(dnaModel, dnaLeft);
    let D = null, readyAt = null;

    // gocce di metallo liquido attorno al centro (superficie che ondeggia come metallo fuso)
    const timeU = { value: 0 };
    const dropMat = makeMat();
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
    // 6 gocce sparse attorno al cuore: non girano in tondo, galleggiano ognuna al suo posto
    const DROPS = lite ? 0 : 6;
    for (let d = 0; d < DROPS; d++) {
        const size = 0.06 + Math.random() * 0.16;
        const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), dropMat);
        const a = (d / DROPS) * Math.PI * 2 + (Math.random() - 0.5) * 0.6, r = 3.4 + Math.random() * 1.8;
        drop.userData = { x: Math.cos(a) * r, y: (Math.random() - 0.5) * 6, z: Math.sin(a) * r,
            f: 0.7 + Math.random() * 0.6, p: [0, 1, 2].map(() => Math.random() * Math.PI * 2) };
        drops.add(drop);
    }
    drops.visible = false;
    scene.add(drops);

    // Cuore di metallo fuso (home): ondeggia come metallo liquido, si contrae sul battito (di più in basso, dove ci sono
    // i ventricoli) e un'onda corre dalla punta verso l'alto; compare con la stessa dissolvenza del filamento.
    // Cellule lontane: membrana di vetro-cromo (si vede soprattutto il bordo) e nucleo; non battono col cuore.
    const beatU = { value: 0 }, waveU = { value: 0 };
    function organ(mat, key, { amount, heart = false, veil = false }) {
        mat.onBeforeCompile = (sh) => {
            Object.assign(sh.uniforms, { uTime: timeU, uBeat: beatU, uWave: waveU, uReveal: revealU, uEdge: edgeU }, lightU);
            sh.vertexShader = 'uniform float uTime; uniform float uBeat; uniform float uWave; varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>',
                '#include <begin_vertex>\n' +
                'vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;\n' +
                'float w = sin(wp0.y * 2.1 + uTime * 1.5) * 0.5 + sin(wp0.x * 3.7 - wp0.z * 2.9 + uTime * 1.1) * 0.35 + sin(wp0.y * 6.5 - uTime * 2.4) * 0.18;\n' +
                'transformed += normal * w * ' + amount.toFixed(4) + ';\n' +
                (heart ? 'float low = smoothstep(0.35, -0.45, position.y);\n' +
                    'transformed *= 1.0 - uBeat * (0.035 + 0.075 * low);\n' +
                    'float ring = exp(-pow((position.y + 0.5) - uWave * 1.4, 2.0) * 60.0);\n' +
                    'transformed += normal * ring * 0.012 * step(0.001, uWave) * (1.0 - uWave);\n' : '') +
                'vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
            sh.fragmentShader = 'uniform float uReveal; uniform vec3 uEdge; varying vec3 vWp;\n' + NOISE + LIGHTS_GLSL + sh.fragmentShader
                .replace('void main() {', 'void main() {\n' + REVEAL_GLSL)
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
    const heartMat = organ(makeMat(), 'heart', { amount: 0.006, heart: true });
    const farMem = organ(makeMat({ transparent: true, depthWrite: false }), 'far-mem', { amount: 0.009, veil: true });
    const farCore = organ(makeMat(), 'far-core', { amount: 0.006 });
    let organs = null, farAspect = 0;
    // asse di rotazione di ogni cellula (numero della cellula: asse): da sinistra a destra, in avanti, come una ruota, in diagonale
    const CELL_AXIS = { 0: [0, 1, 0], 1: [1, 0, 0], 6: [0, 0, -1], 7: [-1, -1, 0.6] };
    const cellQ = new THREE.Quaternion();
    function placeFar() {
        if (!organs || Math.abs(camera.aspect - farAspect) < 0.001) return;
        farAspect = camera.aspect;
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        farCells.clear();
        FAR[camera.aspect > 1 ? 'landscape' : 'portrait'].forEach(([x, y, d, k, i]) => {
            const g = new THREE.Group();
            g.position.copy(ndcAt(x, y, d));
            g.scale.setScalar(FAR_SCALE * k);
            g.rotation.set(i * 1.7, i * 2.3, i * 0.9);
            // tutte fanno un giro ogni 60 secondi, ognuna attorno a un asse diverso (quindi in una direzione diversa)
            g.userData = { q0: g.quaternion.clone(), axis: new THREE.Vector3(...(CELL_AXIS[i] || [0, 1, 0])).normalize(), spin: Math.PI * 2 / 60 };
            const front = new THREE.Mesh(organs.cell.membrana, farMem);
            front.renderOrder = 3;
            g.add(new THREE.Mesh(organs.cell.nucleo, farCore), front);
            farCells.add(g);
        });
    }

    // polvere di dati
    // sempre dietro il cuore: tutte in una fascia di profondità alle sue spalle
    const count = lite ? 120 : 320;
    const pos = new Float32Array(count * 3);
    for (let p = 0; p < count; p++) {
        pos[p * 3] = (Math.random() - 0.5) * 22; pos[p * 3 + 1] = (Math.random() - 0.5) * 16; pos[p * 3 + 2] = -3.5 - Math.random() * 9;
    }
    // ogni particella fluttua per conto suo attorno al suo punto, con ritmi diversi, come in un liquido
    const dustBase = pos.slice(), dustPh = new Float32Array(count * 3).map(() => Math.random() * Math.PI * 2);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // ogni particella ha uno dei 4 colori del motto (mescolati), un po' più luminoso (× 1.8) perché si veda sul nero
    const dustCol = new Float32Array(count * 3);
    const mix = LAMPS.map(({ mood }) => linear(MOODS[mood].hex));
    for (let p = 0; p < count; p++) mix[p % mix.length].toArray(dustCol, p * 3);
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({ vertexColors: true, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false });
    dustMat.color.setScalar(1.8);
    const dust = new THREE.Points(dustGeo, dustMat);
    // il secondo strato, punti più piccoli
    const dust2Mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false });
    dust2Mat.color.setScalar(1.8);
    const dust2 = new THREE.Points(dustGeo, dust2Mat);
    dust2.position.set(0.6, -0.4, -0.5); // il secondo strato appena spostato, sempre dietro il cuore
    scene.add(dust, dust2);

    // la scena si disegna qui, poi il passaggio finale la copia sullo schermo; con msaa i bordi sono lisciati
    const makeTarget = () => {
        const RT = quality.msaa && renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
        const target = new RT(4, 4);
        target.texture.encoding = THREE.sRGBEncoding;
        return target;
    };
    let rt = makeTarget();
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
    let leftAspect = 0, leftTimer = 0, leftReq = 0;
    function placeLeft() {
        if (!D || (Math.abs(camera.aspect - leftAspect) < leftAspect * 0.03 && (camera.aspect > 1) === (leftAspect > 1))) return Promise.resolve();
        leftAspect = camera.aspect;
        camera.zoom = 1; // i punti dello schermo sono pensati senza la pulsazione
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const pts = LEFT[camera.aspect > 1 ? 'landscape' : 'portrait'].map((q) => ndcAt(...q).toArray());
        const req = ++leftReq;
        // il tratto vecchio resta finché non arriva quello nuovo
        return buildLeft(pts, POSE.k).then((pieces) => {
            if (req !== leftReq) return; // nel frattempo lo schermo è cambiato di nuovo
            dnaLeft.children.forEach((m) => m.geometry.dispose());
            dnaLeft.clear();
            pieces.forEach((q) => dnaLeft.add(new THREE.Mesh(makeGeometry(THREE, q), mats.chromeL)));
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
        // livello di qualità più leggero (QUALITY): meno pixel e, se serve, niente bordi lisciati
        setQuality(q) {
            const msaaChanged = q.msaa !== quality.msaa;
            quality = q;
            dpr = Math.min(window.devicePixelRatio || 1, q.ratio);
            renderer.setPixelRatio(dpr);
            if (msaaChanged) {
                rt.dispose();
                rt = makeTarget();
                post.uniforms.tDiffuse.value = rt.texture;
            }
            resize();
        },
        setDna(pieces) {
            D = pieces;
            pieces.forEach((q) => dnaModel.add(new THREE.Mesh(makeGeometry(THREE, q), mats.chrome)));
            // il filamento compare quando c'è anche il tratto a sinistra
            placeLeft().then(() => { ready.dna = true; maybeReveal(); });
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
            waveU.value = Math.min(1, state.ph / Math.min(60 / BPM, 0.6));
            heartPivot.rotation.set(Math.sin(sec * 0.11) * 0.08, Math.sin(sec * 0.14) * 0.5, 0); // dondolio lento, come in un liquido
            farCells.children.forEach((g) => { g.quaternion.copy(g.userData.q0).multiply(cellQ.setFromAxisAngle(g.userData.axis, g.userData.spin * sec)); });
            timeU.value = sec;
            drops.visible = revealU.value > 0.5;
            // galleggiano: salgono e scendono piano e si spostano appena di lato, ognuna con il suo ritmo
            drops.children.forEach((dr) => {
                const q = dr.userData;
                dr.position.set(q.x + Math.sin(sec * 0.13 * q.f + q.p[0]) * 0.22,
                    q.y + Math.sin(sec * 0.21 * q.f + q.p[1]) * 0.4 + Math.sin(sec * 0.07 * q.f + q.p[2]) * 0.2,
                    q.z + Math.sin(sec * 0.11 * q.f + q.p[2]) * 0.22);
            });
            for (let p = 0; p < count; p++) {
                const k = p * 3, f = 0.6 + (p % 7) * 0.08;
                pos[k] = dustBase[k] + Math.sin(sec * 0.17 * f + dustPh[k]) * 0.35;
                pos[k + 1] = dustBase[k + 1] + Math.sin(sec * 0.11 * f + dustPh[k + 1]) * 0.6;
                pos[k + 2] = dustBase[k + 2] + Math.sin(sec * 0.13 * f + dustPh[k + 2]) * 0.35;
            }
            dustGeo.attributes.position.needsUpdate = true;

            // le quattro luci girano attorno alla scena; per il cromo conta da dove arriva ogni luce vista dalla camera
            camera.updateMatrixWorld();
            lamps.forEach((l, i) => {
                const a = sec * ORBIT + LAMP_START[i];
                l.position.set(holder.position.x + Math.cos(a) * 11, holder.position.y + Math.sin(a) * 8, 3 - Math.sin(a) * 4);
                lampDir.copy(l.position).sub(holder.position).normalize().transformDirection(camera.matrixWorldInverse);
                lightU.uLD.value[i].copy(lampDir);
            });
            post.uniforms.uTime.value = sec;
            renderer.setRenderTarget(rt);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCam);
        }
    };
    return view;
}

async function init() {
    const hosts = document.querySelectorAll('.site-background');
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
    const dna = loadDna().then((D) => views.forEach((v) => v.setDna(D))).catch(() => { /* resta lo sfondo senza filamento */ });

    if (reduce) {
        // "riduci movimento": un fotogramma fermo
        const still = () => requestAnimationFrame(() => views.forEach((v) => v.render(2600)));
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
    // Freno automatico: si misura quanto passa fra un fotogramma disegnato e l'altro, a gruppi di 2 secondi, a partire da
    // 3 secondi dopo l'arrivo del filamento (l'entrata e la preparazione degli shader non contano). Se la media è
    // troppo alta si passa al livello di qualità successivo e si aspetta un secondo prima di misurare di nuovo.
    let level = Math.max(...[...hosts].map(firstLevel));
    const brake = { from: Infinity, sum: 0, n: 0 };
    dna.then(() => { brake.from = performance.now() + 3000; });
    function measure(t, dt) {
        if (t < brake.from || dt > 250) return; // prima del via, o dopo una pausa (scheda nascosta)
        brake.sum += Math.min(dt, 100);
        brake.n++;
        if (t - brake.from < 2000) return;
        const slow = brake.sum / brake.n > 1000 / QUALITY[level].fps * SLOW;
        Object.assign(brake, { from: t + (slow ? 1000 : 0), sum: 0, n: 0 });
        if (slow && level < QUALITY.length - 1) {
            level++;
            views.forEach((v) => v.setQuality(QUALITY[level]));
        }
    }
    function frame(t) {
        if (document.hidden) { running = false; return; }
        // Schermi a 120 Hz o più: disegna un fotogramma sì e uno no, così restano almeno 60 al secondo
        // (a 60 e 90 Hz non cambia nulla). All'ultimo livello di qualità uno ogni ~33 ms (30 al secondo).
        // Il movimento dipende da t: velocità, battito e luci restano uguali.
        if (t - lastDraw < (QUALITY[level].fps < 60 ? 30 : 10)) { requestAnimationFrame(frame); return; }
        measure(t, t - lastDraw);
        lastDraw = t;
        const bsec = Math.max(0, (t - t0) / 1000);
        state.ph = bsec % (60 / BPM);
        state.beat = beatAt(bsec);
        views.forEach((v) => v.render(t));
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
}

// parte dopo il caricamento della pagina, così non rallenta il resto
if (document.readyState === 'complete') init();
else window.addEventListener('load', init, { once: true });
