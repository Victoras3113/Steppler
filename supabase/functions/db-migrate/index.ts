// Applies the database migrations from supabase/migrations.ts. Called once by the deploy workflow,
// which deletes this function again right afterwards. It takes no input and only runs the fixed,
// already-reviewed migrations in this repository, each one only once.
import postgres from "npm:postgres@3.4.5";
import { migrations } from "../_shared/migrations.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
  try {
    await sql.unsafe(`
      create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now());
      alter table public.schema_migrations enable row level security;
      revoke all on public.schema_migrations from anon, authenticated;`);
    const done = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name as string));
    const applied: string[] = [];
    for (const m of migrations) {
      if (done.has(m.name)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(m.sql);
        await tx`insert into public.schema_migrations (name) values (${m.name})`;
      });
      applied.push(m.name);
    }
    return Response.json({ ok: true, applied });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    await sql.end();
  }
});
