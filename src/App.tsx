import { useEffect, useState } from 'react';
import { Home, FolderOpen, Calendar, MessageSquare, MoreHorizontal } from 'lucide-react';
import WelcomeLanding from './components/onboarding/WelcomeLanding';
import SignIn from './components/onboarding/SignIn';
import SignUp from './components/onboarding/SignUp';
import VerifyEmail from './components/onboarding/VerifyEmail';
import ForgotPassword from './components/onboarding/ForgotPassword';
import ResetPassword from './components/onboarding/ResetPassword';
import ProfileSetup from './components/onboarding/ProfileSetup';
import ConnectProviders from './components/onboarding/ConnectProviders';
import Authorization from './components/onboarding/Authorization';
import Dashboard from './components/Dashboard';
import MedicalRecords from './components/MedicalRecords';
import Appointments from './components/Appointments';
import Messages from './components/Messages';
import More from './components/More';
import Medications from './components/Medications';
import EmergencyProfile from './components/EmergencyProfile';
import HealthTasks from './components/HealthTasks';
import HealthSummary from './components/HealthSummary';
import CareJourneys from './components/CareJourneys';
import Recommendations from './components/Recommendations';
import DocumentCenter from './components/DocumentCenter';
import NutritionFitness from './components/NutritionFitness';
import SymptomChecker from './components/SymptomChecker';
import MedicalHistory from './components/MedicalHistory';
import CommunicationPreferences from './components/CommunicationPreferences';
import ManageProviders from './components/ManageProviders';
import EmergencyPublic from './components/EmergencyPublic';
import PersonalInformationPage from './components/PersonalInformationPage';
import Notifications from './components/Notifications';
import SettingsDetailPages, { type SettingsPage } from './components/SettingsDetailPages';
import { API_BASE } from "@/config/api";
import type { PatientDataScreen } from '@/lib/patientDataNavigation';
console.log("API_BASE =", API_BASE);

type Screen =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'profile-setup'
  | 'connect-providers'
  | 'authorization'
  | 'dashboard'
  | 'records'
  | 'appointments'
  | 'messages'
  | 'more'
  | 'personal-information'
  | 'medications'
  | 'emergency-profile'
  | 'emergency-public'
  | 'health-tasks'
  | 'health-summary'
  | 'care-journeys'
  | 'recommendations'
  | 'documents'
  | 'nutrition-fitness'
  | 'symptom-checker'
  | 'medical-history'
  | 'communication-preferences'
  | 'manage-providers'
  | 'notifications'
  | SettingsPage;

type NavItem = 'home' | 'records' | 'appointments' | 'messages' | 'more';

