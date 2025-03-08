// Modern effects script for animations and audio

// Audio context and sounds
let audioContext;
let audioInitialized = false;

// Audio initialization - on user interaction to comply with browser policies
function initAudio() {
  if (audioInitialized) {return;}

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioInitialized = true;
}

// Play a sound with specific parameters
function playSound(frequency, type = 'sine', duration = 0.15, volume = 0.2) {
  if (!audioInitialized) {return;}

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume;
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

// UI Sound effects
function playClickSound() {
  playSound(800, 'sine', 0.08, 0.15);
}

function playHoverSound() {
  playSound(1200, 'sine', 0.05, 0.05);
}

function playSuccessSound() {
  // Play a little melody
  setTimeout(() => {return playSound(600, 'sine', 0.1)}, 0);
  setTimeout(() => {return playSound(800, 'sine', 0.1)}, 100);
  setTimeout(() => {return playSound(1000, 'sine', 0.2)}, 200);
}

// Animation on scroll
function handleScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(element => {
    observer.observe(element);
  });
}

// Add mouse trail effect
function createMouseTrail() {
  const trailContainer = document.createElement('div');
  trailContainer.className = 'mouse-trail-container';
  document.body.appendChild(trailContainer);

  document.addEventListener('mousemove', (e) => {
    const trail = document.createElement('div');
    trail.className = 'mouse-trail-particle';
    trail.style.left = `${e.clientX  }px`;
    trail.style.top = `${e.clientY  }px`;

    const size = Math.random() * 15 + 5;
    const hue = Math.random() * 60 + 290; // Purple to pink range

    trail.style.width = `${size  }px`;
    trail.style.height = `${size  }px`;
    trail.style.backgroundColor = `hsla(${hue}, 100%, 70%, 0.7)`;

    trailContainer.appendChild(trail);

    setTimeout(() => {
      trail.remove();
    }, 1000);
  });

  // Add the CSS for the trail
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
      transform: translate(-50%, -50%);
      animation: trail-fade 1s ease-out forwards;
    }
    @keyframes trail-fade {
      0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
    }
  `;
  document.head.appendChild(styleElement);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize scroll animations
  handleScrollAnimations();

  // Create mouse trail effect
  createMouseTrail();

  // Add click sound to buttons and links
  document.querySelectorAll('a, button, .cta-button, .fancy-toggle').forEach(element => {
    element.addEventListener('click', (e) => {
      initAudio();
      playClickSound();
    });

    element.addEventListener('mouseenter', (e) => {
      if (audioInitialized) {
        playHoverSound();
      }
    });
  });

  // One-time initialization on first user interaction
  document.addEventListener('click', () => {
    initAudio();
  }, { once: true });

  // Animation for cards
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (audioInitialized) {
        playSound(500, 'sine', 0.1, 0.1);
      }
    });
  });

  // Handle theme toggle
  const themeToggle = document.querySelector('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isPressed = themeToggle.getAttribute('aria-pressed') === 'true';
      themeToggle.setAttribute('aria-pressed', !isPressed);
      if (audioInitialized) {
        playSuccessSound();
      }
    });
  }
});
