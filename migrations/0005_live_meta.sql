-- Watchable public LIVE listing: title, description, opt-in watchers.
alter table live_roster add column if not exists title text not null default '';
alter table live_roster add column if not exists description text not null default '';
alter table live_roster add column if not exists watchable boolean not null default false;
