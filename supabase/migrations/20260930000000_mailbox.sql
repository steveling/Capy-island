-- Mailboxes: best friends send each other letters, with a gift from their bag tucked inside if they like.
--
-- A letter is a note and a sticker picked from lists in the game (numbers here, no typed text), the
-- sender's name and colour (taken from their island, not from the phone), and optionally an item id. Items
-- are only checked for shape here; the game drops any id it doesn't know when the letter arrives.
--
-- Limits: letters only between best friends; up to 5 a day to the same friend, 30 a day in all; a mailbox
-- holds up to 30 unopened letters. Letters are handed over by claim_mail (the game keeps them after that)
-- and deleted two days later.

create table if not exists public.mail (
  id bigint generated always as identity primary key,
  owner uuid not null references public.islands(owner) on delete cascade on update cascade,
  sender uuid references public.islands(owner) on delete set null on update cascade,
  sender_name text not null check (char_length(sender_name) between 1 and 12),
  sender_color text not null check (sender_color = any (capy_private.capy_colors())),
  item text check (item is null or item ~ '^[a-z0-9_]{1,24}$'),
  note smallint not null check (note between 0 and 11),
  sticker smallint not null check (sticker between 0 and 11),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists mail_owner_unclaimed on public.mail (owner) where claimed_at is null;
create index if not exists mail_sender_owner on public.mail (sender, owner, created_at);

-- only reachable through the functions below
alter table public.mail enable row level security;
revoke all on table public.mail from public, anon, authenticated;

create or replace function public.send_mail(p_friend uuid, p_item text, p_note integer, p_sticker integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare u uuid := capy_private.require_allowed(); me public.islands; n int;
begin
  me := capy_private.require_island(u);
  if not capy_private.are_friends(u, p_friend) then raise exception 'not_friends' using errcode = '42501'; end if;
  if p_note is null or p_note < 0 or p_note > 11 or p_sticker is null or p_sticker < 0 or p_sticker > 11 then
    raise exception 'bad_letter' using errcode = '22023';
  end if;
  if p_item is not null and p_item !~ '^[a-z0-9_]{1,24}$' then raise exception 'bad_item' using errcode = '22023'; end if;
  if not capy_private.rate_ok('send_mail', 30, interval '1 day') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  select count(*) into n from public.mail where sender = u and owner = p_friend and created_at > now() - interval '1 day';
  if n >= 5 then return false; end if;
  select count(*) into n from public.mail where owner = p_friend and claimed_at is null;
  if n >= 30 then return false; end if;
  insert into public.mail(owner, sender, sender_name, sender_color, item, note, sticker)
  values (p_friend, u, coalesce(nullif(me.name, ''), 'Friend'), me.color, p_item, p_note, p_sticker);
  return true;
end $function$;

create or replace function public.claim_mail()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare u uuid := capy_private.require_allowed(); m jsonb;
begin
  with c as (update public.mail set claimed_at = now() where owner = u and claimed_at is null
             returning id, sender_name, sender_color, item, note, sticker, created_at)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'from', sender_name, 'c', sender_color, 'item', item,
                                               'note', note, 'st', sticker, 'at', created_at) order by id), '[]')
    into m from c;
  -- keep opened letters two days (for the daily limits), then forget them
  delete from public.mail where owner = u and claimed_at < now() - interval '2 days';
  return m;
end $function$;

revoke execute on function public.send_mail(uuid, text, integer, integer) from public, anon;
revoke execute on function public.claim_mail() from public, anon;
grant execute on function public.send_mail(uuid, text, integer, integer) to authenticated;
grant execute on function public.claim_mail() to authenticated;

notify pgrst, 'reload schema';
