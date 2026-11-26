import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Content-Security-Policy for the built site: only our own scripts may run, and the app may only talk to our
// Supabase project. Added at build time only (the dev server injects inline scripts that this would block).
function securityHeaders(supabaseUrl: string): Plugin {
  const sb = new URL(supabaseUrl);
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${sb.origin}`,
    `connect-src 'self' ${sb.origin} wss://${sb.host}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  return {
    name: "security-headers",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: csp }, injectTo: "head-prepend" },
      { tag: "meta", attrs: { name: "referrer", content: "no-referrer" }, injectTo: "head-prepend" },
    ],
  };
}

// BASE_PATH is set by the deploy workflow ("/" for app.staplerdisponent.com).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: process.env.BASE_PATH || "/",
    plugins: [react(), tailwindcss(), securityHeaders(env.VITE_SUPABASE_URL || "https://example.supabase.co")],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  };
});
