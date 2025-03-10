# Jesse's World

## 🌱 Jesse's World: A WebGPU-powered Ecosystem Simulator

### Mission Statement

Create a visually engaging, highly performant 2D ecosystem simulation running entirely in-browser. The simulator leverages the power of WebGPU shaders (WGSL) for parallelized lifeform interactions, Web Workers and OffscreenCanvas for distributed rendering, and Service Workers for state caching and persistence. Players can interactively manage the ecosystem, influencing evolution and ecological balance in a sandbox or scenario-driven environment. The project prioritizes maintainability, scalability, and correctness using Test-Driven Development (TDD) via Playwright.

Our vision is to educate users on complex ecological concepts through interactive simulation, making principles of evolution, genetic adaptation, and ecosystem dynamics accessible to everyone. By visualizing these concepts in real-time, Jesse's World serves as both an educational tool and an engaging experience that demonstrates the capabilities of modern web technologies.

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
| Testing & CI | Playwright (Functional E2E tests) |

### Development Roadmap

#### Milestone 1: Infrastructure & WebGPU
- Web Workers & OffscreenCanvas: Divide world into chunks (each representing a pixel–by–pixel simulation area) managed by Web Workers
- Integrate @webgpu/types and wgsl-preprocessor for shader management and WGSL compute shader validation
- Initialize GPU resources (device, buffers, pipelines) within workers (using OffscreenCanvas when available)

#### Milestone 2: Core Simulation Engine
- Define lifeform data structures and allocate GPU buffers using 16-float blocks per lifeform
- Implement basic WGSL compute shaders to update lifeforms in parallel
- Integrate placeholder neural decision–making and genetic mutation logic within the compute shader
- Incrementally add predation, reproduction, and mutation logic (currently simulated via simple threshold checks)

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
- Functional behavior of simulation
- UI interactions and expected outcomes
- Core user journeys through the application

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

### Project Rules & Guidelines

#### Development Philosophy
- **Progressive Enhancement**: Core functionality works without advanced features, enhanced experience with WebGPU
- **Performance First**: Optimize critical paths and minimize main thread blocking
- **Accessibility Matters**: Support keyboard navigation, screen readers, and reduced motion preferences
- **Mobile Consideration**: Design for touch interfaces alongside desktop interactions
- **Testing Always**: Every feature must include appropriate functional tests

#### Code Standards
- **Modern JavaScript**: Use ES Modules, async/await, and modern DOM APIs
- **Clean CSS**: Follow BEM methodology with custom properties for theming
- **Semantic HTML**: Prioritize proper HTML elements and ARIA attributes
- **Documentation**: All components, functions, and modules must be documented with JSDoc

#### Browser Support
- **Primary Targets**: Chrome 113+, Edge 113+, Safari 17+ (future release with WebGPU)
- **Fallback Experience**: Provide graceful degradation for browsers without WebGPU

#### Contribution Guidelines
- **Feature Branches**: All new features developed in separate branches
- **Pull Requests**: All changes require PR review before merging
- **Testing Requirements**: PR must pass all automated tests

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

The project uses Playwright for end-to-end functional browser tests.

### Testing Commands
```bash
npm test           # Run all tests
npm run test:debug # Run tests with debugger
npm run test:ui    # Run tests with UI mode
npm run test:e2e   # Run end-to-end tests
npm run report     # Show test report
```

For detailed information about the testing approach:
- [Tests Documentation](./tests/README.md)

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

## Slippy Map-Style Grid System

Our simulation divides the world into fixed quadrilateral “chunks” that are processed in parallel by Web Workers.
Unlike traditional slippy map tiles, which are designed for coarse geographical maps, our chunks represent detailed pixel–by–pixel simulation areas.
When we later integrate a slippy–map interface (for example, using a minimal NPM package like Leaflet),
we can generate a quadtree of standard “tiles” on the fly from our underlying chunks for rapid display and panning.

### Key Components

#### TileManager (`www/scripts/engine/tile-manager.js`)
- Manages the overall grid system, viewport, and tile lifecycle
- Handles dynamic loading/unloading of tiles as the user pans and zooms
- Distributes work to Web Workers for parallel processing
- Uses Comlink for streamlined worker communication
- Efficiently composites rendered tile bitmaps onto the main canvas

#### TileWorker (`www/scripts/engine/workers/tile-worker.js`)
- Handles simulation and rendering for individual tiles
- Processes entities within each tile independently
- Uses OffscreenCanvas for GPU-accelerated rendering
- Manages entity interactions within the tile boundaries
- Communicates with the main thread via Comlink

#### Demo Implementation (`www/scripts/slippy-map-demo.js`)
- Provides a complete working example of the slippy map system
- Implements pan and zoom controls for intuitive navigation
- Shows performance metrics and tile status
- Demonstrates entity spawning and management

### Usage Example

```javascript
// Create and initialize the TileManager
const tileManager = new TileManager({
  width: 4096,          // Total world width
  height: 4096,         // Total world height
  tileSize: 256,        // Size of each tile
  maxWorkers: 4,        // Number of Web Workers to use
  bufferZone: 1,        // Extra tiles to keep loaded beyond visible area
  viewport: {
    x: 0, y: 0,         // Viewport position
    width: 800,         // Viewport width
    height: 600,        // Viewport height
    zoom: 1             // Zoom level
  },
  ctx: mainCanvasContext // Main canvas for compositing
});

// Initialize and start the system
await tileManager.initialize();
tileManager.start();

// Pan the viewport
tileManager.panViewport(deltaX, deltaY);

// Zoom the viewport around a point
tileManager.zoomViewport(1.1, centerX, centerY);

// Spawn an entity in the world
tileManager.spawnEntity({
  type: 'lifeform',
  position: { x: 100, y: 100 },
  species: 0, // 0: plant, 1: herbivore, 2: carnivore
  energy: 100,
  size: 5
});

// Clean up resources
tileManager.dispose();
```

### Key Benefits

1. **Performance Optimization**
   - Processing is distributed across multiple CPU cores via Web Workers
   - Only tiles in or near the viewport are loaded and processed
   - Rendering happens independently on each tile's OffscreenCanvas

2. **Memory Efficiency**
   - Entities are only loaded in active tiles
   - Resources for off-screen tiles are automatically released
   - Buffer zone prevents constant loading/unloading during small movements

3. **Scalability**
   - Can support very large world sizes (theoretically unlimited)
   - Entity count can scale to millions by only processing visible areas
   - Worker count automatically adjusts to available CPU cores

### Implementation Details

The system follows these principles:

1. **Viewport Management**
   - The visible area is represented by a viewport rectangle
   - Tiles overlapping this viewport are marked as visible
   - A buffer zone around the viewport contains additional loaded tiles

2. **Tile Lifecycle**
   - Tiles can be in states: unloaded, loading, loaded, processing, error
   - Tiles are dynamically assigned to the least busy worker
   - Each tile gets its own OffscreenCanvas for independent rendering

3. **Worker Communication**
   - Comlink provides a clean RPC-like interface to workers
   - Transferable objects (like OffscreenCanvas) minimize copying
   - Workers only process entities contained within their assigned tiles

4. **Entity Management**
   - Entities are assigned to tiles based on their positions
   - When entities move across tile boundaries, ownership transfers
   - Each worker maintains its own entity rendering

## License

This project is licensed under the MIT License - see the LICENSE file for details.
