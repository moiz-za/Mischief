/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "Circular dependencies defeat the layering that keeps Mischief modular.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-stays-pure",
      comment:
        "The domain layer is pure and dependency-free: it may only depend on other src/domain/ modules, built-ins, and external libraries. Anything else breaks testability and the security boundary.",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^src/", pathNot: "^src/domain/" },
    },
    {
      name: "no-electron-in-domain",
      comment: "Electron APIs belong only in the main/preload edge layer, never the domain layer.",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^node_modules/electron" },
    },
    {
      name: "renderer-does-not-import-main",
      comment:
        "The renderer and the Electron entry point are isolated edges; neither may reach into the other.",
      severity: "error",
      from: { path: "^src/renderer/" },
      to: { path: "^src/main" },
    },
    {
      name: "main-does-not-import-renderer",
      comment:
        "The Electron entry point must not reach into the renderer; renderer concerns are loaded via files, not imports.",
      severity: "error",
      from: { path: "^src/main" },
      to: { path: "^src/renderer/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: [],
      conditionNames: ["import"],
      extensions: [".js", ".ts"],
    },
  },
};
