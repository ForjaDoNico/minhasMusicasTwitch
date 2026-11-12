-- =============================================================================
-- Songlist: schema, RLS, RPCs (queue operations) and realtime
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.request_source as enum ('TWITCH', 'SITE');
create type public.queue_status as enum ('QUEUED', 'PLAYING', 'SAVED');
create type public.learning_status as enum ('OPEN', 'LEARNED', 'REJECTED');
create type public.bot_action as enum (
  'REQUEST', 'REMOVE_LAST', 'REPLACE_LAST', 'CURRENT_SONG', 'NEXT_SONG', 'LAST_SONG',
  'PLAYED_TODAY', 'HAS_SONG', 'LAST_PLAYED', 'SONG_DETAILS', 'FAVORITE', 'UNFAVORITE',
  'SONGLIST_LINK', 'QUEUE_LINK', 'COMMANDS_LINK', 'CUSTOM'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  twitch_id text unique,
  login text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
create index profiles_login_idx on public.profiles (lower(login));

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  twitch_id text unique,
  slug text not null unique check (slug ~ '^[a-z0-9_]{2,40}$'),
  display_name text not null,
  avatar_url text,
  queue_open boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  bot_enabled boolean not null default false,
  current_session_id uuid,
  queue_version bigint not null default 0,
  created_at timestamptz not null default now(),
  last_visited_at timestamptz
);

create table public.stream_sessions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index stream_sessions_channel_idx on public.stream_sessions (channel_id, started_at desc);

alter table public.channels
  add constraint channels_current_session_fk foreign key (current_session_id)
  references public.stream_sessions (id) on delete set null;

create table public.moderators (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  twitch_login text not null check (twitch_login = lower(twitch_login)),
  created_at timestamptz not null default now(),
  unique (channel_id, twitch_login)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  artist text not null default '' check (length(artist) <= 200),
  tags text[] not null default '{}',
  is_new boolean not null default false,
  is_premium boolean not null default false,
  notes text,
  times_played integer not null default 0,
  last_played_at timestamptz,
  created_at timestamptz not null default now()
);
create index songs_channel_idx on public.songs (channel_id);
create index songs_tags_idx on public.songs using gin (tags);

create table public.queue_items (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  requester_id uuid references public.profiles (id) on delete set null,
  requester_twitch_id text,
  requester_name text not null default 'Anonymous',
  source public.request_source not null,
  note text check (length(note) <= 300),
  tip_amount numeric(10, 2) not null default 0,
  is_priority boolean not null default false,
  position integer not null default 0,
  status public.queue_status not null default 'QUEUED',
  created_at timestamptz not null default now(),
  started_at timestamptz
);
create index queue_items_channel_idx on public.queue_items (channel_id, status, position);

create table public.play_history (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  song_id uuid references public.songs (id) on delete set null,
  song_title text not null,
  song_artist text not null default '',
  requester_name text,
  source public.request_source,
  note text,
  tip_amount numeric(10, 2) not null default 0,
  played_at timestamptz not null default now(),
  stream_session_id uuid references public.stream_sessions (id) on delete set null
);
create index play_history_channel_idx on public.play_history (channel_id, played_at desc);
create index play_history_session_idx on public.play_history (stream_session_id);

create table public.request_log (
  -- one row per accepted request; feeds "Pedidos nesta live" / "Pedidos totais"
  id bigint generated always as identity primary key,
  channel_id uuid not null references public.channels (id) on delete cascade,
  stream_session_id uuid references public.stream_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index request_log_channel_idx on public.request_log (channel_id, stream_session_id);

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  stream_session_id uuid references public.stream_sessions (id) on delete set null,
  queue_item_id uuid references public.queue_items (id) on delete set null,
  donor_name text not null,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'BRL',
  message text,
  provider text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  unique (channel_id, provider, external_id)
);
create index tips_channel_idx on public.tips (channel_id, stream_session_id);

create table public.bot_commands (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  name text not null,
  description text not null default '',
  command text not null check (command ~ '^[A-Za-z0-9_]{1,32}$'),
  aliases text[] not null default '{}',
  action public.bot_action not null,
  response_template text not null default '',
  cooldown_sec integer not null default 0 check (cooldown_sec >= 0),
  enabled boolean not null default true,
  is_default boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (channel_id, command)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  twitch_id text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (channel_id, song_id, twitch_id)
);

