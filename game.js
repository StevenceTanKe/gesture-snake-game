const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: 10, y: 10 }
];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let score = 0;
let gameSpeed = 150;
let gameLoop;

let bodyPose;
let video;
let poses = [];
let connections;

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose();
}

function setup() {
  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  // Create a new canvas for the video feed
  let videoCanvas = createCanvas(640, 480);
  videoCanvas.parent('videoCanvas');
  videoCanvas.style('display', 'block');
  
  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
}

// Callback function for when the model returns pose data
function gotPoses(results) {
  // Store the model's results in a global variable
  poses = results;
}

function draw() {
  detectGesture();
  
  // Set the background to black for better visibility
  background(0);
  
  // Display the video without mirroring
  image(video, 0, 0, width, height);
  
  // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if we have confidence in both points
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }
  
  // Iterate through all the poses
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    // Iterate through all the keypoints for each pose
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      // Only draw a circle if the keypoint's confidence is greater than 0.1
      if (keypoint.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
      }
    }
  }

  // Display the current gesture
  fill(255);
  textSize(20);
  let gestureText = "Gesture: ";
  if (dx === 0 && dy === -1) gestureText += "Up";
  else if (dx === 0 && dy === 1) gestureText += "Down";
  else if (dx === -1 && dy === 0) gestureText += "Left";
  else if (dx === 1 && dy === 0) gestureText += "Right";
  else gestureText += "None";
  text(gestureText, 20, 30);
}

function detectGesture() {
  if (poses.length === 0) return;

  let detectedPose = poses[0];
  if (!detectedPose || !detectedPose.keypoints) return;

  let pose = poses[0];

  // Extract keypoint positions
  let leftHand = pose.keypoints[10];  // Left hand
  let rightHand = pose.keypoints[9];  // Right hand
  let leftShoulder = pose.keypoints[6]; // Left shoulder
  let rightShoulder = pose.keypoints[5]; // Right shoulder

  // Movement conditions
  let bothHandsUp = leftHand.y < leftShoulder.y && rightHand.y < rightShoulder.y;
  let bothHandsLeft = leftHand.x < leftShoulder.x && rightHand.x < rightShoulder.x;
  let bothHandsRight = leftHand.x > leftShoulder.x && rightHand.x > rightShoulder.x;
  let bothHandsDown = leftHand.y > leftShoulder.y && rightHand.y > rightShoulder.y;

  // Determine primary movement axis
  let verticalDifference = Math.abs(leftHand.y - leftShoulder.y) + Math.abs(rightHand.y - rightShoulder.y);
  let horizontalDifference = Math.abs(leftHand.x - leftShoulder.x) + Math.abs(rightHand.x - rightShoulder.x);

  let isVertical = verticalDifference > horizontalDifference;

  // Assign gesture and update snake direction
  if (isVertical) {
    if (bothHandsUp && dy !== 1) {
      dx = 0;
      dy = -1;
    } else if (bothHandsDown && dy !== -1) {
      dx = 0;
      dy = 1;
    }
  } else {
    // Reverse the left/right controls to match the natural movement
    if (bothHandsRight && dx !== 1) {
      dx = -1;
      dy = 0;
    } else if (bothHandsLeft && dx !== -1) {
      dx = 1;
      dy = 0;
    }
  }
}

function drawGame() {
    // Move snake
    const head = { 
        x: (snake[0].x + dx + tileCount) % tileCount, 
        y: (snake[0].y + dy + tileCount) % tileCount 
    };
    snake.unshift(head);

    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = `Score: ${score}`;
        generateFood();
        // Increase game speed more gradually
        if (gameSpeed > 80) {
            gameSpeed -= 1;
            clearInterval(gameLoop);
            gameLoop = setInterval(drawGame, gameSpeed);
        }
    } else {
        snake.pop();
    }

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Check game over
    if (isGameOver()) {
        clearInterval(gameLoop);
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over!', canvas.width/4, canvas.height/2);
        return;
    }

    // Draw snake
    ctx.fillStyle = 'green';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function generateFood() {
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // Check if the new food position is not on the snake
        validPosition = true;
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                validPosition = false;
                break;
            }
        }
    }
    
    food = newFood;
}

function isGameOver() {
    // Only check for self collision
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            return true;
        }
    }
    return false;
}

// Start game
gameLoop = setInterval(drawGame, gameSpeed); 