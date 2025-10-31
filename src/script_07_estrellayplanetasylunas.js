import planetasDataJSON from "/files/planetas.json";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as dat from "dat.gui";

let scene, renderer, camera, camcontrols, info, infoPanel, indexContainer;
let estrella,
  Planetas = [],
  Lunas = [], 
  Capas = [];
let t0 = 0, accglobal = 0.001, timestamp;

const controls = {
  orbitas: true, // por defecto activadas
  rotaciones: true // controla rotación de nubes y planetas
};

const gui = new dat.GUI();
gui.add(controls, "orbitas").name("Órbitas activas");
gui.add(controls, "rotaciones").name("Rotación planetas/nubes");

const loader = new THREE.TextureLoader();
const loaderGLTF = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
loaderGLTF.setDRACOLoader(dracoLoader);

let spaceship = null;
let naveActiva = false;
const velocidadNave = 0.5;
let planetasData = planetasDataJSON;
let planetaSeleccionado = null;
let camPosInicial = new THREE.Vector3(0, 0, 40);
let camTargetInicial = new THREE.Vector3(0, 0, 0);

init();
animationLoop();

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

function init() {
  const navePanel = document.createElement("div");
  navePanel.style.position = "absolute";
  navePanel.style.bottom = "80px";
  navePanel.style.left = "50%";
  navePanel.style.transform = "translateX(-50%)";
  navePanel.style.width = "220px";
  navePanel.style.padding = "10px";
  navePanel.style.background = "rgba(0,0,0,0.7)";
  navePanel.style.color = "white";
  navePanel.style.fontFamily = "monospace";
  navePanel.style.borderRadius = "10px";
  navePanel.style.textAlign = "left";
  navePanel.style.display = "none";
  navePanel.innerHTML = `
  <b>Controles nave:</b>
  <ul style="margin: 5px; padding-left: 15px;">
    <li>Flecha Arriba: Avanzar</li>
    <li>Flecha Abajo: Retroceder</li>
    <li>Flecha Izquierda/Derecha: Girar</li>
    <li>Espacio: Subir</li>
    <li>Shift: Bajar</li>
    <li>Escape: Salir del modo nave</li>
  </ul>`;
  document.body.appendChild(navePanel);

  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "1";
  info.style.fontFamily = "Monospace";
  info.innerHTML = "Sistema Solar de Lucía Motas Guedes";
  document.body.appendChild(info);

// === Panel lateral para información ===
infoPanel = document.createElement("div");
infoPanel.style.position = "absolute";
infoPanel.style.top = "100px";
infoPanel.style.right = "30px";
infoPanel.style.width = "280px";
infoPanel.style.padding = "15px";
infoPanel.style.background = "rgba(0,0,0,0.6)";
infoPanel.style.color = "white";
infoPanel.style.fontFamily = "monospace";
infoPanel.style.borderRadius = "10px";
infoPanel.style.display = "none";
infoPanel.style.lineHeight = "1.4em";
document.body.appendChild(infoPanel);

indexContainer = document.createElement("div");
indexContainer.style.position = "absolute";
indexContainer.style.bottom = "10px";
indexContainer.style.left = "50%";
indexContainer.style.transform = "translateX(-50%)";
indexContainer.style.display = "flex";
indexContainer.style.gap = "10px";
indexContainer.style.background = "rgba(0,0,0,0.5)";
indexContainer.style.padding = "5px 10px";
indexContainer.style.borderRadius = "10px";
indexContainer.style.zIndex = "2";
document.body.appendChild(indexContainer);

  //Defino cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 40);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.style.backgroundColor = "black"; // el HTML también
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);

const espacio = loader.load("/textures/galaxy.jpg");
scene.background = espacio;

  // Sol
const sol = Sol({
  radio: 2.5,
  texturas: {
    map: "/textures/2k_sun.jpg",
    bump: "/textures/sunmapthumb.jpg",
  },
  intensidad: 2.2,
});

