import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, MapPin, Video } from 'lucide-react-native';
import { api, type PatientAppointment } from '../lib/api';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

type AppointmentsScreenProps = {
  onNavigate?: (screen: string) => void;
};

type AppointmentTab = 'upcoming' | 'past';

function formatWhen(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
    raw: date,
  };
}

function getTabForAppointment(appointment: PatientAppointment): AppointmentTab {
  const status = String(appointment.status || '').toLowerCase();
  if (status === 'completed' || status === 'cancelled') return 'past';
  if (formatWhen(appointment.startTime).raw.getTime() < Date.now()) return 'past';
  return 'upcoming';
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'scheduled' || normalized === 'pending') return 'Waiting for confirmation';
  if (normalized === 'confirmed') return 'Confirmed';
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'cancelled') return 'Cancelled';
  return status;
}

export function AppointmentsScreen({ onNavigate }: AppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.listMyAppointments('all');
        if (!active) return;
        setAppointments(data.appointments || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load appointments');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredAppointments = useMemo(
    () => appointments.filter((appointment) => getTabForAppointment(appointment) === activeTab),
    [appointments, activeTab]
  );

  const nextAppointment = useMemo(
    () =>
      appointments
        .filter((appointment) => getTabForAppointment(appointment) === 'upcoming')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null,
    [appointments]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <CalendarDays color={colors.blue} size={24} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Appointments</Text>
          <Text style={styles.heroSubtitle}>Upcoming visits, confirmations, and appointment history.</Text>
        </View>
      </View>

      {nextAppointment ? (
        <View style={styles.highlightCard}>
          <Text style={styles.highlightEyebrow}>Next appointment</Text>
          <Text style={styles.highlightTitle}>{nextAppointment.providerName}</Text>
          <Text style={styles.highlightMeta}>
            {formatWhen(nextAppointment.startTime).date} • {formatWhen(nextAppointment.startTime).time}
          </Text>
          <Text style={styles.highlightSubmeta}>
            {nextAppointment.hospitalName || nextAppointment.appointmentType}
          </Text>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, selected && styles.tabActive]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {tab === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredAppointments.length ? (
        <View style={styles.list}>
          {filteredAppointments.map((appointment) => {
            const when = formatWhen(appointment.startTime);
            const isVirtual = appointment.visitMode === 'virtual';

            return (
              <Pressable key={appointment.id} style={styles.card} onPress={() => onNavigate?.('messages')}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{appointment.providerName}</Text>
                  <Text style={styles.cardStatus}>{statusLabel(appointment.status)}</Text>
                </View>
                <Text style={styles.cardType}>{appointment.appointmentType}</Text>
                <View style={styles.metaRow}>
                  <CalendarDays color={colors.textSoft} size={15} />
                  <Text style={styles.metaText}>
                    {when.date} • {when.time}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  {isVirtual ? <Video color={colors.textSoft} size={15} /> : <MapPin color={colors.textSoft} size={15} />}
                  <Text style={styles.metaText}>
                    {isVirtual ? 'Virtual visit' : appointment.hospitalName || 'In-person visit'}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    {appointment.notes || 'Open Messages for provider follow-up and updates.'}
                  </Text>
                  <ChevronRight color={colors.textSoft} size={18} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No {activeTab} appointments</Text>
          <Text style={styles.emptyCopy}>
            Appointments created through your connected providers will show up here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 20,
  },
  highlightCard: {
    backgroundColor: colors.tealLight,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  highlightEyebrow: {
    color: colors.tealDark,
    fontSize: typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  highlightTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
  },
  highlightMeta: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '600',
  },
  highlightSubmeta: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.text,
  },
  loadingWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: colors.redLight,
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.red,
    fontSize: typography.small,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  cardStatus: {
    color: colors.tealDark,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  cardType: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardFooterText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: typography.small,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  emptyCopy: {
    fontSize: typography.small,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
