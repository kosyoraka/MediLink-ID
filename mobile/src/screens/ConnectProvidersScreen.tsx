import { ArrowLeft, Building2, CheckCircle2, Hospital, Stethoscope, TestTube } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type Provider } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { colors, radii, spacing, typography } from '../theme/tokens';

type ConnectProvidersScreenProps = {
  connectedProviderIds: string[];
  onConnect: (providerId: string) => void;
  onNext: () => void;
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

export function ConnectProvidersScreen({
  connectedProviderIds,
  onConnect,
  onNext,
  onBack,
}: ConnectProvidersScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [allProviders, myProviders] = await Promise.all([
          api.listProviders(),
          api.listMyProviders(),
        ]);

        if (!active) return;

        const connectedSet = new Set(myProviders.providers.map((provider) => provider.id));
        const merged = allProviders.providers.map((provider) => ({
          ...provider,
          connected_at: connectedSet.has(provider.id) ? provider.connected_at || 'connected' : provider.connected_at,
        }));

        setProviders(merged);
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

  const connectedSet = useMemo(() => new Set(connectedProviderIds), [connectedProviderIds]);

  const connectedProviders = useMemo(
    () => providers.filter((provider) => connectedSet.has(provider.id) || Boolean(provider.connected_at)),
    [providers, connectedSet]
  );

  const filteredProviders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return providers.filter((provider) => {
      if (connectedSet.has(provider.id) || provider.connected_at) return false;
      if (!search) return true;

      return (
        provider.name.toLowerCase().includes(search) ||
        provider.type.toLowerCase().includes(search)
      );
    });
  }, [providers, searchTerm, connectedSet]);

  const handleConnect = async (providerId: string) => {
    try {
      setConnectingId(providerId);
      await api.connectProvider(providerId, 'signup');
      onConnect(providerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect provider');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.backButton}>
        <ArrowLeft color={colors.textMuted} size={24} />
      </Pressable>

      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
          <View style={[styles.progressSegment, styles.progressSegmentActive]} />
          <View style={styles.progressSegment} />
        </View>
        <Text style={styles.progressText}>Step 2 of 3</Text>
      </View>

      <Text style={styles.title}>Connect your providers</Text>
      <Text style={styles.subtitle}>
        Link healthcare providers so your mobile app can pull your records and appointments in one place.
      </Text>

      <TextField
        label="Search providers"
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Hospital, clinic, doctor, lab..."
      />

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <>
          {connectedProviders.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected ({connectedProviders.length})</Text>
              <View style={styles.connectedList}>
                {connectedProviders.map((provider) => (
                  <View key={provider.id} style={styles.connectedItem}>
                    <CheckCircle2 color={colors.green} size={18} />
                    <View style={styles.providerCopy}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <Text style={styles.providerType}>{provider.type}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available providers</Text>

            {!filteredProviders.length ? (
              <Text style={styles.emptyText}>No providers matched your search.</Text>
            ) : (
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
                        label={connectingId === provider.id ? 'Connecting...' : 'Connect'}
                        variant="outline"
                        onPress={() => handleConnect(provider.id)}
                        disabled={connectingId === provider.id}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      <Button label="Continue" onPress={onNext} />
      <Text style={styles.footerText}>You can connect more providers later from mobile settings.</Text>
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
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  loadingWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedList: {
    gap: spacing.sm,
    backgroundColor: colors.greenLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  connectedItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  providerList: {
    gap: spacing.md,
  },
  providerCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
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
  emptyText: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  footerText: {
    fontSize: typography.small,
    color: colors.textSoft,
    textAlign: 'center',
  },
});
