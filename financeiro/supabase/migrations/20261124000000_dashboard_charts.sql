-- Despesas pagas do mês agrupadas por categoria
create or replace function public.expenses_by_category(p_year int, p_month int)
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
  where t.type = 'expense'
    and t.status = 'paid'
    and t.transaction_date >= make_date(p_year, p_month, 1)
    and t.transaction_date < (make_date(p_year, p_month, 1) + interval '1 month')::date
  group by c.id, c.name, c.color
  order by sum(t.amount) desc;
$$;

-- Receitas e despesas pagas dos últimos N meses (inclui meses sem movimento)
create or replace function public.monthly_evolution(p_year int, p_month int, p_months int default 6)
returns table (ref_year int, ref_month int, total_income numeric, total_expense numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select (make_date(p_year, p_month, 1) - (n * interval '1 month'))::date as m
    from generate_series(0, least(greatest(p_months, 1), 24) - 1) as n
  )
  select
    extract(year from months.m)::int,
    extract(month from months.m)::int,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)
  from months
  left join public.transactions t
    on t.status = 'paid'
   and t.transaction_date >= months.m
   and t.transaction_date < (months.m + interval '1 month')::date
  group by months.m
  order by months.m;
$$;

grant execute on function public.expenses_by_category(integer, integer) to authenticated;
grant execute on function public.monthly_evolution(integer, integer, integer) to authenticated;