// Mercurio
const mercurio = planetaConTextura({
  nombre: "Mercurio",
  radio: 0.38,
  distancia: 4,
  velocidad: -2.0,
  texturas: {
    map: "/textures/mercurymap.jpg",
    bump: "/textures/mercurybump.jpg",
  },
});

// Venus
const venus = planetaConTextura({
  nombre: "Venus",
  radio: 0.7,
  distancia: 5.5,
  velocidad: -1.6,
  texturas: {
    map: "/textures/venusmap.jpg",
    bump: "/textures/venusbump.jpg",
  },
});

// Tierra
const tierra = planetaConTextura({
  nombre: "Tierra",
  radio: 0.8,
  distancia: 7.5,
  velocidad: -1.2,
  texturas: { map: "/textures/earthmap1k.jpg", bump: "/textures/earthbumpthumb.jpg" },
});

// Nubes (ligeramente más grandes y giran de forma independiente)
const nubes = capaNubes({
  padre: tierra,
  radio: 0.9,
  velocidad: 0.9,
  texturas: {
    map: "/textures/earthcloudmap.jpg",
    alpha: "/textures/earthcloudmaptrans_invert.jpg",
  },
});

loaderGLTF.load("/files/iss.glb", (gltf) => {
  const iss = gltf.scene;
  iss.scale.set(0.01, 0.01, 0.01);
  agregarEstacionEspacial({
    modelo: iss,
    planetaPadre: tierra,
    distancia: 1.3,
    velocidad: 4.0,
  });
});

// Luna
lunaConTextura({
  nombre: "Luna",
  radio: 0.25,
  distancia: 1.2,
  velocidad: 3.0,
  texturas: {
    map: "/textures/moonmap1k.jpg",
    bump: "/textures/moonmapthumb.jpg",
  },
  padre: tierra,
});

// Marte
const marte = planetaConTextura({
  nombre: "Marte",
  radio: 0.7,
  distancia: 9.8,
  velocidad: -0.9,
  texturas: {
    map: "/textures/marsmap1k.jpg",
    bump: "/textures/marsbump1k.jpg",
  },
});

// Fobos
lunaConTextura({
  nombre: "Fobos",
  radio: 0.1,
  distancia: 1.0,
  velocidad: 3.0,
  texturas: {
    bump: "/textures/phobosbump.jpg",
  },
  padre: marte,
});

// Deimos
lunaConTextura({
  nombre: "Deimos",
  radio: 0.08,
  distancia: 1.6,
  velocidad: 2.2,
  texturas: {
    bump: "/textures/deimosbump.jpg",
  },
  padre: marte,
});


// Júpiter
const jupiter = planetaConTextura({
  nombre: "Júpiter",
  radio: 1.8,
  distancia: 14,
  velocidad: -0.5,
  texturas: {
    map: "/textures/jupitermap.jpg",
    bump: "/textures/jupitermapthump.jpg",
  },
});

