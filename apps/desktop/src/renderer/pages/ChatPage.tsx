import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageDTO, OnlineUsersDTO, TypingDTO, UserDTO, UserListItemDTO } from "@minimalchat/shared";
import { AnimatePresence, motion } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";
import { ChatInput } from "@/components/ChatInput";
import { EmptyChatState } from "@/components/EmptyChatState";
import { ImageViewer } from "@/components/ImageViewer";
import { MessageList } from "@/components/MessageList";
import { ProfileModal } from "@/components/ProfileModal";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar } from "@/components/Sidebar";
import { UserList } from "@/components/UserList";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { Language } from "@/lib/i18n";
import { getTranslation, translateError } from "@/lib/i18n";
import { getPresenceText } from "@/lib/presence";
import { applyReactionUpdate, type ReactionUpdate } from "@/lib/reactions";
import { playUiSound } from "@/lib/sounds";
import {
  clearStoredUser,
  getStoredSoundSettings,
  storeSoundSettings,
  type SoundSettings
} from "@/lib/storage";
import { createChatSocket, sendSocketMessage, type ChatSocket } from "@/lib/socket";

interface ChatPageProps {
  user: UserDTO;
  language: Language;
  onUserUpdate: (user: UserDTO) => void;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
}

export function ChatPage({ user, language, onUserUpdate, onLanguageChange, onLogout }: ChatPageProps) {
  const [users, setUsers] = useState<UserListItemDTO[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserListItemDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [query, setQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageDTO | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => getStoredSoundSettings());
  const [profileError, setProfileError] = useState("");
  const [pinnedCursor, setPinnedCursor] = useState(0);
  const [typingUserIds, setTypingUserIds] = useState<Record<string, boolean>>({});
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const selectedUserRef = useRef<UserListItemDTO | null>(null);
  const usersRef = useRef<UserListItemDTO[]>([]);
  const typingTimersRef = useRef<Record<string, number>>({});
  const soundSettingsRef = useRef(soundSettings);
  const t = getTranslation(language);
  const totalUnreadCount = useMemo(
    () => users.reduce((sum, item) => sum + Math.max(0, item.unreadCount), 0),
    [users]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUsers((current) => [...current]);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    soundSettingsRef.current = soundSettings;
    storeSoundSettings(soundSettings);
  }, [soundSettings]);

  useEffect(() => {
    void window.minimalChatApp?.setUnreadCount?.(totalUnreadCount);
  }, [totalUnreadCount]);

  useEffect(() => {
    return () => {
      void window.minimalChatApp?.setUnreadCount?.(0);
    };
  }, []);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      typingTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    setPinnedCursor(0);
    setReplyTarget(null);
  }, [selectedUser?.id]);

  useEffect(() => {
    if (replyTarget && !messages.some((message) => message.id === replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messages, replyTarget]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (imagePreview) {
        event.preventDefault();
        setImagePreview(null);
        return;
      }

      if (settingsOpen) {
        event.preventDefault();
        setSettingsOpen(false);
        return;
      }

      if (profileOpen) {
        event.preventDefault();
        setProfileOpen(false);
        return;
      }

      if (replyTarget) {
        event.preventDefault();
        setReplyTarget(null);
        return;
      }

      if (selectedUser) {
        event.preventDefault();
        setSelectedUser(null);
        setMessages([]);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [imagePreview, profileOpen, replyTarget, selectedUser, settingsOpen]);

  useEffect(() => {
    const removeNotificationClickListener = window.minimalChatNotifications?.onMessageClick((payload) => {
      if (payload.senderId) {
        void openConversationFromNotification(payload.senderId);
      }
    });

    return () => removeNotificationClickListener?.();
  }, [user.id]);

  useEffect(() => {
    const chatSocket = createChatSocket(user.id);
    setSocket(chatSocket);

    chatSocket.on("connect", () => setConnected(true));
    chatSocket.on("disconnect", () => setConnected(false));
    chatSocket.on("message:receive", (message: MessageDTO) => {
      const activeUser = selectedUserRef.current;
      const belongsToSelected =
        activeUser &&
        ((message.senderId === user.id && message.receiverId === activeUser.id) ||
          (message.senderId === activeUser.id && message.receiverId === user.id));

      setMessages((current) => {
        if (!belongsToSelected || current.some((item) => item.id === message.id)) {
          return current;
        }

        return [...current, message];
      });
      if (activeUser && belongsToSelected && message.senderId === activeUser.id && message.receiverId === user.id) {
        void markConversationRead(activeUser.id);
      }
      if (message.receiverId === user.id) {
        void showIncomingMessageNotification(message, Boolean(!belongsToSelected));
      }
      setUsers((current) => {
        const nextUsers = bumpUserWithMessage(current, message, user.id, activeUser?.id ?? null);
        if (nextUsers === current && message.receiverId === user.id) {
          void loadUsers();
        }
        return nextUsers;
      });
    });
    chatSocket.on("message:update", (message: MessageDTO) => {
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...message, reactions: item.reactions } : item))
      );
      setUsers((current) =>
        current.map((item) =>
          item.lastMessage?.id === message.id
            ? {
                ...item,
                lastMessage: message
              }
            : item
        )
      );
    });
    chatSocket.on("message:delete", (payload: { id: string }) => {
      setMessages((current) => current.filter((item) => item.id !== payload.id));
      setUsers((current) =>
        current.map((item) => (item.lastMessage?.id === payload.id ? { ...item, lastMessage: null } : item))
      );
      void loadUsers();
    });
    chatSocket.on(
      "reaction:update",
      (payload: ReactionUpdate) => {
        setMessages((current) => applyReactionUpdate(current, payload));
      }
    );
    chatSocket.on("typing", (payload: TypingDTO) => {
      if (payload.receiverId !== user.id || payload.senderId === user.id) return;

      updateTypingStatus(payload.senderId, payload.isTyping);
    });

    const setOnline = (payload: OnlineUsersDTO) => {
      setUsers((current) =>
        current.map((item) => (payload.userIds.includes(item.id) ? { ...item, online: true } : item))
      );
      setSelectedUser((current) =>
        current && payload.userIds.includes(current.id) ? { ...current, online: true } : current
      );
    };
    const setOffline = (payload: OnlineUsersDTO) => {
      const lastSeenAt = new Date().toISOString();

      setUsers((current) =>
        current.map((item) => (payload.userIds.includes(item.id) ? { ...item, online: false, lastSeenAt } : item))
      );
      setSelectedUser((current) =>
        current && payload.userIds.includes(current.id) ? { ...current, online: false, lastSeenAt } : current
      );
    };

    chatSocket.on("user:online", setOnline);
    chatSocket.on("user:offline", setOffline);
    chatSocket.on("user:update", (updatedUser: UserDTO) => {
      setUsers((current) =>
        current.map((item) => (item.id === updatedUser.id ? { ...item, ...updatedUser, online: item.online } : item))
      );
      setSelectedUser((current) =>
        current?.id === updatedUser.id ? { ...current, ...updatedUser, online: current.online } : current
      );
    });

    return () => {
      chatSocket.emit("user:disconnect");
      chatSocket.disconnect();
    };
  }, [user.id]);

  useEffect(() => {
    const value = query.trim();

    if (!value) {
      void loadUsers();
      return;
    }

    if (!value.startsWith("@")) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    const timeout = window.setTimeout(() => {
      void searchUsers(value);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query, user.id]);

  async function loadUsers() {
    setUsersLoading(true);
    setError("");
    try {
      const result = await api.users(user.id);
      setUsers(result.users);
      if (selectedUser) {
        const freshSelected = result.users.find((item) => item.id === selectedUser.id);
        setSelectedUser(freshSelected ?? null);
      }
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setUsersLoading(false);
    }
  }

  async function markConversationRead(otherUserId: string) {
    try {
      const result = await api.markMessagesRead(user.id, otherUserId);

      if (!result.messages.length) return;

      setMessages((current) =>
        current.map((message) => {
          const updated = result.messages.find((item) => item.id === message.id);
          return updated ? { ...updated, reactions: message.reactions } : message;
        })
      );
      setUsers((current) =>
        current.map((item) => {
          const updatedLastMessage = item.lastMessage
            ? result.messages.find((message) => message.id === item.lastMessage?.id)
            : null;

          if (item.id !== otherUserId) return item;

          return {
            ...item,
            unreadCount: 0,
            lastMessage: updatedLastMessage ?? item.lastMessage
          };
        })
      );
    } catch {
      // Read receipts are best-effort and should not interrupt chatting.
    }
  }

  async function searchUsers(value: string) {
    setError("");

    try {
      const result = await api.users(user.id, value);
      setUsers(result.users);
    } catch (caught) {
      setError(translateError(caught, t));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  async function selectUser(nextUser: UserListItemDTO) {
    setSelectedUser({ ...nextUser, unreadCount: 0 });
    setUsers((current) => current.map((item) => (item.id === nextUser.id ? { ...item, unreadCount: 0 } : item)));
    setMessagesLoading(true);
    setError("");

    try {
      const result = await api.messages(user.id, nextUser.id);
      setMessages(result.messages);
    } catch (caught) {
      const translated = translateError(caught, t);
      setError(translated === t.errors.generic ? t.errors.couldNotLoadMessages : translated);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function openConversationFromNotification(senderId: string) {
    const knownUser = usersRef.current.find((item) => item.id === senderId);

    if (knownUser) {
      await selectUser(knownUser);
      return;
    }

    try {
      const result = await api.users(user.id);
      setUsers(result.users);
      const freshUser = result.users.find((item) => item.id === senderId);

      if (freshUser) {
        await selectUser(freshUser);
      }
    } catch {
      // Notification clicks should never interrupt the active chat.
    }
  }

  async function showIncomingMessageNotification(message: MessageDTO, force: boolean) {
    const sender =
      selectedUserRef.current?.id === message.senderId
        ? selectedUserRef.current
        : usersRef.current.find((item) => item.id === message.senderId);
    const soundEnabled = soundSettingsRef.current.notifications;

    const notificationShown = await window.minimalChatNotifications?.showMessage({
      title: sender?.username || "MinimalChat",
      body: getNotificationBody(message, t),
      senderId: message.senderId,
      force,
      silent: !soundEnabled
    });

    if (soundEnabled && !notificationShown) {
      void playUiSound("notification");
    }
  }

  async function sendMessage(text: string, file?: File | null) {
    if (!selectedUser) return;

    if (file) {
      try {
        const result = await api.sendMessageWithFile({
          senderId: user.id,
          receiverId: selectedUser.id,
          text,
          replyToMessageId: replyTarget?.id ?? null,
          file
        });
        setMessages((current) =>
          current.some((item) => item.id === result.message.id) ? current : [...current, result.message]
        );
        setUsers((current) => bumpUserWithMessage(current, result.message, user.id, selectedUser.id));
        if (soundSettings.sentMessages) {
          void playUiSound("sent");
        }
      } catch (caught) {
        setError(translateError(caught, t));
      }
      return;
    }

    const response = await sendSocketMessage(socket, {
      senderId: user.id,
      receiverId: selectedUser.id,
      text,
      replyToMessageId: replyTarget?.id ?? null
    });

    if (!response.ok) {
      setError(response.code === "SERVER_UNAVAILABLE" ? t.errors.messageNotSent : translateError(response, t));
      return;
    }

    if (soundSettings.sentMessages) {
      void playUiSound("sent");
    }
  }

  const sendTypingState = useCallback(
    (isTyping: boolean) => {
      if (!selectedUser) return;

      socket?.emit("typing", {
        senderId: user.id,
        receiverId: selectedUser.id,
        isTyping
      } satisfies TypingDTO);
    },
    [selectedUser, socket, user.id]
  );

  function updateTypingStatus(senderId: string, isTyping: boolean) {
    const existingTimer = typingTimersRef.current[senderId];

    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete typingTimersRef.current[senderId];
    }

    setTypingUserIds((current) => ({
      ...current,
      [senderId]: isTyping
    }));

    if (!isTyping) return;

    typingTimersRef.current[senderId] = window.setTimeout(() => {
      setTypingUserIds((current) => ({
        ...current,
        [senderId]: false
      }));
      delete typingTimersRef.current[senderId];
    }, 3000);
  }

  async function editMessage(message: MessageDTO, text: string) {
    try {
      const result = await api.editMessage(message.id, user.id, text);
      setMessages((current) =>
        current.map((item) =>
          item.id === result.message.id ? { ...result.message, reactions: item.reactions } : item
        )
      );
      setUsers((current) =>
        current.map((item) =>
          item.lastMessage?.id === result.message.id ? { ...item, lastMessage: result.message } : item
        )
      );
    } catch (caught) {
      setError(translateError(caught, t));
    }
  }

  async function deleteMessage(message: MessageDTO, mode: "me" | "all") {
    try {
      await api.deleteMessage(message.id, user.id, mode);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setUsers((current) =>
        current.map((item) => (item.lastMessage?.id === message.id ? { ...item, lastMessage: null } : item))
      );
      void loadUsers();
    } catch (caught) {
      setError(translateError(caught, t));
    }
  }

  async function pinMessage(message: MessageDTO) {
    try {
      const result = await api.pinMessage(message.id, user.id, !message.isPinned);
      setMessages((current) =>
        current.map((item) =>
          item.id === result.message.id ? { ...result.message, reactions: item.reactions } : item
        )
      );
    } catch (caught) {
      setError(translateError(caught, t));
    }
  }

  async function updateProfile(data: { username: string; handle: string; avatarUrl: string | null }) {
    setProfileLoading(true);
    setProfileError("");

    try {
      const result = await api.updateProfile(user.id, data);
      onUserUpdate(result.user);
      setProfileOpen(false);
    } catch (caught) {
      setProfileError(translateError(caught, t));
    } finally {
      setProfileLoading(false);
    }
  }

  async function toggleReaction(message: MessageDTO, emoji: string) {
    try {
      const result = await api.toggleReaction(message.id, user.id, emoji);
      setMessages((current) =>
        applyReactionUpdate(
          current,
          result.action === "added"
            ? { action: "added", reaction: result.reaction }
            : { action: "removed", reactionId: result.reaction.id }
        )
      );
    } catch (caught) {
      setError(translateError(caught, t));
    }
  }

  async function updateLastSeenPrivacy(hideLastSeen: boolean) {
    setPrivacyLoading(true);
    setError("");

    try {
      const result = await api.updateLastSeenPrivacy(user.id, hideLastSeen);
      onUserUpdate({ ...result.user, online: user.online });
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setPrivacyLoading(false);
    }
  }

  function logout() {
    clearStoredUser();
    socket?.emit("user:disconnect");
    socket?.disconnect();
    void api.logout();
    onLogout();
  }

  const emptyMode = useMemo<"conversations" | "hint" | "search">(() => {
    const value = query.trim();
    if (!value) return "conversations";
    return value.startsWith("@") ? "search" : "hint";
  }, [query]);

  const pinnedMessages = useMemo(() => {
    return messages
      .filter((message) => message.isPinned)
      .sort((first, second) => new Date(second.sentAt).getTime() - new Date(first.sentAt).getTime());
  }, [messages]);

  useEffect(() => {
    setPinnedCursor((current) => {
      if (!pinnedMessages.length) return 0;
      return Math.min(current, pinnedMessages.length - 1);
    });
  }, [pinnedMessages.length]);

  const pinnedMessage = pinnedMessages[pinnedCursor] ?? null;
  const selectedUserTyping = Boolean(selectedUser && typingUserIds[selectedUser.id]);
  const selectedUserPresenceText = selectedUser ? getPresenceText(selectedUser, t) : "";

  function showNextPinnedMessage() {
    setPinnedCursor((current) => (pinnedMessages.length ? (current + 1) % pinnedMessages.length : 0));
  }

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <Sidebar user={user} unreadCount={totalUnreadCount} onProfileOpen={() => setProfileOpen(true)} />
      <UserList
        users={users}
        selectedUserId={selectedUser?.id}
        loading={usersLoading}
        query={query}
        t={t}
        emptyMode={emptyMode}
        onQueryChange={setQuery}
        onSelect={selectUser}
      />
      <section className="flex min-w-0 flex-1 flex-col bg-background">
        {error ? (
          <div className="mx-6 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          {!selectedUser ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-0 flex-1">
              <EmptyChatState t={t} />
            </motion.div>
          ) : (
            <motion.div
              key={selectedUser.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <header className="flex h-[82px] shrink-0 items-center justify-between border-b border-borderSoft bg-background/80 px-7">
                <div className="flex items-center gap-4">
                  <Avatar username={selectedUser.username} avatarUrl={selectedUser.avatarUrl} online={selectedUser.online} className="h-12 w-12 rounded-full" />
                  <div>
                    <h2 className="text-base font-semibold text-primaryText">{selectedUser.username}</h2>
                    <AnimatePresence mode="wait" initial={false}>
                      {selectedUserTyping ? (
                        <motion.p
                          key="typing"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14 }}
                          className="mt-1 text-xs font-medium text-accent"
                        >
                          {t.chat.typing}
                        </motion.p>
                      ) : (
                        <motion.p
                          key="presence"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14 }}
                          className="mt-1 text-xs text-secondaryText"
                        >
                          {selectedUserPresenceText}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-borderSoft bg-panel px-3 py-2 text-xs text-secondaryText">
                  {selectedUser.online ? <Wifi size={15} className="text-emerald-400" /> : <WifiOff size={15} className="text-red-300" />}
                  {selectedUserPresenceText}
                </div>
              </header>
              <MessageList
                currentUserId={user.id}
                currentUserName={user.username}
                otherUserName={selectedUser.username}
                messages={messages}
                loading={messagesLoading}
                t={t}
                pinnedMessage={pinnedMessage}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onPinMessage={pinMessage}
                onToggleReaction={toggleReaction}
                onReplyMessage={setReplyTarget}
                onPinnedConsumed={showNextPinnedMessage}
                onOpenImage={setImagePreview}
              />
              <ChatInput
                disabled={!connected || messagesLoading}
                t={t}
                replyTo={replyTarget}
                replyToAuthorName={replyTarget ? getMessageAuthorName(replyTarget, user, selectedUser) : ""}
                onCancelReply={() => setReplyTarget(null)}
                onSend={sendMessage}
                onTypingChange={sendTypingState}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <AnimatePresence>
        {profileOpen ? (
          <ProfileModal
            user={user}
            t={t}
            loading={profileLoading}
            error={profileError}
            onClose={() => setProfileOpen(false)}
            onOpenSettings={() => setSettingsOpen(true)}
            onSave={updateProfile}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {settingsOpen ? (
          <SettingsModal
            t={t}
            user={user}
            language={language}
            soundSettings={soundSettings}
            privacyLoading={privacyLoading}
            onClose={() => setSettingsOpen(false)}
            onLanguageChange={onLanguageChange}
            onSoundSettingsChange={setSoundSettings}
            onLastSeenPrivacyChange={updateLastSeenPrivacy}
            onLogout={logout}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {imagePreview ? (
          <ImageViewer
            url={imagePreview.url}
            name={imagePreview.name}
            closeLabel={t.profile.close}
            onClose={() => setImagePreview(null)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function bumpUserWithMessage(
  users: UserListItemDTO[],
  message: MessageDTO,
  currentUserId: string,
  selectedUserId: string | null
) {
  const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
  const index = users.findIndex((item) => item.id === otherUserId);

  if (index === -1) return users;

  const unreadIncrement = message.senderId !== currentUserId && otherUserId !== selectedUserId ? 1 : 0;
  const next = [...users];
  const [matched] = next.splice(index, 1);
  next.unshift({
    ...matched,
    lastMessage: message,
    unreadCount: otherUserId === selectedUserId ? 0 : matched.unreadCount + unreadIncrement
  });
  return next;
}

function getMessageAuthorName(message: MessageDTO, currentUser: UserDTO, selectedUser: UserDTO) {
  return message.senderId === currentUser.id ? currentUser.username : selectedUser.username;
}

function getNotificationBody(message: MessageDTO, t: ReturnType<typeof getTranslation>) {
  const text = message.text.trim();

  if (text) {
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  if (message.attachmentName) {
    return message.attachmentName;
  }

  if (message.attachmentMime?.startsWith("image/")) {
    return t.chat.originalMessage;
  }

  return t.chat.originalMessage;
}
