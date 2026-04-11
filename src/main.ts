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

canvas.addEventListener("click", (event) => {
  debugPosition = [event.offsetX, event.offsetY];
  isDebug = true;
});

const bindGroupLayout0 = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "storage",
      },
    },
  ],
});
const bindGroup0 = device.createBindGroup({
  layout: bindGroupLayout0,
  entries: [
    { binding: 0, resource: debugBuffer },
  ],
});

function createRenderPipeline(fragmentShader: string) {
  const module = device.createShaderModule({
    code: fragmentShader,
  });
  module.getCompilationInfo().then((info) => {
    errorsOutput.innerText = "";
    for (const message of info.messages) {
      errorsOutput.innerText += message.message + "\n";
    }
  });

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout0],
    }),
    vertex: { module: vertexShader },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
}
let pipeline = createRenderPipeline(codeInput.innerText);
codeInput.addEventListener(
  "input",
  debounce(() => {
    pipeline = createRenderPipeline(codeInput.innerText);
  }, 1000),
);

interface Variable {
  type: string;
  id: number;
  line: number;
}

function createDebugRenderPipeline() {
  const code = codeInput.innerText;

  const lines = code.split("\n");
  const outputLines = Array(lines.length).fill("");

  const variables = new Map<string, Variable>();

  let scopeCounter = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("{")) {
      outputLines[i] = "  ".repeat(scopeCounter) + "{";
      scopeCounter += 1;
    } else if (line.includes("}")) {
      scopeCounter -= 1;
      outputLines[i] = "  ".repeat(scopeCounter) + "}";
    }

    if (line.includes("// ignore")) {
      break;
    }

    let debugVariable = "";

    // Variable declarations
    const variableMatch = line.match(
      /(let|var|const) (?<name>[a-zA-Z0-9_]+) ?: ?(?<type>[a-zA-Z0-9_]+)/,
    );
    if (variableMatch !== null) {
      const name = variableMatch.groups!["name"];
      const type = variableMatch.groups!["type"];
      variables.set(name, {
        type,
        id: variables.size,
        line: i,
      });
      debugVariable = name;
    }

    // Variable assignments
    const assignmentMatch = line.match(/^ *(?<name>[a-zA-Z0-9_]+) ?= ?/);
    if (!variableMatch && assignmentMatch !== null) {
      const name = assignmentMatch.groups!["name"];
      debugVariable = name;
    }

    if (debugVariable != "" && variables.has(debugVariable)) {
      const variable = variables.get(debugVariable)!;
      const isKnownType = ["u32", "f32", "vec2f"].includes(
        variable.type,
      );
      if (isKnownType) {
        lines[i] = line +
          ` dbg_${variable.type}(${i},${variable.id},${debugVariable});`;
        outputLines[i] = lines[i];
      }
    }
  }

  codeOutput.innerText = outputLines.join("\n");

  return createRenderPipeline(lines.join("\n"));
}

createDebugRenderPipeline();

function render() {
  const wasDebug = isDebug;
  let renderPipeline = pipeline;
  if (isDebug) {
    renderPipeline = createDebugRenderPipeline();
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

  pass.setPipeline(renderPipeline);
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