create table public.learning_requests (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  artist text not null default '',
  requested_by text not null default 'Anonymous',
  status public.learning_status not null default 'OPEN',
  votes integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index learning_unique_open on public.learning_requests (channel_id, lower(title), lower(artist)) where status = 'OPEN';

create table public.learning_votes (
  request_id uuid not null references public.learning_requests (id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  primary key (request_id, voter_key)
);

-- private tables (no client access at all)
create table public.channel_secrets (
  channel_id uuid primary key references public.channels (id) on delete cascade,
  tip_webhook_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  streamelements_channel_id text,
  streamelements_jwt text,
  eventsub_subscription_ids text[] not null default '{}'
);

create table public.eventsub_messages (
  message_id text primary key,
  received_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create table public.app_tokens (
  id text primary key,
  access_token text not null,
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.default_channel_settings()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'maxRequestsPerUser', 2,
    'preventDuplicates', true,
    'songCooldownHours', 0,
    'subscribersOnly', false,
    'vipsOnly', false,
    'allowSiteRequests', true,
    'allowAnonymous', true,
    'tipPriority', true,
    'minTipForPriority', 5,
    'premiumMinTip', 10,
    'currency', 'BRL',
    'pixKey', '',
    'pixName', '',
    'pixCity', '',
    'botLanguage', 'en'
  );
$$;

create or replace function public.channel_setting(p_settings jsonb, p_key text)
returns jsonb language sql immutable as $$
  select coalesce(p_settings -> p_key, public.default_channel_settings() -> p_key);
$$;

create or replace function public.is_service_role()
returns boolean language sql stable as $$
  -- note: inside SECURITY DEFINER functions current_user is the owner, so check the JWT role / session user
  -- a direct superuser session (migrations, seed, SQL editor) without JWT claims also counts
  select auth.role() = 'service_role' or (auth.role() is null and session_user = 'postgres');
$$;

create or replace function public.is_channel_owner(p_channel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from channels c where c.id = p_channel_id and c.owner_id = auth.uid());
$$;

create or replace function public.is_channel_manager(p_channel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_service_role()
    or exists (select 1 from channels c where c.id = p_channel_id and c.owner_id = auth.uid())
    or exists (
      select 1 from moderators m join profiles p on lower(p.login) = m.twitch_login
      where m.channel_id = p_channel_id and p.id = auth.uid()
    );
$$;

create or replace function public._assert_manager(p_channel_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_channel_manager(p_channel_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end $$;

-- bump queue_version: the single row every client listens to via Realtime
create or replace function public._touch_channel(p_channel_id uuid)
returns void language sql security definer set search_path = public as $$
  update channels set queue_version = queue_version + 1 where id = p_channel_id;
$$;

-- renumber QUEUED items 1..n keeping priority items first, then current order
create or replace function public._renumber_queue(p_channel_id uuid)
returns void language sql security definer set search_path = public as $$
  with ordered as (
    select id, row_number() over (order by position, created_at) as rn
    from queue_items where channel_id = p_channel_id and status = 'QUEUED'
  )
  update queue_items q set position = o.rn
  from ordered o where q.id = o.id and q.position <> o.rn;
$$;

-- open session or create one lazily
create or replace function public._ensure_session(p_channel_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select current_session_id into v_id from channels where id = p_channel_id;
  if v_id is null then
    insert into stream_sessions (channel_id) values (p_channel_id) returning id into v_id;
    update channels set current_session_id = v_id where id = p_channel_id;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles from auth.users (Twitch metadata)
-- ---------------------------------------------------------------------------
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_login text := lower(coalesce(m ->> 'name', m ->> 'full_name', m ->> 'nickname', m ->> 'user_name', split_part(new.email, '@', 1), 'user'));
  v_display text := coalesce(m ->> 'slug', m ->> 'nickname', m ->> 'name', m ->> 'full_name', v_login);
begin
  v_login := regexp_replace(v_login, '[^a-z0-9_]', '', 'g');
  insert into profiles (id, twitch_id, login, display_name, avatar_url)
  values (new.id, m ->> 'provider_id', v_login, v_display, coalesce(m ->> 'avatar_url', m ->> 'picture'))
  on conflict (id) do update set
    twitch_id = coalesce(excluded.twitch_id, profiles.twitch_id),
    login = excluded.login,
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end $$;

create trigger on_auth_user_change
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user();

-- ---------------------------------------------------------------------------
-- Default bot commands + secrets on channel creation
-- ---------------------------------------------------------------------------
create or replace function public.create_default_commands(p_channel_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into bot_commands (channel_id, name, description, command, aliases, action, response_template, cooldown_sec, is_default)
  values
    (p_channel_id, 'Song request', 'Request a song from the songlist', 'sr', '{songRequest,request}', 'REQUEST',
      '{{song}} added to queue at position: {{position}}', 0, true),
    (p_channel_id, 'Wrong song', 'Remove your last request', 'ws', '{wrongsong}', 'REMOVE_LAST',
      'Your request for {{song}} has been removed from position {{position}}', 0, true),
    (p_channel_id, 'Replace last request', 'Replace your last request with another song', 'replace', '{replaceLastRequest,replaceLast}', 'REPLACE_LAST',
      'Replaced {{previous_song}} with {{song}} at position: {{position}}', 0, true),
    (p_channel_id, 'Current song', 'Show the song playing now', 'song', '{currentSong,current}', 'CURRENT_SONG',
      '{{#select now_playing 1}}Now playing: {{song}} (requested by {{requester}}){{#empty}}Nothing is playing right now{{/select}}', 5, true),
    (p_channel_id, 'Next song', 'Show the next song in the queue', 'next', '{nextSong}', 'NEXT_SONG',
      '{{#select queue 1}}Next: {{song}} (requested by {{requester}}){{#empty}}No songs in queue{{/select}}', 5, true),
    (p_channel_id, 'Last song', 'Show the last played song', 'last', '{previousSong,previous,lastSong}', 'LAST_SONG',
      '{{#if song}}Last played: {{song}}{{else}}Nothing played yet{{/if}}', 5, true),
    (p_channel_id, 'Played today', 'How many songs were played this stream', 'today', '{playedToday,played}', 'PLAYED_TODAY',
      '{{count}} songs played this stream', 5, true),
    (p_channel_id, 'Has song', 'Check if a song is in the songlist', 'has', '{hasSong}', 'HAS_SONG',
      '{{#if song}}Yes! {{song}} is in the songlist{{else}}"{{query}}" is not in the songlist{{/if}}', 3, true),
    (p_channel_id, 'Last played', 'When a song was last played', 'lastPlayed', '{}', 'LAST_PLAYED',
      '{{#if song}}{{song}} was last played {{time_ago}}{{else}}"{{query}}" is not in the songlist{{/if}}', 3, true),
    (p_channel_id, 'Song details', 'Current song and its request note', 'sd', '{details}', 'SONG_DETAILS',
      '{{#select now_playing 1}}{{song}} requested by {{requester}}{{#if note}} — note: {{note}}{{/if}}{{#empty}}Nothing is playing right now{{/select}}', 5, true),
    (p_channel_id, 'Favorite', 'Favorite the current (or given) song', 'fav', '{}', 'FAVORITE',
      '{{user}} favorited {{song}}', 0, true),
    (p_channel_id, 'Unfavorite', 'Remove a song from your favorites', 'unfav', '{}', 'UNFAVORITE',
      '{{user}} unfavorited {{song}}', 0, true),
    (p_channel_id, 'Songlist', 'Link to the songlist', 'sl', '{songlist,list}', 'SONGLIST_LINK',
      'Songlist: {{songlist_link}}', 10, true),
    (p_channel_id, 'Queue', 'Link to the queue', 'sq', '{queue,songQueue}', 'QUEUE_LINK',
      'Queue: {{queue_link}}', 10, true),
    (p_channel_id, 'Commands', 'Link to the command list', 'commands', '{}', 'COMMANDS_LINK',
      'Commands: {{commands_link}}', 10, true)
  on conflict (channel_id, command) do nothing;
$$;

create or replace function public.handle_new_channel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.create_default_commands(new.id);
  insert into channel_secrets (channel_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_channel_created after insert on public.channels
  for each row execute function public.handle_new_channel();

-- ---------------------------------------------------------------------------
-- Queue RPCs
-- ---------------------------------------------------------------------------

-- Trusted entry point for every request (site API route + Twitch bot). Only service_role.
create or replace function public.request_song(
  p_channel_id uuid,
  p_song_id uuid,
  p_source public.request_source,
  p_requester_name text default 'Anonymous',
  p_requester_id uuid default null,
  p_requester_twitch_id text default null,
  p_note text default null,
  p_tip_amount numeric default 0,
  p_is_subscriber boolean default false,
  p_is_vip boolean default false,
  p_is_manager boolean default false,
  p_replace_item_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ch channels%rowtype;
  s songs%rowtype;
  v_settings jsonb;
  v_user_count int;
  v_cooldown numeric;
  v_max int;
  v_position int;
  v_priority boolean := false;
  v_item_id uuid;
  v_session uuid;
begin
  if not public.is_service_role() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- serialize all queue mutations of a channel
  select * into ch from channels where id = p_channel_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'channel_not_found'); end if;
  v_settings := ch.settings;

  if not ch.queue_open and not p_is_manager then
    return jsonb_build_object('ok', false, 'error', 'queue_closed');
  end if;

  select * into s from songs where id = p_song_id and channel_id = p_channel_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'song_not_found'); end if;

  if not p_is_manager then
    if p_source = 'SITE' and not (public.channel_setting(v_settings, 'allowSiteRequests'))::boolean then
      return jsonb_build_object('ok', false, 'error', 'site_requests_disabled');
    end if;
    if p_source = 'SITE' and p_requester_id is null and not (public.channel_setting(v_settings, 'allowAnonymous'))::boolean then
      return jsonb_build_object('ok', false, 'error', 'login_required');
    end if;
    if (public.channel_setting(v_settings, 'subscribersOnly'))::boolean and not (p_is_subscriber or p_is_vip) then
      return jsonb_build_object('ok', false, 'error', 'subscribers_only');
    end if;
    if (public.channel_setting(v_settings, 'vipsOnly'))::boolean and not p_is_vip then
      return jsonb_build_object('ok', false, 'error', 'vips_only');
    end if;
    if s.is_premium and not p_is_subscriber
       and coalesce(p_tip_amount, 0) < (public.channel_setting(v_settings, 'premiumMinTip'))::numeric then
      return jsonb_build_object('ok', false, 'error', 'premium_only');
    end if;

    if (public.channel_setting(v_settings, 'preventDuplicates'))::boolean and exists (
      select 1 from queue_items where channel_id = p_channel_id and song_id = p_song_id
        and status in ('QUEUED', 'PLAYING') and id is distinct from p_replace_item_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'already_in_queue');
    end if;

    v_cooldown := (public.channel_setting(v_settings, 'songCooldownHours'))::numeric;
    if v_cooldown > 0 and s.last_played_at is not null
       and s.last_played_at > now() - make_interval(secs => v_cooldown * 3600) then
      return jsonb_build_object('ok', false, 'error', 'song_on_cooldown',
        'available_at', s.last_played_at + make_interval(secs => v_cooldown * 3600));
    end if;

    v_max := (public.channel_setting(v_settings, 'maxRequestsPerUser'))::int;
    if v_max > 0 and p_replace_item_id is null and (p_requester_id is not null or p_requester_twitch_id is not null) then
      select count(*) into v_user_count from queue_items
       where channel_id = p_channel_id and status = 'QUEUED'
         and ((p_requester_id is not null and requester_id = p_requester_id)
           or (p_requester_twitch_id is not null and requester_twitch_id = p_requester_twitch_id));
      if v_user_count >= v_max then
        return jsonb_build_object('ok', false, 'error', 'user_limit', 'limit', v_max);
      end if;
    end if;
  end if;

  v_priority := (public.channel_setting(v_settings, 'tipPriority'))::boolean
    and coalesce(p_tip_amount, 0) > 0
    and p_tip_amount >= (public.channel_setting(v_settings, 'minTipForPriority'))::numeric;

  if p_replace_item_id is not null then
    update queue_items set song_id = p_song_id, note = coalesce(p_note, note)
     where id = p_replace_item_id and channel_id = p_channel_id and status = 'QUEUED'
     returning id, position into v_item_id, v_position;
    if v_item_id is null then return jsonb_build_object('ok', false, 'error', 'nothing_to_replace'); end if;
  else
    if v_priority then
      -- after the last priority item
      select coalesce(max(position), 0) + 1 into v_position from queue_items
       where channel_id = p_channel_id and status = 'QUEUED' and is_priority;
      update queue_items set position = position + 1
       where channel_id = p_channel_id and status = 'QUEUED' and position >= v_position;
    else
      select coalesce(max(position), 0) + 1 into v_position from queue_items
       where channel_id = p_channel_id and status = 'QUEUED';
    end if;

    insert into queue_items (channel_id, song_id, requester_id, requester_twitch_id, requester_name, source,
                             note, tip_amount, is_priority, position)
    values (p_channel_id, p_song_id, p_requester_id, p_requester_twitch_id,
            coalesce(nullif(trim(p_requester_name), ''), 'Anonymous'), p_source,
            nullif(trim(p_note), ''), coalesce(p_tip_amount, 0), v_priority, v_position)
    returning id into v_item_id;

    v_session := public._ensure_session(p_channel_id);
    insert into request_log (channel_id, stream_session_id) values (p_channel_id, v_session);
  end if;

  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true, 'item_id', v_item_id, 'position', v_position,
    'song', s.title, 'artist', s.artist, 'priority', v_priority);
end $$;

-- Finish the PLAYING item into history (internal)
create or replace function public._finish_playing(p_channel_id uuid, p_record boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  qi queue_items%rowtype;
  s songs%rowtype;
  v_session uuid;
begin
  select * into qi from queue_items where channel_id = p_channel_id and status = 'PLAYING' limit 1;
  if not found then return; end if;
  if p_record then
    v_session := public._ensure_session(p_channel_id);
    select * into s from songs where id = qi.song_id;
    insert into play_history (channel_id, song_id, song_title, song_artist, requester_name, source, note, tip_amount, stream_session_id)
    values (p_channel_id, qi.song_id, s.title, s.artist, qi.requester_name, qi.source, qi.note, qi.tip_amount, v_session);
    update songs set times_played = times_played + 1, last_played_at = now(), is_new = false where id = qi.song_id;
  end if;
  delete from queue_items where id = qi.id;
end $$;

-- "Tocar": put a specific queued item in "Tocando agora" (current one is marked as played)
create or replace function public.play_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_channel uuid;
begin
  select channel_id into v_channel from queue_items where id = p_item_id;
  if v_channel is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(v_channel);
  perform 1 from channels where id = v_channel for update;
  perform public._finish_playing(v_channel, true);
  update queue_items set status = 'PLAYING', position = 0, started_at = now() where id = p_item_id;
  perform public._renumber_queue(v_channel);
  perform public._touch_channel(v_channel);
  return jsonb_build_object('ok', true, 'item_id', p_item_id);
end $$;

-- "Marcar como tocada / Próxima": finish current (history) and advance
create or replace function public.play_next(p_channel_id uuid, p_record boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_next uuid;
begin
  perform public._assert_manager(p_channel_id);
  perform 1 from channels where id = p_channel_id for update;
  perform public._finish_playing(p_channel_id, p_record);
  select id into v_next from queue_items
   where channel_id = p_channel_id and status = 'QUEUED' order by position, created_at limit 1;
  if v_next is not null then
    update queue_items set status = 'PLAYING', position = 0, started_at = now() where id = v_next;
    perform public._renumber_queue(p_channel_id);
  end if;
  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true, 'item_id', v_next);
end $$;

-- "Marcar como tocada" without advancing
create or replace function public.finish_current(p_channel_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_manager(p_channel_id);
  perform 1 from channels where id = p_channel_id for update;
  perform public._finish_playing(p_channel_id, true);
  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true);
end $$;

-- "Pular" (current, not recorded) is play_next(channel, false). Remove any item:
create or replace function public.remove_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_channel uuid;
begin
  select channel_id into v_channel from queue_items where id = p_item_id;
  if v_channel is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(v_channel);
  perform 1 from channels where id = v_channel for update;
  delete from queue_items where id = p_item_id;
  perform public._renumber_queue(v_channel);
  perform public._touch_channel(v_channel);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.reorder_queue(p_channel_id uuid, p_item_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_manager(p_channel_id);
  perform 1 from channels where id = p_channel_id for update;
  update queue_items q set position = t.ord
    from unnest(p_item_ids) with ordinality as t(id, ord)
   where q.id = t.id and q.channel_id = p_channel_id and q.status = 'QUEUED';
  -- items not included keep their relative order after the given ones
  update queue_items set position = position + 100000
   where channel_id = p_channel_id and status = 'QUEUED' and not (id = any (p_item_ids));
  perform public._renumber_queue(p_channel_id);
  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.move_to_top(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_channel uuid;
begin
  select channel_id into v_channel from queue_items where id = p_item_id and status = 'QUEUED';
  if v_channel is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(v_channel);
  perform 1 from channels where id = v_channel for update;
  update queue_items set position = 0 where id = p_item_id;
  perform public._renumber_queue(v_channel);
  perform public._touch_channel(v_channel);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.save_item(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_channel uuid;
begin
  select channel_id into v_channel from queue_items where id = p_item_id;
  if v_channel is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(v_channel);
  perform 1 from channels where id = v_channel for update;
  update queue_items set status = 'SAVED', position = 0, started_at = null where id = p_item_id;
  perform public._renumber_queue(v_channel);
  perform public._touch_channel(v_channel);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.restore_saved(p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_channel uuid;
begin
  select channel_id into v_channel from queue_items where id = p_item_id and status = 'SAVED';
  if v_channel is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(v_channel);
  perform 1 from channels where id = v_channel for update;
  update queue_items set status = 'QUEUED',
    position = (select coalesce(max(position), 0) + 1 from queue_items where channel_id = v_channel and status = 'QUEUED')
   where id = p_item_id;
  perform public._touch_channel(v_channel);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.clear_queue(p_channel_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  perform public._assert_manager(p_channel_id);
  perform 1 from channels where id = p_channel_id for update;
  delete from queue_items where channel_id = p_channel_id and status = 'QUEUED';
  get diagnostics v_count = row_count;
  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true, 'removed', v_count);
end $$;

create or replace function public.set_queue_open(p_channel_id uuid, p_open boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_manager(p_channel_id);
  update channels set queue_open = p_open, queue_version = queue_version + 1 where id = p_channel_id;
  return jsonb_build_object('ok', true, 'open', p_open);
end $$;

create or replace function public.confirm_tip(p_item_id uuid, p_amount numeric, p_donor text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare qi queue_items%rowtype; ch channels%rowtype; v_priority boolean; v_pos int;
begin
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'invalid_amount'); end if;
  select * into qi from queue_items where id = p_item_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  perform public._assert_manager(qi.channel_id);
  select * into ch from channels where id = qi.channel_id for update;
  insert into tips (channel_id, stream_session_id, queue_item_id, donor_name, amount, currency, provider)
  values (qi.channel_id, ch.current_session_id, qi.id, coalesce(nullif(trim(p_donor), ''), qi.requester_name), p_amount,
          coalesce(ch.settings ->> 'currency', 'BRL'), 'manual');
  v_priority := (public.channel_setting(ch.settings, 'tipPriority'))::boolean
    and qi.tip_amount + p_amount >= (public.channel_setting(ch.settings, 'minTipForPriority'))::numeric;
  update queue_items set tip_amount = tip_amount + p_amount, is_priority = is_priority or v_priority where id = p_item_id;
  if v_priority and qi.status = 'QUEUED' and not qi.is_priority then
    -- jump right after the existing priority items
    select coalesce(max(position), 0) + 1 into v_pos from queue_items
     where channel_id = qi.channel_id and status = 'QUEUED' and is_priority and id <> p_item_id;
    update queue_items set position = position + 1
     where channel_id = qi.channel_id and status = 'QUEUED' and id <> p_item_id and position >= v_pos;
    update queue_items set position = v_pos where id = p_item_id;
    perform public._renumber_queue(qi.channel_id);
  end if;
  perform public._touch_channel(qi.channel_id);
  return jsonb_build_object('ok', true, 'priority', v_priority);
end $$;

-- Stream sessions ("nesta live")
create or replace function public.start_session(p_channel_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public._assert_manager(p_channel_id);
  update stream_sessions set ended_at = now()
   where id = (select current_session_id from channels where id = p_channel_id) and ended_at is null;
  insert into stream_sessions (channel_id) values (p_channel_id) returning id into v_id;
  update channels set current_session_id = v_id, queue_version = queue_version + 1 where id = p_channel_id;
  return v_id;
end $$;

create or replace function public.end_session(p_channel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_manager(p_channel_id);
  update stream_sessions set ended_at = now()
   where id = (select current_session_id from channels where id = p_channel_id) and ended_at is null;
  update channels set current_session_id = null, queue_version = queue_version + 1 where id = p_channel_id;
end $$;

-- Public metrics for the home page (one round trip)
create or replace function public.channel_stats(p_channel_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with ch as (select id, current_session_id from channels where id = p_channel_id),
  sess as (
    select coalesce((select current_session_id from ch),
      (select id from stream_sessions where channel_id = p_channel_id order by started_at desc limit 1)) as id
  )
  select jsonb_build_object(
    'session_id', (select id from sess),
    'live', (select current_session_id is not null from ch),
    'played_session', (select count(*) from play_history where stream_session_id = (select id from sess)),
    'requests_session', (select count(*) from request_log where stream_session_id = (select id from sess)),
    'tips_session_amount', (select coalesce(sum(amount), 0) from tips where stream_session_id = (select id from sess)),
    'tips_session_donors', (select count(distinct lower(donor_name)) from tips where stream_session_id = (select id from sess)),
    'requests_total', (select count(*) from request_log where channel_id = p_channel_id),
    'songs', (select count(*) from songs where channel_id = p_channel_id),
    'saved', (select count(*) from queue_items where channel_id = p_channel_id and status = 'SAVED'),
    'queued', (select count(*) from queue_items where channel_id = p_channel_id and status = 'QUEUED'),
    'commands', (select count(*) from bot_commands where channel_id = p_channel_id and enabled),
    'premium', (select count(*) from songs where channel_id = p_channel_id and is_premium),
    'learning', (select count(*) from learning_requests where channel_id = p_channel_id and status = 'OPEN')
  );
$$;

-- keep-alive / visit tracking (free projects pause after inactivity)
create or replace function public.touch_visit(p_channel_id uuid)
returns void language sql security definer set search_path = public as $$
  update channels set last_visited_at = now()
   where id = p_channel_id and (last_visited_at is null or last_visited_at < now() - interval '10 minutes');
$$;

-- ---------------------------------------------------------------------------
-- Bot helpers (service role only)
-- ---------------------------------------------------------------------------

-- Atomic global cooldown: returns true if the command may run now
create or replace function public.use_command_cooldown(p_command_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update bot_commands set last_used_at = now()
   where id = p_command_id
     and (cooldown_sec = 0 or last_used_at is null or last_used_at <= now() - make_interval(secs => cooldown_sec))
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;

-- Fixed-window rate limit
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_sec int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_sec) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_sec) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end $$;

-- Idempotency for EventSub: true when the message is new
create or replace function public.claim_eventsub_message(p_message_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into eventsub_messages (message_id) values (p_message_id) on conflict do nothing returning true into v_new;
  if random() < 0.02 then
    delete from eventsub_messages where received_at < now() - interval '2 days';
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return coalesce(v_new, false);
end $$;

-- Remove the user's last QUEUED request (!ws)
create or replace function public.remove_last_request(p_channel_id uuid, p_twitch_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare qi queue_items%rowtype; v_title text;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform 1 from channels where id = p_channel_id for update;
  select * into qi from queue_items where channel_id = p_channel_id and status = 'QUEUED' and requester_twitch_id = p_twitch_id
   order by created_at desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_request'); end if;
  select title into v_title from songs where id = qi.song_id;
  delete from queue_items where id = qi.id;
  perform public._renumber_queue(p_channel_id);
  perform public._touch_channel(p_channel_id);
  return jsonb_build_object('ok', true, 'song', v_title, 'position', qi.position);
end $$;

-- Twitch stream.online / stream.offline
create or replace function public.bot_set_live(p_channel_id uuid, p_live boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update stream_sessions set ended_at = now()
   where id = (select current_session_id from channels where id = p_channel_id) and ended_at is null;
  if p_live then
    insert into stream_sessions (channel_id) values (p_channel_id) returning id into v_id;
  end if;
  update channels set current_session_id = v_id, queue_version = queue_version + 1 where id = p_channel_id;
end $$;

-- Learning list: suggest (or vote for an existing open suggestion)
create or replace function public.suggest_learning(p_channel_id uuid, p_title text, p_artist text, p_requested_by text, p_voter_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  select id into v_id from learning_requests
   where channel_id = p_channel_id and status = 'OPEN' and lower(title) = lower(trim(p_title)) and lower(artist) = lower(trim(coalesce(p_artist, '')));
  if v_id is null then
    insert into learning_requests (channel_id, title, artist, requested_by)
    values (p_channel_id, trim(p_title), trim(coalesce(p_artist, '')), coalesce(nullif(trim(p_requested_by), ''), 'Anonymous'))
    returning id into v_id;
  end if;
  return public._vote_learning(v_id, p_voter_key) || jsonb_build_object('id', v_id);
end $$;

create or replace function public._vote_learning(p_request_id uuid, p_voter_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inserted boolean;
begin
  insert into learning_votes (request_id, voter_key) values (p_request_id, p_voter_key)
  on conflict do nothing returning true into v_inserted;
  if v_inserted then update learning_requests set votes = votes + 1 where id = p_request_id; end if;
  return jsonb_build_object('ok', true, 'voted', coalesce(v_inserted, false));
end $$;

create or replace function public.vote_learning(p_request_id uuid, p_voter_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return public._vote_learning(p_request_id, p_voter_key);
end $$;

-- Owner: move a learning request into the songlist
create or replace function public.learn_song(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lr learning_requests%rowtype; v_song uuid;
begin
  select * into lr from learning_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not (public.is_channel_owner(lr.channel_id) or public.is_service_role()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into songs (channel_id, title, artist, is_new, tags) values (lr.channel_id, lr.title, lr.artist, true, '{}')
  returning id into v_song;
  update learning_requests set status = 'LEARNED' where id = p_request_id;
  return jsonb_build_object('ok', true, 'song_id', v_song);
end $$;

-- ---------------------------------------------------------------------------
-- Grants: RPCs callable from the browser vs. server only
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_channel_owner(uuid), public.is_channel_manager(uuid), public.is_service_role(),
  public.channel_stats(uuid), public.touch_visit(uuid),
  public.default_channel_settings(), public.channel_setting(jsonb, text)
to anon, authenticated;

grant execute on function
  public.play_item(uuid), public.play_next(uuid, boolean), public.finish_current(uuid),
  public.remove_item(uuid), public.reorder_queue(uuid, uuid[]), public.move_to_top(uuid),
  public.save_item(uuid), public.restore_saved(uuid), public.clear_queue(uuid),
  public.set_queue_open(uuid, boolean), public.confirm_tip(uuid, numeric, text),
  public.start_session(uuid), public.end_session(uuid), public.learn_song(uuid)
to authenticated;

grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.stream_sessions enable row level security;
alter table public.moderators enable row level security;
alter table public.songs enable row level security;
alter table public.queue_items enable row level security;
alter table public.play_history enable row level security;
alter table public.request_log enable row level security;
alter table public.tips enable row level security;
alter table public.bot_commands enable row level security;
alter table public.favorites enable row level security;
alter table public.learning_requests enable row level security;
alter table public.learning_votes enable row level security;
alter table public.channel_secrets enable row level security;
alter table public.eventsub_messages enable row level security;
alter table public.rate_limits enable row level security;
alter table public.app_tokens enable row level security;

-- public reads
create policy "profiles are public" on public.profiles for select using (true);
create policy "channels are public" on public.channels for select using (true);
create policy "sessions are public" on public.stream_sessions for select using (true);
create policy "songs are public" on public.songs for select using (true);
create policy "queue is public" on public.queue_items for select using (true);
create policy "history is public" on public.play_history for select using (true);
create policy "commands are public" on public.bot_commands for select using (true);
create policy "learning is public" on public.learning_requests for select using (true);
create policy "favorites are public" on public.favorites for select using (true);
create policy "tips readable by managers" on public.tips for select using (public.is_channel_manager(channel_id));
create policy "moderators readable by managers" on public.moderators for select using (public.is_channel_manager(channel_id));

-- owner writes
-- channels are created server-side (service role) from the verified Twitch profile, so a user
-- cannot claim another streamer's slug / twitch_id.
create policy "owner updates channel" on public.channels for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner inserts songs" on public.songs for insert with check (public.is_channel_owner(channel_id));
create policy "owner updates songs" on public.songs for update using (public.is_channel_owner(channel_id)) with check (public.is_channel_owner(channel_id));
create policy "owner deletes songs" on public.songs for delete using (public.is_channel_owner(channel_id));

create policy "owner inserts commands" on public.bot_commands for insert with check (public.is_channel_owner(channel_id) and not is_default);
create policy "owner updates commands" on public.bot_commands for update using (public.is_channel_owner(channel_id)) with check (public.is_channel_owner(channel_id));
create policy "owner deletes custom commands" on public.bot_commands for delete using (public.is_channel_owner(channel_id) and not is_default);

create policy "owner manages moderators" on public.moderators for all
  using (public.is_channel_owner(channel_id)) with check (public.is_channel_owner(channel_id));

create policy "owner updates learning" on public.learning_requests for update using (public.is_channel_owner(channel_id)) with check (public.is_channel_owner(channel_id));
create policy "owner deletes learning" on public.learning_requests for delete using (public.is_channel_owner(channel_id));

create policy "managers delete tips" on public.tips for delete using (public.is_channel_manager(channel_id));
create policy "history deletable by owner" on public.play_history for delete using (public.is_channel_owner(channel_id));

-- queue_items, request_log, learning_votes, channel_secrets, eventsub_messages, rate_limits, app_tokens:
-- no client write policies -> only security definer RPCs / service role.

-- column-level protection: owner cannot forge counters through direct update
revoke update on public.channels from authenticated, anon;
grant update (display_name, avatar_url, queue_open, settings) on public.channels to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.play_history;
