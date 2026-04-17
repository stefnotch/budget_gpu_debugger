import { device } from "./gpu";
import "./style.css";
import shaderString from "./shader.wgsl?raw";

function drawUI(annotations: string[], currentLine: number | null) {
  const codeInput = document.querySelector<HTMLPreElement>(".input")!;
  codeInput.innerHTML = ""; // Clear existing content

  // Draw the shader code with annotations
  shaderString.split("\n").forEach((line, i) => {
    if (i == currentLine) {
      const highlightSpan = document.createElement("span");
      highlightSpan.classList.add("highlight-annotation");
      codeInput.append(highlightSpan);
      highlightSpan.scrollIntoView({ block: "nearest" });
    }

    const codeSpan = document.createElement("span");
    codeSpan.innerText = line;
    codeInput.append(codeSpan);

    if (annotations[i]) {
      const annotationSpan = document.createElement("span");
      annotationSpan.classList.add("annotation");
      annotationSpan.innerText = annotations[i];
      codeInput.append(annotationSpan);
    }

    codeInput.append(document.createElement("br"));
  });
}
drawUI([], null);

function drawErrorsUI(info: GPUCompilationInfo) {
  const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;
  errorsOutput.innerText = "";
  for (const message of info.messages) {
    errorsOutput.innerText += message.message + "\n";
  }
  if (info.messages.length > 0) {
    errorsOutput.style.display = "initial";
  } else {
    errorsOutput.style.display = "none";
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const stepBackwardsButton = document.querySelector<HTMLButtonElement>(
  ".step-backwards",
)!;
const stepForwardsButton = document.querySelector<HTMLButtonElement>(
  ".step-forwards",
)!;

const context = canvas.getContext("webgpu")!;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format: presentationFormat });

type AppState = {
  id: "editing";
} | {
  id: "request-debug";
  position: [number, number];
} | {
  id: "debugging";
  step: number;
  data: ArrayBuffer;
};
let state: AppState = { id: "editing" };

let variablesById: Variable[] = [];

const DEBUG_SIZE = 10000;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC |
    GPUBufferUsage.COPY_DST,
});
const debugReadBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
function writeDebug() {
  if (state.id == "request-debug") {
    device.queue.writeBuffer(
      debugBuffer,
      0,
      new Uint32Array([state.position[0], state.position[1], 1, 0]),
    );
  } else {
    device.queue.writeBuffer(debugBuffer, 0, new Uint32Array([0, 0, 0, 0]));
  }
}
async function readDebug() {
  await debugReadBuffer.mapAsync(GPUMapMode.READ);
  const results = debugReadBuffer.getMappedRange();
  const header = new Uint32Array(results.slice(0, 16));
  const length = header[3];
  if (state.id === "debugging") {
    state.data = results.slice(16, 16 + 4 * length);
  }
  debugReadBuffer.unmap();
}
function renderDebug() {
  if (state.id !== "debugging") {
    return;
  }
  const debugDataU32 = new Uint32Array(state.data);
  const debugDataFloat = new Float32Array(state.data);

  const outputLines: string[] = []; // Javascript allows for arrays with holes

  let step = 0;
  let i = 0;
  let scrollToLine: number | null = null;
  while (i < debugDataU32.length) {
    const lineNumber = debugDataU32[i++];
    const variableId = debugDataU32[i++];
    const variable = variablesById[variableId];

    let value = "";
    if (variable.type === "u32") {
      value = "" + debugDataU32[i++];
    } else if (variable.type === "f32") {
      value = "" + debugDataFloat[i++];
    } else if (variable.type === "vec2f") {
      value = "" + debugDataFloat[i++] + ", " + debugDataFloat[i++];
    } else {
      console.error("Unknown type", variable.type);
      break;
    }

    outputLines[lineNumber] = variable.name + " = " + value;

    step += 1;
    if (step > state.step) {
      scrollToLine = lineNumber;
      break;
    }
  }

  drawUI(outputLines, scrollToLine);
}
stepForwardsButton.onclick = () => {
  if (state.id === "debugging") {
    state.step += 1;
    renderDebug();
  }
};
stepBackwardsButton.onclick = () => {
  if (state.id === "debugging") {
    state.step = Math.max(0, state.step - 1);
    renderDebug();
  }
};

canvas.onclick = (event) => {
  state = { id: "request-debug", position: [event.offsetX, event.offsetY] };
};

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
  let vertexShader = device.createShaderModule({
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

  const module = device.createShaderModule({
    code: fragmentShader,
  });
  module.getCompilationInfo().then((info) => drawErrorsUI(info));

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
let pipeline = createRenderPipeline(shaderString);

interface Variable {
  name: string;
  type: string;
  id: number;
  line: number;
}

function createDebugRenderPipeline(fragmentShader: string) {
  const lines = fragmentShader.split("\n");
  const outputLines: string[] = []; // Javascript allows for arrays with holes

  const variables = new Map<string, Variable>();
  variablesById.length = 0;

  let scopeCounter = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("{")) {
      scopeCounter += 1;
    } else if (line.includes("}")) {
      scopeCounter -= 1;
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
        outputLines[i] = (outputLines[i] ?? "") + debugCall;
      }
    }
  }

  drawUI(outputLines, null);

  return createRenderPipeline(lines.join("\n"));
}

createDebugRenderPipeline(shaderString);

function render() {
  let renderPipeline = pipeline;
  if (state.id === "request-debug") {
    renderPipeline = createDebugRenderPipeline(shaderString);
    writeDebug();
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

  if (state.id === "request-debug") {
    encoder.copyBufferToBuffer(debugBuffer, debugReadBuffer);
  }

  device.queue.submit([
    encoder.finish(),
  ]);

  if (state.id === "request-debug") {
    state = {
      id: "debugging",
      step: 0,
      data: new ArrayBuffer(),
    };
    writeDebug();

    readDebug().then(() => renderDebug()); // happens async
  }

  requestAnimationFrame(render);
}

render();
