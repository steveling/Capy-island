-- Best friends can see roughly when a friend last played ("Played yesterday").
--
-- list_friends gains last_days: whole days since the friend's island was last seen (touch_island updates
-- seen_at every minute while the game is open). Only whole days are sent, never the exact time, and it is
-- null when that friend's grown-ups switched off "Best friends can drop in" (the same switch that already
-- hides the "Playing now" dot), or if they haven't played since this was added.
--
-- Its result columns change, so the function is dropped and made again (and its grants set again).

drop function if exists public.list_friends();

create function public.list_friends()
 returns table(friend uuid, name text, color text, since timestamp with time zone, online boolean,
               updated_at timestamp with time zone, last_days integer)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select i.owner, i.name, i.color, f.created_at,
         (i.dropins and i.seen_at > now() - interval '90 seconds'), i.updated_at,
         case when i.dropins and i.seen_at is not null
              then greatest(0, floor(extract(epoch from now() - i.seen_at) / 86400))::integer end
    from public.friendships f
    join public.friendships r on r.a = f.b and r.b = f.a
    join public.islands i on i.owner = f.b
   where f.a = auth.uid() and capy_private.is_allowed()
   order by f.created_at
$function$;

revoke execute on function public.list_friends() from public, anon;
grant execute on function public.list_friends() to authenticated;

notify pgrst, 'reload schema';
