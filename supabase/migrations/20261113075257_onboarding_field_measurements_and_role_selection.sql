alter table public.fields
  add column if not exists length_m numeric,
  add column if not exists width_m numeric,
  add column if not exists perimeter_m numeric,
  add column if not exists measurement_method text not null default 'user_drawn_polygon';

alter table public.fields
  add constraint fields_length_m_positive check (length_m is null or length_m > 0),
  add constraint fields_width_m_positive check (width_m is null or width_m > 0),
  add constraint fields_perimeter_m_positive check (perimeter_m is null or perimeter_m > 0);

comment on column public.fields.length_m is 'Approximate longest dimension derived from the user-drawn field polygon in the map.';
comment on column public.fields.width_m is 'Approximate short dimension derived from the user-drawn field polygon in the map.';
comment on column public.fields.perimeter_m is 'Geodesic perimeter derived from the user-drawn field polygon.';
comment on column public.fields.measurement_method is 'Method used to derive field measurements; current onboarding uses user_drawn_polygon.';

create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated','anon') and (
    new.platform_role is distinct from old.platform_role
    or new.account_status is distinct from old.account_status
  ) then
    raise exception 'Protected profile fields can only be changed through authorized platform functions';
  end if;

  if current_user in ('authenticated','anon') and new.role is distinct from old.role then
    if old.onboarding_completed is true
       or new.onboarding_completed is not true
       or old.role <> 'farmer'
       or new.role not in ('farmer','agronomist') then
      raise exception 'Account type can only be selected once during profile onboarding';
    end if;

    if new.role = 'agronomist' then
      new.agronomist_status := 'pending';
    else
      new.agronomist_status := 'not_applicable';
    end if;
  elsif current_user in ('authenticated','anon')
        and new.agronomist_status is distinct from old.agronomist_status then
    raise exception 'Agronomist approval status is managed by NILORA administrators';
  end if;

  return new;
end;
$function$;
