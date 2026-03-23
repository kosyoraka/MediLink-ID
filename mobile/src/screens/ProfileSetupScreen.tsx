import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { setItem } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { colors, radii, spacing, typography } from '../theme/tokens';

type ProfileSetupScreenProps = {
  onBack: () => void;
  onComplete: (payload: { firstName: string; lastName: string; healthCard: string; dob: string }) => void;
};

function formatHealthCard(value: string) {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
  if (digitsOnly.length <= 4) return digitsOnly;
  if (digitsOnly.length <= 7) return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
}

export function ProfileSetupScreen({ onBack, onComplete }: ProfileSetupScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [healthCard, setHealthCard] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const healthCardDigits = healthCard.replace(/\D/g, '');
    if (healthCardDigits.length !== 10) {
      setError('Health card number must be 10 digits.');
      return;
    }

    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    try {
      setLoading(true);
      await api.saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        healthCard: healthCardDigits,
        phoneNumber: phone.trim(),
      });
      await setItem('profileComplete', 'true');
      onComplete({ firstName, lastName, healthCard: healthCardDigits, dob });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save profile';
      setError(message);
      Alert.alert('Profile setup failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={colors.textMuted} size={24} />
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
          <View style={styles.progressSegment} />
          <View style={styles.progressSegment} />
        </View>
        <Text style={styles.progressText}>Step 1 of 3</Text>
      </View>

      <Text style={styles.title}>Let's set up your profile</Text>
      <Text style={styles.subtitle}>This helps your healthcare providers identify you correctly.</Text>
      <Text style={styles.requiredText}><Text style={{ color: colors.red }}>*</Text> Indicates a required field</Text>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <TextField label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="John" />
          </View>
          <View style={styles.halfField}>
            <TextField label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Doe" />
          </View>
        </View>

        <TextField label="Date of Birth *" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <TextField
          label="Health Card Number (Ontario) *"
          value={healthCard}
          onChangeText={(value) => setHealthCard(formatHealthCard(value))}
          placeholder="1234-567-890"
          helperText="Required to connect with healthcare providers"
          keyboardType="number-pad"
        />
        <TextField label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="(416) 555-0123" keyboardType="phone-pad" />

        <Button label={loading ? 'Saving...' : 'Continue'} onPress={handleSubmit} loading={loading} />
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
    gap: spacing.lg,
  },
  headerRow: {
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 32,
  },
  progressWrap: {
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    backgroundColor: colors.teal,
  },
  progressText: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  requiredText: {
    fontSize: typography.small,
    color: colors.textSoft,
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
  form: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
});
