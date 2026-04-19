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

    // Step 2: Use the `time` variable
    let pos: vec2f = input.uv - 0.5;
    let angle: f32 = atan2(pos.y, pos.x) + 0.0003 * uniforms.time;
    print_f32(15, 1, angle);
    let t: f32 = sin(30. * (length(pos) + 0.2 * angle));
    return vec4(vec3f(t), 1);
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