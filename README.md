# MinimalChat

MinimalChat is a dark minimalist desktop messenger built with Electron, React, TypeScript, Tailwind CSS and Supabase.

## Production Architecture

No separate backend hosting is required.

```txt
Your MinimalChat.exe  ─┐
                       ├─> Supabase Auth
Her MinimalChat.exe   ─┤   Supabase Postgres
                       └─> Supabase Realtime + Storage
```

The desktop app connects directly to Supabase using the public anon key. Secret keys are not bundled into the app.

## Supabase Project

Already configured for:

```txt
Project URL: https://lqxtxtfqwfltqcphokqz.supabase.co
Storage bucket: minimalchat-uploads
```

Required Supabase settings:

1. Authentication -> Sign In / Providers -> Email
2. Disable email confirmations for easy private testing, or users must confirm email before first login.
3. Storage -> bucket `minimalchat-uploads` must be public.
4. Database RLS policies are applied by:

```powershell
npm.cmd run db:policies
```

## Local Setup

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:policies
npm.cmd run build
```

## Development

```powershell
npm.cmd run dev
```

The Electron app starts Vite and connects directly to Supabase.

## Build Windows Installer

The production env file is:

```txt
apps/desktop/.env.production
```

It must contain:

```env
VITE_SUPABASE_URL="https://lqxtxtfqwfltqcphokqz.supabase.co"
VITE_SUPABASE_ANON_KEY="your anon public key"
VITE_SUPABASE_STORAGE_BUCKET="minimalchat-uploads"
```

Build:

```powershell
npm.cmd run dist:win
```

Installer output:

```txt
apps/desktop/release/MinimalChat Setup 1.0.0.exe
```

Send this `.exe` to another Windows PC.

## Auto Updates

Auto updates use GitHub Releases through `electron-updater`.

1. Update `apps/desktop/package.json` version, for example `1.0.1`.
2. Commit and push.
3. Create a tag:

```powershell
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions builds and publishes the installer. Installed apps check for updates automatically.

Before using auto-updates, update the `publish` section in `apps/desktop/package.json` if the repository owner/name changes.

## Useful Scripts

```powershell
npm.cmd run dev          # run desktop development app
npm.cmd run build        # build shared, server types and desktop renderer
npm.cmd run db:generate  # generate Prisma client
npm.cmd run db:push      # sync Prisma schema to Supabase
npm.cmd run db:policies  # apply RLS, Storage and Realtime policies
npm.cmd run dist:win     # build Windows installer
```

## Notes

- `apps/server` remains in the repo for database administration scripts and fallback API code, but production desktop messaging no longer requires Render or any hosted Express server.
- Do not commit `apps/server/.env`; it contains the service role key.
- The public anon key in the desktop env is safe to bundle when RLS policies are enabled.
