import Router from "preact-router";
import Header from "./components/Header";
import Nav from "./components/Nav";
import SponsorFooter from "./components/SponsorFooter";
import UpdateBanner from "./components/UpdateBanner";
import OfflineIndicator from "./components/OfflineIndicator";
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
import Photos from "./pages/Photos";
import PhotoDetail from "./pages/PhotoDetail";
import Feedback from "./pages/Feedback";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminHome from "./pages/admin/AdminHome";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminSpeakers from "./pages/admin/AdminSpeakers";
import AdminSponsors from "./pages/admin/AdminSponsors";
import AdminMaps from "./pages/admin/AdminMaps";
import AdminInfoPages from "./pages/admin/AdminInfoPages";
import AdminPhotos from "./pages/admin/AdminPhotos";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminStats from "./pages/admin/AdminStats";

export default function App() {
  return (
    <div class="app-shell">
      <UpdateBanner />
      <OfflineIndicator />
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
          <Photos path="/photos" />
          <PhotoDetail path="/photos/:id" />
          <Feedback path="/feedback" />
          <AdminLogin path="/admin/login" />
          <AdminHome path="/admin" />
          <AdminModeration path="/admin/moderation" />
          <AdminAnnouncements path="/admin/announcements" />
          <AdminSessions path="/admin/sessions" />
          <AdminSpeakers path="/admin/speakers" />
          <AdminSponsors path="/admin/sponsors" />
          <AdminMaps path="/admin/maps" />
          <AdminInfoPages path="/admin/info" />
          <AdminPhotos path="/admin/photos" />
          <AdminFeedback path="/admin/feedback" />
          <AdminStats path="/admin/stats" />
        </Router>
      </main>
      <SponsorFooter />
    </div>
  );
}
