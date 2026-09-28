-- Each island keeps its visiting code, so friends can use the same code every time.
--
-- Before: open_island deleted the island's code and made a new random one each time, and close_island
-- deleted it. Now the code row stays: opening the island opens its code again for 12 hours, and closing
-- only expires it (join_by_code already ignores expired codes, so nobody can join while it's closed).
-- An island only gets a new code the first time it opens, or after new_island_code (a grown-up's
-- "new code" button, for a code that got shared too widely).
--
-- join_by_code is unchanged. Rows are no longer cleaned up when they expire; there is at most one per
-- island (island_codes.owner is unique) and they go when the island does.

create or replace function public.open_island()
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare u uuid := capy_private.require_allowed(); c text; tries int := 0;
begin
  perform capy_private.require_island(u);
  if not capy_private.rate_ok('open_island', 40, interval '1 hour') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- the island's own code, open again for 12 hours
  update public.island_codes set expires_at = now() + interval '12 hours' where owner = u returning code into c;
  if found then return c; end if;
  -- first time: a new code
  loop
    c := capy_private.random_code(5);
    begin
      insert into public.island_codes(code, owner) values (c, u);
      return c;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise; end if;
    end;
  end loop;
end $function$;

create or replace function public.close_island()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  -- keep the code for next time, but nobody can join with it until the island opens again
  update public.island_codes set expires_at = least(expires_at, now())
   where owner = capy_private.require_allowed();
end $function$;

-- forget the island's code; the next open_island makes a new one
create or replace function public.new_island_code()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  delete from public.island_codes where owner = capy_private.require_allowed();
end $function$;

revoke execute on function public.new_island_code() from public, anon;
grant execute on function public.new_island_code() to authenticated;
