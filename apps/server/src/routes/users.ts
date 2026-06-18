import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { toMessageDTO, toUserDTO } from "../mappers.js";
import { getOnlineUserIds } from "../socket.js";
import { HttpError } from "../utils/httpError.js";
import { assertValidHandle, normalizeHandle } from "../utils/handle.js";

const router = Router();

const profileSchema = z.object({
  username: z.string().trim().min(2, "Username must contain at least 2 characters").max(32),
  handle: z.string().trim().min(3).max(25),
  avatarUrl: z.string().nullable().optional()
});

const MAX_AVATAR_LENGTH = 1_500_000;

router.get("/", async (req, res, next) => {
  try {
    const currentUserId = String(req.query.currentUserId ?? "");
    const rawSearch = String(req.query.search ?? "").trim();

    if (!currentUserId) {
      throw new HttpError(400, "currentUserId query parameter is required", "CURRENT_USER_REQUIRED");
    }

    const users = rawSearch
      ? await searchUsers(currentUserId, rawSearch)
      : await getConversationUsers(currentUserId);

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", async (req, res, next) => {
  try {
    const currentUserId = String(req.query.currentUserId ?? "");

    if (!currentUserId) {
      throw new HttpError(400, "currentUserId query parameter is required", "CURRENT_USER_REQUIRED");
    }

    const data = profileSchema.parse(req.body);
    const handle = normalizeHandle(data.handle);
    const handleError = assertValidHandle(handle);

    if (handleError) {
      throw new HttpError(400, handleError, "INVALID_HANDLE");
    }

    const existing = await prisma.user.findFirst({
      where: {
        handle,
        id: { not: currentUserId }
      }
    });

    if (existing) {
      throw new HttpError(409, "This handle is already taken", "HANDLE_TAKEN");
    }

    if (data.avatarUrl && !isValidAvatarDataUrl(data.avatarUrl)) {
      throw new HttpError(400, "Avatar must be a png, jpeg, webp or gif image under 1 MB", "INVALID_AVATAR");
    }

    const user = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        username: data.username,
        handle,
        avatarUrl: data.avatarUrl ?? null
      }
    });

    res.json({ user: toUserDTO(user, getOnlineUserIds().has(user.id)) });
  } catch (error) {
    next(error);
  }
});

async function getConversationUsers(currentUserId: string) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, hiddenForSender: false },
        { receiverId: currentUserId, hiddenForReceiver: false }
      ]
    },
    orderBy: { sentAt: "desc" }
  });

  const otherIds = Array.from(
    new Set(messages.map((message) => (message.senderId === currentUserId ? message.receiverId : message.senderId)))
  );

  if (otherIds.length === 0) {
    return [];
  }

  const onlineIds = getOnlineUserIds();

  return Promise.all(
    otherIds.map(async (userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) return null;

      const lastMessage = await findLastMessage(currentUserId, user.id);

      return {
        ...toUserDTO(user, onlineIds.has(user.id)),
        lastMessage: lastMessage ? toMessageDTO(lastMessage) : null,
        unreadCount: await countUnreadMessages(currentUserId, user.id)
      };
    })
  ).then((items) => items.filter((item) => item !== null));
}

async function searchUsers(currentUserId: string, rawSearch: string) {
  if (!rawSearch.startsWith("@")) {
    return [];
  }

  const handle = normalizeHandle(rawSearch);

  if (!handle) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      handle: { startsWith: handle }
    },
    orderBy: { handle: "asc" },
    take: 12
  });
  const onlineIds = getOnlineUserIds();

  return Promise.all(
    users.map(async (user) => {
      const lastMessage = await findLastMessage(currentUserId, user.id);

      return {
        ...toUserDTO(user, onlineIds.has(user.id)),
        lastMessage: lastMessage ? toMessageDTO(lastMessage) : null,
        unreadCount: await countUnreadMessages(currentUserId, user.id)
      };
    })
  );
}

function findLastMessage(currentUserId: string, userId: string) {
  return prisma.message.findFirst({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: userId, hiddenForSender: false },
        { senderId: userId, receiverId: currentUserId, hiddenForReceiver: false }
      ]
    },
    orderBy: { sentAt: "desc" }
  });
}

function countUnreadMessages(currentUserId: string, userId: string) {
  return prisma.message.count({
    where: {
      senderId: userId,
      receiverId: currentUserId,
      hiddenForReceiver: false,
      isRead: false
    }
  });
}

function isValidAvatarDataUrl(value: string) {
  if (value.length > MAX_AVATAR_LENGTH) {
    return false;
  }

  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
}

export { router as usersRouter };
