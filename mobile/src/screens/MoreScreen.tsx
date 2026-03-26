import {
  AlertCircle,
  Bell,
  Building2,
  ChevronRight,
  HelpCircle,
  Info,
  LogOut,
  Settings,
  Shield,
  User,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, typography } from '../theme/tokens';

type MoreScreenProps = {
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
  userName?: string;
  userEmail?: string;
  userHealthCard?: string;
};

const menuSections = [
  {
    title: 'Profile',
    items: [
      { icon: User, label: 'Profile & Account', screen: 'personal-information' },
      { icon: AlertCircle, label: 'Emergency Profile', screen: 'emergency-profile' },
      { icon: Building2, label: 'Connected Providers', screen: 'manage-providers' },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { icon: Shield, label: 'Privacy Settings', screen: null },
      { icon: Settings, label: 'Two-Factor Authentication', screen: null },
      { icon: Shield, label: 'Login History', screen: null },
    ],
  },
  {
    title: 'Notifications',
    items: [{ icon: Bell, label: 'Notification Preferences', screen: 'notifications' }],
  },
  {
    title: 'Help & Support',
    items: [
      { icon: HelpCircle, label: 'FAQs', screen: null },
      { icon: HelpCircle, label: 'Contact Support', screen: null },
      { icon: HelpCircle, label: 'Tutorial Videos', screen: null },
    ],
  },
  {
    title: 'About',
    items: [
      { icon: Info, label: 'Version 1.0.0', screen: null },
      { icon: Info, label: 'Privacy Policy', screen: null },
      { icon: Info, label: 'Terms of Service', screen: null },
    ],
  },
] as const;

export function MoreScreen({
  onNavigate,
  onSignOut,
  userName = '',
  userEmail = '',
  userHealthCard = '',
}: MoreScreenProps) {
  const displayName = userName || 'Guest User';
  const displayEmail = userEmail || 'user@email.com';
  const displayHealthCard = userHealthCard || '0000-000-000';

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'GU';
  }, [displayName]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient colors={gradients.hero} style={styles.hero}>
        <Text style={styles.heroTitle}>Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{displayEmail}</Text>
            <Text style={styles.profileHealthCard}>Health Card: {displayHealthCard}</Text>
          </View>
        </View>
      </LinearGradient>

      {menuSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => item.screen && onNavigate(item.screen)}
                style={[styles.menuRow, index < section.items.length - 1 ? styles.menuRowBorder : null]}
              >
                <View style={styles.menuIconWrap}>
                  <item.icon color={colors.textMuted} size={20} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.screen ? <ChevronRight color={colors.textSoft} size={18} /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.signOutCard}>
        <Pressable onPress={onSignOut} style={styles.signOutRow}>
          <View style={styles.signOutIconWrap}>
            <LogOut color={colors.red} size={20} />
          </View>
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>MediLink ID</Text>
        <Text style={styles.footerCopy}>© 2026 All rights reserved</Text>
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
    paddingBottom: spacing.xxxl,
  },
  hero: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    gap: spacing.lg,
  },
  heroTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.white,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.teal,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    color: colors.white,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.body,
  },
  profileHealthCard: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.small,
  },
  section: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.sm,
    fontSize: typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
  },
  signOutCard: {
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
  },
  signOutRow: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  signOutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    color: colors.red,
    fontSize: typography.body,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  footerTitle: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  footerCopy: {
    color: colors.textSoft,
    fontSize: typography.tiny,
  },
});
