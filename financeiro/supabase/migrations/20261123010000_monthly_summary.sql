-- Resumo mensal calculado no banco (NUMERIC exato).
-- security invoker: o RLS continua valendo, cada usuário soma só os próprios lançamentos.
create or replace function public.monthly_summary(p_year int, p_month int)
returns table (total_income numeric, total_expense numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)
  from public.transactions t
  where t.status = 'paid'
    and t.transaction_date >= make_date(p_year, p_month, 1)
    and t.transaction_date < (make_date(p_year, p_month, 1) + interval '1 month')::date;
$$;

-- Recria a view acrescentando type e is_archived no final (a ordem das colunas antigas é mantida)
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.initial_balance
    + coalesce(sum(
        case
          when t.status <> 'paid' then 0
          when t.type = 'income'   and t.account_id = a.id          then  t.amount
          when t.type = 'expense'  and t.account_id = a.id          then -t.amount
          when t.type = 'transfer' and t.account_id = a.id          then -t.amount
          when t.type = 'transfer' and t.transfer_account_id = a.id then  t.amount
          else 0
        end
      ), 0) as balance,
  a.type,
  a.is_archived
from public.financial_accounts a
left join public.transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;