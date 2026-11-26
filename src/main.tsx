import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { App } from "./App";
import "./styles.css";

// Refuse to run inside another site's frame (protects against click-jacking).
if (window.top !== window.self) {
  try { window.top!.location.href = window.location.href; } catch { /* blocked: show nothing */ }
  throw new Error("framed");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" theme="light" />
  </StrictMode>,
);
