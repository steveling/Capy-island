/* ================= CLOUD CONFIG (Supabase) =================
   Leave BOTH empty => local-only + PeerJS visits.
   Fill BOTH in (see capy-cloud/SETUP.md, or run capy-cloud/setup.sh) to turn on cloud save,
   best friends and live visits over Supabase Realtime. The anon/publishable key is meant to be
   public; the Row Level Security rules in capy-cloud/schema.sql are what protect the data. */
const SUPABASE_URL = 'https://dgnmnwpkzungedangmjr.supabase.co'; // e.g. 'https://<project-ref>.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_aACqFwZdqJGkpGb0ElWKiw_aocVUjBk'; // Project Settings -> API Keys -> anon (legacy JWT) or publishable key
