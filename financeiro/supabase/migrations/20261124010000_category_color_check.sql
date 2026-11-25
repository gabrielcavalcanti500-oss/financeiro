alter table public.categories
  add constraint categories_color_hex
  check (color ~ '^#[0-9a-fA-F]{6}$');