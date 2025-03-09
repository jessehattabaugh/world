/**
 * Cyberpunk Techno Music Generator
 * Generates techno music using Web Audio API
 */

export class TechnoGenerator {
  constructor() {
    // Initialize Web Audio API
    this.audioContext = null;
    this.masterGain = null;
    this.playing = false;

    // Music parameters
    this.bpm = 130;
    this.step = 0;
    this.patternLength = 16;
    this.nextNoteTime = 0;
    this.timerId = null;

    // Visualization
    this.analyser = null;
    this.visualizer = null;
    this.visualizerBars = [];

    // Instruments
    this.kick = null;
    this.synth = null;
    this.synth2 = null;
    this.hihat = null;

    // Patterns
    this.kickPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    this.synthPattern = [
      { note: 'C3', steps: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
      { note: 'G3', steps: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] }
    ];
    this.hihatPattern = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];

    // Note frequencies
    this.notes = {
      'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
      'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
      'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
      'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94
    };
  }

  /**
   * Initialize audio context and setup instruments
   */
  init() {
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.audioContext.destination);

    // Setup analyser for visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32;
    this.analyser.connect(this.audioContext.destination);
    this.masterGain.connect(this.analyser);

    // Initialize visualizer
    this.initVisualizer();

    // Setup instruments
    this.setupInstruments();

    // Create random patterns
    this.generateRandomPatterns();

    console.log('🎵 Techno generator initialized');

    return this;
  }

  /**
   * Setup audio instruments
   */
  setupInstruments() {
    // Initialize kick drum
    this.kick = {
      play: (time) => {
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.frequency.value = 150;
        gainNode.gain.value = 1;

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
      }
    };

    // Initialize hi-hat
    this.hihat = {
      play: (time) => {
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }

        noise.buffer = noiseBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.2;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 7000;

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.start(time);
        noise.stop(time + 0.1);
      }
    };

    // Initialize synth
    this.synth = {
      play: (time, note) => {
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.frequency.value = this.notes[note];
        osc.type = 'sawtooth';
        gainNode.gain.value = 0.2;

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
      }
    };

    // Initialize second synth with different waveform
    this.synth2 = {
      play: (time, note) => {
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.frequency.value = this.notes[note] / 2; // One octave lower
        osc.type = 'square';
        gainNode.gain.value = 0.1;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        filter.Q.value = 8;

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

        osc.start(time);
        osc.stop(time + 0.6);
      }
    };
  }

  /**
   * Generate random patterns for more variety
   */
  generateRandomPatterns() {
    // Keep the kick steady on beats 1, 5, 9, 13
    // But randomize other beats occasionally
    this.kickPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    for (let i = 0; i < this.patternLength; i++) {
      if (![0, 4, 8, 12].includes(i) && Math.random() < 0.2) {
        this.kickPattern[i] = 1;
      }
    }

    // Create a random bassline
    const availableNotes = ['C2', 'G2', 'D2', 'A2', 'E2', 'F2'];
    this.synthPattern = [];

    for (let i = 0; i < 3; i++) {
      const note = availableNotes[Math.floor(Math.random() * availableNotes.length)];
      const steps = Array(16).fill(0);

      // Place notes strategically
      steps[i * 4] = 1;
      if (Math.random() > 0.5) {steps[i * 4 + 2] = 1;}

      this.synthPattern.push({ note, steps });
    }

    // Generate hi-hat pattern
    this.hihatPattern = Array(16).fill(0);
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 1 || Math.random() < 0.3) {
        this.hihatPattern[i] = 1;
      }
    }
  }

  /**
   * Start the sequencer
   */
  start() {
    if (this.playing) {return;}

    if (!this.audioContext) {
      this.init();
    }

    // Resume audio context if it was suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.nextNoteTime = this.audioContext.currentTime;
    this.schedule();
    this.playing = true;

    // Start visualizer animation
    this.animateVisualizer();

    console.log('🎵 Techno generator started');
  }

  /**
   * Stop the sequencer
   */
  stop() {
    if (!this.playing) {return;}

    clearTimeout(this.timerId);
    this.playing = false;

    console.log('🎵 Techno generator stopped');
  }

  /**
   * Toggle play/pause
   */
  toggle() {
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
    return this.playing;
  }

  /**
   * Schedule next note
   */
  schedule() {
    // Calculate time to next note
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPerStep = secondsPerBeat / 4;

    // Schedule current step
    if (this.kickPattern[this.step]) {
      this.kick.play(this.nextNoteTime);
    }

    if (this.hihatPattern[this.step]) {
      this.hihat.play(this.nextNoteTime);
    }

    this.synthPattern.forEach(pattern => {
      if (pattern.steps[this.step]) {
        this.synth.play(this.nextNoteTime, pattern.note);

        // Sometimes add a second synth an octave higher for color
        if (Math.random() > 0.7) {
          const octaveUp = pattern.note.replace(/\d/, match => {return (parseInt(match) + 1).toString()});
          this.synth2.play(this.nextNoteTime, octaveUp);
        }
      }
    });

    // Move forward
    this.nextNoteTime += secondsPerStep;
    this.step = (this.step + 1) % this.patternLength;

    // Schedule next step
    const {currentTime} = this.audioContext;
    const lookahead = 0.1; // seconds

    const delay = Math.max(0, (this.nextNoteTime - currentTime - 0.05) * 1000);
    this.timerId = setTimeout(() => {return this.schedule()}, delay);
  }

  /**
   * Initialize visualizer elements
   */
  initVisualizer() {
    this.visualizer = document.getElementById('music-visualizer');
    if (!this.visualizer) {return;}

    // Clear existing bars
    this.visualizer.innerHTML = '';
    this.visualizerBars = [];

    // Create visualizer bars
    for (let i = 0; i < 10; i++) {
      const bar = document.createElement('div');
      bar.className = 'visualizer-bar';
      this.visualizer.appendChild(bar);
      this.visualizerBars.push(bar);
    }
  }

  /**
   * Animate visualizer bars
   */
  animateVisualizer() {
    if (!this.playing || !this.visualizer) {return;}

    // Get frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Update visualizer bars
    const barCount = this.visualizerBars.length;
    for (let i = 0; i < barCount; i++) {
      const index = Math.floor(i * bufferLength / barCount);
      const value = dataArray[index] / 255;

      const height = Math.max(3, value * 30);
      this.visualizerBars[i].style.height = `${height}px`;

      // Add color based on frequency
      const hue = 180 + (value * 60);
      this.visualizerBars[i].style.backgroundColor = `hsl(${hue}, 100%, 60%)`;
    }

    // Continue animation
    if (this.playing) {
      requestAnimationFrame(() => {return this.animateVisualizer()});
    } else {
      // Reset bars when not playing
      this.visualizerBars.forEach(bar => {
        bar.style.height = '3px';
      });
    }
  }
}

/**
 * Initialize music controls
 */
export function initMusicControls() {
  // Create techno generator
  const techno = new TechnoGenerator();

  // Get music toggle button
  const musicToggle = document.getElementById('music-toggle');
  if (!musicToggle) {return;}

  // Add click event listener to toggle button
  musicToggle.addEventListener('click', () => {
    const isPlaying = techno.toggle();
    musicToggle.classList.toggle('playing', isPlaying);
    musicToggle.innerHTML = isPlaying ? '<i>⏹</i>' : '<i>▶</i>';

    // Notify user
    const notification = document.createElement('div');
    notification.className = 'music-notification';
    notification.textContent = isPlaying ? 'Music: ON' : 'Music: OFF';
    document.body.appendChild(notification);

    // Remove notification after a delay
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {return notification.remove()}, 500);
    }, 2000);
  });

  // Generate new patterns button
  const newPatternButton = document.getElementById('new-pattern');
  if (newPatternButton) {
    newPatternButton.addEventListener('click', () => {
      techno.generateRandomPatterns();
    });
  }

  console.log('🎵 Music controls initialized');
}
