import { render } from "preact";
import App from "./app";
import "./theme.css";
import "./lib/theme";
import { initAuth } from "./lib/auth";

initAuth();
render(<App />, document.getElementById("app")!);
