import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera setup - using OrthographicCamera for isometric view
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 5;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);
// Position camera directly in front for isometric view
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Create cube with different colored faces
const geometry = new THREE.BoxGeometry(2, 2, 2);

// Create materials for each face with different colors
const materials = [
    new THREE.MeshBasicMaterial({ color: 0xff6347 }), // right - tomato red
    new THREE.MeshBasicMaterial({ color: 0xffd700 }), // left - gold
    new THREE.MeshBasicMaterial({ color: 0xff69b4 }), // top - hot pink
    new THREE.MeshBasicMaterial({ color: 0x9370db }), // bottom - medium purple
    new THREE.MeshBasicMaterial({ color: 0x32cd32 }), // front - lime green
    new THREE.MeshBasicMaterial({ color: 0x87ceeb })  // back - sky blue
];

const cube = new THREE.Mesh(geometry, materials);

// Rotate cube for perfect isometric view showing 3 equal sides
// No rotation needed - camera position creates the isometric view
cube.rotation.set(0, 0, 0);

scene.add(cube);

// Add ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Render the scene (stationary - no animation loop needed)
renderer.render(scene, camera);

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Click handler
window.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections
    const intersects = raycaster.intersectObject(cube);

    if (intersects.length > 0) {
        // Get the face that was clicked
        const faceIndex = Math.floor(intersects[0].faceIndex / 2);
        const faceNames = ['right', 'left', 'top', 'bottom', 'front', 'back'];
        const faceName = faceNames[faceIndex];

        console.log(`Clicked on ${faceName} face (index: ${faceIndex})`);
        alert(`You clicked the ${faceName} face!`);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});
