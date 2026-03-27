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
import { Notifications } from "./pages/Notifications";
import { Documents } from "./pages/Documents";
import { Settings } from "./pages/Settings";
import { Patient } from "./lib/types";
import { apiFetch } from "./lib/api";

type Page =
  | "dashboard"
  | "patients"
  | "patient-details"
  | "appointments"
  | "messages"
  | "notifications"
  | "documents"
  | "settings";

type AuthPage = "login" | "signup";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetailsContext, setPatientDetailsContext] = useState<{ medicationId?: string; medicationChangeRequestId?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Auto-auth if staff exists (localStorage remember-me OR sessionStorage)
  useEffect(() => {
    let cancelled = false;

    try {
      const staffRaw =
        localStorage.getItem("medilink_staff") ||
        sessionStorage.getItem("medilink_staff_session");
      const token =
        localStorage.getItem("medilink_token") ||
        sessionStorage.getItem("medilink_token");

      if (!staffRaw || !token) return;

      apiFetch("/api/staff/me")
        .then(() => {
          if (cancelled) return;
          setIsAuthenticated(true);
          setAuthPage("login");
          setCurrentPage("dashboard");
        })
        .catch(() => {
          if (cancelled) return;
          try {
            localStorage.removeItem("medilink_token");
            localStorage.removeItem("medilink_staff");
            sessionStorage.removeItem("medilink_token");
            sessionStorage.removeItem("medilink_staff_session");
          } catch {
            // ignore
          }
          setIsAuthenticated(false);
          setAuthPage("login");
        });
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    (async () => {
      try {
        const data = await apiFetch<{ notifications: Array<{ unread: boolean }> }>("/api/staff/notifications");
        if (!cancelled) {
          setUnreadCount((data.notifications || []).filter((item) => item.unread).length);
        }
      } catch (error) {
        console.error("STAFF NOTIFICATION COUNT ERROR:", error);
        if (!cancelled) setUnreadCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentPage]);

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
      if (data?.patient) {
        setSelectedPatient(data.patient);
        setPatientDetailsContext({
          medicationId: data.medicationId,
          medicationChangeRequestId: data.medicationChangeRequestId,
        });
      } else {
        setSelectedPatient(data);
        setPatientDetailsContext(null);
      }
      setCurrentPage("patient-details");
      return;
    }

    setSelectedPatient(null);
    setPatientDetailsContext(null);
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
          <PatientDetails patient={selectedPatient} onNavigate={handleNavigate} medicationContext={patientDetailsContext} />
        )}

        {currentPage === "appointments" && <Appointments onNavigate={handleNavigate} />}

        {currentPage === "messages" && <Messages onNavigate={handleNavigate} />}

        {currentPage === "notifications" && <Notifications onNavigate={handleNavigate} />}

        {currentPage === "documents" && <Documents />}

        {currentPage === "settings" && <Settings />}
      </Layout>

      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
