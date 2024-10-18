import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Initialize Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfcf6df);

// Lights Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight1.position.set(0, 100);
scene.add(directionalLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(-205, 45, 235);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Load Bottle
let labelMesh = null;
let bottle;
let liquidMesh;
let originalPositions = [];

const loader = new GLTFLoader();

loader.load("/bottle_without_neck.glb", (gltf) => {
    bottle = gltf.scene;

    bottle.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.needsUpdate = true;

            if (child.name === "Glass") {
                const material = child.material;

                material.reflectivity = 1;
                material.roughness = 0.05;
                material.transmission = 1;
                material.ior = 1;
                material.clearcoat = 1.0;
                material.clearcoatRoughness = 0.1;
                material.envMapIntensity = 1.0;
                material.opacity = 0.7;
                material.transparent = true;
            }

            if (child.name === "Liquid") {
                const material = child.material;

                material.transmission = 1.0;
                material.opacity = 1;

                liquidMesh = child;

                const liquid = bottle.getObjectByName("Liquid");
                const liquidGeometry = liquid.geometry;
                const positionAttribute = liquidGeometry.attributes.position;
                const scaleFactor = 0.99;

                originalPositions = new Float32Array(
                    positionAttribute.count * 3
                );

                positionAttribute.array.forEach((value, index) => {
                    originalPositions[index] = value;
                });

                for (let i = 0; i < positionAttribute.count; i++) {
                    const y = positionAttribute.getY(i);

                    positionAttribute.setY(i, y * scaleFactor);
                }

                positionAttribute.needsUpdate = true;

                liquidGeometry.computeVertexNormals();
            }

            if (child.name === "Cap") {
                const material = child.material;

                material.metalness = 0.7;
                material.roughness = 0.9;
            }
        }
    });

    const bbox = new THREE.Box3().setFromObject(bottle);
    const center = bbox.getCenter(new THREE.Vector3());

    bottle.position.sub(center);
    bottle.scale.set(1, 1, 1);

    scene.add(bottle);

    createCurvedText(scene, "RENAIS", 0.045);
});

// Create Curved Text
const fontLoader = new FontLoader();
let text = "RENAIS";

const createCurvedText = (scene, text, curveRadius) => {
    fontLoader.load("/helvetiker_regular.typeface.json", (font) => {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: 0.017,
            height: 0.017,
            curveSegments: 12,
        });

        textGeometry.computeBoundingBox();

        const boundingBox = textGeometry.boundingBox;
        const centerX = (boundingBox.max.x - boundingBox.min.x) / 2;
        const positions = textGeometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] - centerX;
            const y = positions[i + 1];
            const z = positions[i + 2];

            const angle = x / curveRadius;
            positions[i] = Math.sin(angle) * curveRadius;
            positions[i + 2] = Math.cos(angle) * curveRadius - curveRadius;
        }

        textGeometry.attributes.position.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x000000),
        });

        if (labelMesh) {
            scene.remove(labelMesh);
            labelMesh.geometry.dispose();
        }

        labelMesh = new THREE.Mesh(textGeometry, material);
        labelMesh.position.set(0, 0.214, 0.045);

        scene.add(labelMesh);
    });
};

// Input Handling
const textInput = document.querySelector(".js-text-label");
const messageElement = document.querySelector(".js-error-message");

const validateText = (input) => {
    if (input.length < 3 || input.length > 12) {
        messageElement.textContent =
            "Text must be between 3 and 12 characters!";

        return false;
    }
    messageElement.textContent = "";

    return true;
};

textInput.addEventListener("input", (e) => {
    const inputValue = e.target.value.trim();

    text = inputValue;

    validateText(inputValue);
    createCurvedText(scene, text, 0.045);
});

// Camera, Renderer, and Controls Setup
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.z = 1;
scene.add(camera);

const canvas = document.querySelector("canvas.js-canvas");
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.screenSpacePanning = true;
controls.maxPolarAngle = Math.PI;
controls.minPolarAngle = 0;
controls.maxAzimuthAngle = Infinity;
controls.minAzimuthAngle = -Infinity;
controls.zoomSpeed = 0;

// Window Resize Handler
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Liquid Wave Effect
let amplitude = 0.01;
let frequency = 0.9;
let elapsedTime = 0;

const applyWaveEffectToTopVertices = (mesh, time, amp, freq) => {
    const geometry = mesh.geometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
        const y = positionAttribute.getY(i);

        if (y > 10) {
            const x = positionAttribute.getX(i);
            const waveY = Math.sin((x + time * freq) * 1.5) * amp;
            positionAttribute.setY(i, y + waveY);
        }
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
};

// Main Render Loop
let isInteracting = false;

const renderloop = () => {
    requestAnimationFrame(renderloop);
    controls.update();

    if (liquidMesh && isInteracting) {
        elapsedTime += 0.05;
        applyWaveEffectToTopVertices(
            liquidMesh,
            elapsedTime,
            amplitude,
            frequency
        );

        liquidMesh.material.clipShadows = true;
        liquidMesh.material.needsUpdate = true;
    }

    renderer.render(scene, camera);
};

// Event Listeners for Interaction
let resetInProgress = false;
let resetSpeed = 0.1;

const resetLiquidMesh = () => {
    resetInProgress = true;

    const geometry = liquidMesh.geometry;
    const positionAttribute = geometry.attributes.position;

    const currentPositions = positionAttribute.array.slice();
    let delta = new Float32Array(currentPositions.length);

    for (let i = 0; i < originalPositions.length / 3; i++) {
        delta[i * 3] =
            (originalPositions[i * 3] - currentPositions[i * 3]) * resetSpeed;
        delta[i * 3 + 1] =
            (originalPositions[i * 3 + 1] - currentPositions[i * 3 + 1]) *
            resetSpeed;
        delta[i * 3 + 2] =
            (originalPositions[i * 3 + 2] - currentPositions[i * 3 + 2]) *
            resetSpeed;
    }

    const animateReset = () => {
        for (let i = 0; i < originalPositions.length / 3; i++) {
            currentPositions[i * 3] += delta[i * 3];
            currentPositions[i * 3 + 1] += delta[i * 3 + 1];
            currentPositions[i * 3 + 2] += delta[i * 3 + 2];
        }

        for (let i = 0; i < currentPositions.length / 3; i++) {
            positionAttribute.setX(i, currentPositions[i * 3]);
            positionAttribute.setY(i, currentPositions[i * 3 + 1]);
            positionAttribute.setZ(i, currentPositions[i * 3 + 2]);
        }

        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();

        if (
            !currentPositions.every(
                (value, index) =>
                    Math.abs(value - originalPositions[index]) < 0.001
            )
        ) {
            requestAnimationFrame(animateReset);
        } else {
            resetInProgress = false;
        }
    };

    animateReset();
};

canvas.addEventListener("mousedown", () => {
    isInteracting = true;
});

canvas.addEventListener("mouseup", () => {
    isInteracting = false;
    if (!resetInProgress) resetLiquidMesh();
});

canvas.addEventListener("mouseleave", () => {
    isInteracting = false;
    if (!resetInProgress) resetLiquidMesh();
});

// Initialize and Start
renderloop();
