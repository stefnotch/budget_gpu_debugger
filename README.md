# Budget GPU Debugger

[View the slides here](https://docs.google.com/presentation/d/1QWLXn2W8pAabUf2Le3L1YfJ80W6FlX3SjuLjWaEVH0Q/edit?usp=sharing)

![Screenshot](./screenshot.webp)

## Setup

Open this in your favourite code editor. I recommend VSCode with [wgsl-analyzer](https://github.com/wgsl-analyzer/wgsl-analyzer).

Then run `npm install` (or `pnpm install`) to install the dependencies.

Finally, to start up the website, run `npm start`.

For this tutorial, you will edit
- the `main.ts` file
- the `ui.ts` file
- the `fragment-shader.wgsl` with the shader code and the instrumentation helpers

We'll take a tour through the other files. Especially `ui.ts` exports a useful `drawUI` function.

## Step 1

We'll review the fundamentals of WebGPU first. We want to draw a triangle that covers the entire screen. Edit the `./src/main.ts` file to use the `./src/vertex-shader.wgsl`. You can always look for `Step 1:` comments.

> Once you are done, you should be able to edit `./src/fragment-shader.wgsl`, hit save and have the website immediately update.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-1

## Step 2

We want a beautiful, moving shader. Add a uniform buffer with the current *time*. This means adding a `var<uniform>` to the shader and creating a buffer on the CPU.

Then update the bind group and the bind group layout. As a hint, look at step 3.

If you are ever unsure about how your GPU buffers are laid out, [consult the WebGPU offset calculator](https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html).

In the render loop, write to the time buffer and bind it.

```ts
device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));
```

Finally, use the *time* variable in your shader.

> Once you are done, you should have some animation running on the site.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-2

## Step 3

We will want a `print(value: u32)` function for our shaders! Writing shaders is so inconvenient when you cannot look at values.

Add a storage buffer that we can write data to. Note that you need *two* storage buffers, one lives on the GPU and the other one is read from the CPU.

```ts
const DEBUG_SIZE = 10000;
const debugBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
});
const debugReadBuffer = device.createBuffer({
  size: DEBUG_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
```

Make sure to update the bind group and the bind group layout.
```ts
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
```

Then, add it to the shader. Do add it after the `// <DEBUG>` comment, we will use that later for parsing.

```wgsl
struct DebugData {
    debug_position: vec2u,
    /// Length of data, counting the number of u32s
    length: atomic<u32>,
    /// Unstructured data for printing
    data: array<u32>,
}
@group(0) @binding(99) var<storage, read_write> debug_data: DebugData;
```

Now write a print function that can be called multiple times.
```wgsl
fn print(value: u32) {
  // Step 3: 
  // use atomicAdd to get the next valid index
  // write to debug_data.data
}
```

Because we don't want to call `print` too often, we will limit it to one pixel. Call it via
```wgsl
if all(vec2u(input.position.xy) == debug_data.debug_position) {
    print(42);
}
```

Then, in the `render` loop we need read the data.

```ts
encoder.copyBufferToBuffer(debugBuffer, debugReadBuffer);
```

and after `device.queue.submit([encoder.finish()]);`, we can register our CPU readback.

```ts
if (requestDebug != null) {
  debugReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
    const buf = debugReadBuffer.getMappedRange();
    const header = new Uint32Array(buf.slice(0, 12));
    const length = header[2];
    const data = buf.slice(12, 12 + 4 * length);
    // Step 5: Store and draw the debug data, replacing our console.log
    console.log(new Uint32Array(data)); 
    debugReadBuffer.unmap();
  });
  requestDebug = null;
}
```

> Once you are done, you can click on the canvas. Then open the browser's console (F12 - Console) and inspect the printed values. Notice how we keep adding more values.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-3

## Step 4

Click to debug! We want to click on a pixel and get info about that very pixel.

If we wanted multiple `print` statements, we would have to keep repeating the check for the coordinates.
Let's fix that. Add the following to the shader.

```wgsl
var<private> is_debug: bool;
```

Then, update the `fn print` to include 
```wgsl
if !is_debug { return; }
```


Afterwards, set the variable in `frag_main`. We can simplify our `print` call.

```wgsl
fn frag_main(input: VertexOutput) -> @location(0) vec4f {
  is_debug = all(debug_data.debug_position == vec2u(input.position.xy));
  print(42);
```

We can go a step further and print more interesting values. Add
```wgsl
print(u32(input.position.x));
print(u32(input.position.y));
```

Then, in the `render` function, we need to set the debug buffer's data.
We set the desired position and reset the length to zero.
```ts
device.queue.writeBuffer(
  debugBuffer,
  0,
  new Uint32Array([requestDebug?.[0] ?? 0, requestDebug?.[1] ?? 0, 0]),
);
```

> Once you are done, you can click on the canvas and the website will show the printed values for that pixel.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-4

## Step 5

Show the print statements in the UI. Until now the print statements were in the browser console.

For that, we have a variable `debugData` to store all the debug info. Find it.

Instead of `console.log` in the render loop, assign a value to `debugData`.
Then, display it.

```ts
debugData.data = ...;
debugData.step = 0;
debugReadBuffer.unmap();
drawDebugUI(debugData.data, debugData.variables, debugData.step);
```

Then, we implement the `drawDebugUI` in `./src/ui.ts`. We have a `view` variable that lets us iterate over the `data`. For example, `view.getU32(index)` reads a 32 bit unsigned integer. 
Display each entry on a separate line.

```ts
let index = 0;

while(index < view.byteLength) {
  // Step 5: Read the data and write it to `outputLines`

  index += 4; // we read 4 bytes.

  // Step 6: Use the `variables` to decode the more complex `data` format.

  // Step 8: Use the `step` to only draw the first few print statements.
}
```

> Once you are done, the UI should show each printed value.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-5

## Step 6

We want our debugger to
- show variable values, with support for multiple types
- show the variable *name*
- show it in the correct *line*

To prepare for this, we replace the generic print function with more specialized print functions. 

```wgsl
fn print_u32(line: u32, variable_id: u32, value: u32) {
    if is_debug {
        let index = atomicAdd(&debug_data.length, 3);
        debug_data.data[index] = line;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = value;
    }
}
fn print_f32(line: u32, variable_id: u32, value: f32) {
    print_u32(line, variable_id, bitcast<u32>(value));
}
fn print_vec2f(line: u32, variable_id: u32, value: vec2f) {
    if is_debug {
        let index = atomicAdd(&debug_data.length, 4);
        debug_data.data[index] = line;
        debug_data.data[index + 1] = variable_id;
        debug_data.data[index + 2] = bitcast<u32>(value.x);
        debug_data.data[index + 3] = bitcast<u32>(value.y);
    }
}
```

Add some calls to those functions. Like
```wgsl
print_f32(15, 1, angle);
```

Now the `data` has a very specific layout. We need to decode that on the CPU.

To implement the decoding and drawing logic, go to `drawDebugUI`. Remove the code from step 5.

We instead need to decode it piece by piece.
```ts
const line = view.getU32(index);
index += 4;
const variableId = view.getU32(index);
index += 4;
const variable = variables[variableId];

if (variable.type === "u32") {
  // Read value and write to `outputLines[line]`.
  // Then, increment the index.
} else if (variable.type === "f32") {
  
} else if (variable.type === "vec2f") {
  
} else {
  console.error("Unknown type", variable.type);
}
```


> Once you are done, the UI should show the printed values in the desired lines.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-6

## Step 7

Instrumenting the shader. We want to automatically inject the `print` calls into our shader.

To avoid this turning into a compiler engineering class, we will make a few simplifying assumptions

- Every relevant statement is on one line.
- We can append code to lines with statements.
- Every variable declaration has an explicit type.
- (Variables only change when they are assigned to.)
- (No shadowing.)

This lets us extract the variable declarations and assignments.

Go to `instrumentShader` in `./src/main.ts`

There we iterate over the lines
```ts
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Avoid instrumenting the debug code itself
  if (line.includes("// <DEBUG>")) {
    break;
  }

  let variable: Variable | null = null;

  // Step 7: Detect variable declarations and assignments
}
```

To heuristically detect a variable declaration, we will use the following regular expression.

```ts
const variableMatch = line.match(
  /(let|var|const) (?<name>[a-zA-Z0-9_]+) ?: ?(?<type>[a-zA-Z0-9_]+)/,
);
if (variableMatch !== null) {
  variable = {
    name: variableMatch.groups!.name,
    type: variableMatch.groups!.type,
    id: variables.length,
  };
  variables.push(variable);
}
```
Then, think of a piece of shader code that would be matched by this.


Then, to detect assignments, we use the following

```ts
const assignmentMatch = line.match(/^ *(?<name>[a-zA-Z0-9_]+) ?= ?/);
if (!variableMatch && assignmentMatch !== null) {
  const name = assignmentMatch.groups!.name;
  variable = variables.find(v => v.name == name) ?? null;
}
```
Then, think of a piece of shader code that would be matched by this.

If the current line did have a variable declaration or assignment, we inject our debugging code.
It should produce code like `print_u32(11, 0, pos)`. You can use `i` as the line number and `variable.name` to get the name.

```ts
if (variable !== null && ["u32", "f32", "vec2f"].includes(variable.type)) {
  // Step 7: Finish debugCall
  const debugCall = `print_${}(${i}, ${}, ${});`;
  lines[i] += " " + debugCall;
}
```

Next, we hook up the debug render pipeline and our extracted variables. We do it after calling `instrumentShader`.
```ts
const instrumented = instrumentShader(fragmentShaderString);
const debugPipeline = createRenderPipeline(instrumented.code);

const debugData = {
  data: new ArrayBuffer(0),
  // Step 7: Change this to `variables: instrumented.variables`
  variables: instrumented.variables,
  step: 0,
};

```

Then, we change the `pass.setPipeline(pipeline);` to use the `debugPipeline` if `requestDebug != null`.

> Once you are done, the UI should print all values whenever there is an assignment.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-7

## Step 8

The step forwards and step backwards buttons are essential for a debugger.

So we first need to react to the button presses.

```ts
document.querySelector<HTMLButtonElement>(".step-forwards")!.onclick = () => {
  debugData.step += 1;
  drawDebugUI(debugData.data, debugData.variables, debugData.step);
};
document.querySelector<HTMLButtonElement>(".step-backwards")!.onclick = () => {
  // Step 8: Implement this button. Implementation is nearly identical to above.
};
```

Then, in `drawDebugUI`, count how many values you have decoded. If it is bigger than `maxStep`, store it in `scrollToLine` and break out of the loop.

> Once you are done, the step forwards and step backwards buttons should work.  
> https://github.com/stefnotch/budget_gpu_debugger/tree/step-8


## Bonus present

Try out the `./public/bonus-mandelbrot.wgsl` shader