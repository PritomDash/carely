import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import LandingPage        from './pages/LandingPage';
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
import MyCredits          from './pages/MyCredits';
import NotFoundPage       from './pages/NotFoundPage';
import Terms              from './pages/Terms';
import Privacy            from './pages/Privacy';
import ReferralPage       from './pages/ReferralPage';
import NotificationsPage  from './pages/NotificationsPage';
import InstallBanner      from './components/InstallBanner';
import BlogPage           from './pages/BlogPage';
import BlogPost           from './pages/BlogPost';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                       element={<LandingPage />} />
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
          <Route path="/my-credits"             element={<MyCredits />} />
          <Route path="/terms"                  element={<Terms />} />
          <Route path="/privacy"                element={<Privacy />} />
          <Route path="/ref/:code"              element={<ReferralPage />} />
          <Route path="/notifications"          element={<NotificationsPage />} />
          <Route path="/blog"                   element={<BlogPage />} />
          <Route path="/blog/:slug"             element={<BlogPost />} />
          <Route path="*"                       element={<NotFoundPage />} />
        </Routes>
        <InstallBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
