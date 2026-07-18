import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import LandingPage        from './pages/LandingPage';
import RootRedirect       from './pages/RootRedirect';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import HomePage           from './pages/HomePage';
import BookingPage        from './pages/BookingPage';
import MyBookingsPage     from './pages/MyBookingsPage';
import ProfessionalProfile from './pages/ProfessionalProfile';
import EditProfilePage    from './pages/EditProfilePage';
import DocumentUpload     from './pages/DocumentUpload';
import ChatPage           from './pages/ChatPage';
import ChatInbox          from './pages/ChatInbox';
import ViewProfilePage    from './pages/ViewProfilePage';
import EarningsPage       from './pages/EarningsPage';
import RatingPage         from './pages/RatingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import AdminLoginPage     from './pages/AdminLoginPage';
import AdminDashboard     from './pages/AdminDashboard';
import JobPostFeed        from './pages/JobPostFeed';
import CreateJobPost      from './pages/CreateJobPost';
import MyJobPosts         from './pages/MyJobPosts';
import JobPostDetail      from './pages/JobPostDetail';
import CreditsPage        from './pages/CreditsPage';
import BoostPage          from './pages/BoostPage';
import NotFoundPage       from './pages/NotFoundPage';
import Terms              from './pages/Terms';
import Privacy            from './pages/Privacy';
import ReferralPage       from './pages/ReferralPage';
import NotificationsPage  from './pages/NotificationsPage';
import InstallBanner      from './components/InstallBanner';
import OfflineBanner      from './components/OfflineBanner';
import MaintenanceGate     from './components/MaintenanceGate';
import BlogPage           from './pages/BlogPage';
import BlogPost           from './pages/BlogPost';

function AnalyticsPageView() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalyticsPageView />
        <OfflineBanner />
        <MaintenanceGate>
        <Routes>
          <Route path="/"                       element={<RootRedirect />} />
          <Route path="/welcome"                element={<LandingPage />} />
          <Route path="/login"                  element={<LoginPage />} />
          <Route path="/register"               element={<RegisterPage />} />
          <Route path="/home"                   element={<HomePage />} />
          <Route path="/book/:id"               element={<BookingPage />} />
          <Route path="/my-bookings"            element={<MyBookingsPage />} />
          <Route path="/professional-profile"   element={<ProfessionalProfile />} />
          <Route path="/edit-profile"           element={<EditProfilePage />} />
          <Route path="/upload-documents"       element={<DocumentUpload />} />
          <Route path="/chat/:otherUserId"      element={<ChatPage />} />
          <Route path="/chat-inbox"             element={<ChatInbox />} />
          <Route path="/view-profile/:id"       element={<ViewProfilePage />} />
          <Route path="/earnings"               element={<EarningsPage />} />
          <Route path="/rate/:id"               element={<RatingPage />} />
          <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token"  element={<ResetPasswordPage />} />
          <Route path="/admin/login"            element={<AdminLoginPage />} />
          <Route path="/admin"                  element={<AdminDashboard />} />
          <Route path="/job-posts"              element={<JobPostFeed />} />
          <Route path="/job-posts/:id"          element={<JobPostDetail />} />
          <Route path="/create-job-post"        element={<CreateJobPost />} />
          <Route path="/my-posts"               element={<MyJobPosts />} />
          <Route path="/my-credits"             element={<CreditsPage />} />
          <Route path="/boost"                  element={<BoostPage />} />
          <Route path="/terms"                  element={<Terms />} />
          <Route path="/privacy"                element={<Privacy />} />
          <Route path="/ref/:code"              element={<ReferralPage />} />
          <Route path="/notifications"          element={<NotificationsPage />} />
          <Route path="/blog"                   element={<BlogPage />} />
          <Route path="/blog/:slug"             element={<BlogPost />} />
          <Route path="*"                       element={<NotFoundPage />} />
        </Routes>
        <InstallBanner />
        </MaintenanceGate>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
