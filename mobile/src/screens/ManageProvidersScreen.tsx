import { ArrowLeft, Building2, CheckCircle2, Hospital, Plus, Stethoscope, TestTube, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type Provider } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { colors, gradients, radii, spacing, typography } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

type ManageProvidersScreenProps = {
  onBack: () => void;
};

function typeMeta(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes('hospital')) return { icon: Hospital, tint: colors.blue, bg: colors.blueLight };
  if (normalized.includes('laboratory') || normalized.includes('lab')) {
    return { icon: TestTube, tint: colors.green, bg: colors.greenLight };
  }
  if (normalized.includes('doctor')) return { icon: Stethoscope, tint: colors.teal, bg: colors.tealLight };
  return { icon: Building2, tint: colors.purple, bg: colors.purpleLight };
}

export function ManageProvidersScreen({ onBack }: ManageProvidersScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProviders, setShowAddProviders] = useState(false);
  const [directory, setDirectory] = useState<Provider[]>([]);
  const [connected, setConnected] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyProviderId, setBusyProviderId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [dirRes, myRes] = await Promise.all([api.listProviders(), api.listMyProviders()]);
        if (!active) return;

        setDirectory(dirRes.providers);
        setConnected(myRes.providers);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load providers');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const connectedIds = useMemo(() => new Set(connected.map((provider) => provider.id)), [connected]);

  const filteredProviders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return directory.filter((provider) => {
      if (connectedIds.has(provider.id)) return false;
      if (!search) return true;

      return (
        provider.name.toLowerCase().includes(search) ||
        provider.type.toLowerCase().includes(search)
      );
    });
  }, [directory, searchTerm, connectedIds]);

  const connectProvider = async (provider: Provider) => {
    try {
      setBusyProviderId(provider.id);
      await api.connectProvider(provider.id, 'settings');
      setConnected((current) => [provider, ...current]);
      setShowAddProviders(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect provider');
    } finally {
      setBusyProviderId(null);
    }
  };

  const disconnectProvider = async (providerId: string) => {
    try {
      setBusyProviderId(providerId);
      await api.disconnectProvider(providerId);
      setConnected((current) => current.filter((provider) => provider.id !== providerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect provider');
    } finally {
      setBusyProviderId(null);
    }
  };

  if (showAddProviders) {
    return (
      <ScrollView contentContainerStyle={styles.content} style={styles.screen} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setShowAddProviders(false)} style={styles.backButton}>
          <ArrowLeft color={colors.textMuted} size={24} />
        </Pressable>

        <Text style={styles.title}>Add provider</Text>
        <Text style={styles.subtitle}>Search for hospitals, clinics, labs, or doctors to connect.</Text>

        <TextField
          label="Search providers"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Hospital, clinic, doctor, lab..."
        />

        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        <View style={styles.providerList}>
          {filteredProviders.map((provider) => {
            const meta = typeMeta(provider.type);
            const Icon = meta.icon;

            return (
              <View key={provider.id} style={styles.providerCard}>
                <View style={[styles.providerIcon, { backgroundColor: meta.bg }]}>
                  <Icon color={meta.tint} size={22} />
                </View>
                <View style={styles.providerCopy}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerType}>{provider.type}</Text>
                </View>
                <Button
                  label={busyProviderId === provider.id ? 'Adding...' : 'Add'}
                  variant="outline"
                  onPress={() => connectProvider(provider)}
                  disabled={busyProviderId === provider.id}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.sectionedContent}>
      <LinearGradient colors={gradients.hero} style={styles.hero}>
        <View style={styles.heroHeader}>
          <Pressable onPress={onBack} style={styles.heroBack}>
            <ArrowLeft color={colors.white} size={24} />
          </Pressable>
          <Text style={styles.heroTitle}>Connected Providers</Text>
          <View style={styles.heroSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Total Providers</Text>
            <Text style={styles.heroValue}>{connected.length}</Text>
          </View>
          <Button label="Add Provider" onPress={() => setShowAddProviders(true)} variant="outline" />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : connected.length === 0 ? (
          <View style={styles.emptyCard}>
            <Building2 color={colors.textSoft} size={44} />
            <Text style={styles.emptyTitle}>No providers connected</Text>
            <Text style={styles.emptyText}>
              Connect your healthcare providers to access records and appointments in one place.
            </Text>
            <Button label="Add Your First Provider" onPress={() => setShowAddProviders(true)} />
          </View>
        ) : (
          <View style={styles.providerList}>
            {connected.map((provider) => {
              const meta = typeMeta(provider.type);
              const Icon = meta.icon;

              return (
                <View key={provider.id} style={styles.providerCard}>
                  <View style={[styles.providerIcon, { backgroundColor: meta.bg }]}>
                    <Icon color={meta.tint} size={22} />
                  </View>
                  <View style={styles.providerCopy}>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerType}>{provider.type}</Text>
                  </View>
                  <View style={styles.connectedActions}>
                    <CheckCircle2 color={colors.green} size={18} />
                    <Pressable
                      onPress={() => disconnectProvider(provider.id)}
                      style={styles.disconnectButton}
                      disabled={busyProviderId === provider.id}
                    >
                      <X color={colors.red} size={16} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {connected.length > 0 ? (
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Building2 color={colors.blue} size={18} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>HL7 FHIR Compliant</Text>
              <Text style={styles.infoText}>
                Your provider links use secure healthcare data standards compatible with your deployed backend.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionedContent: {
    paddingBottom: spacing.xxxl,
  },
  hero: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBack: {
    width: 32,
  },
  heroSpacer: {
    width: 32,
  },
  heroTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.white,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroLabel: {
    color: colors.white,
    fontSize: typography.small,
  },
  heroValue: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  backButton: {
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
    marginTop: -spacing.sm,
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
  loadingWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerList: {
    gap: spacing.md,
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  providerName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  providerType: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  connectedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disconnectButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  infoText: {
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
