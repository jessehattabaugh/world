# Jesse's World

## 🌱 PixelBiome: A WebGPU-powered Ecosystem Simulator

### Mission Statement

Create a visually engaging, highly performant 2D ecosystem simulation running entirely in-browser. The simulator leverages the power of WebGPU shaders (WGSL) for parallelized lifeform interactions, Web Workers and OffscreenCanvas for distributed rendering, and Service Workers for state caching and persistence. Players can interactively manage the ecosystem, influencing evolution and ecological balance in a sandbox or scenario-driven environment. The project prioritizes maintainability, scalability, and correctness using Test-Driven Development (TDD) via Playwright.

### Project Goals

- **WebGPU Compute & Rendering**: Use WebGPU and WGSL shaders extensively for high-performance compute tasks such as lifeform logic, genetics, and interactions, as well as rendering ecosystem visuals.
- **Distributed Processing**: Implement a tile-based slippy map system leveraging Web Workers and OffscreenCanvas to parallelize rendering and computation tasks across multiple threads.
- **Interactive Ecosystem**: Players can spawn or destroy lifeforms, introduce resources, and modify the environment dynamically, with intuitive camera controls for zooming, panning, and rotating views.
- **Rich Simulation Mechanics**: Provide realistic ecosystem dynamics, including predation, reproduction, genetic variation, basic neural network-driven behavior, and complex inter-species interactions.
- **User-generated Terrain**: Allow procedural generation of simulation terrain and lifeform distributions from user-uploaded images, converting pixel data into food or initial life conditions.
- **Persistent Simulation**: Leverage Service Workers combined with an IndexedDB wrapper (idb) for state management, caching, and offline persistence.
- **Real-Time Analytics Dashboard**: Provide dynamic visual feedback and statistics about ecosystem health, species populations, energy flow, and genetic diversity through real-time dashboard visualization.
- **Interactive Gameplay Tools**: Equip players with robust tools to directly influence the ecosystem (spawn lifeforms, alter resource distributions, manage populations).
- **Test-Driven Development**: Integrate Playwright as the core end-to-end testing framework, ensuring reliability and correctness throughout incremental feature development.

### Technology Stack

| Category | Libraries / Technologies |
|----------|--------------------------|
| Compute & Rendering | WebGPU, @webgpu/types, wgsl-preprocessor |
| Multithreading | Web Workers, OffscreenCanvas, Comlink (Worker communication) |
| UI & Visualization | Chart.js (statistics), HTML/CSS (interface), Tweakpane (interactive UI), custom camera & slippy map |
| State Management | Service Workers, idb (IndexedDB wrapper) |
| WebGPU Utilities | @webgpu/types, wgsl-preprocessor (WGSL shader management) |
| Testing & CI | Playwright (Visual regression and functional E2E tests) |

### Development Roadmap

#### Milestone 1: Infrastructure & WebGPU
- Web Workers & OffscreenCanvas: Divide world into tiles, each managed by a Web Worker
- Integrate @webgpu/types and wgsl-preprocessor for shader management

#### Milestone 2: Core Simulation Engine
- Define lifeform data structures and allocate GPU buffers
- Implement basic WGSL compute shaders for parallel lifeform updates
- Implement neural decision-making and genetic mutations within compute shaders
- Add predation, reproduction, and mutation logic incrementally

#### Milestone 3: Rendering & Interaction
- Implement WGSL-based rendering pipeline for lifeforms and resources
- Camera system (pan, zoom, rotate) managed per tile using Web Workers and OffscreenCanvas
- Visualization modes toggled via Chart.js graphs and rendered overlays

#### Milestone 4: User Interaction & Tools
- Develop interactive tools for spawning, removing, and manipulating lifeforms/resources
- UI controls built with Tweakpane for simulation parameters
- Enable procedural world generation from uploaded images (pixels → lifeform/resources)

#### Milestone 5: Persistence & Optimization
- Persistent caching and offline support via Service Workers and IndexedDB (managed through idb wrapper)
- Periodic statistics collection (population trends, genetic drift) handled by Web Workers
- Profile and optimize WGSL shaders for large-scale simulation scenarios

