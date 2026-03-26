import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Bell,
  Calendar,
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
  Upload,
  Wallet,
  X,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { api, type PatientAppointment, type ProfileResponse } from '../lib/api';
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

export function DashboardScreen({ onNavigate, userName = '', userEmail = '', userHealthCard = '' }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
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

  useEffect(() => {
    let cancelled = false;

    api
      .listMyAppointments('all')
      .then((data) => {
        if (!cancelled) {
          setAppointments(data.appointments || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppointments([]);
        }
      });

    return () => {
      cancelled = true;
    };
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

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((appointment) => {
        const ts = new Date(appointment.startTime).getTime();
        const status = String(appointment.status || '').toLowerCase();
        return ts >= now && status !== 'cancelled' && status !== 'completed';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  }, [appointments]);

  const nextAppointmentStatusLabel = useMemo(() => {
    if (!nextAppointment) return '';
    return String(nextAppointment.status || '').toLowerCase().trim() === 'confirmed'
      ? 'Confirmed'
      : 'Waiting for confirmation';
  }, [nextAppointment]);

  const quickActions = [
    { icon: Calendar, label: 'Appointments', color: colors.blueLight, iconColor: colors.blue, screen: 'appointments' },
    { icon: Pill, label: 'Medications', color: colors.purpleLight, iconColor: colors.purple, screen: 'medications' },
    { icon: Search, label: 'Find Care AI', color: colors.orangeLight, iconColor: colors.orange, screen: 'symptom-checker' },
    { icon: FileText, label: 'Medical History', color: colors.pinkLight, iconColor: colors.pink, screen: 'medical-history' },
    { icon: Wallet, label: 'Emergency ID', color: colors.tealLight, iconColor: colors.teal, action: 'wallet' as const },
  ];

  const quickLinks = [
    { label: 'Health Summary', icon: Stethoscope, color: colors.blueLight, iconColor: colors.blue, screen: 'health-summary' },
    { label: 'Care Journeys', icon: Activity, color: colors.purpleLight, iconColor: colors.purple, screen: 'care-journeys' },
    { label: 'Recommendations', icon: CheckCircle2, color: colors.greenLight, iconColor: colors.green, screen: 'recommendations' },
    { label: 'Nutrition & Fitness', icon: Upload, color: colors.orangeLight, iconColor: colors.orange, screen: 'nutrition-fitness' },
  ];

  const formatAppointmentDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formatAppointmentTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const openDirections = async () => {
    if (!nextAppointment) return;
    const query = encodeURIComponent(nextAppointment.hospitalName || nextAppointment.providerName || 'Hospital');
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

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
        <LinearGradient
          colors={gradients.hero}
          style={[styles.hero, { marginTop: -insets.top, paddingTop: spacing.xxl + insets.top }]}
        >
          <View style={styles.heroRow}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileCopy}>
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
                  return onNavigate(action.screen);
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

        <View style={styles.linksGrid}>
          {quickLinks.map((item) => (
            <Pressable key={item.label} style={styles.linkTile} onPress={() => onNavigate(item.screen)}>
              <View style={[styles.tileIcon, { backgroundColor: item.color }]}>
                <item.icon color={item.iconColor} size={20} />
              </View>
              <Text style={styles.tileLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Your Health To-Dos</Text>
            <View style={styles.redBadge}>
              <Text style={styles.redBadgeText}>3</Text>
            </View>
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
          {nextAppointment ? (
            <>
              <View style={styles.priorityHeader}>
                <View style={[styles.priorityIcon, { backgroundColor: colors.blueLight }]}>
                  <Calendar color={colors.blue} size={24} />
                </View>
                <View style={styles.priorityCopy}>
                  <Text style={styles.priorityEyebrow}>Next Appointment</Text>
                  <Text style={styles.priorityTitle}>{nextAppointment.providerName}</Text>
                  <Text style={styles.priorityText}>
                    {formatAppointmentDate(nextAppointment.startTime)} • {formatAppointmentTime(nextAppointment.startTime)}
                  </Text>
                  <Text style={styles.priorityMeta}>{nextAppointment.hospitalName || 'Hospital'}</Text>
                  <View style={styles.statusPill}>
                    <Text
                      style={[
                        styles.statusPillText,
                        nextAppointmentStatusLabel === 'Confirmed' ? styles.statusConfirmed : styles.statusPending,
                      ]}
                    >
                      {nextAppointmentStatusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.inlineActions}>
                <Pressable style={styles.inlineButton} onPress={openDirections}>
                  <MapPin color={colors.text} size={16} />
                  <Text style={styles.inlineButtonText}>Directions</Text>
                </Pressable>
                <Pressable style={[styles.inlineButton, styles.inlineButtonPrimary]} onPress={() => onNavigate('appointments')}>
                  <Text style={styles.inlineButtonPrimaryText}>View Details</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.priorityHeader}>
                <View style={[styles.priorityIcon, { backgroundColor: colors.blueLight }]}>
                  <Calendar color={colors.blue} size={24} />
                </View>
                <View style={styles.priorityCopy}>
                  <Text style={styles.priorityEyebrow}>Next Appointment</Text>
                  <Text style={styles.priorityTitle}>Nothing scheduled yet</Text>
                  <Text style={styles.priorityText}>Book your next visit and keep your care plan moving.</Text>
                </View>
              </View>

              <Pressable style={[styles.inlineButton, styles.inlineButtonPrimary]} onPress={() => onNavigate('appointments')}>
                <Text style={styles.inlineButtonPrimaryText}>View Appointments</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={walletOpen} transparent animationType="slide" onRequestClose={() => setWalletOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={styles.modalTitle}>Emergency Identification</Text>
                <Text style={styles.modalSubtitle}>
                  This is your Emergency ID. It will be converted to a real Apple Wallet pass.
                </Text>
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
    paddingBottom: spacing.xxl,
    marginBottom: spacing.md,
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
  profileCopy: {
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
    maxWidth: 78,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.text,
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
  statusPill: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceMuted,
  },
  statusPillText: {
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  statusConfirmed: {
    color: colors.green,
  },
  statusPending: {
    color: colors.yellow,
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
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  linkTile: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
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
