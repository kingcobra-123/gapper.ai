import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authProxyTarget =
    env.VITE_AUTH_API_PROXY_TARGET?.trim() || "http://127.0.0.1:8787";
  const terminalApiBaseUrl =
    env.VITE_GAPPER_API_BASE_URL?.trim() ||
    env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:8000";
  const terminalApiKey =
    env.VITE_GAPPER_API_KEY?.trim() || env.NEXT_PUBLIC_API_KEY?.trim() || "";
  const terminalApiTimeoutMs =
    env.VITE_GAPPER_API_TIMEOUT_MS?.trim() ||
    env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim() ||
    "8000";
  const premiumGateEnabled =
    env.VITE_PREMIUM_GATE_ENABLED?.trim() ||
    env.NEXT_PUBLIC_PREMIUM_GATE_ENABLED?.trim() ||
    "false";
  const hmrClientPortRaw = env.VITE_HMR_CLIENT_PORT?.trim() || "";
  const hmrClientPort = Number.parseInt(hmrClientPortRaw, 10);
  const projectRoot = process.cwd();

  return {
    plugins: [react()],
    define: {
      "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(
        mode === "production" ? terminalApiBaseUrl : "/gapper-api"
      ),
      "process.env.NEXT_PUBLIC_API_KEY": JSON.stringify(terminalApiKey),
      "process.env.NEXT_PUBLIC_API_TIMEOUT_MS": JSON.stringify(
        terminalApiTimeoutMs
      ),
      "process.env.NEXT_PUBLIC_PREMIUM_GATE_ENABLED": JSON.stringify(
        premiumGateEnabled
      ),
      "process.env.NODE_ENV": JSON.stringify(
        mode === "production" ? "production" : "development"
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src/gapper_fe/src"),
        "next/link": path.resolve(
          projectRoot,
          "src/gapper_fe/shims/nextLinkShim.jsx"
        ),
      },
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true,
        ...(Number.isFinite(hmrClientPort) && hmrClientPort > 0
          ? { clientPort: hmrClientPort }
          : {}),
      },
      proxy: {
        "/api": {
          target: authProxyTarget,
          changeOrigin: true,
        },
        "/gapper-api": {
          target: terminalApiBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gapper-api/, ""),
        },
      },
      watch: {
        usePolling: false,
        ignored: ["**/node_modules/**", "**/.git/**"],
      },
    },
  };
});
