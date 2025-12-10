import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignUpPage } from "@/pages/auth/SignUpPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// Public pages
import ChatEmbed from "./pages/public/ChatEmbed";
import ChatDemo from "./pages/public/ChatDemo";

// Protected pages
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { LeadsPage } from "@/pages/leads/LeadsPage";
import { LeadDetailsPage } from "@/pages/leads/LeadDetailsPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { AnalyticsPage } from "@/pages/analytics/AnalyticsPage";
import { ProfilePage } from './pages/profile/ProfilePage';
import TestAgent from "./pages/TestAgent";
import ExperimentsPage from "./pages/experiments/ExperimentsPage";
import NotFound from "./pages/NotFound";
import { AgentSettingsPage } from "./pages/agent/AgentSettingsPage";
import { TestRunnerPage } from "./pages/tests/TestRunnerPage";
import { AvailabilitySettingsPage } from "./pages/availability/AvailabilitySettingsPage";
import InboxPage from "./pages/inbox/InboxPage";
import EmbedSettings from "./pages/settings/EmbedSettings";
import TestModeSettings from "./pages/settings/TestModeSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/chat" element={<ChatDemo />} />
          <Route path="/chat-embed" element={<ChatEmbed />} />
          <Route path="/demo" element={<ChatDemo />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <DashboardPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <LeadsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <LeadDetailsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <CalendarPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AnalyticsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <InboxPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/experiments"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ExperimentsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent-settings"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AgentSettingsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TestRunnerPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ProfilePage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/availability"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AvailabilitySettingsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/embed"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <EmbedSettings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/test-mode"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TestModeSettings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-agent"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TestAgent />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
