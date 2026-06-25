import { prisma } from "../db.js";

const statements = [
  `grant usage on schema public to anon, authenticated`,
  `grant select, insert, update on table public."User" to authenticated`,
  `grant select, insert, update, delete on table public."Message" to authenticated`,
  `grant select, insert, delete on table public."MessageReaction" to authenticated`,
  `grant select, insert, delete on table public."Contact" to authenticated`,
  `grant select, insert, delete on table public."UserBlock" to authenticated`,
  `grant select, insert, update, delete on table public."ChatPreference" to authenticated`,
  `grant select, insert, update, delete on table public."Space" to authenticated`,
  `grant select, insert, update, delete on table public."SpaceMember" to authenticated`,
  `grant select, insert, update, delete on table public."SpaceMessage" to authenticated`,
  `grant usage on schema storage to authenticated`,
  `grant select on table storage.buckets to authenticated`,
  `grant select, insert, update, delete on table storage.objects to authenticated`,
  `alter table public."Message" add column if not exists "replyToMessageId" text`,
  `alter table public."Message" add column if not exists "isForwarded" boolean not null default false`,
  `alter table public."User" add column if not exists "lastSeenAt" timestamp(3)`,
  `alter table public."User" add column if not exists "hideLastSeen" boolean not null default false`,
  `alter table public."User" add column if not exists bio text not null default ''`,
  `alter table public."User" add column if not exists "onlineVisibility" text not null default 'everyone'`,
  `alter table public."User" add column if not exists "avatarVisibility" text not null default 'everyone'`,
  `alter table public."User" add column if not exists "emailVisibility" text not null default 'nobody'`,
  `alter table public."User" add column if not exists "lastSeenVisibility" text not null default 'everyone'`,
  `create index if not exists "Message_replyToMessageId_idx" on public."Message" ("replyToMessageId")`,
  `alter table public."User" enable row level security`,
  `alter table public."Message" enable row level security`,
  `alter table public."Message" replica identity full`,
  `alter table public."MessageReaction" replica identity full`,
  `alter table public."User" replica identity full`,
  `drop policy if exists "Profiles are visible to authenticated users" on public."User"`,
  `drop policy if exists "Users can create own profile" on public."User"`,
  `drop policy if exists "Users can update own profile" on public."User"`,
  `create policy "Profiles are visible to authenticated users" on public."User" for select to authenticated using (true)`,
  `create policy "Users can create own profile" on public."User" for insert to authenticated with check (auth.uid()::text = id)`,
  `create policy "Users can update own profile" on public."User" for update to authenticated using (auth.uid()::text = id) with check (auth.uid()::text = id)`,
  `drop policy if exists "Chat participants can view messages" on public."Message"`,
  `drop policy if exists "Users can send own messages" on public."Message"`,
  `drop policy if exists "Chat participants can update messages" on public."Message"`,
  `drop policy if exists "Chat participants can delete messages" on public."Message"`,
  `create policy "Chat participants can view messages" on public."Message" for select to authenticated using ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text)`,
  `create policy "Users can send own messages" on public."Message" for insert to authenticated with check ("senderId" = auth.uid()::text and not exists (select 1 from public."UserBlock" where ("blockerId" = "Message"."receiverId" and "blockedId" = "Message"."senderId") or ("blockerId" = "Message"."senderId" and "blockedId" = "Message"."receiverId")))`,
  `create policy "Chat participants can update messages" on public."Message" for update to authenticated using ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text) with check ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text)`,
  `create policy "Chat participants can delete messages" on public."Message" for delete to authenticated using ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text)`,
  `alter table public."MessageReaction" enable row level security`,
  `drop policy if exists "Chat participants can view reactions" on public."MessageReaction"`,
  `drop policy if exists "Users can add own reactions" on public."MessageReaction"`,
  `drop policy if exists "Users can remove own reactions" on public."MessageReaction"`,
  `create policy "Chat participants can view reactions" on public."MessageReaction" for select to authenticated using (exists (select 1 from public."Message" where "Message".id = "MessageReaction"."messageId" and ("Message"."senderId" = auth.uid()::text or "Message"."receiverId" = auth.uid()::text)))`,
  `create policy "Users can add own reactions" on public."MessageReaction" for insert to authenticated with check ("userId" = auth.uid()::text and emoji in ('👍', '❤️', '😂', '😮', '😢', '🔥') and exists (select 1 from public."Message" where "Message".id = "MessageReaction"."messageId" and ("Message"."senderId" = auth.uid()::text or "Message"."receiverId" = auth.uid()::text)))`,
  `create policy "Users can remove own reactions" on public."MessageReaction" for delete to authenticated using ("userId" = auth.uid()::text)`,
  `alter table public."Contact" enable row level security`,
  `drop policy if exists "Users manage own contacts" on public."Contact"`,
  `create policy "Users manage own contacts" on public."Contact" for all to authenticated using ("ownerId" = auth.uid()::text) with check ("ownerId" = auth.uid()::text and "contactId" <> auth.uid()::text)`,
  `alter table public."UserBlock" enable row level security`,
  `drop policy if exists "Block participants can view blocks" on public."UserBlock"`,
  `drop policy if exists "Users can create own blocks" on public."UserBlock"`,
  `drop policy if exists "Users can remove own blocks" on public."UserBlock"`,
  `create policy "Block participants can view blocks" on public."UserBlock" for select to authenticated using ("blockerId" = auth.uid()::text or "blockedId" = auth.uid()::text)`,
  `create policy "Users can create own blocks" on public."UserBlock" for insert to authenticated with check ("blockerId" = auth.uid()::text and "blockedId" <> auth.uid()::text)`,
  `create policy "Users can remove own blocks" on public."UserBlock" for delete to authenticated using ("blockerId" = auth.uid()::text)`,
  `alter table public."ChatPreference" enable row level security`,
  `drop policy if exists "Users manage own chat preferences" on public."ChatPreference"`,
  `create policy "Users manage own chat preferences" on public."ChatPreference" for all to authenticated using ("ownerId" = auth.uid()::text) with check ("ownerId" = auth.uid()::text)`,
  `alter table public."Space" enable row level security`,
  `alter table public."SpaceMember" enable row level security`,
  `alter table public."SpaceMessage" enable row level security`,
  `create or replace function public.is_space_member(space_id text, user_id text) returns boolean language sql security definer set search_path = public stable as $$ select exists (select 1 from public."SpaceMember" where "spaceId" = space_id and "userId" = user_id) $$`,
  `create or replace function public.space_role(space_id text, user_id text) returns text language sql security definer set search_path = public stable as $$ select role from public."SpaceMember" where "spaceId" = space_id and "userId" = user_id limit 1 $$`,
  `create or replace function public.space_kind(space_id text) returns text language sql security definer set search_path = public stable as $$ select type from public."Space" where id = space_id limit 1 $$`,
  `create or replace function public.space_comments_enabled(space_id text) returns boolean language sql security definer set search_path = public stable as $$ select "commentsEnabled" from public."Space" where id = space_id limit 1 $$`,
  `drop policy if exists "Members can view spaces" on public."Space"`,
  `drop policy if exists "Users can create spaces" on public."Space"`,
  `drop policy if exists "Managers can update spaces" on public."Space"`,
  `create policy "Members can view spaces" on public."Space" for select to authenticated using (type = 'channel' or public.is_space_member(id, auth.uid()::text))`,
  `create policy "Users can create spaces" on public."Space" for insert to authenticated with check ("ownerId" = auth.uid()::text)`,
  `create policy "Managers can update spaces" on public."Space" for update to authenticated using (public.space_role(id, auth.uid()::text) in ('owner','admin'))`,
  `drop policy if exists "Members can view memberships" on public."SpaceMember"`,
  `drop policy if exists "Managers can add members" on public."SpaceMember"`,
  `drop policy if exists "Managers can update members" on public."SpaceMember"`,
  `drop policy if exists "Managers can remove members" on public."SpaceMember"`,
  `create policy "Members can view memberships" on public."SpaceMember" for select to authenticated using (public.is_space_member("spaceId", auth.uid()::text) or public.space_kind("spaceId") = 'channel')`,
  `create policy "Managers can add members" on public."SpaceMember" for insert to authenticated with check ("userId" = auth.uid()::text or public.space_role("spaceId", auth.uid()::text) in ('owner','admin'))`,
  `create policy "Managers can update members" on public."SpaceMember" for update to authenticated using (public.space_role("spaceId", auth.uid()::text) = 'owner')`,
  `create policy "Managers can remove members" on public."SpaceMember" for delete to authenticated using ("userId" = auth.uid()::text or public.space_role("spaceId", auth.uid()::text) = 'owner' or (public.space_role("spaceId", auth.uid()::text) = 'admin' and role = 'member'))`,
  `drop policy if exists "Members can view space messages" on public."SpaceMessage"`,
  `drop policy if exists "Members can send space messages" on public."SpaceMessage"`,
  `drop policy if exists "Managers can update space messages" on public."SpaceMessage"`,
  `drop policy if exists "Managers can delete space messages" on public."SpaceMessage"`,
  `create policy "Members can view space messages" on public."SpaceMessage" for select to authenticated using (public.is_space_member("spaceId", auth.uid()::text))`,
  `create policy "Members can send space messages" on public."SpaceMessage" for insert to authenticated with check ("senderId" = auth.uid()::text and public.is_space_member("spaceId", auth.uid()::text) and (public.space_role("spaceId", auth.uid()::text) in ('owner','admin') or (public.space_kind("spaceId") = 'group' and kind = 'message') or (public.space_kind("spaceId") = 'channel' and public.space_comments_enabled("spaceId") and kind = 'comment' and "parentPostId" is not null)))`,
  `create policy "Managers can update space messages" on public."SpaceMessage" for update to authenticated using ("senderId" = auth.uid()::text or public.space_role("spaceId", auth.uid()::text) in ('owner','admin'))`,
  `create policy "Managers can delete space messages" on public."SpaceMessage" for delete to authenticated using ("senderId" = auth.uid()::text or public.space_role("spaceId", auth.uid()::text) in ('owner','admin'))`,
  `drop policy if exists "Authenticated users can read uploads" on storage.objects`,
  `drop policy if exists "Authenticated users can upload message files" on storage.objects`,
  `create policy "Authenticated users can read uploads" on storage.objects for select to authenticated using (bucket_id = 'minimalchat-uploads')`,
  `create policy "Authenticated users can upload message files" on storage.objects for insert to authenticated with check (bucket_id = 'minimalchat-uploads')`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Message') then alter publication supabase_realtime add table public."Message"; end if; end $$`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'User') then alter publication supabase_realtime add table public."User"; end if; end $$`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'MessageReaction') then alter publication supabase_realtime add table public."MessageReaction"; end if; end $$`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Contact') then alter publication supabase_realtime add table public."Contact"; end if; end $$`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'UserBlock') then alter publication supabase_realtime add table public."UserBlock"; end if; end $$`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ChatPreference') then alter publication supabase_realtime add table public."ChatPreference"; end if; end $$`
  ,`do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Space') then alter publication supabase_realtime add table public."Space"; end if; end $$`
  ,`do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'SpaceMember') then alter publication supabase_realtime add table public."SpaceMember"; end if; end $$`
  ,`do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'SpaceMessage') then alter publication supabase_realtime add table public."SpaceMessage"; end if; end $$`
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Supabase policies are ready.");
}

main()
  .catch((error) => {
    console.error("Could not apply Supabase policies", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
