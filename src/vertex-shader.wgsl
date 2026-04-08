struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}
// See https://webgpufundamentals.org/webgpu/lessons/webgpu-post-processing.html
@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array(
        vec2f(-1.0, -1.0),
        vec2f(-1.0, 3.0),
        vec2f(3.0, -1.0),
    );

    var vsOutput: VertexOutput;
    let xy = pos[vertexIndex];
    vsOutput.position = vec4f(xy, 0.0, 1.0);
    vsOutput.uv = xy * vec2f(0.5, -0.5) + vec2f(0.5);
    return vsOutput;
}