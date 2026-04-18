import { device } from "./gpu.ts";
import shaderString from "./shader.wgsl?raw";
import { drawUI } from "./ui.ts";

const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const context = canvas.getContext("webgpu")!;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format: presentationFormat });

// Create the buffers we need
const uniformBuffer = device.createBuffer({
  size: 4 * 4,
  usage: GPUBufferUsage.UNIFORM |
    GPUBufferUsage.COPY_DST,
});

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

// Describe our shader's data layout
const bindGroupLayout0 = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "uniform",
      },
    },
    {
      binding: 99,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: {
        type: "storage",
      },
    },
  ],
});

// And bind it
const bindGroup0 = device.createBindGroup({
  layout: bindGroupLayout0,
  entries: [
    { binding: 0, resource: uniformBuffer },
    { binding: 99, resource: debugBuffer },
  ],
});

// Create the rendering pipeline
function createRenderPipeline(fragmentShader: string) {
  const vertexShader = device.createShaderModule({
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

type AppState = {
  id: "running";
} | {
  id: "request-debug";
  position: [number, number];
} | {
  id: "debugging";
  step: number;
  data: ArrayBuffer;
};
let state: AppState = { id: "running" };
canvas.onclick = (event) => {
  state = { id: "request-debug", position: [event.offsetX, event.offsetY] };
};

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

let variablesById: Variable[] = [];
function renderDebugUI() {
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
const stepForwardsButton = document.querySelector<HTMLButtonElement>(
  ".step-forwards",
)!;
stepForwardsButton.onclick = () => {
  if (state.id === "debugging") {
    state.step += 1;
    renderDebugUI();
  }
};
const stepBackwardsButton = document.querySelector<HTMLButtonElement>(
  ".step-backwards",
)!;
stepBackwardsButton.onclick = () => {
  if (state.id === "debugging") {
    state.step = Math.max(0, state.step - 1);
    renderDebugUI();
  }
};

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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

const startTime = performance.now();
function render(time: DOMHighResTimeStamp) {
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    new Float32Array([time - startTime]),
  );

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

    readDebug().then(() => renderDebugUI()); // happens async
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
