-- Permissões da API (o RLS continua filtrando as linhas por usuário)
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles           to authenticated;
grant select, insert, update, delete on public.financial_accounts to authenticated;
grant select, insert, update, delete on public.categories         to authenticated;
grant select, insert, update, delete on public.transactions       to authenticated;
grant select on public.account_balances                           to authenticated;
grant execute on function public.monthly_summary(integer, integer) to authenticated;