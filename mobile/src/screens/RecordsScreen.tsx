import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, FileText, Folder, Image as ImageIcon, Pill, Stethoscope, TestTube } from 'lucide-react-native';
import { api, type RecordDocument, type RecordRequest } from '../lib/api';
import { TextField } from '../components/ui/TextField';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

type RecordsScreenProps = {
  onNavigate?: (screen: string) => void;
};

type CategoryKey = 'all' | 'labs' | 'imaging' | 'visits' | 'prescriptions' | 'insurance' | 'other';

const categories: Array<{ key: CategoryKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'labs', label: 'Labs' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'visits', label: 'Visits' },
  { key: 'prescriptions', label: 'Rx' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'other', label: 'Other' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function categoryMeta(category: RecordDocument['category']) {
  switch (category) {
    case 'labs':
      return { icon: TestTube, tint: colors.green, bg: colors.greenLight };
    case 'imaging':
      return { icon: ImageIcon, tint: colors.blue, bg: colors.blueLight };
    case 'visits':
      return { icon: Stethoscope, tint: colors.purple, bg: colors.purpleLight };
    case 'prescriptions':
      return { icon: Pill, tint: colors.orange, bg: colors.orangeLight };
    default:
      return { icon: FileText, tint: colors.teal, bg: colors.tealLight };
  }
}

export function RecordsScreen({ onNavigate }: RecordsScreenProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [documents, setDocuments] = useState<RecordDocument[]>([]);
  const [requests, setRequests] = useState<RecordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const [docs, reqs] = await Promise.all([
          api.listMyRecords({
            category: activeCategory,
            verification: 'all',
            search,
          }),
          api.listMyRecordRequests(),
        ]);

        if (!active) return;
        setDocuments(docs.documents || []);
        setRequests(reqs.requests || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load records');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeCategory, search]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => ['pending', 'viewed', 'in_progress'].includes(request.status)).slice(0, 3),
    [requests]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Folder color={colors.teal} size={22} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Medical Records</Text>
          <Text style={styles.heroSubtitle}>Your live records, requests, and recent provider documents.</Text>
        </View>
      </View>

      <TextField
        label="Search records"
        value={search}
        onChangeText={setSearch}
        placeholder="Lab, visit note, prescription..."
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
        {categories.map((category) => {
          const selected = category.key === activeCategory;
          return (
            <Pressable
              key={category.key}
              onPress={() => setActiveCategory(category.key)}
              style={[styles.categoryChip, selected && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipLabel, selected && styles.categoryChipLabelActive]}>{category.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {pendingRequests.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Requests</Text>
            <Pressable onPress={() => onNavigate?.('manage-providers')}>
              <Text style={styles.sectionLink}>Providers</Text>
            </Pressable>
          </View>
          <View style={styles.cardList}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestProvider}>{request.hospitalName}</Text>
                  <Text style={styles.requestStatus}>{request.status.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.requestType}>
                  {[request.category, request.subtype].filter(Boolean).join(' • ')}
                </Text>
                <Text style={styles.requestMeta}>Updated {formatDate(request.updatedAt)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <Text style={styles.sectionCount}>{documents.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : documents.length ? (
          <View style={styles.cardList}>
            {documents.map((document) => {
              const meta = categoryMeta(document.category);
              const Icon = meta.icon;

              return (
                <Pressable
                  key={document.id}
                  style={styles.documentCard}
                  onPress={() => void Linking.openURL(document.fileUrl)}
                >
                  <View style={[styles.documentIcon, { backgroundColor: meta.bg }]}>
                    <Icon color={meta.tint} size={22} />
                  </View>
                  <View style={styles.documentCopy}>
                    <Text style={styles.documentTitle}>{document.title}</Text>
                    <Text style={styles.documentSubline}>
                      {[document.hospitalName || document.sourceOrganizationName, formatDate(document.serviceDate || document.uploadDate)]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {document.verificationLabel} • {document.fileSizeLabel}
                    </Text>
                  </View>
                  <ExternalLink color={colors.textSoft} size={18} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptyCopy}>
              Connected provider records and uploaded documents will show up here once they are available.
            </Text>
          </View>
        )}
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
    backgroundColor: colors.tealLight,
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
  categoriesRow: {
    gap: spacing.sm,
  },
  categoryChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  categoryChipActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealLight,
  },
  categoryChipLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '600',
  },
  categoryChipLabelActive: {
    color: colors.tealDark,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    color: colors.teal,
    fontWeight: '600',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  cardList: {
    gap: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  requestProvider: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  requestStatus: {
    color: colors.orange,
    fontSize: typography.tiny,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  requestType: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  requestMeta: {
    color: colors.textSoft,
    fontSize: typography.tiny,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  documentTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  documentSubline: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  documentMeta: {
    color: colors.textSoft,
    fontSize: typography.tiny,
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
