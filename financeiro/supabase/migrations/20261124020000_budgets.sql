-- Orçamento mensal por categoria de despesa
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, year, month)
);
create index budgets_user_period_idx on public.budgets (user_id, year, month);

create trigger trg_budgets_updated before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;

-- Além do dono, valida que a categoria também é do usuário e é de despesa.
create policy "budgets: all own" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.categories c
      where c.id = category_id
        and c.user_id = (select auth.uid())
        and c.type = 'expense'
    )
  );

grant select, insert, update, delete on public.budgets to authenticated;

-- Orçado x gasto por categoria de despesa, em um mês
create or replace function public.budget_progress(p_year int, p_month int)
returns table (
  category_id uuid,
  category_name text,
  category_color text,
  budget_amount numeric,
  spent numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.color,
    b.amount,
    coalesce(sum(t.amount), 0)
  from public.categories c
  left join public.budgets b
    on b.category_id = c.id and b.year = p_year and b.month = p_month
  left join public.transactions t
    on t.category_id = c.id
   and t.type = 'expense'
   and t.status = 'paid'
   and t.transaction_date >= make_date(p_year, p_month, 1)
   and t.transaction_date < (make_date(p_year, p_month, 1) + interval '1 month')::date
  where c.type = 'expense'
  group by c.id, c.name, c.color, b.amount
  order by c.name;
$$;

grant execute on function public.budget_progress(integer, integer) to authenticated;

-- Copia os orçamentos do mês anterior para o mês informado,
-- sem sobrescrever o que já existe. Retorna quantos foram copiados.
create or replace function public.copy_budgets_from_previous_month(p_year int, p_month int)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prev date := (make_date(p_year, p_month, 1) - interval '1 month')::date;
  copied int;
begin
  insert into public.budgets (user_id, category_id, year, month, amount)
  select b.user_id, b.category_id, p_year, p_month, b.amount
  from public.budgets b
  where b.user_id = (select auth.uid())
    and b.year = extract(year from prev)::int
    and b.month = extract(month from prev)::int
  on conflict (user_id, category_id, year, month) do nothing;

  get diagnostics copied = row_count;
  return copied;
end;
$$;

grant execute on function public.copy_budgets_from_previous_month(integer, integer) to authenticated;