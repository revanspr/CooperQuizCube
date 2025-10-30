import * as THREE from 'three';

// Questions and answers data - will be loaded from Q&A.json
let quizData = [];
let popQuizData = []; // PoP! Quiz data with difficulty levels
let idcQuizData = []; // IDC Quiz data with difficulty levels
let radioheadQuizData = []; // Radiohead Quiz data with difficulty levels
let filmQuizData = []; // Film Quiz data with difficulty levels
let litQuizData = []; // Lit Quiz data with difficulty levels
let currentQuizType = 'pop'; // Default to PoP! Quiz
let currentQuestions = []; // Array of 3 current questions being displayed
let usedQuestionIds = new Set(); // Track used questions to prevent repeats
let currentDifficulty = 'd4'; // Start with d4
let difficultyLevels = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
let selectedQuestionIndex = -1; // Which of the 3 questions was selected
let currentAttempts = 0; // Track attempts for current question

// Load quiz data from JSON file
async function loadQuizData() {
    try {
        // Load PoP! Quiz data
        const popResponse = await fetch('./PopQA.json');

        if (!popResponse.ok) {
            throw new Error(`HTTP error! status: ${popResponse.status}`);
        }

        popQuizData = await popResponse.json();

        console.log('PoP! Quiz data loaded:', popQuizData.length, 'questions');

        // Load IDC Quiz data
        const idcResponse = await fetch('./IDCqa.json');

        if (!idcResponse.ok) {
            throw new Error(`HTTP error! status: ${idcResponse.status}`);
        }

        idcQuizData = await idcResponse.json();

        console.log('IDC Quiz data loaded:', idcQuizData.length, 'questions');

        // Load Radiohead Quiz data
        const radioheadResponse = await fetch('./RadioHead.json');

        if (!radioheadResponse.ok) {
            throw new Error(`HTTP error! status: ${radioheadResponse.status}`);
        }

        radioheadQuizData = await radioheadResponse.json();

        console.log('Radiohead Quiz data loaded:', radioheadQuizData.length, 'questions');

        // Load Film Quiz data
        const filmResponse = await fetch('./Film.json');

        if (!filmResponse.ok) {
            throw new Error(`HTTP error! status: ${filmResponse.status}`);
        }

        filmQuizData = await filmResponse.json();

        console.log('Film Quiz data loaded:', filmQuizData.length, 'questions');

        // Load Lit Quiz data
        const litResponse = await fetch('./Lit.json');

        if (!litResponse.ok) {
            throw new Error(`HTTP error! status: ${litResponse.status}`);
        }

        litQuizData = await litResponse.json();

        console.log('Lit Quiz data loaded:', litQuizData.length, 'questions');

        // Initialize the cube with first question
        initializeCube();
    } catch (error) {
        console.error('Error loading quiz data:', error);
        alert('Error loading quiz data: ' + error.message);
        // Fallback to empty data if file can't be loaded
        popQuizData = [{
            id: 1,
            difficulty: 'd4',
            question: "Question not loaded",
            answers: [
                { text: "A", correct: false },
                { text: "B", correct: false },
                { text: "C", correct: false }
            ]
        }];
        initializeCube();
    }
}

// Get current quiz data based on selected quiz type
function getCurrentQuizData() {
    if (currentQuizType === 'pop') {
        return popQuizData;
    } else if (currentQuizType === 'idc') {
        return idcQuizData;
    } else if (currentQuizType === 'radiohead') {
        return radioheadQuizData;
    } else if (currentQuizType === 'film') {
        return filmQuizData;
    } else if (currentQuizType === 'lit') {
        return litQuizData;
    }
    return popQuizData; // Default fallback
}

