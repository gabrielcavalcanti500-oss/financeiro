-- =========================================================
-- Migration inicial: profiles, contas, categorias, lançamentos
-- =========================================================

-- Função genérica para manter updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- financial_accounts ----------
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'checking'
    check (type in ('checking', 'cash', 'digital_wallet', 'savings', 'other')),
  initial_balance numeric(14,2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index financial_accounts_user_idx on public.financial_accounts (user_id);

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#16a34a',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, name)
);
create index categories_user_idx on public.categories (user_id);

-- ---------- transactions ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.financial_accounts (id) on delete restrict,
  transfer_account_id uuid references public.financial_accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  payment_method text,
  notes text,
  status text not null default 'paid' check (status in ('paid', 'pending')),
  source text not null default 'system' check (source in ('system', 'whatsapp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- transferência exige conta destino diferente; os demais tipos não têm conta destino
  constraint transfer_rules check (
    (type = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id)
    or (type <> 'transfer' and transfer_account_id is null)
  )
);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_account_idx on public.transactions (account_id);

-- ---------- triggers de updated_at ----------
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_accounts_updated before update on public.financial_accounts
  for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "accounts: all own" on public.financial_accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: all own" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Em transactions, além do dono, validamos que as contas/categoria referenciadas
-- também pertencem ao usuário (impede apontar para dados de terceiros).
create policy "transactions: all own" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.financial_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
    and (
      transfer_account_id is null
      or exists (
        select 1 from public.financial_accounts a
        where a.id = transfer_account_id and a.user_id = (select auth.uid())
      )
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = category_id and c.user_id = (select auth.uid())
      )
    )
  );

-- ---------- saldo por conta (calculado no banco, sem ponto flutuante) ----------
-- Só lançamentos com status 'paid' afetam o saldo.
create view public.account_balances
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
      ), 0) as balance
from public.financial_accounts a
left join public.transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;

-- ---------- novo usuário: cria perfil + categorias padrão ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.categories (user_id, name, type, color, is_default)
  select new.id, c.name, c.type, c.color, true
  from (values
    ('Salário',             'income',  '#16a34a'),
    ('Serviços',            'income',  '#22c55e'),
    ('Vendas',              'income',  '#4ade80'),
    ('Investimentos',       'income',  '#0d9488'),
    ('Outros recebimentos', 'income',  '#84cc16'),
    ('Alimentação',         'expense', '#ef4444'),
    ('Moradia',             'expense', '#f97316'),
    ('Transporte',          'expense', '#eab308'),
    ('Saúde',               'expense', '#ec4899'),
    ('Educação',            'expense', '#8b5cf6'),
    ('Lazer',               'expense', '#06b6d4'),
    ('Assinaturas',         'expense', '#6366f1'),
    ('Compras',             'expense', '#f43f5e'),
    ('Outros gastos',       'expense', '#64748b')
  ) as c(name, type, color);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();