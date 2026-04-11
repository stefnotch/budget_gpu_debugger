# Low Budget GPU Debugger

Steps

- [x] Typescript project with Vite 
  - At the end think about lowering to vanilla nothing
- [x] Add the WebGPU types (they're already built in yay)
- [x] Add a textarea
- [x] Add a hello triangle
- [x] Turn it into a hello quad and use the textarea code
- [x] Add a "debug buffer"
- [ ] Read the "debug buffer"
- [x] Add a div to the left of the textarea where we can display breakpoints and the "current line"
- [x] Add a bigger div to the left where we can display the debugger UI
  - [x] Step
- [x] Debug button
  - [x] Enable debug mode
  - [x] Write to gpu buffer
  - [x] Read GPU buffer
...





Go over every line. Categorize (try a few regex)
Keep track of the variables Map<name, {line, type, id}> and a reverse Map<id, name>
Insert a generic if(pixelCoord==debugPixel) { dbg(current line number, variable ID, variable value); }. That function just appends to a buffer.
Then run the shader. Read out the buffer.
And the UI is: click on pixel. Set the debugPixel uniform. @fragment fn main will write the current pixel coord to a var<private> so we can access the info everywhere.
Next UI: step forwards/backwards. That just increments a "until command" and then rerenders the entire debugger textarea.
Debugger textarea: data = Array(lineCount).fill("");
And for everything in the GPU buffer until our "until command" we do data[buffer.current line number] = variables[buffer.id].name + ": " + render(variables[id].type, buffer.value);

## Rejected ideas
- https://codemirror.net/5/ for the code editor

## Bonus notes

- We keep the default canvas size, because otherwise we have to deal with making screen pixels and canvas drawing buffer sizes match up https://webgpufundamentals.org/webgpu/lessons/webgpu-resizing-the-canvas.html
- We put the shader in a separate file so that the modifications are "persistent". Also, wgsl-analyzer is bae.
- We need a separate buffer that is mappable. `GPUBufferUsage.STORAGE` and `GPUBufferUsage.MAP_READ` cannot be combined.