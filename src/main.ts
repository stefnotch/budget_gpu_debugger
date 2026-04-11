import { debounce, device, vertexShader } from "./gpu";
import "./style.css";

const codeInput = document.querySelector<HTMLPreElement>(".input")!;
const codeOutput = document.querySelector<HTMLPreElement>(".output")!;
const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;
const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;

codeInput.innerText = /* wgsl */ `@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
  let frame = 3;
  return vec4(1, sin(f32(frame) / 128), 0, 1);
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}
`;

const context = canvas.getContext("webgpu") as GPUCanvasContext;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format: presentationFormat });

function loadUserShader() {
  const module = device.createShaderModule({
    code: codeInput.innerText,
  });
  module.getCompilationInfo().then((info) => {
    errorsOutput.innerText = "";
    for (const message of info.messages) {
      errorsOutput.innerText += message.message + "\n";
    }
  });

  return device.createRenderPipeline({
    layout: "auto",
    vertex: { module: vertexShader },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
}

let pipeline = loadUserShader();
codeInput.addEventListener(
  "input",
  debounce(() => {
    pipeline = loadUserShader();
  }, 1000),
);

function render() {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: [0, 0, 0, 1],
      loadOp: "clear",
      storeOp: "store",
    }],
  });

  pass.setPipeline(pipeline);
  // binding things will go here
  pass.draw(3);
  pass.end();

  device.queue.submit([
    encoder.finish(),
  ]);

  requestAnimationFrame(render);
}

render();
