// Math Utilities for WGSL Shaders
// Common mathematical functions used across various shaders

// Constants
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;
const HALF_PI: f32 = 1.57079632679;

// Clamp a value between min and max
fn clampf(value: f32, minVal: f32, maxVal: f32) -> f32 {
    return min(max(value, minVal), maxVal);
}

// Linear interpolation between a and b by t
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    return a + (b - a) * t;
}

// Spherical linear interpolation for vectors
fn slerp(start: vec2f, end: vec2f, t: f32) -> vec2f {
    let cosTheta = dot(normalize(start), normalize(end));
    let theta = acos(clampf(cosTheta, -1.0, 1.0));

    if (abs(theta) < 0.001) {
        return lerp(start, end, t);
    }

    let sinTheta = sin(theta);
    let startWeight = sin((1.0 - t) * theta) / sinTheta;
    let endWeight = sin(t * theta) / sinTheta;

    return startWeight * start + endWeight * end;
}

// Smooth step function
fn smoothstepf(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = clampf((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

// Calculate distance between two 2D points
fn distance2D(a: vec2f, b: vec2f) -> f32 {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    return sqrt(dx * dx + dy * dy);
}

// Calculate direction vector from point a to point b
fn direction2D(a: vec2f, b: vec2f) -> vec2f {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let len = sqrt(dx * dx + dy * dy);

    if (len < 0.0001) {
        return vec2f(0.0, 0.0);
    }

    return vec2f(dx / len, dy / len);
}

// Calculate angle between two 2D vectors in radians
fn angleBetween(a: vec2f, b: vec2f) -> f32 {
    let dot_product = dot(normalize(a), normalize(b));
    return acos(clampf(dot_product, -1.0, 1.0));
}

// Convert angle to 2D direction vector
fn angleToDir(angle: f32) -> vec2f {
    return vec2f(cos(angle), sin(angle));
}

// Convert 2D direction vector to angle
fn dirToAngle(dir: vec2f) -> f32 {
    return atan2(dir.y, dir.x);
}

// Rotate a 2D point around origin by angle (radians)
fn rotate2D(point: vec2f, angle: f32) -> vec2f {
    let s = sin(angle);
    let c = cos(angle);
    return vec2f(
        point.x * c - point.y * s,
        point.x * s + point.y * c
    );
}