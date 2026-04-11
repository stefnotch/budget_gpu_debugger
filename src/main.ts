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
const variablesById: Variable[] = [];
async function readDebug() {
  await debugReadBuffer.mapAsync(GPUMapMode.READ);
  const results = new Uint32Array(debugReadBuffer.getMappedRange());

  const length = results[3];
  const debugData = results.slice(4, 4 + length);
  const debugDataFloat = new Float32Array(debugData.buffer);

  const outputLines: string[] = []; // Javascript allows for arrays with holes

  let i = 0;
  while (i < debugData.length) {
    const lineNumber = debugData[i++];
    const variableId = debugData[i++];
    const variable = variablesById[variableId];

    let value = "";
    if (variable.type === "u32") {
      value = "" + debugData[i++];
    } else if (variable.type === "f32") {
      value = "" + debugDataFloat[i++];
    } else if (variable.type === "vec2f") {
      value = "" + debugDataFloat[i++] + ", " + debugDataFloat[i++];
    } else {
      console.error("Unknown type", variable.type);
      break;
    }

    outputLines[lineNumber] = variable.name + " = " + value;
  }

  codeOutput.innerText = outputLines.join("\n");

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
  name: string;
  type: string;
  id: number;
  line: number;
}

function createDebugRenderPipeline() {
  const code = codeInput.innerText;

  const lines = code.split("\n");
  const outputLines: string[] = []; // Javascript allows for arrays with holes

  const variables = new Map<string, Variable>();
  variablesById.length = 0;

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
      const variable: Variable = {
        name: variableMatch.groups!["name"],
        type: variableMatch.groups!["type"],
        id: variablesById.length,
        line: i,
      };
      variables.set(variable.name, variable);
      variablesById.push(variable);
      debugVariable = variable.name;
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
        const debugCall =
          `dbg_${variable.type}(${i},${variable.id},${debugVariable});`;
        lines[i] = line + " " + debugCall;
        outputLines[i] = debugCall;
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
