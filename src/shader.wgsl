@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    let my_data: u32 = u32(input.position.x);

    is_debug = debug_data.debug_enabled != 0 && 
        all(debug_data.debug_position == vec2u(input.position.xy));

    if all(floor(input.position.xy) == vec2f(10, 10)) {
        return vec4(1, 0, 0, 1);
    }

    dbg_u32(12, 3, my_data);

    return vec4(0.3, 1, 0, 1);
}

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
fn dbg_vec2f(line_number: u32, variable_id: u32, variable_value: vec2f) {
    if is_debug {
        let index = atomicAdd(&debug_data.index, 4);
        debug_data.data[index] = line_number;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = bitcast<u32>(variable_value.x);
        debug_data.data[index + 3] = bitcast<u32>(variable_value.y);
    }
}