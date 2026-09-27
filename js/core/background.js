// Sfondo del sito: elica di DNA in metallo liquido (Three.js) con glitch a scatti.
// Si attiva su ogni elemento .site-background della pagina. Ogni parola del motto ha il suo colore
// da luci di club; il colore cambia da solo ogni CYCLE_EVERY glitch, seguendo ORDER (l'arco della serata).
// ?mood=<colore> o ?mood=<parola> nell'indirizzo sceglie il colore di partenza; il colore
// raggiunto resta per tutta la visita, anche cambiando pagina.
// Il colore arriva al CSS come --mood e --mood-deep su <html>.
// Con data-lite sull'elemento (scanner) gira in versione leggera.

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export const MOODS = {
    strobo:   { word: 'drink',   hex: 0xff2a3c, deep: 0x4d0712 }, // rosso strobo
    magenta:  { word: 'love',    hex: 0x8a2c80, deep: 0x250a24 }, // bordeaux violaceo
    breathe:  { word: 'breathe', hex: 0x1fa39a, deep: 0x062f35 }, // petrolio
    ghiaccio: { word: 'peace',   hex: 0xcfe6ff, deep: 0x34506e }  // ghiaccio, luce del mattino
};
const DEFAULT_MOOD = 'breathe';
const ORDER = ['strobo', 'magenta', 'breathe', 'ghiaccio'];
const CYCLE_EVERY = 3;

function saveMood(mood) {
    try { sessionStorage.setItem('dlbp-mood', mood); } catch (e) { /* sessionStorage non disponibile */ }
}

function readMood() {
    const param = new URLSearchParams(location.search).get('mood');
    // accetta sia un colore (?mood=magenta) sia una parola del motto (?mood=drink → il suo primo colore)
    const fromUrl = MOODS[param] ? param : ORDER.find((id) => MOODS[id].word === param);
    if (fromUrl) {
        saveMood(fromUrl);
        return fromUrl;
    }
    try {
        const saved = sessionStorage.getItem('dlbp-mood');
        if (MOODS[saved]) return saved;
    } catch (e) { /* sessionStorage non disponibile */ }
    return DEFAULT_MOOD;
}

const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');