// Get 3 different questions from the same difficulty
function getThreeQuestions(difficulty) {
    const quizData = getCurrentQuizData();
    // Filter questions by difficulty that haven't been used
    const availableQuestions = quizData.filter(q =>
        q.difficulty === difficulty && !usedQuestionIds.has(q.id)
    );

    if (availableQuestions.length === 0) {
        return null;
    }

    // Shuffle available questions
    const shuffled = shuffleArray(availableQuestions);

    // Take up to 3 questions from the current difficulty
    const selected = shuffled.slice(0, Math.min(3, shuffled.length));

    // If we have fewer than 3 questions, fill with questions from other difficulties
    if (selected.length < 3) {
        console.log(`Only ${selected.length} questions available at ${difficulty}, filling with other difficulties`);

        // Get all unused questions from other difficulties
        const otherQuestions = quizData.filter(q =>
            q.difficulty !== difficulty && !usedQuestionIds.has(q.id)
        );

        if (otherQuestions.length > 0) {
            const shuffledOthers = shuffleArray(otherQuestions);
            const needed = 3 - selected.length;
            selected.push(...shuffledOthers.slice(0, needed));
        }
    }

    console.log(`Selected ${selected.length} questions from difficulty ${difficulty}${selected.length < 3 ? ' (mixed with other difficulties)' : ''}`);
    return selected.length > 0 ? selected : null;
}

// Get difficulty index
function getDifficultyIndex(difficulty) {
    return difficultyLevels.indexOf(difficulty);
}

// Move to next difficulty level
function getNextDifficulty(currentDiff, attempts) {
    const quizData = getCurrentQuizData();
    const currentIndex = getDifficultyIndex(currentDiff);
    let nextIndex = currentIndex;
    let preferredDirection = 0; // 0 = same, 1 = harder, -1 = easier

    if (attempts === 0) {
        // First try - go harder
        nextIndex = currentIndex + 1;
        preferredDirection = 1;
    } else if (attempts === 1) {
        // Second try - check if this is the last question in difficulty
        const remainingInCurrentDiff = quizData.filter(q =>
            q.difficulty === currentDiff && !usedQuestionIds.has(q.id)
        ).length;

        if (remainingInCurrentDiff === 0) {
            // Last question in group answered on second try - go easier
            nextIndex = currentIndex - 1;
            preferredDirection = -1;
        } else {
            // Stay at same difficulty
            nextIndex = currentIndex;
            preferredDirection = 0;
        }
    } else if (attempts === 2) {
        // Third try - go easier
        nextIndex = currentIndex - 1;
        preferredDirection = -1;
    }

    // Find next available difficulty level in preferred direction
    while (nextIndex >= 0 && nextIndex < difficultyLevels.length) {
        const testDifficulty = difficultyLevels[nextIndex];
        const availableQuestions = quizData.filter(q =>
            q.difficulty === testDifficulty && !usedQuestionIds.has(q.id)
        );

        if (availableQuestions.length > 0) {
            return testDifficulty;
        }

        // No questions at this level, try to move in the same direction
        if (preferredDirection >= 0) {
            nextIndex++; // Keep going harder
        } else {
            nextIndex--; // Keep going easier
        }
    }

    // If we couldn't find questions in the preferred direction,
    // systematically search: try going harder first, then easier
    // First, try going harder from current position
    for (let i = currentIndex + 1; i < difficultyLevels.length; i++) {
        const testDifficulty = difficultyLevels[i];
        const availableQuestions = quizData.filter(q =>
            q.difficulty === testDifficulty && !usedQuestionIds.has(q.id)
        );

        if (availableQuestions.length > 0) {
            console.log(`No questions in preferred direction, switching to harder: ${testDifficulty}`);
            return testDifficulty;
        }
    }

    // Then try going easier from current position
    for (let i = currentIndex - 1; i >= 0; i--) {
        const testDifficulty = difficultyLevels[i];
        const availableQuestions = quizData.filter(q =>
            q.difficulty === testDifficulty && !usedQuestionIds.has(q.id)
        );

        if (availableQuestions.length > 0) {
            console.log(`No questions in preferred direction, switching to easier: ${testDifficulty}`);
            return testDifficulty;
        }
    }

    // If we're here, we've truly run out of all questions
    return null;
}

// Shuffle array helper
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

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

