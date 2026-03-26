import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, ChevronRight, MessageSquare, Plus, Send } from 'lucide-react-native';
import {
  api,
  type PatientConversationSummary,
  type PatientMessage,
  type Provider,
  type StaffUser,
} from '../lib/api';
import { Button } from '../components/ui/Button';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

function formatThreadTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessagesScreen() {
  const [conversations, setConversations] = useState<PatientConversationSummary[]>([]);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffId, setStaffId] = useState('');
  const [newMessageBody, setNewMessageBody] = useState('');
  const [threadMessage, setThreadMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      setError('');
      const data = await api.listPatientConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoadingMessages(true);
        await api.markPatientConversationRead(selectedConversationId).catch(() => undefined);
        const data = await api.getPatientMessages(selectedConversationId);
        if (!active) return;
        setMessages(data.messages || []);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId ? { ...conversation, unread_count: 0 } : conversation
          )
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        if (active) setLoadingMessages(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (!showComposer) return;

    (async () => {
      try {
        const data = await api.listMyProviders();
        setProviders(data.providers || []);
      } catch {
        setProviders([]);
      }
    })();
  }, [showComposer]);

  useEffect(() => {
    if (!providerId) {
      setStaff([]);
      setStaffId('');
      return;
    }

    (async () => {
      try {
        const data = await api.listProviderStaffForPatient(providerId);
        setStaff(data.staff || []);
        setStaffId((data.staff || [])[0]?.id || '');
      } catch {
        setStaff([]);
        setStaffId('');
      }
    })();
  }, [providerId]);

  const handleStartConversation = async () => {
    if (!providerId || !staffId || !newMessageBody.trim()) return;

    try {
      setStarting(true);
      const started = await api.startPatientConversation(providerId, staffId);
      await api.sendPatientMessage(started.conversationId, newMessageBody.trim());
      setShowComposer(false);
      setProviderId('');
      setStaff([]);
      setStaffId('');
      setNewMessageBody('');
      await loadConversations();
      setSelectedConversationId(started.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setStarting(false);
    }
  };

  const handleSendInThread = async () => {
    if (!selectedConversationId || !threadMessage.trim()) return;
    const optimistic: PatientMessage = {
      id: `tmp-${Date.now()}`,
      sender_type: 'patient',
      body: threadMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    const body = threadMessage.trim();
    setThreadMessage('');

    try {
      setSending(true);
      const response = await api.sendPatientMessage(selectedConversationId, body);
      setMessages((current) =>
        current.map((message) => (message.id === optimistic.id ? response.message : message))
      );
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, last_message_preview: body, last_message_at: new Date().toISOString() }
            : conversation
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setThreadMessage(body);
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  if (showComposer) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={() => setShowComposer(false)} style={styles.backButton}>
          <ArrowLeft color={colors.textMuted} size={24} />
        </Pressable>
        <Text style={styles.pageTitle}>New message</Text>
        <Text style={styles.pageSubtitle}>Choose a connected provider and care team member to start a thread.</Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose provider</Text>
          <View style={styles.choiceList}>
            {providers.map((provider) => {
              const selected = provider.id === providerId;
              return (
                <Pressable
                  key={provider.id}
                  onPress={() => setProviderId(provider.id)}
                  style={[styles.choiceCard, selected && styles.choiceCardActive]}
                >
                  <Text style={[styles.choiceTitle, selected && styles.choiceTitleActive]}>{provider.name}</Text>
                  <Text style={[styles.choiceMeta, selected && styles.choiceMetaActive]}>{provider.type}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {staff.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose team member</Text>
            <View style={styles.choiceList}>
              {staff.map((member) => {
                const selected = member.id === staffId;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => setStaffId(member.id)}
                    style={[styles.choiceCard, selected && styles.choiceCardActive]}
                  >
                    <Text style={[styles.choiceTitle, selected && styles.choiceTitleActive]}>{member.full_name}</Text>
                    <Text style={[styles.choiceMeta, selected && styles.choiceMetaActive]}>{member.role || 'Care team'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          <TextInput
            multiline
            placeholder="Write your message..."
            placeholderTextColor={colors.textSoft}
            value={newMessageBody}
            onChangeText={setNewMessageBody}
            style={styles.textArea}
          />
        </View>

        <Button
          label={starting ? 'Starting...' : 'Start conversation'}
          onPress={() => void handleStartConversation()}
          disabled={!providerId || !staffId || !newMessageBody.trim() || starting}
        />
      </ScrollView>
    );
  }

  if (selectedConversation) {
    return (
      <View style={styles.screen}>
        <View style={styles.threadHeader}>
          <Pressable onPress={() => setSelectedConversationId(null)} style={styles.backButton}>
            <ArrowLeft color={colors.textMuted} size={24} />
          </Pressable>
          <View style={styles.threadHeaderCopy}>
            <Text style={styles.threadTitle}>{selectedConversation.staff_name}</Text>
            <Text style={styles.threadSubtitle}>{selectedConversation.provider_name}</Text>
          </View>
        </View>

        {loadingMessages ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : (
          <ScrollView style={styles.threadBody} contentContainerStyle={styles.threadContent}>
            {messages.map((message) => {
              const mine = message.sender_type === 'patient';
              return (
                <View key={message.id} style={[styles.bubbleWrap, mine ? styles.bubbleMineWrap : styles.bubbleOtherWrap]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.body}</Text>
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                      {formatThreadTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.composerBar}>
          <TextInput
            value={threadMessage}
            onChangeText={setThreadMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSoft}
            style={styles.composerInput}
          />
          <Pressable onPress={() => void handleSendInThread()} disabled={!threadMessage.trim() || sending} style={styles.sendButton}>
            <Send color={colors.white} size={18} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MessageSquare color={colors.purple} size={22} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Messages</Text>
          <Text style={styles.heroSubtitle}>Secure threads with your connected providers and care teams.</Text>
        </View>
        <Pressable onPress={() => setShowComposer(true)} style={styles.newButton}>
          <Plus color={colors.white} size={18} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loadingConversations ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : conversations.length ? (
        <View style={styles.list}>
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => setSelectedConversationId(conversation.id)}
              style={styles.conversationCard}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {conversation.staff_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationCopy}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationTitle}>{conversation.staff_name}</Text>
                  <Text style={styles.conversationTime}>{formatRelativeTime(conversation.last_message_at)}</Text>
                </View>
                <Text style={styles.conversationProvider}>{conversation.provider_name}</Text>
                <Text style={styles.conversationPreview} numberOfLines={2}>
                  {conversation.last_message_preview || 'Open conversation'}
                </Text>
              </View>
              <View style={styles.trailingWrap}>
                {conversation.unread_count ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{conversation.unread_count}</Text>
                  </View>
                ) : null}
                <ChevronRight color={colors.textSoft} size={18} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyCopy}>Start a conversation with a connected provider to message your care team.</Text>
          <Button label="Start a message" onPress={() => setShowComposer(true)} />
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
    backgroundColor: colors.purpleLight,
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
  newButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
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
  conversationCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.tealDark,
    fontWeight: '700',
    fontSize: typography.small,
  },
  conversationCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  conversationTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.body,
  },
  conversationTime: {
    color: colors.textSoft,
    fontSize: typography.tiny,
  },
  conversationProvider: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  conversationPreview: {
    color: colors.textSoft,
    fontSize: typography.small,
  },
  trailingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
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
  backButton: {
    width: 32,
  },
  pageTitle: {
    fontSize: typography.h1,
    fontWeight: '700',
    color: colors.text,
  },
  pageSubtitle: {
    marginTop: -spacing.sm,
    color: colors.textMuted,
    fontSize: typography.body,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  choiceList: {
    gap: spacing.md,
  },
  choiceCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  choiceCardActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealLight,
  },
  choiceTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.body,
  },
  choiceTitleActive: {
    color: colors.tealDark,
  },
  choiceMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  choiceMetaActive: {
    color: colors.tealDark,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    textAlignVertical: 'top',
    fontSize: typography.body,
    color: colors.text,
  },
  threadHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  threadHeaderCopy: {
    flex: 1,
  },
  threadTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.text,
  },
  threadSubtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  threadBody: {
    flex: 1,
  },
  threadContent: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  bubbleWrap: {
    flexDirection: 'row',
  },
  bubbleMineWrap: {
    justifyContent: 'flex-end',
  },
  bubbleOtherWrap: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  bubbleMine: {
    backgroundColor: colors.teal,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTime: {
    color: colors.textSoft,
    fontSize: typography.tiny,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
});
