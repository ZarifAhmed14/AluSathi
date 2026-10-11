import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// A previous production preview must not serve stale pages during local development.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration("/").then(registration => registration?.unregister()).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
