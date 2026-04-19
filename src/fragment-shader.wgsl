// Step 2: Add a uniform buffer with the time
struct Uniforms {
    time: f32,
}
@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
    // Step 4: Set the `is_debug` variable

    // Step 3: Call the print function

    // Step 2: Use the `time` variable
    let pos: vec2f = input.uv - 0.5;
    let angle: f32 = atan2(pos.y, pos.x) + 0.0003 * uniforms.time;
    let t: f32 = sin(30. * (length(pos) + 0.2 * angle));
    return vec4(vec3f(t), 1);
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

// <DEBUG>

// Step 3: Add the debug buffer

// Step 3: Write a `print(value: u32)` function that writes to the debug buffer.

// Step 4: Add the `is_debug` variable