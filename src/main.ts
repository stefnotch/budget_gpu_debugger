import { device } from "./gpu.ts";
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

// Step 2: Modify the bind group and layout to include the uniform buffer
// Step 3: Add the debug buffer to the layout
const bindGroupLayout0 = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    },
  ],
});
const bindGroup0 = device.createBindGroup({
  layout: bindGroupLayout0,
  entries: [{ binding: 0, resource: uniformBuffer }],
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

  device.queue.submit([encoder.finish()]);

  frameId = requestAnimationFrame(render);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
  });
}
