export let device = await getGpuDevice();

async function getGpuDevice(): Promise<GPUDevice> {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice({
    label: "GPU Device",
  })!;
  if (!device) {
    alert("Browser doesn't support WebGPU");
  }
  return device;
}
