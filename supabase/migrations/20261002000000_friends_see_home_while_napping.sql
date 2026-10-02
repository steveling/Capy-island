-- Best friends who visit while the island owner is napping can go inside the house, the backyard and the
-- other rooms, and see the drawing board and the plane at the dock, just like on a live visit.
--
-- The game already puts these in the friends-only island copy it uploads (islands.snapshot), but
-- clean_snapshot only keeps the fields it knows, so they were dropped. clean_home cleans the new ones and the
-- trigger adds them next to what clean_snapshot keeps (clean_snapshot itself is unchanged):
--   room, yard          20 squares each: an item id (lower-case letters, digits, _) or null
--   rooms               { bed, kitchen }, 20 squares each, only the rooms that were sent
--   bd                  the drawing board: '' (blank) or exactly 768 hex digits
--   craft               the plane at the dock: a short id
-- Ids are only checked for shape; the game drops any it doesn't know. The snapshot is still only readable by
-- best friends (get_friend_island), and its 8000-byte limit holds: all of this is a few kB at most.
-- Islands pick this up the next time they upload (any change while playing).

create or replace function capy_private.clean_slots(a jsonb)
 returns jsonb
 language sql
 immutable parallel safe
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(case when jsonb_typeof(a->i) = 'string' and (a->>i) ~ '^[a-z0-9_]{1,24}$'
                                 then a->i else 'null'::jsonb end order by i), '[]'::jsonb)
    from generate_series(0, 19) as i
$function$;

create or replace function capy_private.clean_home(s jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare out jsonb := '{}'; r jsonb := '{}'; k text;
begin
  if s is null or jsonb_typeof(s) <> 'object' then return out; end if;
  if jsonb_typeof(s->'room') = 'array' then out := out || jsonb_build_object('room', capy_private.clean_slots(s->'room')); end if;
  if jsonb_typeof(s->'yard') = 'array' then out := out || jsonb_build_object('yard', capy_private.clean_slots(s->'yard')); end if;
  if jsonb_typeof(s->'rooms') = 'object' then
    foreach k in array array['bed', 'kitchen'] loop
      if jsonb_typeof(s->'rooms'->k) = 'array' then
        r := r || jsonb_build_object(k, capy_private.clean_slots(s->'rooms'->k));
      end if;
    end loop;
    out := out || jsonb_build_object('rooms', r);
  end if;
  -- (a regex can't count to 768, so: the length, then hex digits only)
  if jsonb_typeof(s->'bd') = 'string' and length(s->>'bd') in (0, 768) and (s->>'bd') ~ '^[0-9a-f]*$' then
    out := out || jsonb_build_object('bd', s->'bd');
  end if;
  if jsonb_typeof(s->'craft') = 'string' and (s->>'craft') ~ '^[a-z0-9]{1,16}$' then out := out || jsonb_build_object('craft', s->'craft'); end if;
  return out;
end $function$;

-- the same as before, plus clean_home
create or replace function capy_private.islands_before_write()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  new.name := capy_private.clean_name(new.save->>'name');
  -- v4 saves keep the mirror colour in save.color (10 colours); older saves only have save.vcolor
  new.color := case when jsonb_typeof(new.save->'color') = 'string' and (new.save->>'color') = any(capy_private.capy_colors()) then new.save->>'color'
                    when (new.save->>'vcolor') = any(capy_private.capy_colors()) then new.save->>'vcolor' else 'caramel' end;
  new.snapshot := capy_private.clean_snapshot(new.snapshot, new.name) || capy_private.clean_home(new.snapshot);
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $function$;

revoke all on function capy_private.clean_slots(jsonb) from public, anon, authenticated;
revoke all on function capy_private.clean_home(jsonb) from public, anon, authenticated;
