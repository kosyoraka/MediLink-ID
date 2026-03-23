import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  MapPin,
  Pill,
  Search,
  Settings,
  Stethoscope,
  Sun,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { api, type ProfileResponse } from '../lib/api';
import { colors, gradients, radii, shadows, spacing, typography } from '../theme/tokens';

type DashboardScreenProps = {
  onNavigate: (screen: string) => void;
  userName?: string;
  userEmail?: string;
  userHealthCard?: string;
};

const todos = [
  { task: 'Complete Annual Physical', due: 'Due: Dec 1', urgent: false },
  { task: 'Schedule Mammogram', due: 'Overdue by 2 months', urgent: true },
  { task: 'Review new lab results', due: '3 days ago', urgent: false },
];

const activityFeed = [
  { title: 'New lab results from LifeLabs', time: '2 hours ago', tone: 'blue' },
  { title: 'Prescription ready for pickup', time: 'Yesterday • Shoppers Drug Mart', tone: 'green' },
  { title: 'Appointment confirmed', time: 'Nov 15 • Dr. Sarah Johnson', tone: 'purple' },
] as const;

export function DashboardScreen({ onNavigate, userName = '', userEmail = '', userHealthCard = '' }: DashboardScreenProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [emergencyUrl, setEmergencyUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => undefined);
  }, []);

  const displayName = useMemo(() => {
    const dbName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return dbName || userName || profile?.email || 'Guest User';
  }, [profile, userName]);

  const displayEmail = profile?.email || userEmail || 'user@email.com';
  const displayHealthCard = profile?.health_card || userHealthCard || '0000-000-000';

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return 'GU';
  }, [displayName]);

  const maskedHealthCard = useMemo(() => {
    const digits = displayHealthCard.replace(/\D/g, '');
    if (digits.length >= 3) return `****${digits.slice(-3)}`;
    return '****';
  }, [displayHealthCard]);

  const quickActions: Array<{
    icon: typeof CalendarPlus;
    label: string;
    color: string;
    iconColor: string;
    screen?: string;
    action?: 'wallet';
  }> = [
    { icon: CalendarPlus, label: 'Schedule', color: colors.blueLight, iconColor: colors.blue },
    { icon: Upload, label: 'Upload', color: colors.purpleLight, iconColor: colors.purple },
    { icon: Search, label: 'Find Care AI', color: colors.orangeLight, iconColor: colors.orange, screen: 'symptom-checker' },
    { icon: FileText, label: 'Medical History', color: colors.pinkLight, iconColor: colors.pink, screen: 'medical-history' },
    { icon: Wallet, label: 'Emergency ID', color: colors.tealLight, iconColor: colors.teal, action: 'wallet' },
  ];

  const openWallet = async () => {
    setWalletOpen(true);
    setWalletLoading(true);
    setWalletError('');
    setCopied(false);

    try {
      const data = await api.getEmergencyLink();
      setEmergencyUrl(data.url || data.token);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to create emergency link');
      setEmergencyUrl('');
    } finally {
      setWalletLoading(false);
    }
  };

  const copyLink = async () => {
    if (!emergencyUrl) return;
    await Clipboard.setStringAsync(emergencyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openLink = async () => {
    if (!emergencyUrl) return;
    await Linking.openURL(emergencyUrl);
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.healthCard}>Health Card: {maskedHealthCard}</Text>
                <Text style={styles.heroEmail}>{displayEmail}</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <Pressable style={styles.iconButton}>
                <Bell color={colors.white} size={22} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => onNavigate('more')}>
                <Settings color={colors.white} size={22} />
              </Pressable>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Sun color="rgba(255,255,255,0.85)" size={16} />
            <Text style={styles.dateText}>{today} • Toronto, ON</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                style={styles.quickAction}
                onPress={() => {
                  if (action.action === 'wallet') return openWallet();
                  if (action.screen) return onNavigate(action.screen);
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <action.icon color={action.iconColor} size={26} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </LinearGradient>

        <LinearGradient colors={gradients.healthScore} style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View style={styles.scoreTextWrap}>
              <Text style={styles.cardTitle}>Health Score</Text>
              <Text style={styles.cardSubtitle}>Great job staying on track!</Text>
            </View>
            <View style={styles.scoreCircleOuter}>
              <View style={styles.scoreCircleInner}>
                <Text style={styles.scoreValue}>87</Text>
                <Text style={styles.scoreLabel}>/100</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}><Text style={styles.metricTitle}>Checkups</Text><Text style={styles.metricValue}>4/5</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricTitle}>Overdue</Text><Text style={styles.metricValue}>1</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricTitle}>Adherence</Text><Text style={styles.metricValue}>95%</Text></View>
            <View style={styles.metricCard}><Text style={styles.metricTitle}>Upcoming</Text><Text style={styles.metricValue}>2</Text></View>
          </View>

          <Pressable style={styles.outlineAction}>
            <TrendingUp color={colors.green} size={16} />
            <Text style={styles.outlineActionText}>Improve Your Score</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Your Health To-Dos</Text>
            <View style={styles.redBadge}><Text style={styles.redBadgeText}>3</Text></View>
          </View>
          <View style={styles.todoList}>
            {todos.map((item) => (
              <Pressable key={item.task} style={styles.todoItem}>
                <View style={[styles.todoCheck, item.urgent && styles.todoUrgent]} />
                <View style={styles.todoCopy}>
                  <Text style={styles.todoTitle}>{item.task}</Text>
                  <Text style={[styles.todoDue, item.urgent && styles.todoDueUrgent]}>{item.due}</Text>
                </View>
                <ChevronRight color={colors.textSoft} size={20} />
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => onNavigate('health-tasks')}>
            <Text style={styles.linkButton}>View All Tasks (7)</Text>
          </Pressable>
        </View>

        <View style={styles.priorityCard}>
          <View style={styles.priorityHeader}>
            <View style={[styles.priorityIcon, { backgroundColor: colors.blueLight }]}>
              <Calendar color={colors.blue} size={24} />
            </View>
            <View style={styles.priorityCopy}>
              <Text style={styles.priorityEyebrow}>Next Appointment</Text>
              <Text style={styles.priorityTitle}>Dr. Sarah Johnson</Text>
              <Text style={styles.priorityText}>Tomorrow, Nov 19 • 2:30 PM</Text>
              <Text style={styles.priorityMeta}>Sunnybrook Health Sciences Centre</Text>
            </View>
          </View>
          <View style={styles.inlineActions}>
            <Pressable style={styles.inlineButton}>
              <MapPin color={colors.text} size={16} />
              <Text style={styles.inlineButtonText}>Directions</Text>
            </Pressable>
            <Pressable style={[styles.inlineButton, styles.inlineButtonPrimary]}>
              <Text style={styles.inlineButtonPrimaryText}>View Details</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.priorityCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.recentActivityTitleWrap}>
              <View style={[styles.priorityIcon, { backgroundColor: colors.greenLight }]}>
                <Activity color={colors.green} size={24} />
              </View>
              <View>
                <Text style={styles.priorityEyebrow}>Recent Activity</Text>
                <Text style={styles.priorityTitle}>Updates & Results</Text>
              </View>
            </View>
          </View>
          <View style={styles.activityList}>
            {activityFeed.map((item) => (
              <View key={item.title} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityDot,
                    item.tone === 'blue' ? { backgroundColor: colors.blue } : item.tone === 'green' ? { backgroundColor: colors.green } : { backgroundColor: colors.purple },
                  ]}
                />
                <View style={styles.activityCopy}>
                  <Text style={styles.todoTitle}>{item.title}</Text>
                  <Text style={styles.todoDue}>{item.time}</Text>
                </View>
                <ChevronRight color={colors.textSoft} size={18} />
              </View>
            ))}
          </View>
          <Pressable>
            <Text style={styles.linkButton}>View All Activity</Text>
          </Pressable>
        </View>

        <View style={styles.linksGrid}>
          {[
            { label: 'Health Summary', icon: Stethoscope, color: colors.blueLight, iconColor: colors.blue, screen: 'health-summary' },
            { label: 'Care Journeys', icon: Activity, color: colors.purpleLight, iconColor: colors.purple, screen: 'care-journeys' },
            { label: 'Recommendations', icon: CheckCircle2, color: colors.greenLight, iconColor: colors.green, screen: 'recommendations' },
            { label: 'Documents', icon: Upload, color: colors.orangeLight, iconColor: colors.orange, screen: 'documents' },
          ].map((item) => (
            <Pressable key={item.label} style={styles.linkTile} onPress={() => onNavigate(item.screen)}>
              <View style={[styles.tileIcon, { backgroundColor: item.color }]}>
                <item.icon color={item.iconColor} size={20} />
              </View>
              <Text style={styles.tileLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={walletOpen} transparent animationType="slide" onRequestClose={() => setWalletOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={styles.modalTitle}>Emergency Identification</Text>
                <Text style={styles.modalSubtitle}>This is your Emergency ID. It will be converted to a real Apple Wallet pass.</Text>
              </View>
              <Pressable onPress={() => setWalletOpen(false)} style={styles.modalClose}>
                <X color={colors.textMuted} size={20} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {walletLoading ? <Text style={styles.infoBox}>Creating your emergency access link...</Text> : null}
              {!walletLoading && walletError ? <Text style={styles.errorInfo}>{walletError}</Text> : null}
              {!walletLoading && !walletError && emergencyUrl ? (
                <>
                  <View style={styles.successBox}>
                    <View style={styles.successRow}>
                      <Wallet color={colors.teal} size={18} />
                      <Text style={styles.successTitle}>Emergency Access</Text>
                    </View>
                    <Text style={styles.successUrl}>{emergencyUrl}</Text>
                  </View>
                  <View style={styles.qrCard}>
                    <QRCode value={emergencyUrl} size={190} />
                    <Text style={styles.qrCaption}>Scan to open the emergency responder view</Text>
                  </View>
                  <View style={styles.modalActionRow}>
                    <Pressable style={styles.inlineButton} onPress={copyLink}>
                      <Copy color={colors.text} size={16} />
                      <Text style={styles.inlineButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
                    </Pressable>
                    <Pressable style={[styles.inlineButton, styles.inlineButtonPrimary]} onPress={openLink}>
                      <ExternalLink color={colors.white} size={16} />
                      <Text style={styles.inlineButtonPrimaryText}>Open</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.infoBox}>Add to Apple Wallet — coming soon</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    marginBottom: spacing.xl,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.teal,
    fontWeight: '700',
    fontSize: typography.body,
  },
  name: {
    color: colors.white,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  healthCard: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: typography.small,
    marginTop: 2,
  },
  heroEmail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.tiny,
    marginTop: 4,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  iconButton: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dateText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.small,
  },
  quickActionsRow: {
    gap: spacing.lg,
    paddingRight: spacing.xxl,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: colors.white,
    fontSize: typography.tiny,
    maxWidth: 72,
    textAlign: 'center',
  },
  scoreCard: {
    marginHorizontal: spacing.xxl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTextWrap: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },
  scoreCircleOuter: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    borderWidth: 8,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleInner: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
  },
  scoreLabel: {
    fontSize: typography.tiny,
    color: colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  metricTitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  outlineAction: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  outlineActionText: {
    color: colors.green,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  redBadge: {
    backgroundColor: colors.redLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  redBadgeText: {
    color: colors.red,
    fontWeight: '700',
    fontSize: typography.tiny,
  },
  todoList: {
    gap: spacing.md,
  },
  todoItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  todoCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginTop: 2,
  },
  todoUrgent: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  todoCopy: {
    flex: 1,
  },
  todoTitle: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  todoDue: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },
  todoDueUrgent: {
    color: colors.red,
  },
  linkButton: {
    textAlign: 'center',
    color: colors.teal,
    fontWeight: '600',
  },
  priorityCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },
  priorityHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  priorityIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCopy: {
    flex: 1,
  },
  priorityEyebrow: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: 4,
  },
  priorityTitle: {
    fontSize: typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  priorityText: {
    fontSize: typography.body,
    color: colors.text,
  },
  priorityMeta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textMuted,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineButtonPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  inlineButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  inlineButtonPrimaryText: {
    color: colors.white,
    fontWeight: '600',
  },
  recentActivityTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    borderRadius: radii.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    marginTop: 8,
  },
  activityCopy: {
    flex: 1,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
  linkTile: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  infoBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  errorInfo: {
    backgroundColor: colors.redLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: spacing.lg,
    color: colors.red,
    fontSize: typography.small,
  },
  successBox: {
    backgroundColor: colors.tealLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  successTitle: {
    color: '#134e4a',
    fontWeight: '700',
  },
  successUrl: {
    color: '#115e59',
    fontSize: typography.small,
  },
  qrCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  qrCaption: {
    fontSize: typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