// Function to create a canvas texture with melting text effect
function createMeltingTextTexture(text, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Blood red background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw melting text
    ctx.fillStyle = '#8B0000'; // Dark red/blood red
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add dripping shadow effect
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw main text
    ctx.fillText(text, centerX, centerY);

    // Create drip effect - multiple drips at different positions
    const words = text.split(' ');
    const wordSpacing = 120;
    const startX = centerX - ((words.length - 1) * wordSpacing) / 2;

    words.forEach((word, wordIndex) => {
        const wordX = startX + wordIndex * wordSpacing;

        // Create 2-3 drips per word at random positions within the word width
        const numDrips = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < numDrips; i++) {
            const dripX = wordX + (Math.random() - 0.5) * 60;
            const dripStartY = centerY + 35;
            const dripLength = Math.random() * 40 + 30;

            // Draw drip as a gradient
            const gradient = ctx.createLinearGradient(dripX, dripStartY, dripX, dripStartY + dripLength);
            gradient.addColorStop(0, '#8B0000');
            gradient.addColorStop(0.7, '#8B0000');
            gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.shadowBlur = 10;

            // Draw drip shape (tapered)
            ctx.beginPath();
            ctx.moveTo(dripX - 3, dripStartY);
            ctx.lineTo(dripX - 2, dripStartY + dripLength * 0.7);
            ctx.lineTo(dripX, dripStartY + dripLength);
            ctx.lineTo(dripX + 2, dripStartY + dripLength * 0.7);
            ctx.lineTo(dripX + 3, dripStartY);
            ctx.closePath();
            ctx.fill();
        }
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Function to create a canvas texture with text (supports multi-line)
function createTextTexture(text, bgColor, fontSize = 40, isHighlighted = false, label = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add highlight effect
    if (isHighlighted) {
        // Add bright border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Add glow effect
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        ctx.shadowBlur = 0;
    }

    // Draw label at the top if provided
    if (label) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, canvas.width / 2, 20);
    }

    // Text
    ctx.fillStyle = '#000000';
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
    // Adjust startY to account for label if present
    const startY = label
        ? (canvas.height - totalHeight) / 2 + lineHeight / 2 + 30
        : (canvas.height - totalHeight) / 2 + lineHeight / 2;

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

// Face indices for BoxGeometry: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
// We only use: right (0), top (2), front (4)
const activeFaces = [0, 2, 4]; // right, top, front
const faceNames = ['right', 'left', 'top', 'bottom', 'front', 'back'];
const activeFaceLabels = ['Right', 'Top', 'Front']; // Display names for active faces

// State management
let showingAnswers = false;
let clickedFaceIndex = -1;
let clickEffectStartTime = 0;
const clickEffectDuration = 1000; // 1 second highlight effect

// Score tracking
let totalScore = 0;

// Timer tracking
let timerStarted = false;
let timerActive = false;
let timerEndTime = null;
let timerInterval = null;
let selectedTimeLimit = 0; // Default to No timer
let isTimeUp = false; // Track if time has expired for visual effect

// Question display element
let questionDisplayElement = null;

// Function to update score display
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score-display');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${totalScore}`;
    }
}

// Function to show question at bottom of screen with animation
function showQuestionAtBottom(questionText) {
    if (!questionDisplayElement) {
        questionDisplayElement = document.getElementById('question-display');
    }

    if (questionDisplayElement) {
        questionDisplayElement.textContent = questionText;
        // Force a reflow to ensure the transition works
        questionDisplayElement.offsetHeight;
        questionDisplayElement.classList.remove('removing');
        questionDisplayElement.classList.add('visible');
    }
}

// Function to hide question at bottom of screen with animation
function hideQuestionAtBottom() {
    if (!questionDisplayElement) {
        questionDisplayElement = document.getElementById('question-display');
    }

    if (questionDisplayElement) {
        questionDisplayElement.classList.remove('visible');
        questionDisplayElement.classList.add('removing');

        // Clear the text after animation completes
        setTimeout(() => {
            questionDisplayElement.textContent = '';
            questionDisplayElement.classList.remove('removing');
        }, 500); // Match the transition duration
    }
}

