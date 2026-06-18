import { Router } from "express";
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { toMessageDTO } from "../mappers.js";
import { emitMessage, emitMessageDelete, emitMessageUpdate, getOnlineUserIds } from "../socket.js";
import { HttpError } from "../utils/httpError.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const supabase =
  config.supabaseUrl && config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { persistSession: false }
      })
    : null;

fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 1
  }
});

const sendSchema = z.object({
  senderId: z.string().min(1),
  receiverId: z.string().min(1),
  text: z.string().trim().max(1000, "Message is too long").default("")
});

const editSchema = z.object({
  currentUserId: z.string().min(1),
  text: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message is too long")
});

const actionSchema = z.object({
  currentUserId: z.string().min(1),
  mode: z.enum(["me", "all"]).default("all")
});

const pinSchema = z.object({
  currentUserId: z.string().min(1),
  isPinned: z.boolean()
});

const readSchema = z.object({
  currentUserId: z.string().min(1),
  otherUserId: z.string().min(1)
});

router.get("/:userId", async (req, res, next) => {
  try {
    const currentUserId = String(req.query.currentUserId ?? "");
    const otherUserId = req.params.userId;

    if (!currentUserId) {
      throw new HttpError(400, "currentUserId query parameter is required", "CURRENT_USER_REQUIRED");
    }

    await markChatRead(currentUserId, otherUserId);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId, hiddenForSender: false },
          { senderId: otherUserId, receiverId: currentUserId, hiddenForReceiver: false }
        ]
      },
      orderBy: { sentAt: "asc" }
    });

    res.json({ messages: messages.map(toMessageDTO) });
  } catch (error) {
    next(error);
  }
});

router.post("/send", upload.single("file"), async (req, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    const file = req.file;
    const text = data.text.trim();

    if (data.senderId === data.receiverId) {
      throw new HttpError(400, "Cannot send a direct message to yourself", "INVALID_RECEIVER");
    }

    if (!text && !file) {
      throw new HttpError(400, "Message cannot be empty", "EMPTY_MESSAGE");
    }

    const storedFile = file ? await storeUpload(file) : null;

    const message = await prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        text,
        deliveredAt: getOnlineUserIds().has(data.receiverId) ? new Date() : null,
        attachmentUrl: storedFile?.url ?? null,
        attachmentName: file ? decodeUploadName(file.originalname) : null,
        attachmentMime: file?.mimetype ?? null,
        attachmentSize: file?.size ?? null
      }
    });
    const dto = toMessageDTO(message);
    emitMessage(dto);

    res.status(201).json({ message: dto });
  } catch (error) {
    next(error);
  }
});

router.patch("/read", async (req, res, next) => {
  try {
    const data = readSchema.parse(req.body);
    const messages = await markChatRead(data.currentUserId, data.otherUserId);

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.patch("/:messageId", async (req, res, next) => {
  try {
    const data = editSchema.parse(req.body);
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });

    if (!message) {
      throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
    }

    if (message.senderId !== data.currentUserId) {
      throw new HttpError(403, "You can edit only your own messages", "FORBIDDEN");
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        text: data.text,
        editedAt: new Date()
      }
    });
    const dto = toMessageDTO(updated);
    emitMessageUpdate(dto);

    res.json({ message: dto });
  } catch (error) {
    next(error);
  }
});

router.patch("/:messageId/pin", async (req, res, next) => {
  try {
    const data = pinSchema.parse(req.body);
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });

    if (!message) {
      throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
    }

    if (!isParticipant(message, data.currentUserId)) {
      throw new HttpError(403, "You can pin only chat messages", "FORBIDDEN");
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { isPinned: data.isPinned }
    });
    const dto = toMessageDTO(updated);
    emitMessageUpdate(dto);

    res.json({ message: dto });
  } catch (error) {
    next(error);
  }
});

router.delete("/:messageId", async (req, res, next) => {
  try {
    const data = actionSchema.parse(req.body);
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });

    if (!message) {
      throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
    }

    if (!isParticipant(message, data.currentUserId)) {
      throw new HttpError(403, "You can delete only chat messages", "FORBIDDEN");
    }

    const dto = toMessageDTO(message);

    if (data.mode === "me") {
      await prisma.message.update({
        where: { id: message.id },
        data: message.senderId === data.currentUserId ? { hiddenForSender: true } : { hiddenForReceiver: true }
      });
      res.json({ ok: true, id: message.id, mode: "me" });
      return;
    }

    await prisma.message.delete({ where: { id: message.id } });
    emitMessageDelete(dto);

    res.json({ ok: true, id: message.id, mode: "all" });
  } catch (error) {
    next(error);
  }
});

function isParticipant(message: { senderId: string; receiverId: string }, userId: string) {
  return message.senderId === userId || message.receiverId === userId;
}

async function markChatRead(currentUserId: string, otherUserId: string) {
  const unread = await prisma.message.findMany({
    where: {
      senderId: otherUserId,
      receiverId: currentUserId,
      isRead: false
    },
    select: { id: true }
  });

  if (!unread.length) return [];

  const now = new Date();
  const ids = unread.map((message) => message.id);

  await prisma.message.updateMany({
    where: { id: { in: ids } },
    data: {
      isRead: true,
      deliveredAt: now,
      readAt: now
    }
  });

  const updated = await prisma.message.findMany({ where: { id: { in: ids } } });
  const dtos = updated.map(toMessageDTO);
  dtos.forEach(emitMessageUpdate);

  return dtos;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

async function storeUpload(file: Express.Multer.File) {
  const safeExtension = path.extname(file.originalname).replace(/[^a-z0-9.]/gi, "").slice(0, 12);
  const filename = `${Date.now()}-${cryptoRandom()}${safeExtension}`;

  if (supabase) {
    const objectPath = `messages/${filename}`;
    const result = await supabase.storage.from(config.supabaseStorageBucket).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

    if (result.error) {
      throw new HttpError(500, "Could not upload file", "UPLOAD_FAILED");
    }

    return {
      url: supabase.storage.from(config.supabaseStorageBucket).getPublicUrl(objectPath).data.publicUrl
    };
  }

  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);

  return { url: `/uploads/${filename}` };
}

function decodeUploadName(value: string) {
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

export { router as messagesRouter };
