import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { colors, spacing, typography } from '../theme/tokens';

type SignInScreenProps = {
  onBack: () => void;
  onSignedIn: (payload: { email: string }) => void;
};

export function SignInScreen({ onBack, onSignedIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;

    try {
      setLoading(true);
      const data = await api.signIn(email, password);
      onSignedIn({ email: data.email });
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.backButton}>
        <ArrowLeft color={colors.textMuted} size={24} />
      </Pressable>

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to access your health records</Text>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          toggleSecure
        />

        <View style={styles.utilityRow}>
          <Text style={styles.utilityText}>Remember me</Text>
          <Text style={styles.linkText}>Forgot password?</Text>
        </View>

        <Button label="Sign In" onPress={handleSubmit} disabled={!email || !password} loading={loading} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>

        <Button label="Sign in with Apple" variant="outline" />
        <Button label="Sign in with Google" variant="outline" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
    width: 32,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginTop: -spacing.md,
  },
  form: {
    gap: spacing.xl,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilityText: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  linkText: {
    fontSize: typography.small,
    color: colors.teal,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
});
