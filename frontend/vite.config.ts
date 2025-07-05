import { defineConfig } from 'vite'

export default defineConfig({
  // This tells Vite where to find the index.html and src folder
  root: __dirname,
  
  build: {
    // This tells Vite where to put the final 'dist' folder.
    // It will be created at the root of the project.
    outDir: '../dist' 
  }
})