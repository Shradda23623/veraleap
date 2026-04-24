import { useState, useRef, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { useSEO } from "@/hooks/useSEO";

const Chat = () => {
  useSEO({ title: "Messages", description: "Chat with brokers, owners, and tenants on VeraLeap." });
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const toId = searchParams.get("to");
  const toName = searchParams.get("name");
  const queryClient = useQueryClient();

  const [selectedContact, setSelectedContact] = useState<string | null>(toId || null);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations (unique contacts)
  const { data: contacts = [] } = useQuery({
    queryKey: ["chat-contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!msgs?.length) {
        // If navigated with ?to= param, show that contact
        if (toId && toName) {
          return [{ id: toId, username: toName, avatar_url: null, lastMessage: "Start a conversation", unread: 0 }];
        }
        return [];
      }

      const contactIds = new Set<string>();
      msgs.forEach(m => {
        if (m.sender_id !== user.id) contactIds.add(m.sender_id);
        if (m.receiver_id !== user.id) contactIds.add(m.receiver_id);
      });

      // Add the ?to= contact if not in messages
      if (toId) contactIds.add(toId);

      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", Array.from(contactIds));
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return Array.from(contactIds).map(cId => {
        const profile = profileMap.get(cId);
        const lastMsg = msgs.find(m => m.sender_id === cId || m.receiver_id === cId);
        const unread = msgs.filter(m => m.sender_id === cId && m.receiver_id === user.id && !m.read).length;
        return {
          id: cId,
          username: profile?.username || toName || "Unknown",
          avatar_url: profile?.avatar_url,
          lastMessage: lastMsg?.content || "Start a conversation",
          unread,
        };
      });
    },
    enabled: !!user,
  });

  // Fetch messages for selected contact
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", user?.id, selectedContact],
    queryFn: async () => {
      if (!user || !selectedContact) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact}),and(sender_id.eq.${selectedContact},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user && !!selectedContact,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Tables<"messages">;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
          queryClient.invalidateQueries({ queryKey: ["chat-contacts"] });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[60vh]">
        <Skeleton className="h-full" />
        <Skeleton className="h-full md:col-span-2" />
      </div>
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;

  const currentContact = contacts.find(c => c.id === selectedContact);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedContact) return;
    
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedContact,
      content: newMsg.trim(),
    });
    setNewMsg("");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-6">
        <span className="text-gradient-hero">Messages</span>
      </h1>
      <div className="bg-card rounded-2xl shadow-elevated overflow-hidden flex h-[70vh]">
        {/* Sidebar */}
        <div className={`${selectedContact ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-border`}>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No conversations yet</div>
            ) : (
              contacts.map(c => (
                <button key={c.id} onClick={() => setSelectedContact(c.id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left ${selectedContact === c.id ? "bg-muted/50" : ""}`}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {c.username.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{c.username}</p>
                      {c.unread > 0 && <span className="w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">{c.unread}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${selectedContact ? "flex" : "hidden md:flex"} flex-col flex-1`}>
          {selectedContact && currentContact ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <button onClick={() => setSelectedContact(null)} className="md:hidden p-1 hover:bg-muted rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {currentContact.avatar_url ? (
                  <img src={currentContact.avatar_url} alt={currentContact.username} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {currentContact.username.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{currentContact.username}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.sender_id === user.id ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                      <p className="text-sm">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Type a message..." />
                <Button type="submit" className="bg-gradient-hero text-primary-foreground border-0 rounded-xl px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
