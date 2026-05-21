import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const logToFilePlugin = () => {
  return {
    name: 'log-to-file',
    configureServer(server: any) {
      server.middlewares.use('/api/log', (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const logFile = path.resolve(__dirname, 'frontend_logs.txt');
              const parsed = JSON.parse(body);
              const logLine = `[${parsed.time}] [${parsed.type.toUpperCase()}] ${parsed.message}\n`;
              fs.appendFileSync(logFile, logLine);
            } catch (e) {
              console.error('Error writing log', e);
            }
            res.statusCode = 200;
            res.end('ok');
          });
        }
      });
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";

  return {
    base,
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: true,
      hmr: { overlay: false },
    },
    plugins: [react(), logToFilePlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: ["chrome90", "edge90", "firefox90", "safari14"],
      cssTarget: ["chrome90", "edge90", "firefox90", "safari14"],
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-motion": ["framer-motion"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
            ],
          },
        },
      },
    },
  };
});
