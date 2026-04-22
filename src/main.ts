import { device } from "./gpu.ts";
import "./ui.ts";
import vertexShaderString from "./vertex-shader.wgsl?raw";
import fragmentShaderString from "./fragment-shader.wgsl?raw";
import debugDrawShaderString from "./debug-draw-shader.wgsl?raw";
import fontTextureUrl from "./font.png";
// Setup code

const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const context = canvas.getContext("webgpu")!;
context.configure({ device, format: presentationFormat });

// Step 2: Create the uniform buffer
const uniformBuffer = device.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// Step 3: Create the debug buffers
const DEBUG_SIZE = 10000 * 32;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT,
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

const fontImage = await fetch(fontTextureUrl)
  .then((response) => response.blob())
  .then((blob) => createImageBitmap(blob));
const fontTexture = device.createTexture({
  label: "Font Texture",
  size: [fontImage.width, fontImage.height],
  format: "r8unorm",
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});
device.queue.copyExternalImageToTexture({ source: fontImage }, { texture: fontTexture }, [
  fontImage.width,
  fontImage.height,
]);

const fontSampler = device.createSampler({
  minFilter: "nearest",
  magFilter: "nearest",
  mipmapFilter: "nearest",
});

const debugBindGroupLayout0 = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    {
      binding: 2,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: "read-only-storage" },
    },
  ],
});
const debugBindGroup0 = device.createBindGroup({
  layout: debugBindGroupLayout0,
  entries: [
    { binding: 0, resource: fontTexture.createView() },
    { binding: 1, resource: fontSampler },
    { binding: 2, resource: debugBuffer },
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

function createDebugRenderPipeline(): GPURenderPipeline {
  // Step 1: Create a vertex shader that draws a single triangle that covers the screen.
  const shaderModule = device.createShaderModule({ code: debugDrawShaderString });

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [debugBindGroupLayout0],
    }),
    vertex: { module: shaderModule },
    fragment: {
      module: shaderModule,
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              operation: "add",
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
            },
            alpha: {
              operation: "add",
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
            },
          },
        },
      ],
    },
  });
}

const debugDrawPipeline = createDebugRenderPipeline();

// This starts the rendering loop
let frameId = requestAnimationFrame(render);

function render(time: DOMHighResTimeStamp) {
  // Step 2: Update the time and size
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    new Float32Array([time, 0, canvas.width, canvas.height]),
  );

  // Step 4: Write to the debug buffer
  device.queue.writeBuffer(
    debugBuffer,
    0,
    new Uint32Array([
      6, // vertex_count
      0, // instance_count
      0, // first_vertex
      0, // first_instance
    ]),
  );

  const encoder = device.createCommandEncoder();

  const view = context.getCurrentTexture().createView();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view,
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

  const debugPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view,
        loadOp: "load",
        storeOp: "store",
      },
    ],
  });
  // Now do the debug drawing
  debugPass.setPipeline(debugDrawPipeline);
  debugPass.setBindGroup(0, debugBindGroup0);
  // Then draw the debug objects via indirect draw
  debugPass.drawIndirect(debugBuffer, 0);
  debugPass.end();

  device.queue.submit([encoder.finish()]);

  frameId = requestAnimationFrame(render);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
  });
}
