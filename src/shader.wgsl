@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    let my_data: u32 = u32(input.position.x);

    is_debug = debug_data.debug_enabled != 0 && 
        all(debug_data.debug_position == vec2u(input.position.xy));

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

// ignore
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}
struct DebugData {
    debug_position: vec2u,
    debug_enabled: u32,
    index: atomic<u32>,
    data: array<u32>,
}
@group(0) @binding(0) var<storage, read_write> debug_data: DebugData;
var<private> is_debug: bool;
fn dbg_u32(line_number: u32, variable_id: u32, variable_value: u32) {
    if is_debug {
        let index = atomicAdd(&debug_data.index, 3);
        debug_data.data[index] = line_number;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = variable_value;
    }
}
fn dbg_f32(line_number: u32, variable_id: u32, variable_value: f32) {
    dbg_u32(line_number, variable_id, bitcast<u32>(variable_value));
}
fn dbg_vec2f(line_number: u32, variable_id: u32, variable_value: vec2f) {
    if is_debug {
        let index = atomicAdd(&debug_data.index, 4);
        debug_data.data[index] = line_number;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = bitcast<u32>(variable_value.x);
        debug_data.data[index + 3] = bitcast<u32>(variable_value.y);
    }
}