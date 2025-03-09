/**
 * Resource Manager
 *
 * Handles the spawning, distribution, and regeneration of resources
 * (food, water, etc.) in the ecosystem.
 */
export class ResourceManager {
    constructor() {
        this.resources = new Map();
        this.nextResourceId = 0;
        this.lastUpdate = performance.now();

        // Resource regeneration settings
        this.settings = {
            foodRegenerationRate: 0.01,    // Resources per second
            foodRegenerationRadius: 50,     // Minimum distance between resources
            maxFoodDensity: 0.0001,        // Resources per pixel
            foodEnergyValue: 25            // Energy gained from consuming
        };

        // Statistics
        this.stats = {
            totalResources: 0,
            resourcesConsumed: 0,
            resourcesSpawned: 0
        };
    }

    /**
     * Spawn a new food resource
     */
    spawnFood(x, y, options = {}) {
        const resource = {
            id: this.nextResourceId++,
            type: 'food',
            position: [x, y],
            energy: options.energy || this.settings.foodEnergyValue,
            size: options.size || 1.0,
            created: performance.now()
        };

        this.resources.set(resource.id, resource);
        this.stats.totalResources = this.resources.size;
        this.stats.resourcesSpawned++;

        return resource;
    }

    /**
     * Check if a food resource can be spawned at location
     */
    canSpawnFoodAt(x, y) {
        // Check distance to nearest resource
        for (const resource of this.resources.values()) {
            const dx = x - resource.position[0];
            const dy = y - resource.position[1];
            const distSq = dx * dx + dy * dy;

            if (distSq < this.settings.foodRegenerationRadius *
                       this.settings.foodRegenerationRadius) {
                return false;
            }
        }
        return true;
    }

    /**
     * Try to consume a resource
     */
    tryConsumeResource(resourceId, consumerId) {
        const resource = this.resources.get(resourceId);
        if (!resource) return 0;

        const energyGained = resource.energy;
        this.resources.delete(resourceId);

        this.stats.totalResources = this.resources.size;
        this.stats.resourcesConsumed++;

        return energyGained;
    }

    /**
     * Update resource state
     */
    update(currentTime) {
        const deltaTime = (currentTime - this.lastUpdate) / 1000;
        this.lastUpdate = currentTime;

        // Natural resource regeneration
        if (Math.random() < this.settings.foodRegenerationRate * deltaTime) {
            // Try to spawn new food at random location
            const x = Math.random() * 800; // TODO: Get world size from simulation
            const y = Math.random() * 600;

            if (this.canSpawnFoodAt(x, y)) {
                this.spawnFood(x, y);
            }
        }
    }

    /**
     * Get resource statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get all resources within range of a point
     */
    getResourcesInRange(x, y, range) {
        const rangeSq = range * range;
        const nearby = [];

        for (const resource of this.resources.values()) {
            const dx = x - resource.position[0];
            const dy = y - resource.position[1];
            const distSq = dx * dx + dy * dy;

            if (distSq <= rangeSq) {
                nearby.push({
                    ...resource,
                    distance: Math.sqrt(distSq)
                });
            }
        }

        return nearby.sort((a, b) => a.distance - b.distance);
    }
}