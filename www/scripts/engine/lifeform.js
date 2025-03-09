/**
 * Lifeform class representing a simulated organism in the ecosystem
 *
 * This class handles:
 * - Physical properties (position, velocity, size)
 * - Biological properties (energy, species, etc.)
 * - Neural network decision-making
 * - Genetic traits and mutations
 * - Reproduction and predation logic
 */
export class Lifeform {
  /**
   * Create a new lifeform
   * @param {Object} options - Lifeform configuration options
   */
  constructor(options = {}) {
    // Physical properties
    this.position = options.position || { x: 0, y: 0 };
    this.velocity = options.velocity || { x: 0, y: 0 };
    this.size = options.size || 5;

    // Biological properties
    this.energy = options.energy || 100;
    this.maxEnergy = options.maxEnergy || 200;
    this.species = options.species || 0; // 0: plant, 1: herbivore, 2: carnivore
    this.age = options.age || 0;
    this.maxAge = options.maxAge || 1000;
    this.alive = true;
    this.id = options.id || `life-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Neural network for decision making
    this.neuralNetworkId = options.neuralNetworkId || null;

    // Genetic traits (genes that affect behavior and appearance)
    this.genes = options.genes || {
      // Movement traits
      speed: Math.random() * 0.5 + 0.5,           // Movement speed multiplier
      turnRate: Math.random() * 0.3 + 0.1,        // How quickly it can change direction

      // Sensory traits
      visionRange: Math.random() * 50 + 30,       // How far the entity can see
      visionAngle: Math.random() * Math.PI/2 + Math.PI/4, // Field of view angle

      // Metabolic traits
      metabolism: Math.random() * 0.5 + 0.5,      // Energy consumption rate
      digestionEfficiency: Math.random() * 0.3 + 0.6, // How efficiently it extracts energy from food

      // Reproduction traits
      reproductionEnergy: Math.random() * 50 + 50, // Energy threshold for reproduction
      reproductionRate: Math.random() * 0.1 + 0.05, // Chance of reproduction when eligible
      mutationRate: Math.random() * 0.1 + 0.01,    // Genetic mutation rate

      // Species-specific traits
      photosynthesisRate: Math.random() * 0.3 + 0.2, // For plants
      attackStrength: Math.random() * 0.5 + 0.5,     // For predators
      defense: Math.random() * 0.3 + 0.2,            // Defense against predators

      // Appearance genes
      color: Math.random(),                       // Base color variation (0-1)
      pattern: Math.floor(Math.random() * 3),     // Pattern type (0-2)
    };

    // Statistics for tracking
    this.stats = {
      offspring: 0,
      kills: 0,
      foodEaten: 0,
      distanceTraveled: 0,
      damageTaken: 0,
      damageDealt: 0
    };
  }

  /**
   * Convert to a GPU-compatible format for shader processing
   * @returns {Float32Array} Flattened data for GPU buffer
   */
  toGPUFormat() {
    // Convert the lifeform to a format suitable for GPU processing
    // Each lifeform requires 16 float values (64 bytes)
    const data = new Float32Array(16);

    // Physical properties (8 bytes)
    data[0] = this.position.x;
    data[1] = this.position.y;
    data[2] = this.velocity.x;
    data[3] = this.velocity.y;

    // Biological properties (16 bytes)
    data[4] = this.energy;
    data[5] = this.species;
    data[6] = this.size;
    data[7] = this.age;

    // Genetic traits - most important ones for GPU (24 bytes)
    data[8] = this.genes.speed;
    data[9] = this.genes.visionRange;
    data[10] = this.genes.metabolism;
    data[11] = this.genes.photosynthesisRate;
    data[12] = this.genes.attackStrength;
    data[13] = this.genes.defense;

    // State flags (8 bytes)
    data[14] = this.alive ? 1 : 0;
    data[15] = this.neuralNetworkId || 0; // Reference to neural network in separate buffer

    return data;
  }

  /**
   * Create a lifeform from GPU buffer data
   * @param {Float32Array} data - GPU buffer data
   * @returns {Lifeform} New lifeform instance
   */
  static fromGPUFormat(data) {
    return new Lifeform({
      position: { x: data[0], y: data[1] },
      velocity: { x: data[2], y: data[3] },
      energy: data[4],
      species: data[5],
      size: data[6],
      age: data[7],
      neuralNetworkId: data[15],
      genes: {
        speed: data[8],
        visionRange: data[9],
        metabolism: data[10],
        photosynthesisRate: data[11],
        attackStrength: data[12],
        defense: data[13]
      }
    });
  }

  /**
   * Update the lifeform's state for one simulation step
   * @param {number} deltaTime - Time elapsed since last update
   * @param {Array} nearbyEntities - Array of nearby entities
   * @param {Object} world - World parameters (width, height)
   * @returns {Object} Update information
   */
  update(deltaTime, nearbyEntities = [], world = { width: 1000, height: 1000 }) {
    if (!this.alive) return { type: 'dead' };

    // Age the organism
    this.age += deltaTime;

    // Apply species-specific behavior
    let result = {};
    switch (this.species) {
      case 0: // Plant
        result = this.updatePlant(deltaTime);
        break;
      case 1: // Herbivore
        result = this.updateHerbivore(deltaTime, nearbyEntities);
        break;
      case 2: // Carnivore
        result = this.updateCarnivore(deltaTime, nearbyEntities);
        break;
    }

    // Apply movement
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Apply world boundaries
    if (this.position.x < 0) {
      this.position.x = 0;
      this.velocity.x *= -0.5;
    }
    if (this.position.x > world.width) {
      this.position.x = world.width;
      this.velocity.x *= -0.5;
    }
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y *= -0.5;
    }
    if (this.position.y > world.height) {
      this.position.y = world.height;
      this.velocity.y *= -0.5;
    }

    // Apply friction
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    // Track distance traveled
    const distance = Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y
    ) * deltaTime;
    this.stats.distanceTraveled += distance;

    // Consume energy based on movement and metabolism
    this.energy -= (0.1 + distance * this.genes.metabolism) * deltaTime;

    // Check if energy depleted or max age reached
    if (this.energy <= 0 || this.age >= this.maxAge) {
      this.alive = false;
      return { type: 'died', cause: this.energy <= 0 ? 'starvation' : 'old-age' };
    }

    // Check for reproduction
    if (this.canReproduce()) {
      const offspring = this.reproduce();
      return {
        type: 'reproduced',
        offspring
      };
    }

    return result;
  }

  /**
   * Update plant behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @returns {Object} Update information
   */
  updatePlant(deltaTime) {
    // Plants generate energy through photosynthesis
    const energyGained = this.genes.photosynthesisRate * deltaTime;
    this.energy += energyGained;

    // Cap energy at maximum
    if (this.energy > this.maxEnergy) {
      this.energy = this.maxEnergy;
    }

    return { type: 'photosynthesis', energyGained };
  }

  /**
   * Update herbivore behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @param {Array} nearbyEntities - Array of nearby entities
   * @returns {Object} Update information
   */
  updateHerbivore(deltaTime, nearbyEntities) {
    // Find the closest plant
    let closestPlant = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (entity.species === 0 && entity.alive) { // It's a plant
        const dx = entity.position.x - this.position.x;
        const dy = entity.position.y - this.position.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < closestDistance && distSq < this.genes.visionRange * this.genes.visionRange) {
          closestDistance = distSq;
          closestPlant = entity;
        }
      }
    }

    // Also find the closest predator to avoid it
    let closestPredator = null;
    let closestPredatorDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (entity.species === 2 && entity.alive) { // It's a carnivore
        const dx = entity.position.x - this.position.x;
        const dy = entity.position.y - this.position.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < closestPredatorDistance && distSq < this.genes.visionRange * this.genes.visionRange) {
          closestPredatorDistance = distSq;
          closestPredator = entity;
        }
      }
    }

    // If there's a predator nearby, run away
    if (closestPredator && closestPredatorDistance < this.genes.visionRange * this.genes.visionRange * 0.5) {
      const dx = this.position.x - closestPredator.position.x;
      const dy = this.position.y - closestPredator.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Normalize and apply speed
      if (dist > 0) {
        this.velocity.x = (dx / dist) * this.genes.speed * 1.5; // Run faster when fleeing
        this.velocity.y = (dy / dist) * this.genes.speed * 1.5;
      }

      return { type: 'fleeing', from: closestPredator.id };
    }

    // If there's food nearby, move toward it
    if (closestPlant) {
      const dx = closestPlant.position.x - this.position.x;
      const dy = closestPlant.position.y - this.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // If very close, eat it
      if (dist < this.size + closestPlant.size) {
        // Consume the plant
        const energyGained = closestPlant.energy * this.genes.digestionEfficiency;
        this.energy += energyGained;

        // Cap energy at maximum
        if (this.energy > this.maxEnergy) {
          this.energy = this.maxEnergy;
        }

        // Kill the plant
        closestPlant.energy = 0;
        closestPlant.alive = false;

        // Update stats
        this.stats.foodEaten++;

        return { type: 'ate', target: closestPlant.id, energyGained };
      }

      // Move toward food
      if (dist > 0) {
        this.velocity.x = (dx / dist) * this.genes.speed;
        this.velocity.y = (dy / dist) * this.genes.speed;
      }

      return { type: 'seeking', target: 'food' };
    }

    // Random movement if nothing interesting nearby
    if (Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.genes.speed * 0.5;
      this.velocity.y = Math.sin(angle) * this.genes.speed * 0.5;
    }

    return { type: 'wandering' };
  }

  /**
   * Update carnivore behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @param {Array} nearbyEntities - Array of nearby entities
   * @returns {Object} Update information
   */
  updateCarnivore(deltaTime, nearbyEntities) {
    // Find the closest herbivore
    let closestPrey = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (entity.species === 1 && entity.alive) { // It's a herbivore
        const dx = entity.position.x - this.position.x;
        const dy = entity.position.y - this.position.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < closestDistance && distSq < this.genes.visionRange * this.genes.visionRange) {
          closestDistance = distSq;
          closestPrey = entity;
        }
      }
    }

    // If there's prey nearby, chase it
    if (closestPrey) {
      const dx = closestPrey.position.x - this.position.x;
      const dy = closestPrey.position.y - this.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // If very close, attack it
      if (dist < this.size + closestPrey.size) {
        // Attack mechanics
        const attackSuccess = this.genes.attackStrength > closestPrey.genes.defense;

        if (attackSuccess) {
          // Kill the prey
          closestPrey.alive = false;

          // Gain energy
          const energyGained = closestPrey.energy * this.genes.digestionEfficiency;
          this.energy += energyGained;

          // Cap energy at maximum
          if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
          }

          // Update stats
          this.stats.kills++;

          return { type: 'killed', target: closestPrey.id, energyGained };
        } else {
          // Attack failed
          return { type: 'attack-failed', target: closestPrey.id };
        }
      }

      // Move toward prey
      if (dist > 0) {
        this.velocity.x = (dx / dist) * this.genes.speed;
        this.velocity.y = (dy / dist) * this.genes.speed;
      }

      return { type: 'hunting', target: closestPrey.id };
    }

    // Random movement if no prey nearby
    if (Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.genes.speed * 0.5;
      this.velocity.y = Math.sin(angle) * this.genes.speed * 0.5;
    }

    return { type: 'wandering' };
  }

  /**
   * Check if the lifeform can reproduce
   * @returns {boolean} Whether reproduction is possible
   */
  canReproduce() {
    return this.energy > this.genes.reproductionEnergy &&
           this.age > 100 &&
           Math.random() < this.genes.reproductionRate;
  }

  /**
   * Reproduce to create offspring with possible mutations
   * @param {Lifeform} [partner=null] - Optional partner for sexual reproduction
   * @returns {Lifeform} The offspring
   */
  reproduce(partner = null) {
    // Clone genes with mutations
    const childGenes = {};

    // Sexual reproduction (if partner available and same species)
    if (partner && partner.species === this.species) {
      // Crossover genes from both parents
      for (const [key, value] of Object.entries(this.genes)) {
        // 50% chance to inherit from each parent
        childGenes[key] = Math.random() < 0.5 ? value : partner.genes[key];

        // Apply mutations based on mutation rate
        if (Math.random() < this.genes.mutationRate) {
          // Mutate by up to 20% in either direction
          const mutationFactor = 1 + (Math.random() * 0.4 - 0.2);
          childGenes[key] *= mutationFactor;
        }
      }
    } else {
      // Asexual reproduction - copy genes with mutation
      for (const [key, value] of Object.entries(this.genes)) {
        childGenes[key] = value;

        // Apply mutations based on mutation rate
        if (Math.random() < this.genes.mutationRate) {
          // Mutate by up to 20% in either direction
          const mutationFactor = 1 + (Math.random() * 0.4 - 0.2);
          childGenes[key] *= mutationFactor;
        }
      }
    }

    // Create offspring at slightly offset position
    const offspring = new Lifeform({
      position: {
        x: this.position.x + (Math.random() * 10 - 5),
        y: this.position.y + (Math.random() * 10 - 5)
      },
      velocity: { x: 0, y: 0 },
      energy: this.energy * 0.3, // Child gets 30% of parent's energy
      species: this.species,
      genes: childGenes,
      size: this.size * 0.7 // Start smaller than parent
    });

    // Parent loses energy used to create offspring
    this.energy *= 0.7; // Parent keeps 70% of energy

    // Update reproduction stats
    this.stats.offspring++;

    return offspring;
  }
}
