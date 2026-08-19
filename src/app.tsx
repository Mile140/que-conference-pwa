import Router from "preact-router";
import Header from "./components/Header";
import Nav from "./components/Nav";
import SponsorFooter from "./components/SponsorFooter";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import SessionDetail from "./pages/SessionDetail";
import Stub from "./pages/Stub";

export default function App() {
  return (
    <div class="app-shell">
      <Header />
      <Nav />
      <main class="app-main">
        <Router>
          <Home path="/" />
          <Schedule path="/schedule" />
          <SessionDetail path="/schedule/:id" />
          <Stub
            path="/directory"
            title="Attendee Directory"
            phase="Phase 3"
            blurb="Searchable directory, unlocked after passwordless email verification."
          />
          <Stub
            path="/speakers"
            title="Speakers"
            phase="Phase 5"
            blurb="Everyone flagged as a speaker, with their linked sessions."
          />
          <Stub
            path="/sponsors"
            title="Sponsors"
            phase="Phase 5"
            blurb="Sponsor detail pages, display order, and what each sponsor is backing."
          />
          <Stub
            path="/maps"
            title="Venue &amp; Maps"
            phase="Phase 6"
            blurb="Venue map, hotel/parking info, and the off-site event map."
          />
          <Stub
            path="/info"
            title="Info"
            phase="Phase 6"
            blurb="Wifi, parking, local attractions, and other admin-editable info pages."
          />
        </Router>
      </main>
      <SponsorFooter />
    </div>
  );
}
