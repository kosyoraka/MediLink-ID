import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, type NavItem } from './components/ui/BottomNav';
import { DashboardScreen } from './screens/DashboardScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { clearSession } from './lib/storage';
import { colors } from './theme/tokens';

type Screen =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'profile-setup'
  | 'dashboard'
  | 'records'
  | 'appointments'
  | 'messages'
  | 'more'
  | 'symptom-checker'
  | 'medical-history'
  | 'health-tasks'
  | 'health-summary'
  | 'care-journeys'
  | 'recommendations'
  | 'documents';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userHealthCard, setUserHealthCard] = useState('');
  const [userDob, setUserDob] = useState('');

  const showBottomNav = isOnboarded && ['dashboard', 'records', 'appointments', 'messages', 'more'].includes(currentScreen);

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

  const completeOnboarding = () => {
    setIsOnboarded(true);
    setCurrentScreen('dashboard');
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
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={() => handleNavigation('signup')} onSignIn={() => handleNavigation('signin')} />;
      case 'signin':
        return (
          <SignInScreen
            onBack={() => handleNavigation('welcome')}
            onSignedIn={({ email }) => {
              setUserEmail(email);
              completeOnboarding();
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
              completeOnboarding();
            }}
          />
        );
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={(screen) => handleNavigation(screen as Screen)}
            userName={userName}
            userEmail={userEmail}
            userHealthCard={userHealthCard}
          />
        );
      default:
        return (
          <PlaceholderScreen
            title={screenTitle}
            description={`This native screen is next in the port queue. The goal is to match the current web app exactly, but screen by screen.`}
            onPrimaryAction={() => handleNavigation('dashboard', 'home')}
            onSignOut={currentScreen === 'more' ? handleSignOut : undefined}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
});
