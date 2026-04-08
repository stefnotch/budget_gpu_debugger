import { device } from "./gpu.ts";
import { drawUI, drawDebugUI, type Variable } from "./ui.ts";
import vertexShaderString from "./vertex-shader.wgsl?raw";
import fragmentShaderString from "./fragment-shader.wgsl?raw";

// Setup code

const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const context = canvas.getContext("webgpu")!;
context.configure({ device, format: presentationFormat });

// Step 2: Create the uniform buffer
// Step 3: Create the debug buffers

// Step 2: Modify the bind group and layout to include the uniform buffer
// Step 3: Add the debug buffer to the layout
const bindGroupLayout0 = device.createBindGroupLayout({
  entries: [],
});
const bindGroup0 = device.createBindGroup({
  layout: bindGroupLayout0,
  entries: [],
});

function createRenderPipeline(fragmentShader: string): GPURenderPipeline {
  // Step 1: Create a vertex shader that draws a single triangle that covers the screen.
  const vertexShader = null as any;

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout0],
    }),
    vertex: { module: vertexShader },
    fragment: {
      module: device.createShaderModule({ code: fragmentShader }),
      targets: [{ format: presentationFormat }],
    },
  });
}

// Step 1: Call createRenderPipeline with the fragmentShaderString
const pipeline = null;

/** A shader instrumented with debugging function calls. */
interface InstrumentedShader {
  code: string;
  variables: Variable[];
}
function instrumentShader(fragmentShader: string): InstrumentedShader {
  // Step 7: Shader instrumentation
  const variables: Variable[] = [];
  const lines = fragmentShader.split("\n");

  return {
    code: lines.join("\n"),
    variables,
  };
}

// Step 7: Create the instrumented render pipeline
const instrumented = instrumentShader(fragmentShaderString);
const debugPipeline = null;

const debugData = {
  data: new ArrayBuffer(0),
  // Step 7: Change this to `variables: instrumented.variables`
  variables: [
    { id: 0, name: "pos", type: "vec2f" },
    { id: 1, name: "angle", type: "f32" },
    { id: 2, name: "t", type: "f32" },
  ] satisfies Variable[],
  step: 0,
};

// When we click on a pixel, we want to debug that pixel
let requestDebug: [number, number] | null = null;
canvas.onclick = (event) => {
  requestDebug = [event.offsetX, event.offsetY];
};

// Step 8: Add the click handlers for the step buttons

// This starts the rendering loop
let frameId = requestAnimationFrame(render);

function render(time: DOMHighResTimeStamp) {
  // Step 2: Update the time

  // Step 4: Write to the debug buffer

  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  // Step 1:
  // Set the pipeline and the bind group
  // Then draw 3 vertices for our fullscreen triangle
  // Finally, end the render pass

  if (requestDebug != null) {
    // Step 3: Copy to our CPU readable buffer
  }

  device.queue.submit([encoder.finish()]);

  if (requestDebug != null) {
    // Step 3: Read the data to the CPU into debugData.data
  }

  frameId = requestAnimationFrame(render);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
  });
}