// luminanza relativa (WCAG) di un colore 0xRRGGBB
function luminance(n) {
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function setCssMood(m) {
    const root = document.documentElement;
    root.dataset.mood = m;
    root.style.setProperty('--mood', cssHex(MOODS[m].hex));
    root.style.setProperty('--mood-deep', cssHex(MOODS[m].deep));
    // testo dei bottoni pieni: chiaro sui colori scuri, scuro su quelli chiari
    root.style.setProperty('--on-mood', luminance(MOODS[m].hex) < 0.18 ? '#f3f2ee' : '#050508');
}

const state = { mood: readMood(), glitch: 0, power: 0, seed: 0, lastSeed: 0, burstEnd: 0, nextBurst: 2500, bursts: 0, pending: null, swapAt: 0 };
setCssMood(state.mood);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadThree() {
    return new Promise((resolve, reject) => {
        if (window.THREE) return resolve(window.THREE);
        const s = document.createElement('script');
        s.src = THREE_URL;
        s.async = true;
        s.onload = () => resolve(window.THREE);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

const ENV_VERT = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// "Studio" nero con strisce di luce bianca e la luce del motto dal basso: è quello che il cromo riflette
const ENV_FRAG = `
uniform vec3 uMood; varying vec3 vDir;
float band(float x, float c, float w){ return 1.0 - smoothstep(0.0, w, abs(x - c)); }
void main(){
  vec3 d = normalize(vDir);
  vec3 c = vec3(0.003);
  c += vec3(7.0) * smoothstep(0.88, 0.97, d.y);
  c += vec3(3.0) * band(d.y, 0.38, 0.045);
  c += vec3(3.5) * band(d.x, 0.78, 0.05) * step(-0.25, d.y);
  c += vec3(1.6) * band(d.x, -0.72, 0.035) * step(0.05, d.y);
  c += uMood * 5.0 * smoothstep(-0.05, -0.85, d.y);
  c += uMood * 2.5 * band(d.y, -0.04, 0.12);
  c += uMood * 1.8 * smoothstep(0.1, 1.0, -d.z) * smoothstep(-0.4, 0.4, d.x);
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
}`;

const BG_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// Sfumatura come nei flyer: il colore della serata sale verso il nero
const BG_FRAG = `
uniform vec3 uMood; uniform vec3 uDeep; uniform vec2 uGlow; uniform float uAspect; uniform float uRadius; varying vec2 vUv;
void main(){
  // distanza misurata in altezze di schermo, così il bagliore resta rotondo su ogni formato
  float d = smoothstep(uRadius, 0.0, length((vUv - uGlow) * vec2(uAspect, 0.8)));
  vec3 c = mix(vec3(0.0), uDeep * 0.55, smoothstep(0.0, 0.8, d));
  c += uMood * 0.22 * pow(d, 3.0);
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
}`;

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// Passaggio finale: separazione RGB, righe strappate, blocchi, righe del monitor, grana
const POST_FRAG = `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uGlitch; uniform float uSeed;
uniform vec2 uRes; uniform vec3 uMood; uniform float uDim;
varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv; float g = uGlitch;
  float rows = 10.0 + floor(rnd(vec2(uSeed, 3.1)) * 50.0);
  float sl = floor(uv.y * rows); float r = rnd(vec2(sl, uSeed));
  uv.x += step(1.0 - 0.5 * g, r) * (rnd(vec2(sl, uSeed + 7.0)) - 0.5) * 0.28 * g;
  vec2 bl = floor(vUv * vec2(9.0, 20.0) + uSeed);
  float b = rnd(bl);
  uv += step(1.0 - 0.14 * g, b) * (vec2(rnd(bl + 1.3), rnd(bl + 2.7)) - 0.5) * 0.14;
  float cr = rnd(vec2(floor(vUv.x * 36.0), uSeed + 11.0));
  if (cr > 1.0 - 0.12 * g) uv.y = floor(uv.y * 5.0) / 5.0 + 0.1;
  vec2 fc = vUv - 0.5;
  vec2 ca = fc * (0.006 + 0.03 * g) + vec2(0.02 * g * (r - 0.5), 0.0);
  vec3 col = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
  col = mix(col, uMood * (0.55 + 0.7 * col.g), step(1.0 - 0.06 * g, rnd(bl + 9.1)) * 0.9);
  col = mix(col, 1.0 - col, step(1.0 - 0.03 * g, rnd(bl + 4.4)));
  col *= 0.92 + 0.08 * sin(vUv.y * uRes.y * 1.5708);
  col += (rnd(vUv * uRes + fract(uTime * 0.37)) - 0.5) * (0.04 + 0.1 * g);
  float roll = fract(uTime * 0.06);
  col += uMood * 0.18 * (1.0 - smoothstep(0.0, 0.003, abs(vUv.y - roll)));
  col *= smoothstep(1.05, 0.3, length(fc * vec2(1.0, 1.15)) * 1.25);
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
}`;

function createView(THREE, host) {
    const lite = host.hasAttribute('data-lite');
    const dim = parseFloat(host.dataset.dim || '1');
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: lite ? 'low-power' : 'high-performance' });
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
    const timeU = { value: 0 };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    // un riflesso già pronto per ogni colore, così il cambio è istantaneo
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envUniforms = { uMood: { value: new THREE.Color() } };
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({
        side: THREE.BackSide, vertexShader: ENV_VERT, fragmentShader: ENV_FRAG, uniforms: envUniforms
    })));
    const envs = {};
    ORDER.forEach((m) => {
        envUniforms.uMood.value.copy(linear(MOODS[m].hex));
        envs[m] = pmrem.fromScene(envScene, 0.02).texture;
    });
    scene.environment = envs[state.mood];

    const bgMat = new THREE.ShaderMaterial({
        depthWrite: false, toneMapped: false, vertexShader: BG_VERT, fragmentShader: BG_FRAG,
        uniforms: { uMood: { value: linear(mood.hex) }, uDeep: { value: linear(mood.deep) }, uGlow: { value: new THREE.Vector2(0.58, 0.4) }, uAspect: { value: 1 }, uRadius: { value: 0.62 } }
    });
    // il pannello viene ridimensionato in resize() per coprire sempre tutto lo schermo
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
    bg.position.z = -9;
    scene.add(bg);

    // superficie che ondeggia come metallo fuso
    function liquid(mat, amount) {
        mat.onBeforeCompile = (sh) => {
            sh.uniforms.uTime = timeU;
            sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
                '#include <begin_vertex>\n' +
                'vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;\n' +
                'float w = sin(wp.y * 2.1 + uTime * 1.5) * 0.5 + sin(wp.x * 3.7 - wp.z * 2.9 + uTime * 1.1) * 0.35 + sin(wp.y * 6.5 - uTime * 2.4) * 0.18;\n' +
                'transformed += normal * w * ' + amount.toFixed(3) + ';');
        };
        return mat;
    }

    class HelixCurve extends THREE.Curve {
        constructor(radius, height, turns, phase) { super(); this.r = radius; this.h = height; this.t = turns; this.p = phase; }
        getPoint(u, target = new THREE.Vector3()) {
            const a = u * Math.PI * 2 * this.t + this.p;
            return target.set(Math.cos(a) * this.r, (u - 0.5) * this.h, Math.sin(a) * this.r);
        }
    }

    const chrome = liquid(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 }), 0.08);
    const chromeSolid = new THREE.MeshStandardMaterial({ color: 0xdedee6, metalness: 1, roughness: 0.16 });
    const moodMat = new THREE.MeshStandardMaterial({ color: linear(mood.hex), metalness: 0.55, roughness: 0.18, emissive: linear(mood.hex), emissiveIntensity: 0.45 });

    const H = 18, R = 1.3, T = 2.8;
    const dna = new THREE.Group();
    [0, Math.PI].forEach((ph) => {
        dna.add(new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(R, H, T, ph), lite ? 240 : 520, 0.25, lite ? 14 : 28, false), chrome));
    });
    // coppie di basi: metà cromo, metà nel colore del motto
    const up = new THREE.Vector3(0, 1, 0);
    const N = Math.round(T * 11);
    const cA = new HelixCurve(R, H, T, 0), cB = new HelixCurve(R, H, T, Math.PI);
    const rungGeo = new THREE.CylinderGeometry(0.068, 0.068, 1, lite ? 8 : 16);
    const knotGeo = new THREE.SphereGeometry(0.13, lite ? 10 : 20, lite ? 8 : 14);
    for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const a = cA.getPoint(u), b = cB.getPoint(u), mid = a.clone().lerp(b, 0.5);
        const flip = i % 2 === 0;
        [[a, mid, flip ? chromeSolid : moodMat], [mid, b, flip ? moodMat : chromeSolid]].forEach(([from, to, mat]) => {
            const dir = to.clone().sub(from);
            const cyl = new THREE.Mesh(rungGeo, mat);
            cyl.scale.y = dir.length();
            cyl.position.copy(from).addScaledVector(dir, 0.5);
            cyl.quaternion.setFromUnitVectors(up, dir.normalize());
            dna.add(cyl);
        });
        const knot = new THREE.Mesh(knotGeo, chromeSolid);
        knot.position.copy(mid);
        dna.add(knot);
    }
    // gocce di metallo liquido attorno
    const drops = [];
    for (let d = 0; d < (lite ? 0 : 12); d++) {
        const size = 0.05 + Math.random() * 0.17;
        const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), liquid(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 }), size * 0.5));
        drop.userData = { r: R + 0.6 + Math.random() * 1.8, y: (Math.random() - 0.5) * H * 0.6, a: Math.random() * Math.PI * 2, v: 0.12 + Math.random() * 0.25 };
        drops.push(drop);
        dna.add(drop);
    }
    const holder = new THREE.Group();
    holder.add(dna);
    scene.add(holder);

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
        uniforms: {
            tDiffuse: { value: rt.texture }, uTime: { value: 0 }, uGlitch: { value: 0 }, uSeed: { value: 0 },
            uRes: { value: new THREE.Vector2(4, 4) }, uMood: { value: new THREE.Color(mood.hex) }, uDim: { value: dim }
        }
    });
    const postScene = new THREE.Scene();
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // schermo orizzontale: elica in diagonale come nei flyer; schermo verticale: quasi in piedi
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
        post.uniforms.uRes.value.set(w * dpr, h * dpr);
        camera.aspect = w / h;
        const landscape = w > h;
        holder.rotation.z = landscape ? -1.0 : -0.4;
        holder.position.x = landscape ? 1.2 : 0.3;
        camera.position.set(0, 0, landscape ? 12 : 16.5);
        camera.updateProjectionMatrix();
        const dist = camera.position.z - bg.position.z;
        const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        bg.scale.set(viewH * camera.aspect * 1.05, viewH * 1.05, 1);
        bgMat.uniforms.uAspect.value = camera.aspect;
        bgMat.uniforms.uRadius.value = landscape ? 0.9 : 0.62;
        bgMat.uniforms.uGlow.value.set(landscape ? 0.64 : 0.55, landscape ? 0.4 : 0.42);
    }
    resize();
    window.addEventListener('resize', resize);

    return {
        setMood(m) {
            const c = linear(MOODS[m].hex);
            scene.environment = envs[m];
            moodMat.color.copy(c);
            moodMat.emissive.copy(c);
            dustMat.color.copy(c);
            bgMat.uniforms.uMood.value.copy(c);
            bgMat.uniforms.uDeep.value.copy(linear(MOODS[m].deep));
            post.uniforms.uMood.value.setHex(MOODS[m].hex);
        },
        render(t) {
            const sec = t / 1000;
            timeU.value = sec;
            dna.rotation.y = sec * 0.3;
            dna.scale.setScalar(1 + Math.sin(sec * 0.9) * 0.012);
            drops.forEach((dr) => {
                const q = dr.userData, ang = q.a + sec * q.v;
                dr.position.set(Math.cos(ang) * q.r, q.y + Math.sin(sec * 0.6 + q.a) * 0.3, Math.sin(ang) * q.r);
            });
            dust.rotation.y = sec * 0.03;
            dust2.rotation.y = 1.7 - sec * 0.02;
            dust.position.y = (sec * 0.15) % 2;
            const g = state.glitch;
            dna.position.x = g > 0 ? (Math.random() - 0.5) * 0.25 * g : 0;
            dna.position.y = g > 0 ? (Math.random() - 0.5) * 0.12 * g : 0;
            post.uniforms.uTime.value = sec;
            post.uniforms.uGlitch.value = g;
            post.uniforms.uSeed.value = state.seed;
            renderer.setRenderTarget(rt);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCam);
        }
    };
}

