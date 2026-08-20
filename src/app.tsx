import Router from "preact-router";
import Header from "./components/Header";
import Nav from "./components/Nav";
import SponsorFooter from "./components/SponsorFooter";
import UpdateBanner from "./components/UpdateBanner";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import SessionDetail from "./pages/SessionDetail";
import Directory from "./pages/Directory";
import Questions from "./pages/Questions";
import LearningList from "./pages/LearningList";
import Verify from "./pages/Verify";
import Profile from "./pages/Profile";
import Speakers from "./pages/Speakers";
import Sponsors from "./pages/Sponsors";
import SponsorDetail from "./pages/SponsorDetail";
import Maps from "./pages/Maps";
import Info from "./pages/Info";

export default function App() {
  return (
    <div class="app-shell">
      <UpdateBanner />
      <Header />
      <Nav />
      <main class="app-main">
        <Router>
          <Home path="/" />
          <Schedule path="/schedule" />
          <SessionDetail path="/schedule/:id" />
          <Directory path="/directory" />
          <Questions path="/questions" />
          <LearningList path="/learning" />
          <Verify path="/verify" />
          <Profile path="/profile" />
          <Speakers path="/speakers" />
          <Sponsors path="/sponsors" />
          <SponsorDetail path="/sponsors/:id" />
          <Maps path="/maps" />
          <Info path="/info" />
        </Router>
      </main>
      <SponsorFooter />
    </div>
  );
}
