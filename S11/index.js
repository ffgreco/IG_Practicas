import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Ammo from "ammojs-typed";

let scene, camera, renderer, controls, clock;
let physicsWorld;
let rigidBodies = [];
let transformTemp;
let AmmoLib;

Ammo().then((AmmoModule) => {
  AmmoLib = AmmoModule;
  initScene();
  initPhysics();
  createGround();
  spawnCubes();
  bindInput();
  animate();
});

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  clock = new THREE.Clock();

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  light.castShadow = true;
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  window.addEventListener("resize", onResize);
}

function initPhysics() {
  const cfg = new AmmoLib.btDefaultCollisionConfiguration();
  const disp = new AmmoLib.btCollisionDispatcher(cfg);
  const broad = new AmmoLib.btDbvtBroadphase();
  const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
  physicsWorld = new AmmoLib.btDiscreteDynamicsWorld(disp, broad, solver, cfg);
  physicsWorld.setGravity(new AmmoLib.btVector3(0, -9.8, 0));
  transformTemp = new AmmoLib.btTransform();
}

function createGround() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 30), mat);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(15, 0.5, 15));
  shape.setMargin(0.05);

  const transform = new AmmoLib.btTransform();
  transform.setIdentity();
  transform.setOrigin(new AmmoLib.btVector3(0, -0.5, 0));
  const motionState = new AmmoLib.btDefaultMotionState(transform);
  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    0,
    motionState,
    shape,
    new AmmoLib.btVector3(0, 0, 0)
  );
  const body = new AmmoLib.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(body);
}

function spawnCubes() {
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  for (let i = 0; i < 10; i++) {
    const size = 1 + Math.random() * 1;
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      cubeMat
    );
    const x = (Math.random() - 0.5) * 10;
    const y = 5 + i * 2;
    const z = (Math.random() - 0.5) * 10;
    cube.position.set(x, y, z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    const shape = new AmmoLib.btBoxShape(
      new AmmoLib.btVector3(size / 2, size / 2, size / 2)
    );
    shape.setMargin(0.05);

    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new AmmoLib.btVector3(x, y, z));
    const motionState = new AmmoLib.btDefaultMotionState(transform);
    const localInertia = new AmmoLib.btVector3(0, 0, 0);
    shape.calculateLocalInertia(1, localInertia);
    const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
      1,
      motionState,
      shape,
      localInertia
    );
    const body = new AmmoLib.btRigidBody(rbInfo);
    physicsWorld.addRigidBody(body);

    cube.userData.physicsBody = body;
    rigidBodies.push(cube);
  }
}

function bindInput() {
  window.addEventListener("pointerdown", (ev) => {
    const mouse = new THREE.Vector2();
    mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const intersects = ray.intersectObjects(rigidBodies);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const body = obj.userData.physicsBody;
      body.applyCentralImpulse(new AmmoLib.btVector3(0, 10, 0));
    }
  });
}

function updatePhysics(delta) {
  physicsWorld.stepSimulation(delta, 10);
  for (let i = 0; i < rigidBodies.length; i++) {
    const obj = rigidBodies[i];
    const body = obj.userData.physicsBody;
    const ms = body.getMotionState();
    if (ms) {
      ms.getWorldTransform(transformTemp);
      const p = transformTemp.getOrigin();
      const q = transformTemp.getRotation();
      obj.position.set(p.x(), p.y(), p.z());
      obj.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updatePhysics(delta);
  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
