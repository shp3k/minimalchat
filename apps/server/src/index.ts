import cors from "cors";
import express from "express";
import { createServer } from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { ZodError } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { messagesRouter } from "./routes/messages.js";
import { usersRouter } from "./routes/users.js";
import { setupSocket } from "./socket.js";
import { HttpError } from "./utils/httpError.js";

const app = express();
const httpServer = createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads");
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (config.allowAllOrigins || !origin || config.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  }
};
const io = new Server(httpServer, {
  cors: {
    origin: config.allowAllOrigins ? "*" : config.clientOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "3mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/messages", messagesRouter);

setupSocket(io);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    const first = error.errors[0];
    res.status(400).json({ message: first?.message ?? "Invalid request", code: "VALIDATION_ERROR" });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message, code: error.code });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error", code: "INTERNAL_ERROR" });
});

prisma.$connect()
  .then(() => {
    httpServer.listen(config.port, () => {
      console.log(`MinimalChat server listening on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Could not connect database", error);
    process.exit(1);
  });
