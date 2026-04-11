import { debounce, device, vertexShader } from "./gpu";
import "./style.css";
import shaderString from "./shader.wgsl?raw";

const codeInput = document.querySelector<HTMLPreElement>(".input")!;
const codeOutput = document.querySelector<HTMLPreElement>(".output")!;
const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;
const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;

codeInput.innerText = shaderString;

const context = canvas.getContext("webgpu")!;
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

const DEBUG_SIZE = 10000;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC |
    GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(debugBuffer, 0, new Uint32Array([0, 0, 0, 0]));
const debugReadBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
const bindGroup0 = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: debugBuffer },
  ],
});

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
  pass.setBindGroup(0, bindGroup0);
  pass.draw(3);
  pass.end();

  device.queue.submit([
    encoder.finish(),
  ]);

  requestAnimationFrame(render);
}

render();
