import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const backendOrigin = (() => {
    if (env.VITE_BACKEND_ORIGIN) {
      return env.VITE_BACKEND_ORIGIN;
    }

    if (env.VITE_API_BASE_URL) {
      try {
        return new URL(env.VITE_API_BASE_URL).origin;
      } catch {
        return "http://localhost:5050";
      }
    }

    return "http://localhost:5050";
  })();

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 900,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/recharts")) {
              return "charts";
            }
            if (id.includes("node_modules/@tanstack/react-query")) {
              return "query";
            }
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-router-dom")
            ) {
              return "react-vendor";
            }
            if (id.includes("node_modules/framer-motion")) {
              return "motion";
            }
            if (id.includes("node_modules/@radix-ui")) {
              return "radix";
            }
            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          secure: false
        },
        "/Storage": {
          target: backendOrigin,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
