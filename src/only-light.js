import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfdf3d0);

const textureLoader = new THREE.TextureLoader();
const environmentMap = textureLoader.load("bg.jpg");
//scene.background = environmentMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight1.position.set(0, 100); // Above and in front of the bottle
scene.add(directionalLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(-205, 45, 235);
directionalLight.castShadow = true;
scene.add(directionalLight);

let bottle;
const loader = new GLTFLoader();

loader.load("/bottle_without_neck.glb", (gltf) => {
    bottle = gltf.scene;

    console.log(bottle);

    bottle.traverse((child) => {
        console.log(child.name);
        //console.log('child.isMesh ', child.isMesh );
        //console.log('child.material ', child.material );
        if (child.isMesh && child.material) {
            if (child.name === "Glass") {
                const existingMaterial = child.material;
                existingMaterial.envMap = environmentMap;
                //existingMaterial.color = new THREE.Color(0xff5733);
                existingMaterial.reflectivity = 1;
                existingMaterial.roughness = 0.05; // Smooth surface
                existingMaterial.transmission = 1; // Full transparency
                existingMaterial.ior = 1;
                existingMaterial.clearcoat = 1.0;
                existingMaterial.clearcoatRoughness = 0.1;
                existingMaterial.envMapIntensity = 1.0;
            }

            /*if (child.name === "Liquid") {
                const existingMaterial = child.material;

                existingMaterial.roughness = 0.1; // Slight roughness for liquid
                existingMaterial.transmission = 0.9; // Almost fully transparent
                existingMaterial.ior = 1.33; // Index of refraction for water/liquid
                existingMaterial.color = new THREE.Color(0xff5733);
                existingMaterial.opacity = 1;
                existingMaterial.envMapIntensity = 0.9;
                existingMaterial.needsUpdate = true;
            }*/

            if (child.name === "Cap") {
                const existingMaterial = child.material;

                existingMaterial.metalness = 0.7;
                existingMaterial.roughness = 0.9;
            }
        }
    });

    const bbox = new THREE.Box3().setFromObject(bottle);
    const center = bbox.getCenter(new THREE.Vector3());
    bottle.position.sub(center);

    bottle.scale.set(1, 1, 1);
    scene.add(bottle);
});

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    30
);
camera.position.z = 1;
scene.add(camera);

const canvas = document.querySelector("canvas.threejs");
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

const renderloop = () => {
    requestAnimationFrame(renderloop);
    controls.update();
    renderer.render(scene, camera);
};

renderloop();
