import shaderString from "./shader.wgsl?raw";

/**
 * Draw the shader code with annotations
 * @param annotations The text to render after each line
 * @param currentLine The "current line" to highlight
 */
export function drawUI(annotations: string[], currentLine: number | null) {
    const codeInput = document.querySelector<HTMLPreElement>(".input")!;
    codeInput.innerHTML = ""; // Clear existing content

    //
    shaderString.split("\n").forEach((line, i) => {
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
