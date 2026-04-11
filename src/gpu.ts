const adapter = await navigator.gpu.requestAdapter();
export const device = await adapter?.requestDevice()!;
if (!device) {
  alert("Browser doesn't support WebGPU");
}

export const vertexShader = device.createShaderModule({
  code: /* wgsl */ `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}
// See https://webgpufundamentals.org/webgpu/lessons/webgpu-post-processing.html
@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VertexOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.uv = xy * vec2f(0.5, -0.5) + vec2f(0.5);
  return vsOutput;
}`,
});

export function debounce<T extends Function>(cb: T, wait = 1000) {
  let h = 0;
  let callable = (...args: any) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return callable as any as T;
}