// Function to calculate and award points based on attempts
function awardPoints() {
    let points = 0;

    if (currentAttempts === 0) {
        points = 3; // First try
    } else if (currentAttempts === 1) {
        points = 2; // Second try
    } else if (currentAttempts === 2) {
        points = 1; // Third try
    }
    // No points for more than 3 attempts

    totalScore += points;
    updateScoreDisplay();
    console.log(`Awarded ${points} points. Total score: ${totalScore}. Attempts: ${currentAttempts}`);
}

// Function to start the timer
function startTimer() {
    if (timerStarted) return; // Timer already started

    timerStarted = true;
    timerActive = true; // Always set to true, including for "No timer"

    // Check if "No timer" is selected
    if (selectedTimeLimit === 0) {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = 'No Timer';
            timerDisplay.style.color = '#ffffff';
        }
        console.log('No timer selected - infinite time');
        return;
    }

    // Get selected time limit in seconds
    const timeLimitSeconds = selectedTimeLimit;
    const timeLimitMs = timeLimitSeconds * 1000;

    timerEndTime = Date.now() + timeLimitMs;

    // Update timer display immediately
    updateTimerDisplay();

    // Update timer every second
    timerInterval = setInterval(updateTimerDisplay, 1000);

    console.log(`Timer started for ${timeLimitSeconds} second(s)`);
}

// Function to show "Time Up!" blood red effect on cube
function showTimeUpEffect() {
    if (!cube) return;

    const bloodRed = '#8B0000'; // Dark blood red
    const newMaterials = [];

    // Set all 6 faces to blood red
    for (let i = 0; i < 6; i++) {
        const activeIndex = activeFaces.indexOf(i);
        if (activeIndex !== -1) {
            // Active face - show melting "Time up!" text
            newMaterials.push(new THREE.MeshBasicMaterial({
                map: createMeltingTextTexture('Time up!', bloodRed)
            }));
        } else {
            // Inactive face - solid blood red
            newMaterials.push(new THREE.MeshBasicMaterial({
                map: createTextTexture('', bloodRed, 50)
            }));
        }
    }

    cube.material = newMaterials;

    // Lock the cube - stop any ongoing animation and prevent further interactions
    isAnimating = false;
    showingAnswers = false;

    // Hide question display if showing
    hideQuestionAtBottom();

    console.log('Time up effect applied to cube - cube is now locked');
}

// Function to update timer display
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;

    if (!timerStarted) {
        timerDisplay.textContent = 'Not Started';
        return;
    }

    // If "No timer" is selected, don't update display or check expiration
    if (selectedTimeLimit === 0) {
        return;
    }

    const remainingMs = timerEndTime - Date.now();

    if (remainingMs <= 0) {
        // Timer expired
        timerDisplay.textContent = 'Time Up!';
        timerDisplay.style.color = '#ff0000';
        timerActive = false;
        isTimeUp = true; // Set time up flag
        clearInterval(timerInterval);
        console.log('Timer expired!');

        // Trigger blood red visual effect on cube
        showTimeUpEffect();
        return;
    }

    // Convert to minutes and seconds
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Display in MM:SS format
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.style.color = '#ffd700';
}

// Function to handle time limit selection
function handleTimeLimitChange() {
    const selectElement = document.getElementById('time-select');
    if (selectElement) {
        selectedTimeLimit = parseInt(selectElement.value);
        console.log(`Time limit set to ${selectedTimeLimit} second(s)`);
    }
}

// Randomize questions into active faces
let questionMapping = []; // Maps active face index (0, 1, 2) to question index (0, 1, 2)

function randomizeQuestions() {
    // Create array of indices [0, 1, 2]
    const indices = [0, 1, 2];

    // Shuffle the indices
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    questionMapping = indices;
    console.log('Question mapping:', questionMapping);
}

// Randomize answers into active faces
let answerMapping = []; // Maps active face index (0, 1, 2) to answer index (0, 1, 2)
let disabledFaces = new Set(); // Track disabled faces for current question

function randomizeAnswers(answers) {
    // Create array of indices [0, 1, 2]
    const indices = [0, 1, 2];

    // Shuffle the indices
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    answerMapping = indices;
    console.log('Answer mapping:', answerMapping);
}

