-- =========================================================
-- Fase 2: cartões de crédito, compras parceladas e faturas
-- =========================================================

-- ---------- cartões ----------
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  closing_day int not null check (closing_day between 1 and 28),
  due_day int not null check (due_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index credit_cards_user_idx on public.credit_cards (user_id);

create trigger trg_credit_cards_updated before update on public.credit_cards
  for each row execute function public.set_updated_at();

alter table public.credit_cards enable row level security;
create policy "cards: all own" on public.credit_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.credit_cards to authenticated;

-- ---------- transactions: suporte a cartão ----------
-- Remove a regra antiga de tipos (qualquer nome que ela tenha) e recria com 'card_payment'.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%income%expense%transfer%'
  loop
    execute format('alter table public.transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer', 'card_payment'));

alter table public.transactions alter column account_id drop not null;

alter table public.transactions
  add column card_id uuid references public.credit_cards (id) on delete restrict,
  add column invoice_year int,
  add column invoice_month int check (invoice_month between 1 and 12),
  add column installment_number int,
  add column installments_count int,
  add column purchase_group_id uuid,
  add column purchase_date date;

-- Cada lançamento é de conta OU de cartão, nunca os dois (exceto o pagamento de fatura,
-- que sai de uma conta e aponta para a fatura de um cartão).
alter table public.transactions
  add constraint transactions_account_or_card check (
    (type in ('income', 'transfer') and account_id is not null and card_id is null)
    or (type = 'expense' and (
          (account_id is not null and card_id is null)
          or (account_id is null and card_id is not null
              and invoice_year is not null and invoice_month is not null)
       ))
    or (type = 'card_payment' and account_id is not null and card_id is not null
        and invoice_year is not null and invoice_month is not null)
  );

create index transactions_card_invoice_idx
  on public.transactions (card_id, invoice_year, invoice_month) where card_id is not null;
create index transactions_purchase_group_idx
  on public.transactions (purchase_group_id) where purchase_group_id is not null;

-- RLS: conta e cartão referenciados também precisam ser do usuário.
drop policy "transactions: all own" on public.transactions;
create policy "transactions: all own" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (account_id is null or exists (
      select 1 from public.financial_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())))
    and (card_id is null or exists (
      select 1 from public.credit_cards c
      where c.id = card_id and c.user_id = (select auth.uid())))
    and (transfer_account_id is null or exists (
      select 1 from public.financial_accounts a
      where a.id = transfer_account_id and a.user_id = (select auth.uid())))
    and (category_id is null or exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = (select auth.uid())))
  );

-- ---------- saldo por conta: pagamento de fatura tira dinheiro da conta ----------
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
          when t.type = 'income'       and t.account_id = a.id          then  t.amount
          when t.type = 'expense'      and t.account_id = a.id          then -t.amount
          when t.type = 'transfer'     and t.account_id = a.id          then -t.amount
          when t.type = 'transfer'     and t.transfer_account_id = a.id then  t.amount
          when t.type = 'card_payment' and t.account_id = a.id          then -t.amount
          else 0
        end
      ), 0) as balance,
  a.type,
  a.is_archived
from public.financial_accounts a
left join public.transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;

-- ---------- relatório anual: o saldo final considera só o dinheiro das contas ----------
-- Compra no cartão entra em "despesas" (competência), mas só reduz o saldo quando a fatura é paga.
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
          select sum(case
                       when t.type = 'income' then t.amount
                       when t.type = 'expense' and t.account_id is not null then -t.amount
                       when t.type = 'card_payment' then -t.amount
                       else 0
                     end)
          from public.transactions t
          where t.status = 'paid'
            and t.transaction_date < make_date(p_year, 1, 1)
        ), 0) as amount
  ),
  monthly as (
    select
      extract(month from t.transaction_date)::int as m,
      coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as inc,
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as exp,
      coalesce(sum(
        case
          when t.type = 'income' then t.amount
          when t.type = 'expense' and t.account_id is not null then -t.amount
          when t.type = 'card_payment' then -t.amount
          else 0
        end
      ), 0) as cash
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
      + sum(coalesce(monthly.cash, 0)) over (order by months.m)
  from months
  left join monthly on monthly.m = months.m
  order by months.m;
$$;

-- ---------- visões: resumo do cartão e faturas ----------
create view public.card_summary
with (security_invoker = true) as
select
  c.id as card_id,
  c.user_id,
  c.name,
  c.credit_limit,
  c.closing_day,
  c.due_day,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)
    - coalesce(sum(t.amount) filter (where t.type = 'card_payment'), 0) as used,
  c.credit_limit
    - (coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)
       - coalesce(sum(t.amount) filter (where t.type = 'card_payment'), 0)) as available
from public.credit_cards c
left join public.transactions t on t.card_id = c.id
group by c.id;

create view public.card_invoices
with (security_invoker = true) as
select
  t.user_id,
  t.card_id,
  t.invoice_year,
  t.invoice_month,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as total,
  coalesce(sum(t.amount) filter (where t.type = 'card_payment'), 0) as paid
