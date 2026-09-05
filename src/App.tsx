import { ThemeProvider } from "./components/theme-provider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

// ─── Pages ────────────────────────────────────────────────────────────────────
import ProjectDetails from "./pages/ProjectDetails";
import About from "./pages/About";

import Home from "./pages/Home";
import AuthPage from "./pages/auth";
import Dashboard from "./pages/Dashboard";
import DoubtSolver from "./pages/DoubtSolver";
import MockInterview from "./pages/MockInterview";
import Communication from "./pages/Communication";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { ProtectedRoute } from "./components/ProtectedRoute";

// ─── Styles ───────────────────────────────────────────────────────────────────
import "./App.css";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <ThemeProvider defaultTheme="system" storageKey="speakwise-theme">
        <BrowserRouter>
          <Routes>
            {/* Public Routes - Anyone can see these */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* 🔒 Protected Routes - Must be logged in to see these! 🔒 */}
            <Route element={<ProtectedRoute />}>
              {/* Workspace Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/project-details" element={<ProjectDetails />} />
              <Route path="/about" element={<About />} />

              {/* Tool Routes */}
              <Route path="/doubt-solver" element={<DoubtSolver />} />
              <Route path="/doubt-solver/:threadId" element={<DoubtSolver />} />
              <Route path="/mock-interview" element={<MockInterview />} />
              <Route
                path="/mock-interview/:threadId"
                element={<MockInterview />}
              />
              <Route path="/communication" element={<Communication />} />
              <Route
                path="/communication/:threadId"
                element={<Communication />}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
}

export default App;
