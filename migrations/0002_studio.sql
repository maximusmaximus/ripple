-- Shared studio session + named presets (unowned — this is a kiosk, not accounts).
create table if not exists studio_session (
  id         text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists studio_presets (
  id         text primary key,
  name       text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_presets_updated_idx on studio_presets (updated_at desc);
