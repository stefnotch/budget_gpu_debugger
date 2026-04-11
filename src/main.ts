import { debounce, device, vertexShader } from "./gpu";
import "./style.css";
import shaderString from "./shader.wgsl?raw";

const codeInput = document.querySelector<HTMLPreElement>(".input")!;
const codeOutput = document.querySelector<HTMLPreElement>(".output")!;
const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;
const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const debugButton = document.querySelector<HTMLButtonElement>(".debug-button")!;

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

//
let debugPosition = [0, 0];
let isDebug = false;
debugButton.addEventListener("click", () => {
  isDebug = true;
});
function writeDebug() {
  device.queue.writeBuffer(
    debugBuffer,
    0,
    new Uint32Array([debugPosition[0], debugPosition[1], isDebug ? 1 : 0, 0]),
  );
}
const DEBUG_SIZE = 10000;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC |
    GPUBufferUsage.COPY_DST,
});
writeDebug();
const debugReadBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
async function readDebug() {
  await debugReadBuffer.mapAsync(GPUMapMode.READ);
  const results = new Uint32Array(debugReadBuffer.getMappedRange());

  const length = results[3];
  const debugData = results.slice(4, 4 + length);

  codeOutput.innerText = "" + debugData;

  debugReadBuffer.unmap();
}

const bindGroup0 = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: debugBuffer },
  ],
});

function render() {
  let wasDebug = isDebug;
  if (isDebug) {
    writeDebug();
    isDebug = false;
  }

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

  if (wasDebug) {
    encoder.copyBufferToBuffer(debugBuffer, debugReadBuffer);
  }

  device.queue.submit([
    encoder.finish(),
  ]);

  if (wasDebug) {
    writeDebug();
    readDebug(); // happens async
  }

  requestAnimationFrame(render);
}

render();