const ringTexture = loader.load("/textures/saturnring.png");
{
  const ringGeom = new THREE.RingGeometry(1.95, 2.3, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: 0x888888,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.3,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2.3;
  jupiter.add(ring);
}
// Saturno
const saturno = planetaConTextura({
  nombre: "Saturno",
  radio: 1.5,
  distancia: 19,
  velocidad: -0.4,
  texturas: {
    map: "/textures/saturnmap.jpg",
    bump: "/textures/saturnbump.jpg",
  },
});

  const ringGeom = new THREE.RingGeometry(1.7, 3, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTexture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2.6;
  saturno.add(ring);

// Urano
const urano = planetaConTextura({
  nombre: "Urano",
  radio: 1.2,
  distancia: 24,
  velocidad: -0.3,
  texturas: {
    map: "/textures/uranusmap.jpg",
    bump: "/textures/uranusmapthumb.jpg",
  },
});

{
  const ringGeom = new THREE.RingGeometry(1.4, 1.8, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: 0x555555,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.35,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2.0;
  urano.add(ring);
}

// Neptuno
const neptuno = planetaConTextura({
  nombre: "Neptuno",
  radio: 1.1,
  distancia: 27,
  velocidad: -0.25,
  texturas: {
    map: "/textures/neptunemap.jpg",
    bump: "/textures/neptunemapthumb.jpg",
  },
});

{
  const ringGeom = new THREE.RingGeometry(1.3, 1.7, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: 0x777777,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.25,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2.1;
  neptuno.add(ring);
}

// Plutón
const pluton = planetaConTextura({
  nombre: "Plutón",
  radio: 0.3,
  distancia: 29,
  velocidad: -0.2,
  texturas: {
    map: "/textures/plutomap1k.jpg",
    bump: "/textures/plutomapthumb.jpg",
  },
});

  //Inicio tiempo
  t0 = Date.now();

  crearIndiceSol(sol);
  crearIndicePlanetas();
  crearIndiceNaveOBJ(navePanel);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        naveActiva = false;
        controls.orbitas = true;
        navePanel.style.display = "none";

        new TWEEN.Tween(camera.position)
                .to({ x: camPosInicial.x, y: camPosInicial.y, z: camPosInicial.z }, 1200)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => camcontrols.update())
                .start();

            new TWEEN.Tween(camcontrols.target)
                .to({ x: camTargetInicial.x, y: camTargetInicial.y, z: camTargetInicial.z }, 1200)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => camcontrols.update())
                .start();
    }

    if (!naveActiva || !spaceship) return;
    const rotationSpeed = 0.03;
    const moveSpeed = velocidadNave;
    
    // Ejes locales
    const upAxis = new THREE.Vector3(0,1,0);
    const rightAxis = new THREE.Vector3(1,0,0);
    
    switch(event.key) {
        case "ArrowUp":    // Avanzar
            spaceship.translateZ(-moveSpeed);
            break;
        case "ArrowDown":  // Retroceder
            spaceship.translateZ(moveSpeed);
            break;
        case "ArrowLeft":  // Girar izquierda (yaw)
            spaceship.rotation.y += rotationSpeed;
            break;
        case "ArrowRight": // Girar derecha (yaw)
            spaceship.rotation.y -= rotationSpeed;
            break;
        case " ":          // Subir
            spaceship.translateY(moveSpeed);
            break;
        case "Shift":      // Bajar
            spaceship.translateY(-moveSpeed);
            break;
    }
});

  const mtlLoader = new MTLLoader();
mtlLoader.load('/files/spaceship_flying.mtl', (materials) => {
  materials.preload();
  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('/files/spaceship_flying.obj', (obj) => {
    obj.scale.set(0.01, 0.01, 0.01);
    obj.position.set(-35, 0, 0);
    obj.rotation.set(-Math.PI/2, -Math.PI/2, 0);

    scene.add(obj);
    spaceship = obj;
    naveActiva = false; // no activamos el control todavía
  });
});
}

function mostrarInfo(nombre) {
  const data = planetasData.find((p) => p.nombre === nombre);
  if (!data) return;

  infoPanel.innerHTML = `
  <h2 style="color: #ffcc00; margin-top:0">${data.nombre}</h2>
  <p><b>Descripción:</b> ${data.descripcion}</p>
  <p><b>Día:</b> ${data.dia}</p>
  <p><b>Año:</b> ${data.anio}</p>
  <p><b>Masa:</b> ${data.masa}</p>
  <p><b>Gravedad:</b> ${data.gravedad}</p>
  <p><b>Temperatura:</b> ${data.temperatura}</p>
  <p><b>Satélites:</b> ${data.satélites}</p>
    <button id="volverBtn">Volver</button>
  `;
  infoPanel.style.display = "block";

  document.getElementById("volverBtn").onclick = () => {
    planetaSeleccionado = null;

    controls.orbitas = true;
    const orbitasController = gui.__controllers.find(c => c.property === "orbitas");
    if (orbitasController) orbitasController.updateDisplay();
    // Reinicia el tiempo antes de mover cámara
    t0 = Date.now();

    requestAnimationFrame(() => {
      new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 0, z: 40 }, 1200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => camcontrols.update())
        .start();

      new TWEEN.Tween(camcontrols.target)
        .to({ x: 0, y: 0, z: 0 }, 1200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => camcontrols.update())
        .start();
    infoPanel.style.display = "none";
    });
  };
}

