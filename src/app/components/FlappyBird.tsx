'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 4;
const BIRD_SIZE = 40;
const FRAME_RATE = 1000 / 120; // 120 FPS for smoother animation

// Image URLs
const IMAGES = {
  bird: 'https://raw.githubusercontent.com/sourabhv/FlapPyBird/master/assets/sprites/yellowbird-midflap.png',
  pipeTop: 'https://raw.githubusercontent.com/sourabhv/FlapPyBird/master/assets/sprites/pipe-green.png',
  pipeBottom: 'https://raw.githubusercontent.com/sourabhv/FlapPyBird/master/assets/sprites/pipe-green.png',
  background: 'https://raw.githubusercontent.com/sourabhv/FlapPyBird/master/assets/sprites/background-day.png'
};

interface Pipe {
  x: number;
  height: number;
  scored: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    bird: { y: 250, velocity: 0, rotation: 0 },
    pipes: [] as Pipe[],
    score: 0,
    lastFrame: 0,
  });
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const animationFrameRef = useRef<number>();
  const birdImageRef = useRef<HTMLImageElement>();
  const pipeTopImageRef = useRef<HTMLImageElement>();
  const pipeBottomImageRef = useRef<HTMLImageElement>();
  const backgroundImageRef = useRef<HTMLImageElement>();

  useEffect(() => {
    let loadedImages = 0;
    const totalImages = 4;

    const handleImageLoad = () => {
      loadedImages++;
      if (loadedImages === totalImages) {
        setImagesLoaded(true);
      }
    };

    // Load images
    birdImageRef.current = new Image();
    birdImageRef.current.src = IMAGES.bird;
    birdImageRef.current.onload = handleImageLoad;

    pipeTopImageRef.current = new Image();
    pipeTopImageRef.current.src = IMAGES.pipeTop;
    pipeTopImageRef.current.onload = handleImageLoad;

    pipeBottomImageRef.current = new Image();
    pipeBottomImageRef.current.src = IMAGES.pipeBottom;
    pipeBottomImageRef.current.onload = handleImageLoad;

    backgroundImageRef.current = new Image();
    backgroundImageRef.current.src = IMAGES.background;
    backgroundImageRef.current.onload = handleImageLoad;
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current) {
      gameStateRef.current.bird.velocity = JUMP_FORCE;
    }
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = {
      bird: { y: 250, velocity: 0, rotation: 0 },
      pipes: [],
      score: 0,
      lastFrame: 0,
    };
    setGameStarted(true);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleClick = () => {
      if (!gameStarted || gameOver) {
        resetGame();
      } else {
        jump();
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleClick();
      }
    };

    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyPress);

    const updateGameState = (timestamp: number) => {
      const deltaTime = timestamp - gameStateRef.current.lastFrame;
      
      if (deltaTime < FRAME_RATE) return;
      
      const state = gameStateRef.current;
      
      // Update bird
      state.bird.velocity += GRAVITY;
      state.bird.y += state.bird.velocity;
      state.bird.rotation = Math.min(Math.max(-30, -state.bird.velocity * 3), 90);

      // Update pipes
      state.pipes = state.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);
      
      // Move pipes and check score
      state.pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
        
        // Update score when bird passes the middle of the pipe
        const birdX = 50 + BIRD_SIZE / 2;
        const pipeMiddleX = pipe.x + PIPE_WIDTH / 2;
        
        if (!pipe.scored && birdX > pipeMiddleX) {
          state.score += 1;
          pipe.scored = true;
        }
      });

      // Add new pipes
      if (state.pipes.length === 0 || state.pipes[state.pipes.length - 1].x < canvas.width - 250) {
        state.pipes.push({
          x: canvas.width,
          height: Math.random() * (canvas.height - PIPE_GAP - 200) + 100,
          scored: false,
        });
      }

      gameStateRef.current.lastFrame = timestamp;
    };

    const checkCollisions = () => {
      const state = gameStateRef.current;
      const birdRect = {
        x: 50,
        y: state.bird.y,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
      };

      // Check boundaries
      if (state.bird.y < 0 || state.bird.y > canvas.height - BIRD_SIZE) {
        return true;
      }

      // Check pipe collisions
      return state.pipes.some(pipe => {
        const upperPipe = {
          x: pipe.x,
          y: 0,
          width: PIPE_WIDTH,
          height: pipe.height,
        };

        const lowerPipe = {
          x: pipe.x,
          y: pipe.height + PIPE_GAP,
          width: PIPE_WIDTH,
          height: canvas.height - (pipe.height + PIPE_GAP),
        };

        return checkCollision(birdRect, upperPipe) || checkCollision(birdRect, lowerPipe);
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      if (backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Draw pipes
      gameStateRef.current.pipes.forEach(pipe => {
        if (pipeTopImageRef.current && pipeBottomImageRef.current) {
          ctx.drawImage(pipeTopImageRef.current, pipe.x, pipe.height - 320, PIPE_WIDTH, 320);
          ctx.drawImage(pipeBottomImageRef.current, pipe.x, pipe.height + PIPE_GAP, PIPE_WIDTH, canvas.height - (pipe.height + PIPE_GAP));
        }
      });

      // Draw bird
      if (birdImageRef.current) {
        ctx.save();
        ctx.translate(50 + BIRD_SIZE / 2, gameStateRef.current.bird.y + BIRD_SIZE / 2);
        ctx.rotate((gameStateRef.current.bird.rotation * Math.PI) / 180);
        ctx.drawImage(birdImageRef.current, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
        ctx.restore();
      }

      // Draw score
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.font = 'bold 32px Arial';
      const scoreText = `Score: ${gameStateRef.current.score}`;
      ctx.strokeText(scoreText, 10, 40);
      ctx.fillText(scoreText, 10, 40);
    };

    const gameLoop = (timestamp: number) => {
      if (!gameStarted || gameOver || !imagesLoaded) return;

      updateGameState(timestamp);

      if (checkCollisions()) {
        setHighScore(prev => Math.max(prev, gameStateRef.current.score));
        setGameOver(true);
        return;
      }

      draw();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameStarted, gameOver, imagesLoaded, jump, resetGame]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-blue-600">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-4 border-yellow-400 rounded-lg shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {!imagesLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-2xl text-white">Loading...</div>
          </div>
        ) : !gameStarted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
            <h1 className="text-4xl font-bold text-white mb-8">Flappy Bird</h1>
            <div className="bg-white/90 p-6 rounded-lg max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-blue-600">How to Play:</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Click or press SPACE to make the bird jump</li>
                <li>Navigate through the pipes without hitting them</li>
                <li>Each pipe passed gives you 1 point</li>
                <li>Try to beat your high score!</li>
              </ul>
              <button 
                className="mt-6 w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-600 transition"
                onClick={() => canvasRef.current?.click()}
              >
                Start Game
              </button>
            </div>
          </div>
        ) : null}
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
            <div className="bg-white/90 p-6 rounded-lg text-center">
              <h2 className="text-3xl font-bold text-red-500 mb-4">Game Over!</h2>
              <p className="text-xl mb-2">Score: {gameStateRef.current.score}</p>
              <p className="text-xl mb-6">High Score: {highScore}</p>
              <button 
                className="bg-blue-500 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-600 transition"
                onClick={() => canvasRef.current?.click()}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function checkCollision(rect1: Rect, rect2: Rect) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}