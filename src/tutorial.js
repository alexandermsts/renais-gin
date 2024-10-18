import * as CANNON from "cannon-es";
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

let liquidMesh;
let amplitude = 0.01; // Висота хвилі
let frequency = 0.5; // Швидкість хвилі
let elapsedTime = 0; // Лічильник часу для ефекту хвилі

loader.load("/bottle_without_neck.glb", (gltf) => {
    bottle = gltf.scene;

    const glass = bottle.getObjectByName("Glass");
    const liquid = bottle.getObjectByName("Liquid");

    console.log(bottle.getObjectByName("Glass"));

    //const glass = bottle.getObjectByName("Liquid");
    // bottle.remove(glass);

    console.log("bottle", bottle);

    const glassBBox = new THREE.Box3().setFromObject(glass);
    const glassHeight = glassBBox.max.y - glassBBox.min.y;
    const glassCenterY = glassBBox.min.y + glassHeight / 2;

    bottle.traverse((child) => {
        //console.log(child.name);
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
                existingMaterial.opacity = 0.7;
                child.visible = false;

                existingMaterial.transparent = true; // Make sure it is set to transparent
            }

            if (child.name === "Liquid") {
                console.log("child", child);

                liquidMesh = child;

                const existingMaterial = child.material;

                // Update the color using normalized RGB values

                // Adjust properties for visibility
                existingMaterial.roughness = 0.1; // Slight roughness for liquid
                existingMaterial.transmission = 1.0; // Full transmission (transparent)
                existingMaterial.opacity = 0.9; // Almost fully transparent (adjust as needed)
                existingMaterial.ior = 1.33; // Index of refraction for water
                existingMaterial.clearcoat = 0.5; // Optional: Add clearcoat for gloss
                existingMaterial.clearcoatRoughness = 0.1; // Optional: Adjust roughness of clearcoat
                existingMaterial.envMapIntensity = 1.0; // Set intensity for reflections
                existingMaterial.needsUpdate = true; // Ensure the material updates
                existingMaterial.color = new THREE.Color(0xff5733);

                // Create the physics body for the liquid
                // Create physics body for the liquid

                liquidMesh = child;
            }

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

const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 0), 0.5);

renderer.localClippingEnabled = true;

const applyWaveEffectToTopVertices = (mesh, time, amp, freq) => {
    const geometry = mesh.geometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
        const y = positionAttribute.getY(i);

        // Apply the wave only to vertices above a certain Y position
        if (y > 0.1) {
            // Adjust this value to fit the height of your liquid
            const x = positionAttribute.getX(i);
            const waveY = Math.sin((x + time * freq) * 5.0) * amp;
            positionAttribute.setY(i, y + waveY); // Modify Y position
        }
    }

    // Mark the position attribute as needing an update
    positionAttribute.needsUpdate = true;

    // Update normals for proper shading
    geometry.computeVertexNormals();
};

const renderloop = () => {
    requestAnimationFrame(renderloop);
    controls.update();

    if (liquidMesh) {
        elapsedTime += 0.05;
        applyWaveEffectToTopVertices(
            liquidMesh,
            elapsedTime,
            amplitude,
            frequency
        );

        // Apply the clipping plane to the liquid
        liquidMesh.material.clippingPlanes = [clippingPlane];
        liquidMesh.material.clipShadows = true;
        liquidMesh.material.needsUpdate = true;
    }
    renderer.render(scene, camera);
};

renderloop();