function crearIndiceNaveOBJ(panel) {
  const btn = document.createElement("button");
  btn.textContent = "Nave";
  btn.style.padding = "5px 10px";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";
  btn.style.background = "#222";
  btn.style.color = "#fff";
  btn.style.border = "1px solid #fff";
  btn.onclick = () => {
      naveActiva = true;
      controls.orbitas = false;
      panel.style.display = "block";
  };
  indexContainer.appendChild(btn);
}

function crearIndiceSol(sol) {
  const btn = document.createElement("button");
  btn.textContent = "Sol";
  btn.style.padding = "5px 10px";
  btn.style.borderRadius = "5px";
  btn.style.cursor = "pointer";
  btn.style.background = "#222";
  btn.style.color = "#fff";
  btn.style.border = "1px solid #fff";
  btn.onclick = () => {
    mostrarInfo("Sol");
    enfocarPlaneta(sol);
  };
  indexContainer.appendChild(btn);
}

function crearIndicePlanetas() {
  Planetas.forEach((planet) => {
    const btn = document.createElement("button");
    btn.textContent = planet.userData.nombre;
    btn.style.padding = "5px 10px";
    btn.style.borderRadius = "5px";
    btn.style.cursor = "pointer";
    btn.style.background = "#222";
    btn.style.color = "#fff";
    btn.style.border = "1px solid #fff";
    btn.onclick = () => {
      planetaSeleccionado = planet;
      controls.orbitas = false;
      const orbitasController = gui.__controllers.find(c => c.property === "orbitas");
      if (orbitasController) orbitasController.updateDisplay();

      mostrarInfo(planet.userData.nombre);
      enfocarPlaneta(planet);
    };
    indexContainer.appendChild(btn);
  });
}

function enfocarPlaneta(planeta) {
  const target = new THREE.Vector3();
  planeta.getWorldPosition(target);

  // Suavizado del movimiento de cámara
  new TWEEN.Tween(camera.position)
    .to(
      {
        x: target.x + 3,
        y: target.y + 2,
        z: target.z + 3,
      },
      1200
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();

  new TWEEN.Tween(camera.lookAt(target))
    .to({}, 1200)
    .onUpdate(() => camera.lookAt(target))
    .start();
}

function agregarEstacionEspacial({ modelo, planetaPadre, distancia = 1.2, velocidad = 2.5 }) {
  modelo.userData = { planetaPadre, distancia, velocidad };
  modelo.position.set(planetaPadre.position.x + distancia, planetaPadre.position.y, planetaPadre.position.z);
  scene.add(modelo);
  return modelo;
}

function planetaConTextura({
  nombre = "",
  radio = 1,
  distancia = 0,
  velocidad = 0,
  color = 0xffffff,
  texturas = null,
}) {
  const loader = new THREE.TextureLoader();

  let material;
  if (texturas) {
    const map = texturas.map ? loader.load(texturas.map) : null;
    const bump = texturas.bump ? loader.load(texturas.bump) : null;
    const alpha = texturas.alpha ? loader.load(texturas.alpha) : null;

    material = new THREE.MeshPhongMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.05,
      alphaMap: alpha,
      transparent: !!alpha,
      side: THREE.DoubleSide,
    });
  } else {
    material = new THREE.MeshPhongMaterial({ color });
  }

  // Crear esfera
  const geom = new THREE.SphereGeometry(radio, 20, 20);
  const planeta = new THREE.Mesh(geom, material);

  // Guardar datos de movimiento
  planeta.userData = {
    dist: distancia,
    speed: velocidad,
    nombre,
  };

  // Añadir al sistema solar
  scene.add(planeta);
  Planetas.push(planeta);

  // Dibujar órbita (solo si tiene distancia > 0)
  if (distancia > 0) {
    const curve = new THREE.EllipseCurve(0, 0, distancia, distancia);
    const points = curve.getPoints(80);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x444444 });
    const orbita = new THREE.Line(geo, mat);
    scene.add(orbita);
  }

  return planeta;
}

