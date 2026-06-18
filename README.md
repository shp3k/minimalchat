# MinimalChat

MinimalChat is a dark minimalist desktop messenger built with Electron, React, Express, Socket.IO, Prisma and Supabase Postgres.

## Architecture

```txt
apps/
  desktop/        Electron + React desktop client
  server/         Express + Socket.IO API server
packages/
  shared/         Shared TypeScript DTOs and types
```

For real messaging between two computers, the app must use one shared public server:

```txt
Your PC app  ─┐
              ├─> Public MinimalChat server ─> Supabase Postgres
Her PC app   ─┘                         └────> Supabase Storage
```

The packaged desktop app does not start a local server. It connects to the public server URL baked into the build through `VITE_API_URL` and `VITE_SOCKET_URL`.

## Supabase Setup

1. Create a Supabase project.
2. Open `Project Settings -> Database -> Connection string`.
3. Copy the pooled Postgres connection string and use it as `DATABASE_URL`.
4. Open `Project Settings -> API`.
5. Copy:
   - `Project URL` as `SUPABASE_URL`
   - `service_role` key as `SUPABASE_SERVICE_ROLE_KEY`
6. Open `Storage`.
7. Create a public bucket named `minimalchat-uploads`.

Example `apps/server/.env`:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="minimalchat-uploads"
```

Never put `SUPABASE_SERVICE_ROLE_KEY` into the desktop app. It must exist only on the server or hosting provider.

## Local Setup

```bash
npm install
npm run db:generate
npm run db:push
npm run build
```

Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run build
```

## Development

Start the server and Electron app together:

```bash
npm run dev
```

The local server runs on `http://localhost:4000`.

## Deploy Server

Use any Node.js hosting that supports WebSockets. Render is a simple option.

Recommended Render settings:

```txt
Runtime: Node
Build command:
npm install && npm run db:generate && npm run build -w @minimalchat/shared && npm run build -w apps/server && npm run db:push -w apps/server

Start command:
npm run start -w apps/server

Health check path:
/health
```

Environment variables on hosting:

```env
DATABASE_URL=your Supabase pooled Postgres URL
DIRECT_URL=your Supabase session pooler URL
PORT=10000
CLIENT_ORIGIN=*
SUPABASE_URL=your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=your Supabase service role key
SUPABASE_STORAGE_BUCKET=minimalchat-uploads
```

After deploy, test:

```txt
https://YOUR_SERVER_URL/health
```

It should return:

```json
{ "ok": true }
```

## Build Windows Installer

Create `apps/desktop/.env.production`:

```env
VITE_API_URL="https://YOUR_SERVER_URL"
VITE_SOCKET_URL="https://YOUR_SERVER_URL"
```

Build the installer:

```powershell
npm.cmd run dist:win
```

The installer appears in:

```txt
apps/desktop/release/
```

Send the `MinimalChat Setup ... .exe` file to another person.

## Auto Updates

Auto updates use `electron-updater` and GitHub Releases.

Before publishing:

1. Create a GitHub repo for the project.
2. In `apps/desktop/package.json`, replace:

```json
"owner": "YOUR_GITHUB_USERNAME",
"repo": "minimalchat"
```

3. In GitHub repo settings, add an Actions secret:

```txt
MINIMALCHAT_SERVER_URL=https://YOUR_SERVER_URL
```

4. Commit and push the project.
5. Create a version tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will build and publish the Windows installer. Installed clients check for updates automatically about every 30 minutes and install downloaded updates on app quit.

## Useful Scripts

```bash
npm run dev          # server + Electron client for development
npm run build        # build shared, server and desktop renderer
npm run db:generate  # generate Prisma client
npm run db:push      # sync Prisma schema to Supabase Postgres
npm run dist:win     # create Windows installer
```

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users?currentUserId=...`
- `GET /api/messages/:userId?currentUserId=...`
- `POST /api/messages/send`

## Socket.IO Events

- `user:connect`
- `user:disconnect`
- `message:send`
- `message:receive`
- `message:update`
- `message:delete`
- `user:online`
- `user:offline`
