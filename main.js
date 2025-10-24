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

// Function to create a canvas texture with text
function createTextTexture(text, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create cube with different colored faces
const geometry = new THREE.BoxGeometry(2, 2, 2);

// Create materials for each face with text
const faceData = [
    { text: 'RIGHT', color: '#ff6347' },   // tomato red
    { text: 'LEFT', color: '#ffd700' },    // gold
    { text: 'TOP', color: '#ff69b4' },     // hot pink
    { text: 'BOTTOM', color: '#9370db' },  // medium purple
    { text: 'FRONT', color: '#32cd32' },   // lime green
    { text: 'BACK', color: '#87ceeb' }     // sky blue
];

const materials = faceData.map(face =>
    new THREE.MeshBasicMaterial({
        map: createTextTexture(face.text, face.color)
    })
);

const cube = new THREE.Mesh(geometry, materials);

// Rotate cube for perfect isometric view showing 3 equal sides
// No rotation needed - camera position creates the isometric view
cube.rotation.set(0, 0, 0);

scene.add(cube);

// Add ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Animation variables
let isAnimating = false;
let animationStartTime = 0;
const animationDuration = 1333; // ~1.33 seconds (1.5x faster than original 2s)
let startRotation = { x: 0, y: 0, z: 0 };
let targetRotation = { x: 0, y: 0, z: 0 };

// Animation loop
function animate(currentTime) {
    requestAnimationFrame(animate);

    if (isAnimating) {
        const elapsed = currentTime - animationStartTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Easing function for smooth animation (ease-in-out)
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate rotation
        cube.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
        cube.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
        cube.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;

        // Stop animation when complete
        if (progress >= 1) {
            isAnimating = false;
            // Update start rotation for next animation
            startRotation = { ...targetRotation };
        }
    }

    renderer.render(scene, camera);
}

// Start the animation loop
animate(0);

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Handle click/touch on cube
function handleInteraction(clientX, clientY) {
    // Don't start new animation if one is already playing
    if (isAnimating) return;

    // Calculate position in normalized device coordinates (-1 to +1)
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

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

        // Start spin animation
        isAnimating = true;
        animationStartTime = performance.now();
        startRotation = {
            x: cube.rotation.x,
            y: cube.rotation.y,
            z: cube.rotation.z
        };
        // Spin 360 degrees (2 * PI radians) on Y axis
        targetRotation = {
            x: startRotation.x,
            y: startRotation.y + Math.PI * 2,
            z: startRotation.z
        };
    }
}

// Click handler for desktop
window.addEventListener('click', (event) => {
    handleInteraction(event.clientX, event.clientY);
});

// Touch handler for mobile
window.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent mouse events from firing
    if (event.touches.length > 0) {
        handleInteraction(event.touches[0].clientX, event.touches[0].clientY);
    }
}, { passive: false });

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
