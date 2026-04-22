// Step 2: Add a uniform buffer with the time
struct Uniforms {
    time: f32,
    _pad0: f32,
    size: vec2f,
}
@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    let screen_pos = vec2u(input.uv * uniforms.size);
    let one_pixel = 1.0 / uniforms.size;

    let pos: vec2f = input.uv - 0.5;
    let angle: f32 = atan2(pos.y, pos.x) + 0.0003 * uniforms.time;
    let t: f32 = sin(30. * (length(pos) + 0.2 * angle));

    let spacing = 30u;
    if (screen_pos.x % spacing == 15u) && (screen_pos.y % spacing == 15u) {
        debug_draw_circle(input.uv, 10 * one_pixel, vec4f(1, 0, 0, 1));
    }

    return vec4(vec3f(t), 1);
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

// <DEBUG>

// Step 3: Add the debug buffer
struct DebugDraw {
    indirect_draw: DrawIndirectArgs,
    data: array<DebugDrawObject>,
}
/// Arguments for indirect draw calls
struct DrawIndirectArgs {
    vertex_count: u32,
    /// Number of objects
    instance_count: atomic<u32>,
    first_vertex: u32,
    first_instance: u32,
}
struct DebugDrawObject {
    /// 0 = line, 1 = rect, 2 = circle, 3 = text, etc
    kind: u32,
    /// Packed color
    color: u32,
    position: vec2f,
    size: vec2f,
}

@group(0) @binding(99) var<storage, read_write> debug_draw: DebugDraw;

fn debug_draw_line(a: vec2f, b: vec2f, color: vec4f) {
    let index = atomicAdd(&debug_draw.indirect_draw.instance_count, 1);
    debug_draw.data[index] = DebugDrawObject(0, pack4x8unorm(color), a, b);
}
fn debug_draw_circle(position: vec2f, size: vec2f, color: vec4f) {
    let index = atomicAdd(&debug_draw.indirect_draw.instance_count, 1);
    debug_draw.data[index] = DebugDrawObject(1, pack4x8unorm(color), position, size);
}
fn debug_draw_rect(a: vec2f, b: vec2f, color: vec4f) {
    let index = atomicAdd(&debug_draw.indirect_draw.instance_count, 1);
    debug_draw.data[index] = DebugDrawObject(2, pack4x8unorm(color), a, b);
}
fn debug_draw_char(position: vec2f, value: u32, size: f32, color: vec4f) {
    let index = atomicAdd(&debug_draw.indirect_draw.instance_count, 1);
    debug_draw.data[index] = DebugDrawObject(3, pack4x8unorm(color), position, vec2f(f32(size), f32(value)));
}
fn debug_draw_float(position: vec2f, value: f32, size: f32, color: vec4f) {
    // Draw from back to front, because that's easier.
    let OFFSET = vec2f(-1 * size, 0);
    var pos = position;

    var small = u32(round(fract(abs(value)) * 1e3));
    // draw up to 3 digits after the decimal
    if small > 0 {
        for (var i = 0; i < 3 && small > 0; i++) {
            let digit = small % 10;
            small /= 10;
            debug_draw_char(pos, digit, size, color);
            pos += OFFSET;
        }
        debug_draw_char(pos, 10, size, color);
        pos += OFFSET;
    }
    var big = u32(abs(value));
    if big == 0 {
        debug_draw_char(pos, 0, size, color);
    }
    // draw up to 10 digits before the decimal
    for (var i = 0; i < 10 && big > 0; i++) {
        let digit = big % 10;
        big /= 10;
        debug_draw_char(pos, digit, size, color);
        pos += OFFSET;
    }
    // oversized numbers
    if abs(value) > 4294967295 || big > 0 {
        debug_draw_char(pos, 10, size, color);
        pos += OFFSET;
        debug_draw_char(pos, 10, size, color);
        pos += OFFSET;
    }
    // sign
    if value < 0 {
        debug_draw_char(pos, 11, size, color);
        pos += OFFSET;
    }
}
