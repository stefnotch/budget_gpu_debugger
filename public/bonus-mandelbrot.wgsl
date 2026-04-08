// Bonus present!
// This is for when you finish the tutorial :)
// Enjoy debugging this shader.

// Step 2: Add a uniform buffer with the time
struct Uniforms {
    time: f32,
}
@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    // Step 4: Set the `is_debug` variable
    is_debug = all(debug_data.debug_position == vec2u(input.position.xy));

    let my_data: u32 = u32(input.position.x);

    let color: f32 = mandelbrot(input.uv * 3.0 - vec2f(2.0, 1.5));
    return vec4(vec3f(color), 1);
}

/// The function z -> z^2 + c
fn quadraticMap(z: vec2f, c: vec2f) -> vec2f {
    return vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
}

/// Evaluates the mandelbrot set, and returns how long it takes to escape
/// 0 => escapes instantly
/// 1 => did not escape
fn mandelbrot(position: vec2f) -> f32 {
    const maxIterations: u32 = 100;

    var current: vec2f = vec2f(0.0);
    for (var i: u32 = 0; i < maxIterations; i++) {
        current = quadraticMap(current, position);
        if dot(current, current) > 4.0 {
            return f32(i) / f32(maxIterations);
        }
    }
    return 1.0;
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

// <DEBUG>

// Step 3: Add the debug buffer
struct DebugData {
    debug_position: vec2u,
    length: atomic<u32>,
    data: array<u32>,
}
@group(0) @binding(99) var<storage, read_write> debug_data: DebugData;

// Step 3: Write a `print(value: u32)` function that writes to the debug buffer.
fn print_u32(line: u32, variable_id: u32, value: u32) {
    if is_debug {
        let index = atomicAdd(&debug_data.length, 3);
        debug_data.data[index] = line;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = value;
    }
}
fn print_f32(line: u32, variable_id: u32, value: f32) {
    print_u32(line, variable_id, bitcast<u32>(value));
}
fn print_vec2f(line: u32, variable_id: u32, value: vec2f) {
    if is_debug {
        let index = atomicAdd(&debug_data.length, 4);
        debug_data.data[index] = line;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = bitcast<u32>(value.x);
        debug_data.data[index + 3] = bitcast<u32>(value.y);
    }
}

// Step 4: Add the `is_debug` variable
var<private> is_debug: bool;