// WGSL Random Number Generators
// Common random number utilities for use in shaders

// PCG (Permuted Congruential Generator)
// A simple but high-quality random number generator
fn pcg(seed: u32) -> u32 {
    let state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// Float random between 0 and 1
fn rand(seed: u32) -> f32 {
    return f32(pcg(seed)) / 4294967295.0;
}

// Random float in range [min, max]
fn randRange(seed: u32, min: f32, max: f32) -> f32 {
    return min + rand(seed) * (max - min);
}

// Random 2D direction (normalized vector)
fn randDir2D(seed: u32) -> vec2f {
    let angle = rand(seed) * 6.28318; // 2*PI
    return vec2f(cos(angle), sin(angle));
}

// Random 3D direction (normalized vector)
fn randDir3D(seed: u32) -> vec3f {
    let z = randRange(seed, -1.0, 1.0);
    let angle = randRange(seed + 1u, 0.0, 6.28318); // 2*PI
    let xy = sqrt(1.0 - z*z);
    return vec3f(xy * cos(angle), xy * sin(angle), z);
}

// Noise function for 2D position
fn noise2D(p: vec2f, seed: u32) -> f32 {
    let i = vec2u(floor(p));
    let f = fract(p);

    // Cubic interpolation to smooth the noise
    let u = f * f * (3.0 - 2.0 * f);

    // Generate random values at the 4 corners
    let a = rand(pcg(i.x + pcg(i.y + seed)));
    let b = rand(pcg(i.x + 1u + pcg(i.y + seed)));
    let c = rand(pcg(i.x + pcg(i.y + 1u + seed)));
    let d = rand(pcg(i.x + 1u + pcg(i.y + 1u + seed)));

    // Bilinear interpolation
    return mix(
        mix(a, b, u.x),
        mix(c, d, u.x),
        u.y
    );
}