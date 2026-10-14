// CSS side-effect imports carry no JS exports. The bundler injects them.
// This ambient declaration lets `tsc` resolve the side-effect import when
// emitting declarations (vite handles the actual CSS at build time).
declare module '*.css';
