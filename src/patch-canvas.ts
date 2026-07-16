import Module, { createRequire } from 'module';

const customRequire = createRequire(import.meta.url);
const canvasModule = customRequire('@napi-rs/canvas');

// Patch Node's module resolution so that jsdom can require('canvas')
// successfully even when isolated by strict package managers like pnpm.
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'canvas') return canvasModule;
  return originalRequire.call(this, id);
};
