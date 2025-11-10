import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, camera, camcontrols;
let mapa,
  mapsx,
  mapsy,
  scale = 6;
const datosRegioni = [];

const minlon = 6.0,
  maxlon = 19.5;
const minlat = 36.0,
  maxlat = 47.5;

const regionCoords = {
  Piemonte: { lat: 45.0703, lon: 7.6869 },
  "Valle d'Aosta": { lat: 45.737, lon: 7.315 },
  Lombardia: { lat: 45.4642, lon: 9.7 },
  "Trentino-Alto Adige": { lat: 46.5, lon: 10.6 },
  Veneto: { lat: 45.4408, lon: 11.7 },
  "Friuli-Venezia Giulia": { lat: 46, lon: 12.7768 },
  Liguria: { lat: 44.4056, lon: 8.9463 },
  "Emilia-Romagna": { lat: 44.4949, lon: 11.3426 },
  Toscana: { lat: 43.2, lon: 10.8 },
  Umbria: { lat: 42.8, lon: 12.1 },
  Marche: { lat: 43.6158, lon: 12.5189 },
  Lazio: { lat: 41.9028, lon: 12.4964 },
  Abruzzo: { lat: 42.3499, lon: 13.3995 },
  Molise: { lat: 41.56, lon: 14.6655 },
  Campania: { lat: 40.8518, lon: 14.2681 },
  Puglia: { lat: 41.1171, lon: 15.8719 },
  Basilicata: { lat: 40.2, lon: 15.8051 },
  Calabria: { lat: 38.5, lon: 15.9 },
  Sicilia: { lat: 37.4, lon: 13.3615 },
  Sardegna: { lat: 39.2238, lon: 9.1217 },
};

function normName(s) {
  return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);

  const loader = new THREE.TextureLoader();
  loader.load("src/mapa.png", function (texture) {
    const txaspectRatio = texture.image.width / texture.image.height;
    mapsy = scale;
    mapsx = mapsy * txaspectRatio;
    createMapPlaneWithShader(mapsx, mapsy, texture);

    fetch("src/regioni.csv")
      .then((res) => res.text())
      .then((txt) => procesarCSVRegioni(txt))
      .catch((err) => {
        console.error("Errore CSV:", err);
        creaMarcatoreSoloCoords();
      });
  });

  window.addEventListener("resize", onWindowResize);
}

// Shader Material per la mappa
function createMapPlaneWithShader(sx, sy, texture) {
  const geometry = new THREE.PlaneGeometry(sx, sy);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(uTexture, vUv);
        // Effetto pulsante sulle zone chiare
        float glow = 0.7 + 0.5*sin(uTime*2.0 + vUv.x*10.0);
        gl_FragColor = vec4(tex.rgb * glow, tex.a);
      }
    `,
    transparent: false,
  });

  mapa = new THREE.Mesh(geometry, material);
  scene.add(mapa);
}

function procesarCSVRegioni(content) {
  const sep = ",";
  const rows = content.split(/\r?\n/).filter((r) => r.trim().length > 0);
  const headers = rows[0].split(sep).map((h) => h.trim());
  let nameIdx = headers.findIndex((h) =>
    ["regione", "nome", "region", "name"].includes(h.toLowerCase())
  );
  if (nameIdx === -1) nameIdx = 0;

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(sep);
    const nome = cols[nameIdx].trim();
    if (nome) datosRegioni.push({ name: nome });
  }
  placeRegionMarkersFromData();
}

function placeRegionMarkersFromData() {
  for (const rName in regionCoords) {
    const coords = regionCoords[rName];
    const mlon = Map2Range(coords.lon, minlon, maxlon, -mapsx / 2, mapsx / 2);
    const mlat = Map2Range(coords.lat, minlat, maxlat, -mapsy / 2, mapsy / 2);
    Esfera(mlon, mlat, 0.01, 0.04, 16, 12, 0xff9800);
    creaEtichetta(rName, mlon, mlat, 0.1);
  }
}

function creaEtichetta(testo, x, y, z) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = "Bold 48px Arial";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  ctx.strokeText(testo, 4, 50);
  ctx.fillText(testo, 4, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.8, 0.4, 1);
  sprite.position.set(x + 0.15, y + 0.03, z);
  scene.add(sprite);
}

function creaMarcatoreSoloCoords() {
  for (const rName in regionCoords) {
    const coords = regionCoords[rName];
    const mlon = Map2Range(coords.lon, minlon, maxlon, -mapsx / 2, mapsx / 2);
    const mlat = Map2Range(coords.lat, minlat, maxlat, -mapsy / 2, mapsy / 2);
    Esfera(mlon, mlat, 0.01, 0.04, 16, 12, 0x2196f3);
    creaEtichetta(rName, mlon, mlat, 0.1);
  }
}

function Map2Range(val, vmin, vmax, dmin, dmax) {
  return dmin + ((val - vmin) / (vmax - vmin)) * (dmax - dmin);
}

function Esfera(px, py, pz, radio, nx, ny, col) {
  const geometry = new THREE.SphereGeometry(radio, nx, ny);
  const material = new THREE.MeshBasicMaterial({ color: col });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  scene.add(mesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
  requestAnimationFrame(animate);
  if (mapa.material.uniforms) mapa.material.uniforms.uTime.value = time * 0.001;
  renderer.render(scene, camera);
}
