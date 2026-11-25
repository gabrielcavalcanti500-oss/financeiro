-- Exclui uma conta. Se ela tiver lançamentos (inclusive transferências de/para ela),
-- só prossegue com p_with_transactions = true, e apaga tudo na mesma transação.
-- security invoker: o RLS continua valendo, só é possível apagar o que é do próprio usuário.
create or replace function public.delete_account(
  p_account_id uuid,
  p_with_transactions boolean default false
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.transactions t
  where t.account_id = p_account_id or t.transfer_account_id = p_account_id;

  if v_count > 0 and not p_with_transactions then
    raise exception 'ACCOUNT_HAS_TRANSACTIONS:%', v_count;
  end if;

  delete from public.transactions t
  where t.account_id = p_account_id or t.transfer_account_id = p_account_id;

  delete from public.financial_accounts a where a.id = p_account_id;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  return v_count;
end;
$$;

grant execute on function public.delete_account(uuid, boolean) to authenticated;