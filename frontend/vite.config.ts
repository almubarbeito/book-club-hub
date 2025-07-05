// The new, simplified vite.config.ts

import { defineConfig } from 'vite'
import path from 'path' // We need to import the 'path' module

export default defineConfig({
  // This explicitly tells Vite that the project root (where index.html is)
  // is the current directory it's being run from.
  root: path.resolve(__dirname, '.'),
  
  build: {
    // We also need to tell it where to put the output files,
    // relative to the new root.
    outDir: 'dist',
    sourcemap: true,
  }
})
