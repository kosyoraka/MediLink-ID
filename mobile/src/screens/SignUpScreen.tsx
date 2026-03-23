import { ArrowLeft, Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { colors, radii, spacing, typography } from '../theme/tokens';

type SignUpScreenProps = {
  onBack: () => void;
  onSignedUp: (email: string) => void;
};

function getPasswordStrength(password: string) {
  if (!password) return { strength: 0, label: '' };
  if (password.length < 6) return { strength: 1, label: 'Weak' };
  if (password.length < 10) return { strength: 2, label: 'Medium' };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { strength: 3, label: 'Strong' };
  return { strength: 2, label: 'Medium' };
}

export function SignUpScreen({ onBack, onSignedUp }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async () => {
    if (!email || !password || !agreed) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.signUp(email, password, agreed);
      onSignedUp(data.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      Alert.alert('Signup failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.backButton}>
        <ArrowLeft color={colors.textMuted} size={24} />
      </Pressable>

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Get started with MediLink ID</Text>

      <View style={styles.form}>
        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.fieldGroup}>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password"
            toggleSecure
          />
          {password ? (
            <>
              <View style={styles.meterRow}>
                {[1, 2, 3].map((segment) => (
                  <View
                    key={segment}
                    style={[
                      styles.meterSegment,
                      strength.strength >= segment
                        ? strength.strength === 1
                          ? styles.meterWeak
                          : strength.strength === 2
                          ? styles.meterMedium
                          : styles.meterStrong
                        : styles.meterIdle,
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  strength.strength === 1
                    ? styles.weakText
                    : strength.strength === 2
                    ? styles.mediumText
                    : styles.strongText,
                ]}
              >
                {strength.label}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.oauthBlock}>
          <Text style={styles.oauthTitle}>Or sign up with</Text>
          <Button label="Sign up with Apple" variant="outline" />
          <Button label="Sign up with Google" variant="outline" />
        </View>

        <Pressable onPress={() => setAgreed((value) => !value)} style={styles.termsRow}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Check color={colors.white} size={14} /> : null}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </Pressable>

        <Button label={loading ? 'Creating...' : 'Create Account'} onPress={handleSubmit} disabled={!email || !password || !agreed} loading={loading} />
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
    width: 32,
    marginBottom: spacing.lg,
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
  errorBox: {
    fontSize: typography.small,
    color: colors.red,
    backgroundColor: colors.redLight,
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  meterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  meterSegment: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
  },
  meterIdle: {
    backgroundColor: colors.border,
  },
  meterWeak: {
    backgroundColor: colors.red,
  },
  meterMedium: {
    backgroundColor: colors.yellow,
  },
  meterStrong: {
    backgroundColor: colors.green,
  },
  strengthLabel: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  weakText: {
    color: colors.red,
  },
  mediumText: {
    color: colors.yellow,
  },
  strongText: {
    color: colors.green,
  },
  oauthBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  oauthTitle: {
    fontSize: typography.body,
    color: colors.text,
  },
  termsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  termsText: {
    flex: 1,
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  linkText: {
    color: colors.teal,
    fontWeight: '600',
  },
});
