import { prisma } from "../db.js";

const statements = [
  `alter table public."User" enable row level security`,
  `alter table public."Message" enable row level security`,
  `alter table public."Message" replica identity full`,
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
  `create policy "Users can send own messages" on public."Message" for insert to authenticated with check ("senderId" = auth.uid()::text)`,
  `create policy "Chat participants can update messages" on public."Message" for update to authenticated using ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text) with check ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text)`,
  `create policy "Chat participants can delete messages" on public."Message" for delete to authenticated using ("senderId" = auth.uid()::text or "receiverId" = auth.uid()::text)`,
  `drop policy if exists "Authenticated users can read uploads" on storage.objects`,
  `drop policy if exists "Authenticated users can upload message files" on storage.objects`,
  `create policy "Authenticated users can read uploads" on storage.objects for select to authenticated using (bucket_id = 'minimalchat-uploads')`,
  `create policy "Authenticated users can upload message files" on storage.objects for insert to authenticated with check (bucket_id = 'minimalchat-uploads')`,
  `do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Message') then alter publication supabase_realtime add table public."Message"; end if; end $$`
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
