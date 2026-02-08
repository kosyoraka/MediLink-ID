import { useState, useEffect } from "react";
import { Toaster } from "sonner@2.0.3";
import { LoginPage } from "./components/auth/LoginPage";
import { SignUpPage } from "./components/auth/SignUpPage";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { PatientDetails } from "./pages/PatientDetails";
import { Appointments } from "./pages/Appointments";
import { Messages } from "./pages/Messages";
import { Documents } from "./pages/Documents";
import { Settings } from "./pages/Settings";
import { conversations } from "./lib/mockData";
import { Patient } from "./lib/types";

type Page =
  | "dashboard"
  | "patients"
  | "patient-details"
  | "appointments"
  | "messages"
  | "documents"
  | "settings";

type AuthPage = "login" | "signup";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Calculate unread messages count
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // ✅ Auto-auth if staff exists (localStorage remember-me OR sessionStorage)
  useEffect(() => {
    try {
      const staffRaw =
        localStorage.getItem("medilink_staff") ||
        sessionStorage.getItem("medilink_staff_session");

      if (staffRaw) {
        setIsAuthenticated(true);
        setAuthPage("login");
        setCurrentPage("dashboard");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  };

  const handleSignUp = () => {
    setIsAuthenticated(true);
    setAuthPage("login");
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    // ✅ Clear local + session auth data
    try {
      localStorage.removeItem("medilink_staff");
      sessionStorage.removeItem("medilink_staff_session");
    } catch {
      // ignore
    }

    setIsAuthenticated(false);
    setAuthPage("login");
    setCurrentPage("dashboard");
    setSelectedPatient(null);
  };

  const handleNavigate = (page: string, data?: any) => {
    if (page === "patient-details" && data) {
      setSelectedPatient(data);
      setCurrentPage("patient-details");
      return;
    }

    setSelectedPatient(null);
    setCurrentPage(page as Page);
  };

  const handleAddPatientClick = () => {
    setCurrentPage("patients");
  };

  if (!isAuthenticated) {
    return (
      <>
        {authPage === "login" && (
          <LoginPage
            onLogin={handleLogin}
            onSignUpClick={() => setAuthPage("signup")}
          />
        )}

        {authPage === "signup" && (
          <SignUpPage
            onSignUp={handleSignUp}
            onBackToLogin={() => setAuthPage("login")}
          />
        )}

        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      >
        {currentPage === "dashboard" && (
          <Dashboard onNavigate={handleNavigate} onAddPatientClick={handleAddPatientClick} />
        )}

        {currentPage === "patients" && <Patients onNavigate={handleNavigate} />}

        {currentPage === "patient-details" && selectedPatient && (
          <PatientDetails patient={selectedPatient} onNavigate={handleNavigate} />
        )}

        {currentPage === "appointments" && <Appointments onNavigate={handleNavigate} />}

        {currentPage === "messages" && <Messages />}

        {currentPage === "documents" && <Documents />}

        {currentPage === "settings" && <Settings />}
      </Layout>

      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
