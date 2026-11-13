create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated','anon') then
    if new.platform_role is distinct from old.platform_role
       or new.account_status is distinct from old.account_status then
      raise exception 'Protected profile fields can only be changed through authorized platform functions';
    end if;

    if new.role is distinct from old.role then
      if old.onboarding_completed is true
         or new.onboarding_completed is not true
         or new.role not in ('farmer','agronomist') then
        raise exception 'Account type can only be selected once during profile onboarding';
      end if;

      if new.role = 'agronomist' then
        new.agronomist_status := 'pending';
      else
        new.agronomist_status := 'not_applicable';
      end if;
    elsif new.agronomist_status is distinct from old.agronomist_status then
      raise exception 'Agronomist approval status is managed by NILORA administrators';
    end if;
  end if;
  return new;
end;
$function$;
