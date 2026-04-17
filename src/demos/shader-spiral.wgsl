@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    is_debug = debug_data.debug_enabled != 0 && 
        all(debug_data.debug_position == vec2u(input.position.xy));

    let pos: vec2f = input.uv - 0.5;
    let angle: f32 = atan2(pos.y, pos.x);
    let t: f32 = sin(30. * (length(pos) + 0.2 * angle));
    return vec4(vec3f(t), 1);
}

// ignore
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}
struct DebugData {
    debug_position: vec2u,
    debug_enabled: u32,
    length: atomic<u32>,
    data: array<u32>,
}
@group(0) @binding(0) var<storage, read_write> debug_data: DebugData;
var<private> is_debug: bool;
fn dbg_u32(line_number: u32, variable_id: u32, variable_value: u32) {
    if is_debug {
        let index = atomicAdd(&debug_data.length, 3);
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
        let index = atomicAdd(&debug_data.length, 4);
        debug_data.data[index] = line_number;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = bitcast<u32>(variable_value.x);
        debug_data.data[index + 3] = bitcast<u32>(variable_value.y);
    }
}