@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    let frame = 3;

    is_debug = debug_data.debug_enabled != 0 && 
        all(debug_data.debug_position == vec2u(input.position.xy));

    if all(floor(input.position.xy) == vec2f(10, 10)) {
        return vec4(1, 0, 0, 1);
    }

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