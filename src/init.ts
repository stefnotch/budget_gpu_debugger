import "./style.css";
// Import the GPU so that it stays alive when hot reloading main.ts
import { device } from "./gpu.ts";
// Import our app
import "./main.ts";

// Error handling
// Remember to open the browser console for more info!
globalThis.addEventListener("unhandledrejection", (event) => {
  drawErrorsUI(event.reason, event);
});
globalThis.addEventListener("error", (event) => {
  drawErrorsUI(event.message, event);
});
device.addEventListener("uncapturederror", (event) => {
  drawErrorsUI(event.error.message, event);
});

function drawErrorsUI(message: string, event: any) {
  if ("error" in event) {
    console.error(event.error);
  } else {
    console.error(event);
  }
  const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;

  const errorSpan = document.createElement("div");
  errorSpan.classList.add("error-message");
  errorSpan.innerText = message;
  errorsOutput.append(errorSpan);
  errorsOutput.style.display = "initial";
}
function clearErrorsUI() {
  const errorsOutput = document.querySelector<HTMLPreElement>(".errors")!;
  errorsOutput.innerHTML = "";
  errorsOutput.style.display = "none";
}

// Hot reloading entrypoint.
// Assumes that you don't modify global state in main.ts
if (import.meta.hot) {
  import.meta.hot.accept("./main.ts", (_newMain) => {
    clearErrorsUI();
  });
}