// Function to update cube materials
function updateCubeMaterials(showAnswers = false, highlightFace = -1) {
    const newMaterials = [];

    if (showAnswers && selectedQuestionIndex >= 0 && currentQuestions[selectedQuestionIndex]) {
        // Show answers for the selected question
        const selectedQuestion = currentQuestions[selectedQuestionIndex];
        const answers = selectedQuestion.answers;

        console.log('Showing answers for question:', selectedQuestion.question);
        console.log('Answer mapping:', answerMapping);
        console.log('Answers:', answers);

        for (let i = 0; i < 6; i++) {
            const activeIndex = activeFaces.indexOf(i);
            if (activeIndex !== -1) {
                // This is an active face - show answer (or blank if disabled)
                const isDisabled = disabledFaces.has(activeIndex);
                const answerIndex = answerMapping[activeIndex];

                // Safety check
                if (answerIndex === undefined || !answers[answerIndex]) {
                    console.error(`Invalid answerIndex ${answerIndex} for activeIndex ${activeIndex}`);
                    newMaterials.push(new THREE.MeshBasicMaterial({
                        map: createTextTexture('', colors[i], 50, i === highlightFace)
                    }));
                    continue;
                }

                const text = isDisabled ? '' : answers[answerIndex].text;
                console.log(`Face ${i} (activeIndex ${activeIndex}): answer ${answerIndex} = ${text}`);
                newMaterials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture(text, colors[i], 50, i === highlightFace)
                }));
            } else {
                // Inactive face - show blank colored face
                newMaterials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture('', colors[i], 50, i === highlightFace)
                }));
            }
        }
    } else {
        // Show 3 different questions on active faces (right, top, front)
        for (let i = 0; i < 6; i++) {
            const activeIndex = activeFaces.indexOf(i);
            if (activeIndex !== -1) {
                // This is an active face - show question using question mapping
                const questionIndex = questionMapping[activeIndex];
                if (questionIndex !== undefined && currentQuestions[questionIndex]) {
                    const questionText = currentQuestions[questionIndex].question;
                    console.log(`Face ${i} (activeIndex ${activeIndex}, questionIndex ${questionIndex}): ${questionText.substring(0, 50)}...`);
                    newMaterials.push(new THREE.MeshBasicMaterial({
                        map: createTextTexture(questionText, colors[i], 35, i === highlightFace)
                    }));
                } else {
                    // No question for this face
                    console.log(`Face ${i}: blank (no question mapped)`);
                    newMaterials.push(new THREE.MeshBasicMaterial({
                        map: createTextTexture('', colors[i], 35, i === highlightFace)
                    }));
                }
            } else {
                // Inactive face - show blank colored face
                console.log(`Face ${i}: blank (activeIndex: ${activeIndex})`);
                newMaterials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture('', colors[i], 35, i === highlightFace)
                }));
            }
        }
    }

    cube.material = newMaterials;
}

// Cube variable - will be initialized after data loads
let cube;

