import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { clearSession, getItem } from '../lib/storage';
import { colors } from '../theme/tokens';

type WebAppScreenProps = {
  onSignedOut: () => void;
};

type AuthPayload = {
  patientId: string;
  email: string;
  token: string;
  profileComplete: string;
  emergencyComplete: string;
};

const WEB_APP_URL = 'https://medilinkid.com';

function escapeForJs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function WebAppScreen({ onSignedOut }: WebAppScreenProps) {
  const [authPayload, setAuthPayload] = useState<AuthPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [patientId, email, token, profileComplete, emergencyComplete] = await Promise.all([
        getItem('patientId'),
        getItem('email'),
        getItem('token'),
        getItem('profileComplete'),
        getItem('emergencyComplete'),
      ]);

      if (!mounted) return;

      if (!patientId || !token) {
        await clearSession();
        onSignedOut();
        return;
      }

      setAuthPayload({
        patientId,
        email: email || '',
        token,
        profileComplete: profileComplete || 'true',
        emergencyComplete: emergencyComplete || 'false',
      });
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [onSignedOut]);

  const injectedJavaScriptBeforeContentLoaded = useMemo(() => {
    if (!authPayload) return '';

    const patientId = escapeForJs(authPayload.patientId);
    const email = escapeForJs(authPayload.email);
    const token = escapeForJs(authPayload.token);
    const profileComplete = escapeForJs(authPayload.profileComplete);
    const emergencyComplete = escapeForJs(authPayload.emergencyComplete);

    return `
      (function() {
        localStorage.setItem('patientId', '${patientId}');
        localStorage.setItem('email', '${email}');
        localStorage.setItem('patient_token', '${token}');
        localStorage.setItem('token', '${token}');
        localStorage.setItem('profileComplete', '${profileComplete}');
        localStorage.setItem('emergencyComplete', '${emergencyComplete}');

        function postAuthState() {
          const signedIn = Boolean(localStorage.getItem('patient_token') || localStorage.getItem('token'));
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'auth-state',
            signedIn: signedIn
          }));
        }

        postAuthState();
        window.addEventListener('storage', postAuthState);
        setInterval(postAuthState, 1000);
      })();
      true;
    `;
  }, [authPayload]);

  if (!authPayload) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.webviewShell}>
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={async (event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === 'auth-state' && payload?.signedIn === false) {
              await clearSession();
              onSignedOut();
            }
          } catch {
            // ignore malformed bridge messages
          }
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webviewShell: {
    flex: 1,
    backgroundColor: colors.white,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