function getEmergencyTokenFromPath() {
  const match = window.location.pathname.match(/^\/e\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function App() {
  const initialEmergencyToken = getEmergencyTokenFromPath();
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    initialEmergencyToken ? 'emergency-public' : 'welcome'
  );
  const [activeNav, setActiveNav] = useState<NavItem>('home');

  const [userEmail, setUserEmail] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'expired' | 'invalid' | 'error'>('pending');
  const [resetToken, setResetToken] = useState('');
  const [userName, setUserName] = useState('');
  const [userHealthCard, setUserHealthCard] = useState('');
  const [userDOB, setUserDOB] = useState('');
  const [profilePrefill, setProfilePrefill] = useState<{ firstName: string; lastName: string }>({
    firstName: '',
    lastName: '',
  });

  // Keep Authorization UI in the app, but we won't route to it from provider connect actions
  const [selectedProvider, setSelectedProvider] = useState(''); // (kept for Authorization screen)
  const [authorizationReturnScreen, setAuthorizationReturnScreen] = useState<Screen>('connect-providers');

  const [isOnboarded, setIsOnboarded] = useState(false);

  // IMPORTANT: This now stores PROVIDER IDS (UUIDs), not names
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  const [emergencyToken, setEmergencyToken] = useState(initialEmergencyToken);
  const [bootstrappingSession, setBootstrappingSession] = useState(!initialEmergencyToken);

  const syncOnboardingState = async (
    email: string,
    options?: { firstName?: string; lastName?: string }
  ) => {
    const patientId = localStorage.getItem("patientId");
    const token = localStorage.getItem("patient_token");

    setUserEmail(email);

    if (!patientId) {
      setProfilePrefill({
        firstName: options?.firstName || "",
        lastName: options?.lastName || "",
      });
      handleNavigation("profile-setup");
      return;
    }

    try {
      const authHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      const [profileRes, providersRes] = await Promise.all([
        fetch(`${API_BASE}/api/patients/${patientId}/profile`),
        fetch(`${API_BASE}/api/patient/connected-providers`, {
          headers: authHeaders,
        }),
      ]);

      const profile = profileRes.ok ? await profileRes.json() : null;
      const providersData = providersRes.ok ? await providersRes.json() : null;

      const profileComplete = Boolean(
        profile?.first_name &&
          profile?.last_name &&
          profile?.dob &&
          profile?.health_card &&
          profile?.phone_number
      );
      const connectedProviderIds = Array.isArray(providersData?.providers)
        ? providersData.providers.map((provider: { id: string }) => provider.id)
        : [];

      setConnectedProviders(connectedProviderIds);

      if (profile?.first_name || profile?.last_name) {
        setProfilePrefill({
          firstName: profile?.first_name || options?.firstName || "",
          lastName: profile?.last_name || options?.lastName || "",
        });
      } else {
        setProfilePrefill({
          firstName: options?.firstName || "",
          lastName: options?.lastName || "",
        });
      }

      if (profileComplete) {
        setUserName(
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
        );
        setUserHealthCard(profile.health_card || "");
        setUserDOB(profile.dob || "");
        localStorage.setItem("profileComplete", "true");
      } else {
        localStorage.removeItem("profileComplete");
      }

      if (!profileComplete) {
        handleNavigation("profile-setup");
        return;
      }

      completeOnboarding();
    } catch (error) {
      console.error("Failed to sync onboarding state:", error);
      setProfilePrefill({
        firstName: options?.firstName || "",
        lastName: options?.lastName || "",
      });
      handleNavigation("profile-setup");
    }
  };

  const handleNavigation = (screen: Screen, navItem?: NavItem) => {
    setCurrentScreen(screen);
    if (navItem) setActiveNav(navItem);
  };

  const handlePatientDataNavigation = (screen: PatientDataScreen) => {
    const navItem: NavItem =
      screen === 'appointments'
        ? 'appointments'
        : screen === 'records'
        ? 'records'
        : screen === 'manage-providers' || screen === 'personal-information'
        ? 'more'
        : 'home';

    handleNavigation(screen, navItem);
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
    setCurrentScreen('dashboard');
    setActiveNav('home');
  };

  const handleSignOut = () => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patientId');
    localStorage.removeItem('email');
    localStorage.removeItem('profileComplete');
    setIsOnboarded(false);
    setCurrentScreen('welcome');
    setActiveNav('home');
    setUserEmail('');
    setUserName('');
    setUserHealthCard('');
    setUserDOB('');
    setSelectedProvider('');
    setConnectedProviders([]);
  };

  const showBottomNav =
    isOnboarded &&
    ![
      'emergency-profile',
      'medications',
      'health-tasks',
      'health-summary',
      'care-journeys',
      'recommendations',
      'documents',
      'nutrition-fitness',
      'symptom-checker',
      'medical-history',
      'communication-preferences',
      'manage-providers',
      'notifications',
      'emergency-public',
    ].includes(currentScreen);

  useEffect(() => {
    const pathEmergencyToken = getEmergencyTokenFromPath();
    if (pathEmergencyToken) {
      setEmergencyToken(pathEmergencyToken);
      setCurrentScreen('emergency-public');
      setBootstrappingSession(false);
    }
  }, []);

  useEffect(() => {
    if (emergencyToken) return;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const token = params.get('token');
    const status = params.get('status');
    const email = params.get('email');

    if (email) {
      setUserEmail(email);
    }

    if (mode === 'verify-email') {
      if (status === 'verified' || status === 'expired' || status === 'invalid' || status === 'error') {
        setVerificationStatus(status);
        setCurrentScreen('verify-email');
        return;
      }

      if (token) {
        void (async () => {
          try {
            const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const data = await res.json().catch(() => null);
            setUserEmail(data?.email || email || '');
            setVerificationStatus(res.ok ? 'verified' : 'invalid');
          } catch (error) {
            console.error('Inline verify-email failed:', error);
            setVerificationStatus('error');
          } finally {
            window.history.replaceState({}, '', '/?mode=verify-email');
            setCurrentScreen('verify-email');
          }
        })();
        return;
      }

      setVerificationStatus('pending');
      setCurrentScreen('verify-email');
      return;
    }

    if (mode === 'reset-password' && token) {
      setResetToken(token);
      setCurrentScreen('reset-password');
    }
  }, [emergencyToken]);

  useEffect(() => {
    if (emergencyToken) return;

    const token = localStorage.getItem('patient_token');
    const email = localStorage.getItem('email');
    const patientId = localStorage.getItem('patientId');

    if (!token || !email || !patientId) {
      setBootstrappingSession(false);
      return;
    }

    void (async () => {
      try {
        await syncOnboardingState(email);
      } finally {
        setBootstrappingSession(false);
      }
    })();
  }, [emergencyToken]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeLanding
            onGetStarted={() => handleNavigation('signup')}
            onSignIn={() => handleNavigation('signin')}
          />
        );

      case 'signin':
        return (
          <SignIn
            onSignIn={(userData) => {
              void syncOnboardingState(userData.email);
            }}
            onRequireVerification={(email) => {
              setUserEmail(email);
              setVerificationStatus('pending');
              handleNavigation('verify-email');
            }}
            onForgotPassword={() => handleNavigation('forgot-password')}
            onBack={() => handleNavigation('welcome')}
            onGoToSignUp={() => handleNavigation('signup')}
          />
        );

      case 'signup':
        return (
          <SignUp
            onBack={() => handleNavigation('welcome')}
            onGoToSignIn={() => handleNavigation('signin')}
            onSignUp={(email, prefill, options) => {
              setUserEmail(email);
              setProfilePrefill({
                firstName: prefill?.firstName || '',
                lastName: prefill?.lastName || '',
              });

              if (options?.skipVerification) {
                void syncOnboardingState(email, {
                  firstName: prefill?.firstName || '',
                  lastName: prefill?.lastName || '',
                });
                return;
              }

              setVerificationStatus('pending');
              handleNavigation('verify-email');
            }}
          />
        );

      case 'verify-email':
        return (
          <VerifyEmail
            email={userEmail}
            status={verificationStatus}
            onBack={() => handleNavigation('signin')}
            onContinue={() => handleNavigation('signin')}
            onResendComplete={() => setVerificationStatus('pending')}
          />
        );

      case 'forgot-password':
        return (
          <ForgotPassword
            initialEmail={userEmail}
            onBack={() => handleNavigation('signin')}
            onComplete={(email) => {
              setUserEmail(email);
            }}
          />
        );

      case 'reset-password':
        return (
          <ResetPassword
            token={resetToken}
            onBack={() => handleNavigation('signin')}
            onComplete={() => {
              setResetToken('');
              window.history.replaceState({}, '', '/');
              handleNavigation('signin');
            }}
          />
        );

      case 'profile-setup':
        return (
          <ProfileSetup
            initialFirstName={profilePrefill.firstName}
            initialLastName={profilePrefill.lastName}
            onNext={(firstName, lastName, healthCard, dob) => {
              setUserName(`${firstName} ${lastName}`);
              setUserHealthCard(healthCard);
              setUserDOB(dob);
              setProfilePrefill({ firstName: '', lastName: '' });
              handleNavigation('connect-providers');
            }}
            onBack={() => handleNavigation('signup')}
          />
        );

      case 'connect-providers':
        return (
          <ConnectProviders
            connectedProviderIds={connectedProviders}
            onConnect={(providerId) => {
              // ConnectProviders already writes to DB (api.connectProvider)
              // We just keep local state in sync
              if (!connectedProviders.includes(providerId)) {
                setConnectedProviders([...connectedProviders, providerId]);
              }
            }}
            onNext={completeOnboarding}
            onBack={() => handleNavigation('profile-setup')}
          />
        );

      case 'authorization':
        // Keeping this UI available, but not used in the connect flow right now
        return (
          <Authorization
            provider={selectedProvider}
            onAuthorize={() => {
              // Previously this added names; we keep this harmless.
              // If you later want Authorization to work again, pass providerId and insert it.
              handleNavigation(authorizationReturnScreen);
            }}
          />
        );

      case 'dashboard':
        return (
          <Dashboard
            onNavigate={handleNavigation}
            userName={userName}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
          />
        );

      case 'personal-information':
        return (
          <PersonalInformationPage
            onBack={() => handleNavigation('more', 'more')}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
            userName={userName}
          />
        );

      case 'records':
        return <MedicalRecords />;

      case 'appointments':
        return <Appointments />;

      case 'messages':
        return <Messages />;

      case 'more':
        return (
          <More
            onNavigate={handleNavigation}
            onSignOut={handleSignOut}
            userName={userName}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
          />
        );

      case 'medications':
        return <Medications onBack={() => handleNavigation('dashboard', 'home')} />;

      case 'emergency-profile':
        return (
          <EmergencyProfile
            onBack={() => handleNavigation('more', 'more')}
            userName={userName}
            userHealthCard={userHealthCard}
            userDOB={userDOB}
          />
        );

      case 'emergency-public':
        return <EmergencyPublic token={emergencyToken} />;

      case 'health-tasks':
        return (
          <HealthTasks
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={(screen) => {
              if (screen === 'appointments') handleNavigation('appointments', 'appointments');
              if (screen === 'records') handleNavigation('records', 'home');
              if (screen === 'medications') handleNavigation('medications', 'home');
              if (screen === 'manage-providers') handleNavigation('manage-providers', 'more');
              if (screen === 'messages') handleNavigation('messages', 'messages');
              if (screen === 'health-summary') handleNavigation('health-summary', 'home');
              if (screen === 'personal-information') handleNavigation('personal-information', 'more');
              if (screen === 'emergency-profile') handleNavigation('emergency-profile', 'more');
            }}
          />
        );

      case 'health-summary':
        return (
          <HealthSummary
            onBack={() => handleNavigation('dashboard', 'home')}
            onOpenMedications={() => handleNavigation('medications', 'home')}
          />
        );

      case 'care-journeys':
        return (
          <CareJourneys
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={handlePatientDataNavigation}
          />
        );

      case 'recommendations':
        return (
          <Recommendations
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={handlePatientDataNavigation}
          />
        );

      case 'documents':
        return <DocumentCenter onBack={() => handleNavigation('dashboard', 'home')} />;

      case 'nutrition-fitness':
        return (
          <NutritionFitness
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={handlePatientDataNavigation}
          />
        );

      case 'symptom-checker':
        return (
          <SymptomChecker
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={(screen) => {
              if (screen === 'appointments') handleNavigation('appointments', 'appointments');
              if (screen === 'messages') handleNavigation('messages', 'messages');
            }}
          />
        );

      case 'medical-history':
        return (
          <MedicalHistory
            onBack={() => handleNavigation('dashboard', 'home')}
            onNavigate={handlePatientDataNavigation}
          />
        );

      case 'communication-preferences':
        return <CommunicationPreferences onBack={() => handleNavigation('more', 'more')} />;

      case 'manage-providers':
        // DB-backed ManageProviders only needs onBack
        return <ManageProviders onBack={() => handleNavigation('more', 'more')} />;

      case 'notifications':
        return <Notifications onBack={() => handleNavigation('dashboard', 'home')} onNavigate={(screen) => handleNavigation(screen as Screen)} />;

      case 'privacy-settings':
      case 'session-management':
      case 'faqs':
      case 'contact-support':
      case 'tutorial-videos':
      case 'about':
      case 'app-version':
      case 'privacy-policy':
      case 'terms-of-service':
        return (
          <SettingsDetailPages
            page={currentScreen}
            onBack={() => handleNavigation('more', 'more')}
            onNavigate={(screen) => handleNavigation(screen as Screen)}
          />
        );

      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20">
        {bootstrappingSession && !emergencyToken ? (
          <div className="min-h-screen flex items-center justify-center p-6 text-gray-600">
            Restoring your session...
          </div>
        ) : (
          renderScreen()
        )}

        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
            <div className="flex justify-around items-center h-16">
              <button
                onClick={() => handleNavigation('dashboard', 'home')}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  activeNav === 'home' ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs mt-1">Home</span>
              </button>

              <button
                onClick={() => handleNavigation('records', 'records')}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  activeNav === 'records' ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <FolderOpen className="w-6 h-6" />
                <span className="text-xs mt-1">Records</span>
              </button>

              <button
                onClick={() => handleNavigation('appointments', 'appointments')}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  activeNav === 'appointments' ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-xs mt-1">Appointments</span>
              </button>

              <button
                onClick={() => handleNavigation('messages', 'messages')}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  activeNav === 'messages' ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-xs mt-1">Messages</span>
              </button>

              <button
                onClick={() => handleNavigation('more', 'more')}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  activeNav === 'more' ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <MoreHorizontal className="w-6 h-6" />
                <span className="text-xs mt-1">More</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
