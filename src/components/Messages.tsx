import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  ArrowLeft,
  Send,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { api } from "@/lib/api";

type ConversationSummary = {
  id: string;
  provider_id: string;
  provider_name: string;
  staff_id: string;
  staff_name: string;
  staff_role: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  // optional (if your backend includes it)
  can_send?: boolean;
};

type StaffUser = {
  id: string;
  full_name: string;
  role: string;
};

type Provider = {
  id: string;
  name: string;
  type: string;
  connected_at?: string;
};

type ChatMessage = {
  id: string;
  sender_type: "patient" | "staff" | "system";
  body: string;
  created_at: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRelativeTime(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";

  const diffMs = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Messages() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [messageInput, setMessageInput] = useState("");

  // New message UI state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffId, setStaffId] = useState<string>("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // read-only (e.g., disconnected)
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      const a = (c.staff_name || "").toLowerCase();
      const b = (c.provider_name || "").toLowerCase();
      const preview = (c.last_message_preview || "").toLowerCase();
      return a.includes(q) || b.includes(q) || preview.includes(q);
    });
  }, [conversations, searchQuery]);

  async function loadConversations() {
    setLoadingConversations(true);
    try {
      const data = await apiFetchPatientConversations();
      setConversations(data);
    } catch (e: any) {
      console.error(e);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadConversationMessages(conversationId: string) {
    setLoadingMessages(true);
    setReadOnlyReason(null);

    try {
      // mark read (if you implemented this endpoint)
      try {
        await api.markPatientConversationRead(conversationId);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        );
      } catch {
        // ignore if not implemented
      }

      const data = await api.getPatientMessages(conversationId);
      setMessages(data.messages || []);
    } catch (e: any) {
      console.error(e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function apiFetchPatientConversations(): Promise<ConversationSummary[]> {
    const data = await api.listPatientConversations();
    return (data as any).conversations || [];
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selecting a conversation, load messages
  useEffect(() => {
    if (selectedConversationId) {
      loadConversationMessages(selectedConversationId);
    } else {
      setMessages([]);
      setMessageInput("");
      setReadOnlyReason(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, selectedConversationId]);

  // When opening new message screen, load providers
  useEffect(() => {
    if (!showNewMessage) return;

    (async () => {
      try {
        const data = await api.listMyProviders();
        setProviders(data.providers || []);
        // reset
        setProviderId("");
        setStaff([]);
        setStaffId("");
        setNewMessageBody("");
      } catch (e) {
        console.error(e);
        setProviders([]);
      }
    })();
  }, [showNewMessage]);

  // When provider changes, load staff list
  useEffect(() => {
    if (!showNewMessage) return;
    if (!providerId) {
      setStaff([]);
      setStaffId("");
      return;
    }

    (async () => {
      try {
        const data = await api.listProviderStaffForPatient(providerId);
        const staffList = (data as any).staff || [];
        setStaff(staffList);
        setStaffId(staffList[0]?.id || "");
      } catch (e) {
        console.error(e);
        setStaff([]);
        setStaffId("");
      }
    })();
  }, [providerId, showNewMessage]);

  async function handleStartConversationAndSend() {
    const body = newMessageBody.trim();
    if (!providerId || !staffId || !body) return;

    setStarting(true);
    try {
      const started = await api.startPatientConversation(providerId, staffId);
      const conversationId = (started as any).conversationId;

      await api.sendPatientMessage(conversationId, body);

      // refresh conversations, open the convo, close new message UI
      await loadConversations();
      setShowNewMessage(false);
      setSelectedConversationId(conversationId);
      setNewMessageBody("");
    } catch (e: any) {
      alert(e?.message || "Failed to start conversation");
    } finally {
      setStarting(false);
    }
  }

  async function handleSendInThread() {
    const conversationId = selectedConversationId;
    const body = messageInput.trim();
    if (!conversationId || !body) return;

    // optimistic message
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      sender_type: "patient",
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setMessageInput("");

    // update preview in list optimistically
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              last_message_preview: body.slice(0, 200),
              last_message_at: new Date().toISOString(),
            }
          : c
      )
    );

    try {
      const data = await api.sendPatientMessage(conversationId, body);
      const serverMsg = (data as any).message as ChatMessage;

      // replace optimistic
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((m) => m.id === optimistic.id);
        if (idx !== -1) copy[idx] = serverMsg;
        return copy;
      });
    } catch (e: any) {
      // rollback
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageInput(body);

      // if disconnected / read-only
      const msg = e?.message || "Failed to send message";
      if (String(msg).toLowerCase().includes("disconnect") || String(msg).includes("403")) {
        setReadOnlyReason(
          "You’re no longer connected to this provider. You can still view message history, but you can’t send new messages."
        );
      } else {
        alert(msg);
      }
    }
  }

  // ---------------- UI: NEW MESSAGE ----------------
  if (showNewMessage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setShowNewMessage(false)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">New Message</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Select Provider</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              <option value="" disabled>
                Choose a provider…
              </option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              You can only message providers you’re currently connected to.
            </p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Select Staff</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={!providerId}
            >
              {!providerId ? (
                <option value="">Select a provider first</option>
              ) : staff.length === 0 ? (
                <option value="">No staff available</option>
              ) : (
                staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.role ? `- ${s.role}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Message</label>
            <Textarea
              placeholder="Type your message here..."
              className="min-h-32"
              value={newMessageBody}
              onChange={(e) => setNewMessageBody(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="text-gray-900">Typical response time:</span> 1-2 business days
            </p>
          </div>

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleStartConversationAndSend}
            disabled={starting || !providerId || !staffId || !newMessageBody.trim()}
          >
            {starting ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------- UI: THREAD VIEW ----------------
  if (selectedConversationId && selectedConversation) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-gray-50">
        <div className="shrink-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedConversationId(null)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-gray-900 truncate">{selectedConversation.staff_name}</h2>
              <p className="text-xs text-gray-500 truncate">
                {selectedConversation.provider_name} • Typical response: 1-2 business days
              </p>
            </div>
          </div>
        </div>

        {readOnlyReason && (
          <div className="shrink-0 bg-yellow-50 border-b border-yellow-200 p-3 text-sm text-yellow-900">
            {readOnlyReason}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex min-h-full flex-col justify-end gap-4">
            {loadingMessages ? (
              <div className="text-sm text-gray-500">Loading messages…</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet.</div>
            ) : (
              messages.map((m) => {
                const isPatient = m.sender_type === "patient";
                const isSystem = m.sender_type === "system";

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
                        {m.body}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-2xl p-4 max-w-xs shadow-sm ${
                        isPatient
                          ? "bg-teal-600 text-white rounded-tr-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p
                        className={`text-xs mt-2 ${
                          isPatient ? "text-teal-100" : "text-gray-500"
                        }`}
                      >
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder={
                readOnlyReason ? "Read-only" : "Type a message..."
              }
              className="flex-1"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={!!readOnlyReason}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!readOnlyReason) handleSendInThread();
                }
              }}
            />
            <button
              className={`p-2 rounded-full ${
                readOnlyReason
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
              onClick={handleSendInThread}
              disabled={!!readOnlyReason}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- UI: LIST ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-900">Messages</h1>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowNewMessage(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search messages..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {loadingConversations ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No messages yet</p>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setShowNewMessage(true)}
            >
              Send Your First Message
            </Button>
          </div>
        ) : (
          filteredConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedConversationId(c.id)}
              className="w-full bg-white hover:bg-gray-50 p-4 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-teal-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-gray-900 truncate">{c.staff_name}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {getRelativeTime(c.last_message_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-600 truncate">
                      {c.last_message_preview || "No messages yet"}
                      <span className="text-gray-400"> • </span>
                      <span className="text-gray-500">{c.provider_name}</span>
                    </p>

                    {c.unread_count > 0 && (
                      <Badge className="bg-teal-600 text-white border-0">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
