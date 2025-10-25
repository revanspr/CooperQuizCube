import * as THREE from 'three';

// Questions and answers data
const quizData = [
    {
        question: "",
        answers: ["", "", ""]
    },
    {
        question: "",
        answers: ["", "", ""]
    },
    {
        question: "",
        answers: ["", "", ""]
    },
    {
        question: "",
        answers: ["", "", ""]
    },
    {
        question: "",
        answers: ["", "", ""]
    },
    {
        question: "",
        answers: ["", "", ""]
    }
];

// Shuffle array helper
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Shuffle questions at start
const shuffledQuestions = shuffleArray(quizData);

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

// Function to create a canvas texture with text (supports multi-line)
function createTextTexture(text, bgColor, fontSize = 40) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap for long text
    const maxWidth = canvas.width - 40;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);

    // Draw each line
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create cube with different colored faces
const geometry = new THREE.BoxGeometry(2, 2, 2);

// Color palette for faces
const colors = ['#ff6347', '#ffd700', '#ff69b4', '#9370db', '#32cd32', '#87ceeb'];

// State management
let showingAnswers = false;
let selectedQuestionIndex = -1;

// Function to update cube materials
function updateCubeMaterials(showAnswers = false, questionIndex = -1) {
    const newMaterials = [];

    if (showAnswers && questionIndex >= 0) {
        // Show answers on 3 faces, other 3 faces show "Pick a Question"
        const answers = shuffledQuestions[questionIndex].answers;
        for (let i = 0; i < 6; i++) {
            if (i < 3) {
                // First 3 faces show answers
                newMaterials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture(answers[i], colors[i], 50)
                }));
            } else {
                // Other 3 faces show instruction
                newMaterials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture('Pick a Question', colors[i], 40)
                }));
            }
        }
    } else {
        // Show questions on all 6 faces
        for (let i = 0; i < 6; i++) {
            const question = shuffledQuestions[i].question;
            newMaterials.push(new THREE.MeshBasicMaterial({
                map: createTextTexture(question, colors[i], 35)
            }));
        }
    }

    cube.material = newMaterials;
}

// Initialize materials with questions
const materials = [];
for (let i = 0; i < 6; i++) {
    materials.push(new THREE.MeshBasicMaterial({
        map: createTextTexture(shuffledQuestions[i].question, colors[i], 35)
    }));
}

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
const animationDuration = 2000; // 2 seconds
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

        // Apply blur effect during animation (stronger in the middle)
        const blurAmount = Math.sin(progress * Math.PI) * 8; // Max blur at 50% progress
        renderer.domElement.style.filter = `blur(${blurAmount}px)`;

        // Stop animation when complete
        if (progress >= 1) {
            isAnimating = false;
            // Update start rotation for next animation
            startRotation = { ...targetRotation };
            // Remove blur
            renderer.domElement.style.filter = 'blur(0px)';

            // Show answers after animation completes
            if (selectedQuestionIndex >= 0) {
                showingAnswers = true;
                updateCubeMaterials(true, selectedQuestionIndex);
            }
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

        if (showingAnswers) {
            // If showing answers and clicked on a "Pick a Question" face (index >= 3)
            // or any face, go back to questions
            showingAnswers = false;
            selectedQuestionIndex = -1;
            updateCubeMaterials(false);
        } else {
            // Showing questions - store which question was clicked
            selectedQuestionIndex = faceIndex;
        }

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