// Function to initialize the cube with 3 questions
function initializeCube() {
    const quizData = getCurrentQuizData();
    console.log('initializeCube called');
    console.log(`${currentQuizType} Quiz data length:`, quizData.length);
    console.log('currentDifficulty:', currentDifficulty);

    // Get 3 questions at d4 difficulty
    currentQuestions = getThreeQuestions(currentDifficulty);

    console.log('currentQuestions:', currentQuestions);

    if (!currentQuestions || currentQuestions.length === 0) {
        console.error('No questions available');
        alert('No questions available for difficulty: ' + currentDifficulty);
        return;
    }

    // Randomize which question appears on which face
    randomizeQuestions();

    console.log('Starting with', currentQuestions.length, 'questions at difficulty:', currentDifficulty);
    currentQuestions.forEach((q, i) => {
        console.log(`Question ${i}:`, q.question);
    });

    // Initialize materials with questions on active faces
    const materials = [];
    for (let i = 0; i < 6; i++) {
        const activeIndex = activeFaces.indexOf(i);
        if (activeIndex !== -1) {
            // Active face - show question using question mapping
            const questionIndex = questionMapping[activeIndex];
            if (questionIndex !== undefined && currentQuestions[questionIndex]) {
                console.log(`Creating material for face ${i} (activeIndex ${activeIndex}) with question ${questionIndex}:`, currentQuestions[questionIndex].question);
                materials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture(currentQuestions[questionIndex].question, colors[i], 35)
                }));
            } else {
                console.log(`Creating blank material for face ${i} (no question mapped)`);
                materials.push(new THREE.MeshBasicMaterial({
                    map: createTextTexture('', colors[i], 35)
                }));
            }
        } else {
            // Inactive face - show blank colored face
            console.log(`Creating blank material for face ${i}`);
            materials.push(new THREE.MeshBasicMaterial({
                map: createTextTexture('', colors[i], 35)
            }));
        }
    }

    console.log('Creating cube with', materials.length, 'materials');
    cube = new THREE.Mesh(geometry, materials);
    cube.rotation.set(0, 0, 0);
    scene.add(cube);
    console.log('Cube added to scene');
}

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

    // Only animate if cube is initialized
    if (!cube) {
        renderer.render(scene, camera);
        return;
    }

    // Handle click effect (1 second duration)
    if (clickedFaceIndex >= 0) {
        const clickElapsed = currentTime - clickEffectStartTime;
        if (clickElapsed >= clickEffectDuration) {
            // Click effect finished, remove highlight
            clickedFaceIndex = -1;
            updateCubeMaterials(showingAnswers);
        }
    }

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
            if (showingAnswers && selectedQuestionIndex >= 0) {
                // Update to show answers (already randomized)
                updateCubeMaterials(true);
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
    // Don't start new animation if one is already playing or cube not initialized
    if (isAnimating || !cube || currentQuestions.length === 0) return;

    // Check if timer has expired
    if (timerStarted && !timerActive) {
        console.log('Timer has expired, ignoring click');
        return;
    }

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
        const faceName = faceNames[faceIndex];

        console.log(`Clicked on ${faceName} face (index: ${faceIndex})`);

        // Check if this is an active face (right, top, or front)
        const activeIndex = activeFaces.indexOf(faceIndex);
        if (activeIndex === -1) {
            // Clicked on inactive face, ignore
            console.log('Inactive face clicked, ignoring');
            return;
        }

        // Check if there's a question on this face
        if (!currentQuestions[activeIndex]) {
            console.log('No question on this face');
            return;
        }

        if (showingAnswers) {
            // Answering mode
            // Check if this face is disabled
            if (disabledFaces.has(activeIndex)) {
                // Ignore clicks on disabled faces
                console.log('Face is disabled, ignoring click');
                return;
            }

            // Get the actual answer based on mapping
            const answerIndex = answerMapping[activeIndex];
            const selectedQuestion = currentQuestions[selectedQuestionIndex];
            const answer = selectedQuestion.answers[answerIndex];

            // Trigger click effect (1 second highlight) for the clicked answer
            clickedFaceIndex = faceIndex;
            clickEffectStartTime = performance.now();
            updateCubeMaterials(true, faceIndex);

            if (!answer.correct) {
                // Wrong answer - disable this face and increment attempt counter
                disabledFaces.add(activeIndex);
                currentAttempts++;
                console.log('Wrong answer! Face disabled. Attempts:', currentAttempts);
                // Don't animate or change state, just wait for highlight to fade
                return;
            }

            // Correct answer! Award points
            awardPoints();

            // Hide the question display at bottom
            hideQuestionAtBottom();

            // Mark this question as used
            usedQuestionIds.add(selectedQuestion.id);
            console.log(`Question answered: ${selectedQuestion.question}`);

            // Block further clicks immediately
            isAnimating = true;

            // Determine next difficulty
            const nextDiff = getNextDifficulty(selectedQuestion.difficulty, currentAttempts);

            if (!nextDiff) {
                console.log('No more questions available!');
                // Clear the cube to prevent further interaction
                currentQuestions = [];
                showingAnswers = false;
                isAnimating = false; // Allow animation to stop
                alert('Quiz complete! Your score: ' + totalScore);
                return;
            }

            console.log(`Moving from ${selectedQuestion.difficulty} to ${nextDiff} (attempts: ${currentAttempts})`);
            currentDifficulty = nextDiff;

            // Get next set of 3 questions
            const nextQuestions = getThreeQuestions(currentDifficulty);
            if (!nextQuestions || nextQuestions.length === 0) {
                console.log('No more questions available!');
                // Clear the cube to prevent further interaction
                currentQuestions = [];
                showingAnswers = false;
                isAnimating = false; // Allow animation to stop
                alert('Quiz complete! Your score: ' + totalScore);
                return;
            }

            currentQuestions = nextQuestions;

            // Randomize which question appears on which face
            randomizeQuestions();

            currentAttempts = 0;
            disabledFaces.clear();
            selectedQuestionIndex = -1;

            console.log('New questions loaded:');
            currentQuestions.forEach((q, i) => {
                console.log(`Question ${i}:`, q.question);
            });

            // Go back to question display
            showingAnswers = false;
            updateCubeMaterials(false, -1);

            // Start spin animation (isAnimating already set to true above)
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
        } else {
            // Question viewing mode - transition to answering
            // Start timer on first question click
            if (!timerStarted) {
                startTimer();
            }

            // Get the actual question index from the mapping
            const questionIndex = questionMapping[activeIndex];
            const selectedQuestion = currentQuestions[questionIndex];

            // Set which question was selected (using the actual question index)
            selectedQuestionIndex = questionIndex;
            console.log(`Selected face ${activeIndex} -> question ${questionIndex}:`, selectedQuestion.question);

            // Show the question at the bottom of the screen
            showQuestionAtBottom(selectedQuestion.question);

            // Randomize answers immediately
            randomizeAnswers(selectedQuestion.answers);

            // Trigger click effect (1 second highlight)
            clickedFaceIndex = faceIndex;
            clickEffectStartTime = performance.now();
            updateCubeMaterials(false, faceIndex);

            // Set to show answers mode
            showingAnswers = true;

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
}

// Click handler for desktop
window.addEventListener('click', (event) => {
    handleInteraction(event.clientX, event.clientY);
});

// Touch handler for mobile - only on canvas to allow dropdown interaction
renderer.domElement.addEventListener('touchstart', (event) => {
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

// Function to handle quiz type selection
function handleQuizTypeChange() {
    const selectElement = document.getElementById('quiz-select');
    if (selectElement) {
        const newQuizType = selectElement.value;
        if (newQuizType !== currentQuizType) {
            console.log(`Switching quiz from ${currentQuizType} to ${newQuizType}`);
            currentQuizType = newQuizType;

            // Reset quiz state
            usedQuestionIds.clear();
            currentDifficulty = 'd4';
            currentAttempts = 0;
            selectedQuestionIndex = -1;
            showingAnswers = false;
            disabledFaces.clear();
            totalScore = 0;
            updateScoreDisplay();

            // Reset timer
            timerStarted = false;
            timerActive = false;
            isTimeUp = false;
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            const timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = 'Not Started';
                timerDisplay.style.color = '#ffffff';
            }

            // Hide question display
            hideQuestionAtBottom();

            // Remove old cube
            if (cube) {
                scene.remove(cube);
            }

            // Initialize with new quiz data
            initializeCube();
        }
    }
}

// Initialize time limit dropdown
window.addEventListener('DOMContentLoaded', () => {
    const timeSelect = document.getElementById('time-select');
    if (timeSelect) {
        // Set initial value
        selectedTimeLimit = parseInt(timeSelect.value);

        // Listen for changes
        timeSelect.addEventListener('change', handleTimeLimitChange);
    }

    // Initialize quiz selector
    const quizSelect = document.getElementById('quiz-select');
    if (quizSelect) {
        // Listen for changes
        quizSelect.addEventListener('change', handleQuizTypeChange);
    }
});

// Load quiz data and initialize the cube
loadQuizData();
