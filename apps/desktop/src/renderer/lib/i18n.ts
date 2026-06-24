export type Language = "ru" | "en";

export const translations = {
  en: {
    language: {
      label: "Language",
      ru: "Russian",
      en: "English"
    },
    auth: {
      createAccount: "Create account",
      welcomeBack: "Welcome back",
      subtitle: "MinimalChat private desktop messenger",
      username: "Username",
      email: "Email",
      password: "Password",
      pleaseWait: "Please wait...",
      signIn: "Sign in",
      register: "Register",
      passwordHash: "Passwords are stored as hashes"
    },
    chat: {
      messages: "Messages",
      inbox: "Inbox",
      searchUsers: "Search by @handle",
      noUsers: "No conversations yet. Search a user by @handle to start chatting.",
      noSearchResults: "No users found for this @handle.",
      searchHint: "Type @handle to find a user.",
      noMessagesYet: "No messages yet",
      savedMessages: "Saved Messages",
      savedMessagesHint: "Your personal cloud storage",
      savedMessagesEmpty: "Send messages and files here to keep them close at hand.",
      selectConversation: "Select a conversation",
      emptyConversation: "Your private chats will appear here with realtime messages, history and online presence.",
      startConversation: "Start the conversation with a thoughtful first message.",
      connecting: "Connecting...",
      writeMessage: "Write a message",
      attachFile: "Attach file",
      removeFile: "Remove file",
      fileTooLarge: "File is too large. Maximum size is 50 MB.",
      downloadFile: "Download file",
      recordVoice: "Record voice message",
      recordingVoice: "Recording voice message",
      sendVoice: "Send voice",
      cancelVoice: "Cancel voice",
      microphoneUnavailable: "Microphone is unavailable or permission was denied.",
      editMessage: "Edit",
      replyMessage: "Reply",
      forwardMessage: "Forward",
      forwarded: "Forwarded",
      copyMessage: "Copy",
      selectMessage: "Select",
      selectedMessages: "Selected",
      saveToSavedMessages: "Save",
      clearSelection: "Cancel selection",
      deleteSelectedQuestion: "Delete selected messages?",
      chatMenu: "Chat menu",
      clearHistory: "Clear history",
      clearHistoryQuestion: "Clear chat history?",
      clearHistoryHelp: "Messages will disappear from this conversation.",
      searchMessages: "Search messages",
      previousResult: "Previous result",
      nextResult: "Next result",
      closeSearch: "Close search",
      addReaction: "Add reaction",
      pasteMessage: "Paste",
      pinMessage: "Pin",
      unpinMessage: "Unpin",
      deleteMessage: "Delete",
      deleteForMe: "Delete for me",
      deleteForEveryone: "Delete for everyone",
      deleteQuestion: "Delete message?",
      saveEdit: "Save",
      cancelEdit: "Cancel",
      edited: "edited",
      pinned: "Pinned",
      replyingTo: "Replying to",
      originalMessage: "Message",
      originalMessageUnavailable: "Original message is unavailable",
      online: "online",
      offline: "offline",
      lastSeenRecently: "last seen recently",
      lastSeenJustNow: "last seen just now",
      lastSeenAt: "last seen at",
      typing: "typing..."
    },
    profile: {
      title: "Profile",
      publicId: "Public ID",
      username: "Name",
      handle: "Short @handle",
      avatar: "Avatar",
      changeAvatar: "Change avatar",
      removeAvatar: "Remove",
      cropAvatar: "Crop avatar",
      applyCrop: "Apply crop",
      cancelCrop: "Cancel",
      zoom: "Zoom",
      save: "Save",
      saving: "Saving...",
      close: "Close",
      settings: "Settings",
      language: "Language",
      privacy: "Privacy",
      hideLastSeen: "Hide last seen time",
      hideLastSeenHelp: "Other users will see “last seen recently” instead of the exact time.",
      sounds: "Sounds",
      notificationSound: "Incoming message sound",
      sentMessageSound: "Message sent sound",
      version: "Version",
      logout: "Log out",
      handleHelp: "Use 3-24 latin letters, numbers or underscores.",
      avatarHelp: "PNG, JPEG, WEBP or GIF up to 1 MB.",
      saved: "Profile updated"
    },
    errors: {
      serverUnavailable: "Server is unavailable. Check that MinimalChat server is running.",
      messageNotSent: "Server is unavailable. Message was not sent.",
      couldNotSendMessage: "Could not send message.",
      couldNotLoadUsers: "Could not load users",
      couldNotLoadMessages: "Could not load messages",
      invalidCredentials: "Invalid email or password",
      emailNotConfirmed: "Email confirmation is enabled in Supabase. Confirm this user or turn it off in Authentication settings.",
      userExists: "User with this email already exists",
      weakPassword: "Password is too short or too weak. Use at least 6 characters.",
      signupDisabled: "Registration is disabled in Supabase Auth settings.",
      handleTaken: "This @handle is already taken",
      invalidHandle: "Use 3-24 latin letters, numbers or underscores.",
      invalidAvatar: "Choose a png, jpeg, webp or gif image under 1 MB.",
      validation: "Check the form fields and try again.",
      generic: "Something went wrong"
    }
  },
  ru: {
    language: {
      label: "Язык",
      ru: "Русский",
      en: "Английский"
    },
    auth: {
      createAccount: "Создать аккаунт",
      welcomeBack: "С возвращением",
      subtitle: "Приватный десктопный мессенджер MinimalChat",
      username: "Имя пользователя",
      email: "Email",
      password: "Пароль",
      pleaseWait: "Подождите...",
      signIn: "Войти",
      register: "Регистрация",
      passwordHash: "Пароли хранятся только в виде hash"
    },
    chat: {
      messages: "Сообщения",
      inbox: "Чаты",
      searchUsers: "Поиск по @нику",
      noUsers: "Диалогов пока нет. Найдите пользователя по @нику, чтобы начать переписку.",
      noSearchResults: "По этому @нику ничего не найдено.",
      searchHint: "Введите @ник, чтобы найти пользователя.",
      noMessagesYet: "Сообщений пока нет",
      savedMessages: "Избранное",
      savedMessagesHint: "Ваше личное облачное хранилище",
      savedMessagesEmpty: "Отправляйте сюда сообщения и файлы, чтобы они всегда были под рукой.",
      selectConversation: "Выберите диалог",
      emptyConversation: "Здесь появятся приватные чаты с realtime-сообщениями, историей и статусом онлайн.",
      startConversation: "Начните диалог с первого сообщения.",
      connecting: "Подключение...",
      writeMessage: "Напишите сообщение",
      attachFile: "Прикрепить файл",
      removeFile: "Убрать файл",
      fileTooLarge: "Файл слишком большой. Максимальный размер 50 МБ.",
      downloadFile: "Скачать файл",
      recordVoice: "Записать голосовое сообщение",
      recordingVoice: "Запись голосового сообщения",
      sendVoice: "Отправить голосовое",
      cancelVoice: "Отменить голосовое",
      microphoneUnavailable: "Микрофон недоступен или доступ запрещён.",
      editMessage: "Редактировать",
      replyMessage: "Ответить",
      forwardMessage: "Переслать",
      forwarded: "Переслано",
      copyMessage: "Скопировать",
      selectMessage: "Выбрать",
      selectedMessages: "Выбрано",
      saveToSavedMessages: "Сохранить",
      clearSelection: "Отменить выбор",
      deleteSelectedQuestion: "Удалить выбранные сообщения?",
      chatMenu: "Меню чата",
      clearHistory: "Очистить историю",
      clearHistoryQuestion: "Очистить историю чата?",
      clearHistoryHelp: "Сообщения исчезнут из этой переписки.",
      searchMessages: "Поиск по сообщениям",
      previousResult: "Предыдущий результат",
      nextResult: "Следующий результат",
      closeSearch: "Закрыть поиск",
      addReaction: "Добавить реакцию",
      pasteMessage: "Вставить",
      pinMessage: "Закрепить",
      unpinMessage: "Открепить",
      deleteMessage: "Удалить",
      deleteForMe: "Удалить у меня",
      deleteForEveryone: "Удалить для всех",
      deleteQuestion: "Удалить сообщение?",
      saveEdit: "Сохранить",
      cancelEdit: "Отмена",
      edited: "изменено",
      pinned: "Закреплено",
      replyingTo: "Ответ на",
      originalMessage: "Сообщение",
      originalMessageUnavailable: "Исходное сообщение недоступно",
      online: "онлайн",
      offline: "офлайн",
      lastSeenRecently: "был(а) недавно",
      lastSeenJustNow: "был(а) только что",
      lastSeenAt: "был(а) в",
      typing: "печатает..."
    },
    profile: {
      title: "Профиль",
      publicId: "Публичный ID",
      username: "Имя",
      handle: "Короткий @ник",
      avatar: "Аватар",
      changeAvatar: "Заменить аватар",
      removeAvatar: "Убрать",
      cropAvatar: "Обрезка аватара",
      applyCrop: "Применить",
      cancelCrop: "Отмена",
      zoom: "Масштаб",
      save: "Сохранить",
      saving: "Сохранение...",
      close: "Закрыть",
      settings: "Настройки",
      language: "Язык",
      privacy: "Конфиденциальность",
      hideLastSeen: "Скрывать время посещения",
      hideLastSeenHelp: "Другие пользователи увидят «был(а) недавно» вместо точного времени.",
      sounds: "Звуки",
      notificationSound: "Звук входящего сообщения",
      sentMessageSound: "Звук отправки сообщения",
      version: "Версия",
      logout: "Выйти из аккаунта",
      handleHelp: "Используйте 3-24 латинские буквы, цифры или подчёркивания.",
      avatarHelp: "PNG, JPEG, WEBP или GIF до 1 МБ.",
      saved: "Профиль обновлён"
    },
    errors: {
      serverUnavailable: "Сервер недоступен. Проверьте, что сервер MinimalChat запущен.",
      messageNotSent: "Сервер недоступен. Сообщение не отправлено.",
      couldNotSendMessage: "Не удалось отправить сообщение.",
      couldNotLoadUsers: "Не удалось загрузить пользователей",
      couldNotLoadMessages: "Не удалось загрузить сообщения",
      invalidCredentials: "Неверный email или пароль",
      emailNotConfirmed: "В Supabase включено подтверждение email. Подтвердите пользователя или отключите подтверждение в Authentication settings.",
      userExists: "Пользователь с таким email уже существует",
      weakPassword: "Пароль слишком короткий или слабый. Используйте минимум 6 символов.",
      signupDisabled: "Регистрация отключена в настройках Supabase Auth.",
      handleTaken: "Этот @ник уже занят",
      invalidHandle: "Используйте 3-24 латинские буквы, цифры или подчёркивания.",
      invalidAvatar: "Выберите png, jpeg, webp или gif до 1 МБ.",
      validation: "Проверьте поля формы и попробуйте снова.",
      generic: "Что-то пошло не так"
    }
  }
} as const;

export type Translation = (typeof translations)[Language];

export function getTranslation(language: Language): Translation {
  return translations[language];
}

export function translateError(error: unknown, t: Translation) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code ?? "");

    if (code === "SERVER_UNAVAILABLE") return t.errors.serverUnavailable;
    if (code === "INVALID_CREDENTIALS") return t.errors.invalidCredentials;
    if (code === "EMAIL_NOT_CONFIRMED") return t.errors.emailNotConfirmed;
    if (code === "USER_EXISTS") return t.errors.userExists;
    if (code === "WEAK_PASSWORD") return t.errors.weakPassword;
    if (code === "SIGNUP_DISABLED") return t.errors.signupDisabled;
    if (code === "HANDLE_TAKEN") return t.errors.handleTaken;
    if (code === "INVALID_HANDLE") return t.errors.invalidHandle;
    if (code === "INVALID_AVATAR") return t.errors.invalidAvatar;
    if (code === "VALIDATION_ERROR") return t.errors.validation;
    if (code === "SEND_FAILED") return t.errors.couldNotSendMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t.errors.generic;
}