from public.transactions t
where t.card_id is not null
group by t.user_id, t.card_id, t.invoice_year, t.invoice_month;

-- ---------- funções ----------
-- Fatura (mês em que fecha) que recebe uma compra: no dia do fechamento ou depois, vai para a seguinte.
create or replace function public.card_first_invoice(p_closing_day int, p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select (
    make_date(extract(year from p_date)::int, extract(month from p_date)::int, 1)
    + case when extract(day from p_date) >= p_closing_day
           then interval '1 month' else interval '0 month' end
  )::date;
$$;

-- Cria a compra e todas as parcelas de uma vez (tudo ou nada).
create or replace function public.create_card_purchase(
  p_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_total numeric,
  p_installments int,
  p_date date,
  p_notes text default null,
  p_source text default 'system'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_group uuid := gen_random_uuid();
  v_closing int;
  v_cat_type text;
  v_first date;
  v_base numeric;
  v_amount numeric;
  v_inv date;
  i int;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_total is null or p_total <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_installments < 1 or p_installments > 48 then raise exception 'INVALID_INSTALLMENTS'; end if;

  v_base := round(p_total / p_installments, 2);
  if v_base <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select c.closing_day into v_closing from public.credit_cards c where c.id = p_card_id;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;

  if p_category_id is not null then
    select c.type into v_cat_type from public.categories c where c.id = p_category_id;
    if v_cat_type is distinct from 'expense' then raise exception 'INVALID_CATEGORY'; end if;
  end if;

  v_first := public.card_first_invoice(v_closing, p_date);

  for i in 1..p_installments loop
    -- A última parcela absorve a diferença de centavos do arredondamento.
    v_amount := case when i = p_installments
                     then p_total - v_base * (p_installments - 1)
                     else v_base end;
    v_inv := (v_first + ((i - 1) * interval '1 month'))::date;

    insert into public.transactions (
      user_id, card_id, category_id, type, description, amount, transaction_date,
      payment_method, notes, status, source,
      purchase_group_id, purchase_date, installment_number, installments_count,
      invoice_year, invoice_month
    ) values (
      v_user, p_card_id, p_category_id, 'expense', p_description, v_amount,
      (p_date + ((i - 1) * interval '1 month'))::date,
      'credit_card', p_notes, 'paid', p_source,
      v_group, p_date, i, p_installments,
      extract(year from v_inv)::int, extract(month from v_inv)::int
    );
  end loop;

  return v_group;
end;
$$;

-- Exclui uma compra inteira (todas as parcelas). Bloqueia se alguma fatura envolvida já tem pagamento.
create or replace function public.delete_card_purchase(p_group_id uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  if exists (
    select 1
    from public.transactions t
    join public.transactions p
      on p.card_id = t.card_id
     and p.invoice_year = t.invoice_year
     and p.invoice_month = t.invoice_month
     and p.type = 'card_payment'
    where t.purchase_group_id = p_group_id and t.type = 'expense'
  ) then
    raise exception 'INVOICE_HAS_PAYMENTS';
  end if;

  delete from public.transactions t
  where t.purchase_group_id = p_group_id and t.type = 'expense';
  get diagnostics v_count = row_count;

  if v_count = 0 then raise exception 'PURCHASE_NOT_FOUND'; end if;
  return v_count;
end;
$$;

-- Paga (total ou parcialmente) uma fatura, tirando o valor de uma conta.
create or replace function public.pay_card_invoice(
  p_card_id uuid,
  p_year int,
  p_month int,
  p_account_id uuid,
  p_amount numeric,
  p_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text;
  v_total numeric;
  v_paid numeric;
  v_id uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select c.name into v_name from public.credit_cards c where c.id = p_card_id;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;

  perform 1 from public.financial_accounts a where a.id = p_account_id;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'card_payment'), 0)
  into v_total, v_paid
  from public.transactions t
  where t.card_id = p_card_id and t.invoice_year = p_year and t.invoice_month = p_month;

  if v_total = 0 then raise exception 'INVOICE_EMPTY'; end if;
  if p_amount > v_total - v_paid then
    raise exception 'AMOUNT_EXCEEDS_INVOICE:%', v_total - v_paid;
  end if;

  insert into public.transactions (
    user_id, account_id, card_id, type, description, amount, transaction_date,
    status, source, invoice_year, invoice_month
  ) values (
    v_user, p_account_id, p_card_id, 'card_payment',
    'Pagamento da fatura ' || v_name, p_amount, p_date,
    'paid', 'system', p_year, p_month
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant select on public.card_summary to authenticated;
grant select on public.card_invoices to authenticated;
grant execute on function public.card_first_invoice(integer, date) to authenticated;
grant execute on function public.create_card_purchase(uuid, uuid, text, numeric, integer, date, text, text) to authenticated;
grant execute on function public.delete_card_purchase(uuid) to authenticated;
grant execute on function public.pay_card_invoice(uuid, integer, integer, uuid, numeric, date) to authenticated;