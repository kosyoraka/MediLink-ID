import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  onSignOut?: () => void;
};

export function PlaceholderScreen({
  title,
  description,
  onPrimaryAction,
  primaryLabel = 'Back to Dashboard',
  onSignOut,
}: PlaceholderScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {onPrimaryAction ? <Button label={primaryLabel} onPress={onPrimaryAction} /> : null}
        {onSignOut ? <Button label="Sign Out" onPress={onSignOut} variant="outline" /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: typography.body,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
