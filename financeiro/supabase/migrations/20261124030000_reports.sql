-- Receitas pagas do mês agrupadas por categoria
create or replace function public.income_by_category(p_year int, p_month int)
returns table (category_name text, category_color text, total numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(c.name, 'Sem categoria'),
    coalesce(c.color, '#94a3b8'),
    sum(t.amount)
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.type = 'income'
    and t.status = 'paid'
    and t.transaction_date >= make_date(p_year, p_month, 1)
    and t.transaction_date < (make_date(p_year, p_month, 1) + interval '1 month')::date
  group by c.id, c.name, c.color
  order by sum(t.amount) desc;
$$;

-- Relatório anual: receitas, despesas e saldo total ao final de cada mês.
-- O saldo final = saldos iniciais das contas + resultado acumulado (pagos).
-- Transferências não entram: movem dinheiro entre contas, sem alterar o total.
create or replace function public.yearly_report(p_year int)
returns table (ref_month int, total_income numeric, total_expense numeric, ending_balance numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select generate_series(1, 12) as m
  ),
  opening as (
    select
      coalesce((select sum(a.initial_balance) from public.financial_accounts a), 0)
      + coalesce((
          select sum(case when t.type = 'income' then t.amount
                          when t.type = 'expense' then -t.amount
                          else 0 end)
          from public.transactions t
          where t.status = 'paid'
            and t.transaction_date < make_date(p_year, 1, 1)
        ), 0) as amount
  ),
  monthly as (
    select
      extract(month from t.transaction_date)::int as m,
      coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as inc,
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as exp
    from public.transactions t
    where t.status = 'paid'
      and t.transaction_date >= make_date(p_year, 1, 1)
      and t.transaction_date < make_date(p_year + 1, 1, 1)
    group by 1
  )
  select
    months.m,
    coalesce(monthly.inc, 0),
    coalesce(monthly.exp, 0),
    (select amount from opening)
      + sum(coalesce(monthly.inc, 0) - coalesce(monthly.exp, 0)) over (order by months.m)
  from months
  left join monthly on monthly.m = months.m
  order by months.m;
$$;

grant execute on function public.income_by_category(integer, integer) to authenticated;
grant execute on function public.yearly_report(integer) to authenticated;