import { useEffect, useState } from 'react';
import { Home, FolderOpen, Calendar, MessageSquare, MoreHorizontal } from 'lucide-react';
import WelcomeLanding from './components/onboarding/WelcomeLanding';
import SignIn from './components/onboarding/SignIn';
import SignUp from './components/onboarding/SignUp';
import VerifyEmail from './components/onboarding/VerifyEmail';
import ProfileSetup from './components/onboarding/ProfileSetup';
import ConnectProviders from './components/onboarding/ConnectProviders';
import Authorization from './components/onboarding/Authorization';
import EmergencySetup from './components/onboarding/EmergencySetup';
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
import SymptomChecker from './components/SymptomChecker';
import MedicalHistory from './components/MedicalHistory';
import CommunicationPreferences from './components/CommunicationPreferences';
import ManageProviders from './components/ManageProviders';
import EmergencyPublic from './components/EmergencyPublic';
import PersonalInformationPage from './components/PersonalInformationPage';
import { API_BASE } from "@/config/api";
console.log("API_BASE =", API_BASE);


type Screen = 
  | 'welcome' 
  | 'signin'
  | 'signup' 
  | 'verify-email' 
  | 'profile-setup' 
  | 'connect-providers' 
  | 'authorization'
  | 'emergency-setup'
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
  | 'symptom-checker'
  | 'medical-history'
  | 'communication-preferences'
  | 'manage-providers';

type NavItem = 'home' | 'records' | 'appointments' | 'messages' | 'more';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userHealthCard, setUserHealthCard] = useState('');
  const [userDOB, setUserDOB] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [emergencyToken, setEmergencyToken] = useState('');
  const [authorizationReturnScreen, setAuthorizationReturnScreen] = useState<Screen>('connect-providers');

  const handleNavigation = (screen: Screen, navItem?: NavItem) => {
    setCurrentScreen(screen);
    if (navItem) setActiveNav(navItem);
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
    setCurrentScreen('dashboard');
  };

  const handleSignOut = () => {
    setIsOnboarded(false);
    setCurrentScreen('welcome');
    setActiveNav('home');
    setUserEmail('');
    setSelectedProvider('');
    setConnectedProviders([]);
  };

  const showBottomNav = isOnboarded && ![
    'emergency-profile',
    'medications',
    'health-tasks',
    'health-summary',
    'care-journeys',
    'recommendations',
    'documents',
    'symptom-checker',
    'medical-history',
    'communication-preferences',
    'manage-providers'
  ].includes(currentScreen);

  useEffect(() => {
  const path = window.location.pathname;
  const match = path.match(/^\/e\/([^/]+)$/);
  if (match) {
    setEmergencyToken(match[1]);
    setCurrentScreen('emergency-public');
  }
}, []);


  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeLanding 
          onGetStarted={() => handleNavigation('signup')} 
          onSignIn={() => handleNavigation('signin')}
        />;
      case 'signin':
        return <SignIn 
          onSignIn={(userData) => {
            setUserEmail(userData.email);
            if (userData.name) {
              setUserName(userData.name);
              setUserHealthCard(userData.healthCard);
              setUserDOB(userData.dob);
            }
            if (userData.connectedProviders) {
              setConnectedProviders(userData.connectedProviders);
            }
            completeOnboarding();
          }}
          onBack={() => handleNavigation('welcome')}
        />;
      case 'signup':
        return <SignUp onSignUp={(email) => {
          setUserEmail(email);
          handleNavigation('profile-setup');
        }} />;
      case 'verify-email':
        return <VerifyEmail email={userEmail} onVerified={() => handleNavigation('profile-setup')} />;
      case 'profile-setup':
        return <ProfileSetup 
          onNext={(firstName, lastName, healthCard, dob) => {
            setUserName(`${firstName} ${lastName}`);
            setUserHealthCard(healthCard);
            setUserDOB(dob);
            handleNavigation('connect-providers');
          }} 
          onBack={() => handleNavigation('signup')}
        />;
      case 'connect-providers':
        return <ConnectProviders 
          connectedProviders={connectedProviders}
          onConnect={(provider) => {
            setSelectedProvider(provider);
            setAuthorizationReturnScreen('connect-providers');
            handleNavigation('authorization');
          }} 
          onNext={() => handleNavigation('emergency-setup')} 
          onBack={() => handleNavigation('profile-setup')}
        />;
      case 'authorization':
        return <Authorization 
          provider={selectedProvider} 
          onAuthorize={() => {
            if (!connectedProviders.includes(selectedProvider)) {
              setConnectedProviders([...connectedProviders, selectedProvider]);
            }
            handleNavigation(authorizationReturnScreen);
          }} 
        />;
      case 'emergency-setup':
        return <EmergencySetup onFinish={completeOnboarding} />;
      case 'dashboard':
        return <Dashboard 
          onNavigate={handleNavigation} 
          userName={userName}
          userEmail={userEmail}
          userHealthCard={userHealthCard}
        />;
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
        return <More 
          onNavigate={handleNavigation} 
          onSignOut={handleSignOut}
          userName={userName}
          userEmail={userEmail}
          userHealthCard={userHealthCard}
        />; 
      case 'medications':
        return <Medications onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'emergency-profile':
        return <EmergencyProfile 
          onBack={() => handleNavigation('more', 'more')} 
          userName={userName}
          userHealthCard={userHealthCard}
          userDOB={userDOB}
        />;
      case 'emergency-public':
        return <EmergencyPublic token={emergencyToken} />;
      case 'health-tasks':
        return <HealthTasks onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'health-summary':
        return <HealthSummary onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'care-journeys':
        return <CareJourneys onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'recommendations':
        return <Recommendations onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'documents':
        return <DocumentCenter onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'symptom-checker':
        return <SymptomChecker onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'medical-history':
        return <MedicalHistory onBack={() => handleNavigation('dashboard', 'home')} />;
      case 'communication-preferences':
        return <CommunicationPreferences onBack={() => handleNavigation('more', 'more')} />;
      case 'manage-providers':
        return <ManageProviders 
          connectedProviders={connectedProviders}
          onConnect={(provider) => {
            setSelectedProvider(provider);
            setAuthorizationReturnScreen('manage-providers');
            handleNavigation('authorization');
          }}
          onRemove={(provider) => {
            setConnectedProviders(connectedProviders.filter(p => p !== provider));
          }}
          onBack={() => handleNavigation('more', 'more')} 
        />; 
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20">
        {renderScreen()}
        
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