import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 固定端口
    strictPort: true, // 如果端口被占用则报错而不是自动寻找其他端口
  },
});