// Glitch anche sui titoli: il CSS usa body.glitching e --gx
function domGlitch(on) {
    document.body.classList.toggle('glitching', on);
    if (on) document.body.style.setProperty('--gx', ((Math.random() - 0.5) * 10).toFixed(1) + 'px');
}

// Sequenza di DNA che ogni tanto si decifra nella parola del motto (solo dove c'è #dna-seq)
function startSequence(el) {
    const BASES = 'ATCG', NOISE = '#/\\<>▓░_=+*', LEN = 26;
    const seq = Array.from({ length: LEN }, () => BASES[(Math.random() * 4) | 0]);
    const t0 = performance.now();
    function tick() {
        seq.shift();
        seq.push(BASES[(Math.random() * 4) | 0]);
        const out = seq.slice();
        const word = MOODS[state.mood].word.toUpperCase();
        const cycle = (performance.now() - t0) % 7000;
        if (cycle > 3800) {
            const start = ((LEN - word.length) / 2) | 0;
            const shown = Math.min(word.length, Math.floor((cycle - 3800) / 90));
            for (let k = 0; k < word.length; k++) out[start + k] = k < shown ? word[k] : NOISE[(Math.random() * NOISE.length) | 0];
            out[start - 1] = '·';
            out[start + word.length] = '·';
        }
        if (state.glitch > 0.05) {
            for (let n = 0; n < 6; n++) out[(Math.random() * LEN) | 0] = NOISE[(Math.random() * NOISE.length) | 0];
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

    if (reduce) {
        views.forEach((v) => v.render(2600));
        return;
    }

    function applyMood(m) {
        state.mood = m;
        setCssMood(m);
        saveMood(m);
        views.forEach((v) => v.setMood(m));
    }

    let running = false;
    function frame(t) {
        if (document.hidden) { running = false; return; }
        if (t > state.nextBurst) {
            state.bursts++;
            if (state.bursts % CYCLE_EVERY === 0) {
                // colpo forte: il colore passa alla parola successiva del motto a metà glitch
                state.power = 1;
                state.burstEnd = t + 460;
                state.pending = ORDER[(ORDER.indexOf(state.mood) + 1) % ORDER.length];
                state.swapAt = t + 170;
                state.nextBurst = t + 2000 + Math.random() * 2000;
            } else {
                state.power = 0.3 + Math.random() * 0.7;
                state.burstEnd = t + 90 + Math.random() * 340;
                // a volte un secondo colpo subito dopo, come un segnale che salta
                state.nextBurst = Math.random() < 0.3 ? t + 420 : t + 1800 + Math.random() * 2000;
            }
        }
        if (state.pending && t >= state.swapAt) {
            applyMood(state.pending);
            state.pending = null;
        }
        let g = 0;
        if (t < state.burstEnd) {
            g = state.power * (0.55 + 0.45 * Math.random());
            if (t - state.lastSeed > 45) { state.seed = Math.random() * 100; state.lastSeed = t; }
        }
        state.glitch = g;
        domGlitch(g > 0.08);
        views.forEach((v) => v.render(t));
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
