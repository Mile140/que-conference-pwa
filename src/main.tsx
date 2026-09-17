import { render } from "preact";
import App from "./app";
import "./theme.css";
import "./lib/theme";
import { initAuth } from "./lib/auth";
import { initUpdateSW } from "./lib/updateSW";

initAuth();
initUpdateSW();
render(<App />, document.getElementById("app")!);

// This module executing at all means the shell that loaded it was valid --
// clear the stale-shell reload guard (see index.html) so a *later*, separate
// occurrence in the same tab session (e.g. after another deploy) can still
// trigger one auto-reload instead of being silently skipped forever.
sessionStorage.removeItem("que-stale-shell-reload");
