// Modern effects script for animations and audio
// Audio context and pooling system
let audioContext;
let audioInitialized = false;
const OSCILLATOR_POOL_SIZE = 8;
const oscillatorPool = [];
let nextOscillator = 0;

// Performance optimization flags
const PERF_FLAGS = {
  enableMouseTrail: true,
  maxParticles: 20,
  minTimeBetweenParticles: 16, // ~60fps
  enableHoverSounds: false,    // Disable by default for better performance
  enableScrollAnimations: true
};

// Initialize pooled audio resources
function initAudio() {
	if (audioInitialized) {return;}

	audioContext = new (window.AudioContext || window.webkitAudioContext)();

	// Create oscillator pool
	for (let i = 0; i < OSCILLATOR_POOL_SIZE; i++) {
		const gainNode = audioContext.createGain();
		gainNode.connect(audioContext.destination);
		gainNode.gain.value = 0;

		oscillatorPool.push({
			oscillator: null,
			gainNode,
			active: false,
		});
	}

	audioInitialized = true;
}

// Get next available oscillator from pool
function getOscillator() {
	const poolEntry = oscillatorPool[nextOscillator];
	nextOscillator = (nextOscillator + 1) % OSCILLATOR_POOL_SIZE;

	if (poolEntry.active) {
		poolEntry.oscillator.stop();
		poolEntry.oscillator.disconnect();
	}

	const oscillator = audioContext.createOscillator();
	oscillator.connect(poolEntry.gainNode);
	poolEntry.oscillator = oscillator;
	poolEntry.active = true;

	return poolEntry;
}

// Play sound using pooled oscillators
function playSound(frequency, type = 'sine', duration = 0.15, volume = 0.2) {
	if (!audioInitialized) {return;}

	const { oscillator, gainNode } = getOscillator();
	oscillator.type = type;
	oscillator.frequency.value = frequency;

	gainNode.gain.setValueAtTime(0, audioContext.currentTime);
	gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
	gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

	oscillator.start();
	oscillator.stop(audioContext.currentTime + duration);
}

// UI Sound effects
const clickSound = () => {return playSound(800, 'sine', 0.08, 0.15)};
const hoverSound = () => {return PERF_FLAGS.enableHoverSounds && playSound(1200, 'sine', 0.05, 0.05)};
const successSound = () => {
	if (!audioInitialized) {return;}
	setTimeout(() => {return playSound(600, 'sine', 0.1)}, 0);
	setTimeout(() => {return playSound(800, 'sine', 0.1)}, 100);
	setTimeout(() => {return playSound(1000, 'sine', 0.2)}, 200);
};

// Mouse trail optimization
let lastParticleTime = 0;
const particlePool = new Array(PERF_FLAGS.maxParticles).fill(null).map(() => {
	const particle = document.createElement('div');
	particle.className = 'mouse-trail-particle';
	particle.style.display = 'none';
	return particle;
});
let nextParticle = 0;

function createMouseTrail() {
	if (!PERF_FLAGS.enableMouseTrail) {return;}

	const trailContainer = document.createElement('div');
	trailContainer.className = 'mouse-trail-container';
	document.body.appendChild(trailContainer);

	// Add particles to container
	particlePool.forEach((particle) => {return trailContainer.appendChild(particle)});

	// Optimized mousemove handler using throttling and particle pool
	const mouseMoveCallback = (e) => {
		const now = performance.now();
		if (now - lastParticleTime < PERF_FLAGS.minTimeBetweenParticles) {return;}
		lastParticleTime = now;

		const particle = particlePool[nextParticle];
		nextParticle = (nextParticle + 1) % PERF_FLAGS.maxParticles;

		const size = Math.random() * 15 + 5;
		const hue = Math.random() * 60 + 290; // Purple to pink range

		Object.assign(particle.style, {
			display: 'block',
			left: `${e.clientX}px`,
			top: `${e.clientY}px`,
			width: `${size}px`,
			height: `${size}px`,
			backgroundColor: `hsla(${hue}, 100%, 70%, 0.7)`,
		});

		// Use requestAnimationFrame for smoother cleanup
		requestAnimationFrame(() => {
			particle.style.transform = 'scale(0)';
			particle.style.opacity = '0';
			setTimeout(() => {
				particle.style.display = 'none';
			}, 1000);
		});
	};

	// Use passive event listener for better scroll performance
	document.addEventListener('mousemove', mouseMoveCallback, { passive: true });

	// Add the CSS with optimized animations
	const styleElement = document.createElement('style');
	styleElement.textContent = `
    .mouse-trail-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }
    .mouse-trail-particle {
      position: absolute;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(1);
      transition: transform 1s ease-out, opacity 1s ease-out;
      will-change: transform, opacity;
    }
  `;
	document.head.appendChild(styleElement);
}

// Optimized scroll animations using IntersectionObserver
function handleScrollAnimations() {
  if (!PERF_FLAGS.enableScrollAnimations) {return;}

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Stop observing after animation
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '20px'
    }
  );

  document.querySelectorAll('.animate-on-scroll').forEach(element => {
    observer.observe(element);
  });
}

// Optimized event listeners
document.addEventListener('DOMContentLoaded', () => {
	// Initialize scroll animations
	handleScrollAnimations();

	// Create mouse trail with performance flags
	createMouseTrail();

	// Batch add event listeners
	const interactiveElements = document.querySelectorAll('a, button, .cta-button, .fancy-toggle');

	const handleInteraction = (element) => {
		const clickHandler = () => {
			initAudio();
			clickSound();
		};

		const mouseenterHandler = () => {
			if (audioInitialized) {
				hoverSound();
			}
		};

		element.addEventListener('click', clickHandler);
		if (PERF_FLAGS.enableHoverSounds) {
			element.addEventListener('mouseenter', mouseenterHandler);
		}
	};

	interactiveElements.forEach(handleInteraction);

	// One-time initialization on first user interaction
	document.addEventListener(
		'click',
		() => {
			initAudio();
		},
		{ once: true },
	);

	// Handle theme toggle
	const themeToggle = document.querySelector('theme-toggle');
	if (themeToggle) {
		themeToggle.addEventListener('click', () => {
			const isPressed = themeToggle.getAttribute('aria-pressed') === 'true';
			themeToggle.setAttribute('aria-pressed', !isPressed);
			if (audioInitialized) {
				successSound();
			}
		});
	}
});
