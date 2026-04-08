declare namespace GPUBufferUsage {
  const MAP_READ: 0x0001;
  const MAP_WRITE: 0x0002;
  const COPY_SRC: 0x0004;
  const COPY_DST: 0x0008;
  const INDEX: 0x0010;
  const VERTEX: 0x0020;
  const UNIFORM: 0x0040;
  const STORAGE: 0x0080;
  const INDIRECT: 0x0100;
  const QUERY_RESOLVE: 0x0200;
}

declare namespace GPUColorWrite {
  const RED: 0x1;
  const GREEN: 0x2;
  const BLUE: 0x4;
  const ALPHA: 0x8;
  const ALL: 0xf;
}

declare namespace GPUMapMode {
  const READ: 0x0001;
  const WRITE: 0x0002;
}

declare namespace GPUShaderStage {
  const VERTEX: 0x1;
  const FRAGMENT: 0x2;
  const COMPUTE: 0x4;
}

declare namespace GPUTextureUsage {
  const COPY_SRC: 0x01;
  const COPY_DST: 0x02;
  const TEXTURE_BINDING: 0x04;
  const STORAGE_BINDING: 0x08;
  const RENDER_ATTACHMENT: 0x10;
  const TRANSIENT_ATTACHMENT: 0x20;
}

interface HTMLCanvasElement {
  getContext(contextId: "webgpu"): GPUCanvasContext | null;
}
