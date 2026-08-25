-- Unowned kiosk feedback (feature requests + bugs). No user_id.
create table if not exists studio_feedback (
  id         text primary key,
  kind       text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_feedback_created_idx on studio_feedback (created_at desc);
