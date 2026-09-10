import { render } from "preact";
import App from "./app";
import "./theme.css";
import "./lib/theme";
import { initAuth } from "./lib/auth";
import { initUpdateSW } from "./lib/updateSW";

initAuth();
initUpdateSW();
render(<App />, document.getElementById("app")!);
