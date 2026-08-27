-- Public LIVE session roster (unowned). One host at a time; watchers and pads heartbeat in.
create table if not exists live_roster (
  peer_id   text primary key,
  role      text not null,
  code      text not null,
  last_seen timestamptz not null default now()
);

create index if not exists live_roster_role_seen_idx on live_roster (role, last_seen desc);
create index if not exists live_roster_code_idx on live_roster (code);
