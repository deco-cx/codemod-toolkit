<p align="center">
  <a href="https://jsr.io/@deco/codemod-toolkit" target="_blank"><img alt="jsr" src="https://jsr.io/badges/@deco/codemod-toolkit" /></a>
  &nbsp;
</p>
# CodeMod Toolkit

**CodeMod Toolkit** is a powerful utility designed to streamline file
modifications in JavaScript and TypeScript projects. Whether you're rewriting
import statements, modifying JSON configuration files, or transforming
TypeScript files, this toolkit offers a comprehensive API to apply changes
efficiently. With support for multiple runtimes (Node.js, Deno, browsers, etc.),
it provides flexibility across environments and ensures compatibility with
modern ecosystems.

## Features

- **Flexible File Patching**: Modify text, JSON, and TypeScript files with ease.
- **Cross-Runtime Compatibility**: Works in Node.js, Deno, and browser
  environments.
- **TypeScript Support**: Use the `ts-morph` library to safely modify TypeScript
  files.
- **Contextual File System Operations**: Integrated file system helpers to
  manage file changes.
- **Custom CodeMod Context**: Use a context-aware API to add custom operations
  and patches.

## Usage

```tsx
import { codeMod, rewriteImports } from "@deco/codemod-toolkit";

const symbolMap = {
  "old-module": {
    "oldExport": {
      moduleSpecifier: "new-module",
    },
  },
};

await codeMod({
  name: "Rewrite Imports",
  description: "Rewrites import statements based on a symbol map",
  targets: [rewriteImports(symbolMap)],
});
```
