import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageDTO, OnlineUsersDTO, TypingDTO, UserDTO, UserListItemDTO } from "@minimalchat/shared";
import { Bookmark } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ChatInput } from "@/components/ChatInput";
import { ChatHistoryMenu } from "@/components/ChatHistoryMenu";
import { ChatSearch } from "@/components/ChatSearch";
import { EmptyChatState } from "@/components/EmptyChatState";
import { ForwardMessageModal } from "@/components/ForwardMessageModal";
import { ImageViewer } from "@/components/ImageViewer";
import { MessageSelectionBar } from "@/components/MessageSelectionBar";
import { MessageList } from "@/components/MessageList";
import { copyMessageContent, getAttachmentUrl, getCopyMode } from "@/components/MessageBubble";
import { ProfileModal } from "@/components/ProfileModal";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar } from "@/components/Sidebar";
import { UserList } from "@/components/UserList";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { Language } from "@/lib/i18n";
import { getTranslation, translateError } from "@/lib/i18n";
import { getPresenceText } from "@/lib/presence";
import { applyReactionUpdate, type ReactionUpdate } from "@/lib/reactions";
import { playUiSound } from "@/lib/sounds";
import {
  clearStoredUser,
  getStoredDrafts,
  getStoredSoundSettings,
  storeDrafts,
  storeSoundSettings,
  type ChatDrafts,
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
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageDTO | null>(null);
  const [forwardTargets, setForwardTargets] = useState<MessageDTO[]>([]);
  const [forwardUsers, setForwardUsers] = useState<UserListItemDTO[]>([]);
  const [forwardQuery, setForwardQuery] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardingUserId, setForwardingUserId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [clearHistoryBusy, setClearHistoryBusy] = useState(false);
  const [drafts, setDrafts] = useState<ChatDrafts>(() => getStoredDrafts(user.id));
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
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
  const usersRefreshTimerRef = useRef<number | null>(null);
  const soundSettingsRef = useRef(soundSettings);
  const t = getTranslation(language);
  const forwardTarget = forwardTargets[0] ?? null;
  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedMessageIds.includes(message.id)),
    [messages, selectedMessageIds]
  );
  const canCopySelection = useMemo(() => {
    if (selectedMessages.some((message) => message.text.trim())) return true;
    if (selectedMessages.length !== 1) return false;
    const message = selectedMessages[0];
    const attachmentUrl = getAttachmentUrl(message.attachmentUrl);
    return getCopyMode(message, attachmentUrl) === "image";
  }, [selectedMessages]);
  const searchResults = useMemo(() => {
    const value = chatSearchQuery.trim().toLocaleLowerCase();
    if (!value) return [];

    return messages.filter((message) => message.text.toLocaleLowerCase().includes(value));
  }, [chatSearchQuery, messages]);
  const activeSearchMessageId = searchResults[activeSearchIndex]?.id ?? null;
  const displayedUsers = useMemo(() => sortConversationUsersWithDrafts(users, drafts), [drafts, users]);
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
    storeDrafts(user.id, drafts);
  }, [drafts, user.id]);

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
      if (usersRefreshTimerRef.current !== null) {
        window.clearTimeout(usersRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPinnedCursor(0);
    setReplyTarget(null);
    setSelectedMessageIds([]);
    setChatSearchOpen(false);
    setChatSearchQuery("");
    setActiveSearchIndex(0);
  }, [selectedUser?.id]);

  useEffect(() => {
    setActiveSearchIndex(searchResults.length ? searchResults.length - 1 : 0);
  }, [chatSearchQuery, searchResults.length]);

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

      if (forwardTarget) {
        event.preventDefault();
        setForwardTargets([]);
        setForwardQuery("");
        return;
      }

      if (chatSearchOpen) {
        event.preventDefault();
        setChatSearchOpen(false);
        setChatSearchQuery("");
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

      if (userProfileOpen) {
        event.preventDefault();
        setUserProfileOpen(false);
        return;
      }

      if (selectedMessageIds.length) {
        event.preventDefault();
        setSelectedMessageIds([]);
        return;
      }

      if (selectedUser) {
        event.preventDefault();
        selectedUserRef.current = null;
        setSelectedUser(null);
        setMessages([]);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [chatSearchOpen, forwardTarget, imagePreview, profileOpen, replyTarget, selectedMessageIds.length, selectedUser, settingsOpen, userProfileOpen]);

  useEffect(() => {
    if (!forwardTarget) {
      setForwardUsers([]);
      setForwardLoading(false);
      return;
    }

    const value = forwardQuery.trim();

    if (value && !value.startsWith("@")) {
      setForwardUsers([]);
      setForwardLoading(false);
      return;
    }

    let cancelled = false;
    setForwardLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const result = await api.users(user.id, value || undefined);
        if (!cancelled) {
          setForwardUsers(value ? result.users : withSavedMessages(result.users, user));
        }
      } catch (caught) {
        if (!cancelled) {
          setForwardUsers([]);
          setError(translateError(caught, t));
        }
      } finally {
        if (!cancelled) {
          setForwardLoading(false);
        }
      }
    }, value ? 220 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [forwardQuery, forwardTarget?.id, user.id]);

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
      if (message.receiverId === user.id && message.senderId !== user.id) {
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
      scheduleUsersRefresh();
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

  async function loadUsers(silent = false) {
    if (!silent) {
      setUsersLoading(true);
      setError("");
    }

    try {
      const result = await api.users(user.id);
      const nextUsers = withSavedMessages(result.users, user);
      setUsers(nextUsers);
      const activeUser = selectedUserRef.current;
      if (activeUser) {
        const freshSelected = nextUsers.find((item) => item.id === activeUser.id);
        selectedUserRef.current = freshSelected ?? null;
        setSelectedUser(freshSelected ?? null);
      }
    } catch (caught) {
      if (!silent) {
        setError(translateError(caught, t));
      }
    } finally {
      if (!silent) {
        setUsersLoading(false);
      }
    }
  }

  function scheduleUsersRefresh() {
    if (usersRefreshTimerRef.current !== null) {
      window.clearTimeout(usersRefreshTimerRef.current);
    }

    usersRefreshTimerRef.current = window.setTimeout(() => {
      usersRefreshTimerRef.current = null;
      void loadUsers(true);
    }, 160);
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
    if (selectedUserRef.current?.id === nextUser.id) return;

    const activeUser = { ...nextUser, unreadCount: 0 };
    selectedUserRef.current = activeUser;
    setSelectedUser(activeUser);
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
      const nextUsers = withSavedMessages(result.users, user);
      setUsers(nextUsers);
      const freshUser = nextUsers.find((item) => item.id === senderId);

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
    if (!selectedUser) return false;

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
        return true;
      } catch (caught) {
        setError(translateError(caught, t));
        return false;
      }
    }

    const response = await sendSocketMessage(socket, {
      senderId: user.id,
      receiverId: selectedUser.id,
      text,
      replyToMessageId: replyTarget?.id ?? null
    });

    if (!response.ok) {
      setError(response.code === "SERVER_UNAVAILABLE" ? t.errors.messageNotSent : translateError(response, t));
      return false;
    }

    if (soundSettings.sentMessages) {
      void playUiSound("sent");
    }
    return true;
  }

  const sendTypingState = useCallback(
    (isTyping: boolean) => {
      if (!selectedUser || selectedUser.isSavedMessages) return;

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
      const remainingMessages = messages.filter((item) => item.id !== message.id);
      const replacement = remainingMessages.at(-1) ?? null;

      setMessages(remainingMessages);
      setUsers((current) =>
        sortConversationUsers(
          current.map((item) =>
            item.lastMessage?.id === message.id ? { ...item, lastMessage: replacement } : item
          )
        )
      );
      void loadUsers(true);
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

  async function updateProfile(data: { username: string; handle: string; avatarUrl: string | null; bio: string }) {
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

  function openForwardMessage(message: MessageDTO) {
    setForwardTargets([message]);
    setForwardQuery("");
    setForwardingUserId(null);
  }

  async function forwardMessageTo(targetUser: UserListItemDTO) {
    if (!forwardTargets.length || forwardingUserId) return;

    setForwardingUserId(targetUser.id);
    setError("");

    try {
      const forwarded: MessageDTO[] = [];

      for (const source of forwardTargets) {
        const result = await api.forwardMessage(source, user.id, targetUser.id);
        forwarded.push(result.message);
      }

      if (selectedUser?.id === targetUser.id) {
        setMessages((current) => [
          ...current,
          ...forwarded.filter((message) => !current.some((item) => item.id === message.id))
        ]);
      }

      const lastForwarded = forwarded.at(-1);
      if (lastForwarded) {
        setUsers((current) => upsertUserWithMessage(current, targetUser, lastForwarded));
      }
      if (soundSettings.sentMessages) {
        void playUiSound("sent");
      }
      setForwardTargets([]);
      setForwardQuery("");
      setSelectedMessageIds([]);
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setForwardingUserId(null);
    }
  }

  function openForwardSelection() {
    if (!selectedMessages.length) return;
    setForwardTargets(selectedMessages);
    setForwardQuery("");
    setForwardingUserId(null);
  }

  function changeMessageSelection(messageIds: string[]) {
    if (messageIds.length) {
      setReplyTarget(null);
    }
    setSelectedMessageIds(messageIds);
  }

  async function copySelectedMessages() {
    if (!selectedMessages.length || !canCopySelection) return;

    setSelectionBusy(true);
    try {
      if (selectedMessages.length === 1) {
        const message = selectedMessages[0];
        const attachmentUrl = getAttachmentUrl(message.attachmentUrl);
        const mode = getCopyMode(message, attachmentUrl);

        if (mode === "image") {
          await copyMessageContent(message, attachmentUrl, mode);
          setSelectedMessageIds([]);
          return;
        }
      }

      const text = selectedMessages
        .map((message) => message.text.trim())
        .filter(Boolean)
        .join("\n\n");

      if (text) {
        await writeClipboardText(text);
        setSelectedMessageIds([]);
      }
    } finally {
      setSelectionBusy(false);
    }
  }

  async function saveSelectedMessages() {
    if (!selectedMessages.length || selectedUser?.isSavedMessages) return;

    setSelectionBusy(true);
    setError("");
    try {
      const savedUser = withSavedMessages(users, user).find((item) => item.isSavedMessages);
      if (!savedUser) return;

      let lastMessage: MessageDTO | null = null;
      for (const source of selectedMessages) {
        const result = await api.forwardMessage(source, user.id, user.id);
        lastMessage = result.message;
      }

      if (lastMessage) {
        setUsers((current) => upsertUserWithMessage(current, savedUser, lastMessage as MessageDTO));
      }
      setSelectedMessageIds([]);
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setSelectionBusy(false);
    }
  }

  async function deleteSelectedMessages(mode: "me" | "all") {
    if (!selectedMessages.length) return;

    setSelectionBusy(true);
    setError("");
    try {
      await Promise.all(selectedMessages.map((message) => api.deleteMessage(message.id, user.id, mode)));
      const deletedIds = new Set(selectedMessages.map((message) => message.id));
      const remainingMessages = messages.filter((message) => !deletedIds.has(message.id));
      const replacement = remainingMessages.at(-1) ?? null;

      setMessages(remainingMessages);
      setUsers((current) =>
        sortConversationUsers(
          current.map((item) =>
            item.lastMessage && deletedIds.has(item.lastMessage.id) ? { ...item, lastMessage: replacement } : item
          )
        )
      );
      setSelectedMessageIds([]);
      void loadUsers(true);
    } catch (caught) {
      setError(translateError(caught, t));
    } finally {
      setSelectionBusy(false);
    }
  }

  async function clearChatHistory(mode: "me" | "all") {
    if (!selectedUser || clearHistoryBusy) return false;

    setClearHistoryBusy(true);
    setError("");
    try {
      await api.clearConversation(user.id, selectedUser.id, mode);
      setMessages([]);
      setReplyTarget(null);
      setSelectedMessageIds([]);
      setPinnedCursor(0);
      setUsers((current) =>
        sortConversationUsers(
          current.map((item) =>
            item.id === selectedUser.id
              ? { ...item, lastMessage: null, unreadCount: 0 }
              : item
          )
        )
      );
      scheduleUsersRefresh();
      return true;
    } catch (caught) {
      setError(translateError(caught, t));
      return false;
    } finally {
      setClearHistoryBusy(false);
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

  const selectedUserTyping = Boolean(selectedUser && !selectedUser.isSavedMessages && typingUserIds[selectedUser.id]);
  const selectedUserPresenceText = selectedUser
    ? selectedUser.isSavedMessages
      ? t.chat.savedMessagesHint
      : getPresenceText(selectedUser, t)
    : "";
  const selectedUserName = selectedUser?.isSavedMessages ? t.chat.savedMessages : selectedUser?.username ?? "";

  function updateDraft(text: string) {
    if (!selectedUser) return;

    setDrafts((current) => {
      const value = text.slice(0, 1000);
      if (!value) {
        const next = { ...current };
        delete next[selectedUser.id];
        return next;
      }

      return {
        ...current,
        [selectedUser.id]: {
          text: value,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function closeChatSearch() {
    setChatSearchOpen(false);
    setChatSearchQuery("");
    setActiveSearchIndex(0);
  }

  function showPreviousSearchResult() {
    if (!searchResults.length) return;
    setActiveSearchIndex((current) => (current - 1 + searchResults.length) % searchResults.length);
  }

  function showNextSearchResult() {
    if (!searchResults.length) return;
    setActiveSearchIndex((current) => (current + 1) % searchResults.length);
  }

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <Sidebar user={user} unreadCount={totalUnreadCount} onProfileOpen={() => setProfileOpen(true)} />
      <UserList
        users={displayedUsers}
        selectedUserId={selectedUser?.id}
        loading={usersLoading}
        query={query}
        t={t}
        drafts={drafts}
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
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-4 rounded-2xl p-1 text-left transition hover:bg-white/[0.04]"
                  onClick={() => {
                    if (selectedUser.isSavedMessages) {
                      setProfileOpen(true);
                    } else {
                      setUserProfileOpen(true);
                    }
                  }}
                >
                  {selectedUser.isSavedMessages ? (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-accent">
                      <Bookmark size={20} fill="currentColor" />
                    </div>
                  ) : (
                    <Avatar username={selectedUser.username} avatarUrl={selectedUser.avatarUrl} online={selectedUser.online} className="h-12 w-12 rounded-full" />
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-primaryText">{selectedUserName}</h2>
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
                </button>
                <div className="flex items-center gap-1">
                  <ChatSearch
                    open={chatSearchOpen}
                    query={chatSearchQuery}
                    resultCount={searchResults.length}
                    activeResult={activeSearchIndex}
                    t={t}
                    onOpenChange={(open) => (open ? setChatSearchOpen(true) : closeChatSearch())}
                    onQueryChange={setChatSearchQuery}
                    onPrevious={showPreviousSearchResult}
                    onNext={showNextSearchResult}
                  />
                  {!chatSearchOpen ? (
                    <ChatHistoryMenu
                      savedMessages={Boolean(selectedUser.isSavedMessages)}
                      busy={clearHistoryBusy}
                      t={t}
                      onClear={clearChatHistory}
                    />
                  ) : null}
                </div>
              </header>
              <MessageList
                currentUserId={user.id}
                currentUserName={user.username}
                otherUserName={selectedUserName}
                messages={messages}
                loading={messagesLoading}
                emptyText={selectedUser.isSavedMessages ? t.chat.savedMessagesEmpty : undefined}
                savedMessages={selectedUser.isSavedMessages}
                selectedMessageIds={selectedMessageIds}
                searchQuery={chatSearchQuery}
                activeSearchMessageId={activeSearchMessageId}
                t={t}
                pinnedMessages={pinnedMessages}
                pinnedIndex={pinnedCursor}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onPinMessage={pinMessage}
                onToggleReaction={toggleReaction}
                onForwardMessage={openForwardMessage}
                onReplyMessage={setReplyTarget}
                onSelectionChange={changeMessageSelection}
                onPinnedIndexChange={setPinnedCursor}
                onOpenImage={setImagePreview}
              />
              {selectedMessageIds.length ? (
                <MessageSelectionBar
                  count={selectedMessageIds.length}
                  savedMessages={Boolean(selectedUser.isSavedMessages)}
                  canCopy={canCopySelection}
                  busy={selectionBusy}
                  t={t}
                  onCopy={copySelectedMessages}
                  onSave={saveSelectedMessages}
                  onForward={openForwardSelection}
                  onDelete={deleteSelectedMessages}
                  onCancel={() => setSelectedMessageIds([])}
                />
              ) : (
                <ChatInput
                  key={selectedUser.id}
                  disabled={!connected || messagesLoading}
                  t={t}
                  initialText={drafts[selectedUser.id]?.text ?? ""}
                  replyTo={replyTarget}
                  replyToAuthorName={replyTarget ? getMessageAuthorName(replyTarget, user, selectedUser) : ""}
                  onCancelReply={() => setReplyTarget(null)}
                  onDraftChange={updateDraft}
                  onSend={sendMessage}
                  onTypingChange={sendTypingState}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <AnimatePresence>
        {forwardTarget ? (
          <ForwardMessageModal
            message={forwardTarget}
            messageCount={forwardTargets.length}
            users={forwardUsers}
            query={forwardQuery}
            loading={forwardLoading}
            sendingUserId={forwardingUserId}
            t={t}
            onQueryChange={setForwardQuery}
            onSelect={forwardMessageTo}
            onClose={() => {
              setForwardTargets([]);
              setForwardQuery("");
            }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {userProfileOpen && selectedUser && !selectedUser.isSavedMessages ? (
          <UserProfileModal
            user={selectedUser}
            messages={messages}
            language={language}
            t={t}
            onClose={() => setUserProfileOpen(false)}
            onOpenImage={setImagePreview}
          />
        ) : null}
      </AnimatePresence>
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
  const updated = {
    ...matched,
    lastMessage: message,
    unreadCount: otherUserId === selectedUserId ? 0 : matched.unreadCount + unreadIncrement
  };
  return sortConversationUsers([updated, ...next]);
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

function upsertUserWithMessage(
  users: UserListItemDTO[],
  targetUser: UserListItemDTO,
  message: MessageDTO
) {
  const existing = users.find((item) => item.id === targetUser.id);
  const rest = users.filter((item) => item.id !== targetUser.id);

  const updated = {
    ...(existing ?? targetUser),
    lastMessage: message,
    unreadCount: existing?.unreadCount ?? targetUser.unreadCount ?? 0
  };

  return sortConversationUsers([updated, ...rest]);
}

function withSavedMessages(users: UserListItemDTO[], currentUser: UserDTO) {
  const existing = users.find((item) => item.id === currentUser.id);
  const savedMessages: UserListItemDTO = {
    ...currentUser,
    online: false,
    lastMessage: existing?.lastMessage ?? null,
    unreadCount: 0,
    isSavedMessages: true
  };

  return sortConversationUsers([savedMessages, ...users.filter((item) => item.id !== currentUser.id)]);
}

function sortConversationUsers(users: UserListItemDTO[]) {
  return [...users].sort((first, second) => {
    const firstTime = first.lastMessage ? new Date(first.lastMessage.sentAt).getTime() : 0;
    const secondTime = second.lastMessage ? new Date(second.lastMessage.sentAt).getTime() : 0;
    return secondTime - firstTime;
  });
}

function sortConversationUsersWithDrafts(users: UserListItemDTO[], drafts: ChatDrafts) {
  return [...users].sort((first, second) => {
    const firstTime = drafts[first.id]?.updatedAt ?? first.lastMessage?.sentAt ?? "";
    const secondTime = drafts[second.id]?.updatedAt ?? second.lastMessage?.sentAt ?? "";
    return new Date(secondTime || 0).getTime() - new Date(firstTime || 0).getTime();
  });
}

async function writeClipboardText(value: string) {
  if (window.minimalChatClipboard) {
    await window.minimalChatClipboard.writeText(value);
    return;
  }

  await navigator.clipboard.writeText(value);
}
