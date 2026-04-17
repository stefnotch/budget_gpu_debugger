import "./main.ts";

// Hot reloading entrypoint.
// Assumes that you don't modify global state in main.ts
if (import.meta.hot) {
    import.meta.hot
        .accept("./main.ts", (_newMain) => {});
}