#### Milestone 6: Game Modes & Final Polish
- Implement multiple game modes (sandbox, survival, scenarios)
- Polish visuals, performance, and user experience
- Finalize documentation and deployment

### Testing Methodology

**Test-Driven Development**: Implement Playwright end-to-end tests covering:
- Shader correctness (output validation)
- UI interactions and regression visual tests
- Performance and scalability tests to ensure GPU-accelerated features perform within targets

### Deployment

- Host on Netlify
- Fully offline-capable via Service Worker caching
- Comprehensive Playwright testing ensures stable deployments

This project will demonstrate the power of modern web APIs (WebGPU, Web Workers, OffscreenCanvas, and IndexedDB caching via Service Workers) to deliver high-performance, interactive simulations directly in the browser, pushing both the boundaries of your abilities and the capabilities of web technology.

## System Requirements

- **Modern Web Browser with WebGPU Support**: Chrome 113+, Edge 113+, or browsers with WebGPU enabled
- **GPU**: Hardware that supports modern graphics APIs (WebGPU)
- **Node.js**: v16 or higher
- **NPM**: v7 or higher

## Development Principles

- We use modern web standards: HTML, JavaScript, CSS, JSDoc comments, and JSON
- We embrace ES Modules and reject CommonJS
- We follow test-driven development practices with Playwright
- We prioritize performance, accessibility, and security
- We use Web Components for DOM interactions
- We leverage Service Workers for offline capabilities

## Features

- 🧬 Real-time ecosystem simulation with genetic algorithms
- 🌍 Interactive, tile-based world rendering with WebGPU
- 📊 Data visualization dashboard with real-time statistics
- 🧠 Neural networks for lifeform decision making
- 🔄 Save/load ecosystem state with IndexedDB
- 🎮 Multiple simulation modes and tools
- 🖱️ Advanced camera controls (pan, zoom, rotate)
- 🌓 Dark/light theme support with auto detection
- 📱 Fully responsive design
- 🔒 Enhanced security headers
- ♿ Accessibility features including prefers-reduced-motion support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create required directories:
```bash
npm run pretest
```

3. Start the development server:
```bash
npm run dev
```

## Testing

The project includes several types of automated tests:

- WebGPU shader validation
- Ecosystem simulation correctness
- Performance metrics
- Visual regression
- Accessibility compliance

### Running Tests

```bash
# Run all tests against local dev server
npm test

# Run against specific environments
npm run local     # Local development
npm run staging   # Staging environment
npm run prod      # Production environment

# Other test commands
npm run debug     # Run tests with debugger
npm run ui        # Run tests with UI mode
npm run quick     # Run quick test suite

# Update baselines
npm run updshots  # Update visual snapshots
npm run updperf   # Update performance baselines
```

### Test Reports

- Test results: `playwright-report/`
- Screenshots: `snapshots/`
- Performance data: `performance/`
- Shader test results: `reports/shaders/`

## Development

- `npm run dev` - Start development server
- `npm run lint` - Check code style
- `npm run fix` - Fix code style issues
- `npm run build` - Build for production

## Directory Structure

```
/
├── bin/                # CLI tools and utilities
├── performance/        # Performance baselines
├── snapshots/          # Visual test baselines
├── tests/              # Test files
│   ├── components/     # Component tests
│   ├── flows/          # User flow tests
│   ├── pages/          # Page-specific tests
│   └── utils/          # Test utilities
├── www/                # Website source files
│   ├── components/     # Web components
│   ├── scripts/        # JavaScript modules
│   │   ├── shaders/    # WGSL shader files
│   │   ├── workers/    # Web Workers
│   │   └── engine/     # Simulation engine
│   ├── styles/         # CSS files
│   └── index.html      # Main entry point
└── package.json        # Project configuration
```

## Documentation

- [Tests Documentation](./tests/README.md)
- [Performance Documentation](./performance/README.md)
- [WebGPU Shaders Documentation](./www/scripts/shaders/README.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
