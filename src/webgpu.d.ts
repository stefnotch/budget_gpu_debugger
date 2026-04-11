interface GPUBufferUsage {
    readonly MAP_READ: GPUFlagsConstant;
    readonly MAP_WRITE: GPUFlagsConstant;
    readonly COPY_SRC: GPUFlagsConstant;
    readonly COPY_DST: GPUFlagsConstant;
    readonly INDEX: GPUFlagsConstant;
    readonly VERTEX: GPUFlagsConstant;
    readonly UNIFORM: GPUFlagsConstant;
    readonly STORAGE: GPUFlagsConstant;
    readonly INDIRECT: GPUFlagsConstant;
    readonly QUERY_RESOLVE: GPUFlagsConstant;
}

declare var GPUBufferUsage: GPUBufferUsage;

interface HTMLCanvasElement {
    getContext(
        contextId: "webgpu",
    ): GPUCanvasContext | null;
}

interface GPUMapMode {
    readonly READ: GPUFlagsConstant;
    readonly WRITE: GPUFlagsConstant;
}

declare var GPUMapMode: GPUMapMode;
