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
const uniformBuffer = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// Step 3: Create the debug buffers
const DEBUG_SIZE = 10000;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
});
const debugReadBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});

// Step 2: Modify the bind group and layout to include the uniform buffer
// Step 3: Add the debug buffer to the layout
const bindGroupLayout0 = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    { binding: 99, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "storage" } },
  ],
});
const bindGroup0 = device.createBindGroup({
  layout: bindGroupLayout0,
  entries: [
    { binding: 0, resource: uniformBuffer },
    { binding: 99, resource: debugBuffer },
  ],
});

function createRenderPipeline(fragmentShader: string): GPURenderPipeline {
  // Step 1: Create a vertex shader that draws a single triangle that covers the screen.
  const vertexShader = device.createShaderModule({ code: vertexShaderString });

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
const pipeline = createRenderPipeline(fragmentShaderString);

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
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));

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
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup0);
  // Then draw 3 vertices for our fullscreen triangle
  pass.draw(3);
  // Finally, end the render pass
  pass.end();

  if (requestDebug != null) {
    // Step 3: Copy to our CPU readable buffer
    encoder.copyBufferToBuffer(debugBuffer, debugReadBuffer);
  }

  device.queue.submit([encoder.finish()]);

  if (requestDebug != null) {
    // Step 3: Read the data to the CPU into debugData.data
    debugReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
      const buf = debugReadBuffer.getMappedRange();
      const header = new Uint32Array(buf.slice(0, 12));
      const length = header[2];
      const data = buf.slice(12, 12 + 4 * length);
      console.log(new Uint32Array(data)); // Step 5: Store and draw the debug data
      debugReadBuffer.unmap();
    });
    requestDebug = null;
  }

  frameId = requestAnimationFrame(render);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
  });
}
