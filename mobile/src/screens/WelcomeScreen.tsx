import { CheckCircle, Shield } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

type WelcomeScreenProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
};

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.centerBlock}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/medilink-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.imageCard}>
          <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
        </View>

        <Text style={styles.title}>Your health records. One place. Always with you.</Text>
        <Text style={styles.subtitle}>
          Access your complete medical history, manage appointments, and share emergency information instantly.
        </Text>

        <View style={styles.actions}>
          <Button label="Get Started" onPress={onGetStarted} />
          <Button label="Sign In" onPress={onSignIn} variant="outline" />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Shield color={colors.teal} size={18} />
          <Text style={styles.footerText}>HL7 FHIR Compliant</Text>
        </View>
        <View style={styles.footerItem}>
          <CheckCircle color={colors.teal} size={18} />
          <Text style={styles.footerText}>MediLink ID, 2025-2026</Text>
        </View>
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
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  centerBlock: {
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 154,
    height: 64,
  },
  imageCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.xxxl,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 1.2,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.md,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  footer: {
    gap: spacing.md,
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
});
