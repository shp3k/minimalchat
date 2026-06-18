import dotenv from "dotenv";

dotenv.config();

const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "minimalchat-uploads",
  allowAllOrigins: configuredOrigins.includes("*"),
  clientOrigins: Array.from(
    new Set([
      ...configuredOrigins,
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ])
  )
};
