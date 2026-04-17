export let device = await getGpuDevice();

/** WebGPU setup, while allowing for hot reloading */
async function getGpuDevice(): Promise<GPUDevice> {
  if (import.meta.hot) {
    if (import.meta.hot.data.device) {
      return import.meta.hot.data.device;
    }
  }

  // WebGPU setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice({
    label: "GPU Device",
  })!;
  if (!device) {
    alert("Browser doesn't support WebGPU");
  }
  // End of the usual WebGPU setup

  if (import.meta.hot) {
    import.meta.hot.data.device = device;
  }
  return device;
}

if (import.meta.hot) {
  import.meta.hot
    .accept((newModule) => {
      if (newModule) {
        device = newModule.device;
      }
    });
}
