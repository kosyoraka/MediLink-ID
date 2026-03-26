import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, type NavItem } from './components/ui/BottomNav';
import { DashboardScreen } from './screens/DashboardScreen';
import { ConnectProvidersScreen } from './screens/ConnectProvidersScreen';
import { ManageProvidersScreen } from './screens/ManageProvidersScreen';
import { AppointmentsScreen } from './screens/AppointmentsScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { MoreScreen } from './screens/MoreScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { RecordsScreen } from './screens/RecordsScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { WebAppScreen } from './screens/WebAppScreen';
import { api } from './lib/api';
import { clearSession, getItem } from './lib/storage';
import { colors } from './theme/tokens';

type Screen =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'profile-setup'
  | 'connect-providers'
  | 'web-app'
  | 'dashboard'
  | 'records'
  | 'appointments'
  | 'messages'
  | 'more'
  | 'medications'
  | 'symptom-checker'
  | 'medical-history'
  | 'health-tasks'
  | 'health-summary'
  | 'care-journeys'
  | 'recommendations'
  | 'nutrition-fitness'
  | 'documents'
  | 'manage-providers'
  | 'personal-information'
  | 'emergency-profile'
  | 'notifications';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [connectedProviderIds, setConnectedProviderIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userHealthCard, setUserHealthCard] = useState('');
  const [userDob, setUserDob] = useState('');

  const embeddedWebScreens: Screen[] = [
    'web-app',
    'dashboard',
    'records',
    'appointments',
    'messages',
    'more',
    'medications',
    'symptom-checker',
    'medical-history',
    'health-tasks',
    'health-summary',
    'care-journeys',
    'recommendations',
    'nutrition-fitness',
    'documents',
    'manage-providers',
    'personal-information',
    'emergency-profile',
    'notifications',
  ];
  const shouldUseEmbeddedWebApp = isOnboarded && embeddedWebScreens.includes(currentScreen);
  const showBottomNav = false;
  const safeAreaEdges = ['top', 'left', 'right'] as const;

  const screenTitle = useMemo(() => {
    switch (currentScreen) {
      case 'records':
        return 'Medical Records';
      case 'appointments':
        return 'Appointments';
      case 'messages':
        return 'Messages';
      case 'more':
        return 'More';
      case 'medications':
        return 'Medications';
      case 'symptom-checker':
        return 'Find Care AI';
      case 'medical-history':
        return 'Medical History';
      case 'health-tasks':
        return 'Health Tasks';
      case 'health-summary':
        return 'Health Summary';
      case 'care-journeys':
        return 'Care Journeys';
      case 'recommendations':
        return 'Recommendations';
      case 'nutrition-fitness':
        return 'Nutrition & Fitness';
      case 'documents':
        return 'Documents';
      default:
        return '';
    }
  }, [currentScreen]);

  const handleNavigation = (screen: Screen, navItem?: NavItem) => {
    setCurrentScreen(screen);
    if (navItem) setActiveNav(navItem);
  };

  const applyProfileState = (profile: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    health_card: string | null;
    dob: string | null;
  }) => {
    setUserEmail(profile.email ?? '');
    setUserName([profile.first_name, profile.last_name].filter(Boolean).join(' ').trim());
    setUserHealthCard(profile.health_card ?? '');
    setUserDob(profile.dob ?? '');
  };

  const restoreSession = async () => {
    try {
      const token = await getItem('token');
      if (!token) {
        setCurrentScreen('welcome');
        setIsOnboarded(false);
        return;
      }

      const storedEmail = await getItem('email');
      if (storedEmail) {
        setUserEmail(storedEmail);
      }

      const profile = await api.getProfile();
      applyProfileState(profile);

      const profileComplete = Boolean(
        profile.first_name &&
          profile.last_name &&
          profile.health_card &&
          profile.dob
      );

      setIsOnboarded(profileComplete);
      setCurrentScreen(profileComplete ? 'web-app' : 'profile-setup');
      setActiveNav('home');

      if (profileComplete) {
        try {
          const { providers } = await api.listMyProviders();
          setConnectedProviderIds(providers.map((provider) => provider.id));
        } catch {
          setConnectedProviderIds([]);
        }
      }
    } catch {
      await clearSession();
      setIsOnboarded(false);
      setCurrentScreen('welcome');
      setUserEmail('');
      setUserName('');
      setUserHealthCard('');
      setUserDob('');
      setConnectedProviderIds([]);
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void restoreSession();
  }, []);

  const completeOnboarding = () => {
    setIsOnboarded(true);
    setCurrentScreen('web-app');
    setActiveNav('home');
  };

  const handleSignOut = async () => {
    await clearSession();
    setIsOnboarded(false);
    setActiveNav('home');
    setCurrentScreen('welcome');
    setUserEmail('');
    setUserName('');
    setUserHealthCard('');
    setUserDob('');
    setConnectedProviderIds([]);
  };

  const renderScreen = () => {
    if (isBootstrapping) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      );
    }

    if (shouldUseEmbeddedWebApp) {
      return <WebAppScreen onSignedOut={handleSignOut} />;
    }

    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={() => handleNavigation('signup')} onSignIn={() => handleNavigation('signin')} />;
      case 'signin':
        return (
          <SignInScreen
            onBack={() => handleNavigation('welcome')}
            onSignedIn={async ({ email }) => {
              setUserEmail(email);

              try {
                const profile = await api.getProfile();
                applyProfileState(profile);

                const profileComplete = Boolean(
                  profile.first_name &&
                    profile.last_name &&
                    profile.health_card &&
                    profile.dob
                );

                if (profileComplete) {
                  try {
                    const { providers } = await api.listMyProviders();
                    setConnectedProviderIds(providers.map((provider) => provider.id));
                  } catch {
                    setConnectedProviderIds([]);
                  }
                  completeOnboarding();
                } else {
                  handleNavigation('profile-setup');
                }
              } catch {
                handleNavigation('profile-setup');
              }
            }}
          />
        );
      case 'signup':
        return <SignUpScreen onBack={() => handleNavigation('welcome')} onSignedUp={(email) => {
          setUserEmail(email);
          handleNavigation('profile-setup');
        }} />;
      case 'profile-setup':
        return (
          <ProfileSetupScreen
            onBack={() => handleNavigation('signup')}
            onComplete={({ firstName, lastName, healthCard, dob }) => {
              setUserName(`${firstName} ${lastName}`.trim());
              setUserHealthCard(healthCard);
              setUserDob(dob);
              handleNavigation('connect-providers');
            }}
          />
        );
      case 'connect-providers':
        return (
          <ConnectProvidersScreen
            connectedProviderIds={connectedProviderIds}
            onConnect={(providerId) => {
              setConnectedProviderIds((current) =>
                current.includes(providerId) ? current : [...current, providerId]
              );
            }}
            onNext={completeOnboarding}
            onBack={() => handleNavigation('profile-setup')}
          />
        );
      case 'web-app':
        return <WebAppScreen onSignedOut={handleSignOut} />;
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={(screen) => handleNavigation(screen as Screen)}
            userName={userName}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
          />
        );
      case 'records':
        return <RecordsScreen onNavigate={(screen) => handleNavigation(screen as Screen)} />;
      case 'appointments':
        return <AppointmentsScreen onNavigate={(screen) => handleNavigation(screen as Screen)} />;
      case 'messages':
        return <MessagesScreen />;
      case 'more':
        return (
          <MoreScreen
            onNavigate={(screen) => handleNavigation(screen as Screen, 'more')}
            onSignOut={handleSignOut}
            userName={userName}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
          />
        );
      case 'manage-providers':
        return <ManageProvidersScreen onBack={() => handleNavigation('more', 'more')} />;
      default:
        return (
          <PlaceholderScreen
            title={screenTitle}
            description={`This native screen is next in the port queue. The goal is to match the current web app exactly, but screen by screen.`}
            onPrimaryAction={() => handleNavigation('dashboard', 'home')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
          <View style={styles.content}>{renderScreen()}</View>
          {showBottomNav ? (
            <BottomNav
              active={activeNav}
              onChange={(item) => {
                setActiveNav(item);
                if (item === 'home') return setCurrentScreen('dashboard');
                if (item === 'records') return setCurrentScreen('records');
                if (item === 'appointments') return setCurrentScreen('appointments');
                if (item === 'messages') return setCurrentScreen('messages');
                return setCurrentScreen('more');
              }}
            />
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