function lunaConTextura({
  nombre = "",
  radio = 0.1,
  distancia = 1,
  velocidad = 2,
  texturas = null,
  padre,
}) {
  const loader = new THREE.TextureLoader();
  const map = texturas.map ? loader.load(texturas.map) : null;
  const bump = texturas.bump ? loader.load(texturas.bump) : null;

  const material = new THREE.MeshPhongMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.05,
  });

  const geom = new THREE.SphereGeometry(radio, 16, 16);
  const luna = new THREE.Mesh(geom, material);
  luna.userData = { dist: distancia, speed: velocidad, nombre };

  padre.add(luna);
  Lunas.push(luna);

  return luna;
}

function capaNubes({ padre, radio, texturas }) {
  const loader = new THREE.TextureLoader();
  const map = loader.load(texturas.map);
  const alpha = loader.load(texturas.alpha);

  const material = new THREE.MeshLambertMaterial({
    map,
    alphaMap: alpha,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const geom = new THREE.SphereGeometry(radio, 48, 48);
  const nubes = new THREE.Mesh(geom, material);
  nubes.userData = { rotSpeed: 0.009, orbitSpeed: -1.25, dist: 7 };
  padre.add(nubes);
  Capas.push(nubes);
  return nubes;
}

function Sol({ radio = 1.8, texturas = null, intensidad = 2 }) {
  const loader = new THREE.TextureLoader();

  let material;
  if (texturas) {
    const map = loader.load(texturas.map);
    material = new THREE.MeshBasicMaterial({
      map,
    });
  } else {
    material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  }

  const geom = new THREE.SphereGeometry(radio, 20, 20);
  const sol = new THREE.Mesh(geom, material);
  scene.add(sol);

  // Luz que ilumina los planetas
  const luzSol = new THREE.PointLight(0xffffff, intensidad, 100);
  luzSol.position.set(0, 0, 0);
  scene.add(luzSol);

  return sol;
}

//Bucle de animación
function animationLoop() {
  TWEEN.update();
  requestAnimationFrame(animationLoop);
  // https://www.solarsystemscope.com/textures/
  if (controls.rotaciones) {
    for (let object of Planetas) {
      object.rotation.y += 0.003;
    }
  
    for (let c of Capas) {
      c.rotation.y += c.userData.rotSpeed;
    }
  }
  
  if (controls.orbitas) {
    timestamp = (Date.now() - t0) * accglobal;
  
    for (let object of Planetas) {
      object.position.x = Math.cos(timestamp * object.userData.speed) * object.userData.dist;
      object.position.y = Math.sin(timestamp * object.userData.speed) * object.userData.dist;
    }
  
    for (let object of Lunas) {
      object.position.x = Math.cos(timestamp * object.userData.speed) * object.userData.dist;
      object.position.y = Math.sin(timestamp * object.userData.speed) * object.userData.dist;
    }

    const iss = scene.children.find(o => o.userData && o.userData.planetaPadre);
    if (iss) {
      const { planetaPadre, distancia, velocidad } = iss.userData;
      const t = timestamp * velocidad;
      const pos = planetaPadre.position;
      iss.position.set(
        pos.x + Math.cos(t) * distancia,
        pos.y + Math.sin(t) * distancia,
        pos.z
      );
      iss.lookAt(planetaPadre.position);
    }
  }  

  if (naveActiva && spaceship) {
    // Vector de dirección hacia adelante de la nave
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(spaceship.quaternion);
  
    // Posición deseada de la cámara (detrás y arriba)
    const desiredPosition = spaceship.position.clone().add(new THREE.Vector3(0, 2, 6).applyQuaternion(spaceship.quaternion));
  
    // Interpolación suave
    camera.position.lerp(desiredPosition, 0.1);
  
    // Cámara mira hacia adelante de la nave
    const lookAtPosition = spaceship.position.clone().add(forward.multiplyScalar(10));
    camera.up.set(5, 0, -1);
    camera.lookAt(lookAtPosition);
  }

  renderer.render(scene, camera);
}