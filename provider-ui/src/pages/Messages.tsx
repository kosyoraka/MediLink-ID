import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

type StaffConversation = {
  id: string;

  patient_id: string;
  patient_email: string | null;

  first_name: string | null;
  last_name: string | null;

  last_message_preview: string | null;
  last_message_at: string | null;

  unread_count: number;
};

type ChatMessage = {
  id: string;
  sender_type: "patient" | "staff";
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

function displayPatientName(c: StaffConversation) {
  const first = (c.first_name || "").trim();
  const last = (c.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || c.patient_email || c.patient_id;
}

export function Messages() {
  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      const name = displayPatientName(c).toLowerCase();
      const email = (c.patient_email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || c.patient_id.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function loadConversations() {
    setLoadingConversations(true);
    try {
      const data = await apiFetch<{ conversations: StaffConversation[] }>(
        "/api/staff/messages/conversations"
      );
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true);
    try {
      // mark read first (so badge clears quickly)
      await apiFetch<{ ok: true }>(`/api/staff/messages/conversations/${conversationId}/read`, {
        method: "POST",
      });

      // clear unread locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );

      const data = await apiFetch<{ messages: ChatMessage[] }>(
        `/api/staff/messages/conversations/${conversationId}/messages`
      );

      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // when messages change, keep view pinned to bottom
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSelectConversation = async (conv: StaffConversation) => {
    setSelectedConversationId(conv.id);
    await loadMessages(conv.id);
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();

    const conversationId = selectedConversationId;
    const body = newMessage.trim();
    if (!conversationId || !body) return;

    // Optimistic UI
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      sender_type: "staff",
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    // update conversation preview/time optimistically
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
      const data = await apiFetch<{ message: ChatMessage }>(
        `/api/staff/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        }
      );

      // Replace optimistic message with server message
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((m) => m.id === optimistic.id);
        if (idx !== -1) copy[idx] = data.message;
        return copy;
      });
    } catch (err: any) {
      // rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(err?.message || "Failed to send message");
      // restore text so user can retry
      setNewMessage(body);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Conversations List */}
      <div
        className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 bg-white flex flex-col ${
          selectedConversation ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {loadingConversations && (
            <p className="text-xs text-gray-500 mt-2">Loading…</p>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {!loadingConversations && filteredConversations.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                  selectedConversationId === conversation.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                    {displayPatientName(conversation).slice(0, 1).toUpperCase()}
                    {conversation.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {displayPatientName(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {getRelativeTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message_preview || "No messages yet"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col bg-gray-50 ${
          !selectedConversation ? "hidden lg:flex" : "flex"
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedConversationId(null);
                  setMessages([]);
                }}
                className="lg:hidden text-blue-600 mr-2"
              >
                ← Back
              </button>

              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                {displayPatientName(selectedConversation).slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">
                  {displayPatientName(selectedConversation)}
                </h2>
                <p className="text-sm text-gray-600 truncate">
                  {selectedConversation.patient_email || selectedConversation.patient_id}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-sm text-gray-500">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500">No messages in this conversation yet.</div>
              ) : (
                messages.map((m) => {
                  const isStaff = m.sender_type === "staff";
                  return (
                    <div key={m.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl ${
                          isStaff
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-xs mt-1 ${isStaff ? "text-blue-100" : "text-gray-500"}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                />
                <Button type="submit" size="icon" className="h-[60px] w-[60px]">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a patient from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
