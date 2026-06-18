import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { toUserDTO } from "../mappers.js";
import { HttpError } from "../utils/httpError.js";
import { createUniqueHandle } from "../utils/handle.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(2, "Username must contain at least 2 characters").max(32),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(6, "Password must contain at least 6 characters").max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });

    if (existing) {
      throw new HttpError(409, "User with this email already exists", "USER_EXISTS");
    }

    const passwordHash = await hashPassword(data.password);
    const handle = await createUniqueHandle(data.username);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        handle,
        passwordHash
      }
    });

    res.status(201).json({ user: toUserDTO(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const passwordMatches = await verifyPassword(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    res.json({ user: toUserDTO(user) });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
