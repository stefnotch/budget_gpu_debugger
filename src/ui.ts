import shaderString from "./fragment-shader.wgsl?raw";

/**
 * Draw the shader code with annotations
 * @param annotations The text to render after each line
 * @param currentLine The "current line" to highlight
 */
export function drawUI(annotations: string[], currentLine: number | null) {
  const codeInput = document.querySelector<HTMLPreElement>(".input")!;
  codeInput.innerHTML = ""; // Clear existing content

  shaderString.split(/\r?\n/).forEach((line, i) => {
    if (i == currentLine) {
      const highlightSpan = document.createElement("span");
      highlightSpan.classList.add("highlight-annotation");
      codeInput.append(highlightSpan);
      highlightSpan.scrollIntoView({ block: "nearest" });
    }

    const codeSpan = document.createElement("span");
    codeSpan.innerText = line;
    codeInput.append(codeSpan);

    if (annotations[i]) {
      const annotationSpan = document.createElement("span");
      annotationSpan.classList.add("annotation");
      annotationSpan.innerText = annotations[i];
      codeInput.append(annotationSpan);
    }

    codeInput.append(document.createElement("br"));
  });
}
drawUI([], null);

/** A wrapper around `DataView` that always uses little endian. */
class WgslDataView {
  view: DataView;
  constructor(arrayBuffer: ArrayBuffer) {
    this.view = new DataView(arrayBuffer);
  }

  getU32(byteOffset: number) {
    return this.view.getUint32(byteOffset, true);
  }
  getF32(byteOffset: number) {
    return this.view.getFloat32(byteOffset, true);
  }

  get byteLength() {
    return this.view.byteLength;
  }
}

export interface Variable {
  id: number;
  name: string;
  type: string;
}

/**
 * Draws the debugger UI
 * @param data Data from the GPU
 * @param variables Variables extracted from the shader
 * @param maxStep Draw the debug UI up until this "step"
 */
export function drawDebugUI(data: ArrayBuffer, variables: Variable[], maxStep: number) {
  const outputLines: string[] = [];
  let scrollToLine: number | null = null;

  // Step 5: Read the `data` and write it to `outputLines`
  const view = new WgslDataView(data);

  while (false /* Step 5: Loop until we've read all the data */) {
    // Step 5: Read the data and write it to `outputLines`
    // Step 6: Use the `variables` to decode the more complex `data` format.
    // Step 8: Use the `step` to only draw the first few print statements.
  }

  drawUI(outputLines, scrollToLine);
}
