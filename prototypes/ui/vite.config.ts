import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PROTOTYPE: throwaway UI variations, see README.md
export default defineConfig({ plugins: [react()], server: { port: 5199 } });
