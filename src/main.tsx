import { render } from "preact";
import App from "./app";
import "./theme.css";
import "./lib/theme";

render(<App />, document.getElementById("app")!);

if ("serviceWorker" in navigator) {
  // vite-plugin-pwa injects the registration in production builds
  // (autoUpdate). No manual registration needed here.
}
