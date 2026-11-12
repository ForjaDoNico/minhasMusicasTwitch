-- pgTAP tests for the queue RPCs. Run with: pnpm supabase test db
begin;
select plan(25);

-- fixtures ------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner@t.local', '{"name":"owner_t","provider_id":"900001"}'),
  ('a0000000-0000-0000-0000-000000000002', 'mod@t.local', '{"name":"mod_t","provider_id":"900002"}'),
  ('a0000000-0000-0000-0000-000000000003', 'rando@t.local', '{"name":"rando_t","provider_id":"900003"}');
insert into channels (id, owner_id, twitch_id, slug, display_name, queue_open, settings)
values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '900001', 'test_chan', 'Test', true,
        default_channel_settings() || '{"maxRequestsPerUser": 2, "minTipForPriority": 5}');
insert into moderators (channel_id, twitch_login) values ('c0000000-0000-0000-0000-000000000001', 'mod_t');
insert into songs (id, channel_id, title, artist) values
  ('50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Song A', 'X'),
  ('50000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Song B', 'X'),
  ('50000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Song C', 'Y'),
  ('50000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Song D', 'Y');

create temp table r (k text primary key, v jsonb);
grant all on r to authenticated, anon;
create function pg_temp.pos(p_song uuid) returns int language sql as
  $$ select position from queue_items where song_id = p_song and status = 'QUEUED' $$;

-- default commands were created by the trigger
select is((select count(*)::int from bot_commands where channel_id = 'c0000000-0000-0000-0000-000000000001'), 15, 'default bot commands created');

-- requests ------------------------------------------------------------------
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'TWITCH', 'alice', null, 'tw-alice')) ->> 'position', '1', 'first request at position 1');
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'TWITCH', 'alice', null, 'tw-alice')) ->> 'position', '2', 'second request at position 2');
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'TWITCH', 'alice', null, 'tw-alice')) ->> 'error', 'user_limit', 'per-user limit enforced');
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'SITE', 'bob')) ->> 'error', 'already_in_queue', 'duplicates blocked');
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'SITE', 'rich', null, null, null, 10)) ->> 'position', '1', 'tipped request jumps the queue');
select is(pg_temp.pos('50000000-0000-0000-0000-000000000001'), 2, 'others shift down after priority insert');
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'SITE', 'rich2', null, null, null, 6)) ->> 'position', '2', 'second tipped request goes after the first one');

update channels set queue_open = false where id = 'c0000000-0000-0000-0000-000000000001';
select is((request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'SITE', 'late')) ->> 'error', 'queue_closed', 'closed queue rejects viewers');
update channels set queue_open = true where id = 'c0000000-0000-0000-0000-000000000001';

-- permissions -----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$ select request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'SITE') $$,
  '42501', null, 'clients cannot call request_song directly');
select throws_ok($$ select play_next('c0000000-0000-0000-0000-000000000001') $$, '42501', 'not_allowed', 'random user cannot control the queue');
select is_empty($$ update songs set title = 'hacked' where channel_id = 'c0000000-0000-0000-0000-000000000001' returning id $$, 'RLS: non-owner cannot edit songs');

-- moderator can run the queue
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
insert into r values ('next1', play_next('c0000000-0000-0000-0000-000000000001'));
reset role;
reset request.jwt.claims;

select is((select song_id from queue_items where status = 'PLAYING'), '50000000-0000-0000-0000-000000000003'::uuid, 'moderator play_next → first item is playing');
select is((select count(*)::int from queue_items where status = 'QUEUED'), 3, 'three left in the queue');
select results_eq($$ select position from queue_items where status = 'QUEUED' order by position $$, $$ values (1),(2),(3) $$, 'positions stay contiguous');

-- mark played / next ----------------------------------------------------------
select play_next('c0000000-0000-0000-0000-000000000001');
select is((select song_title from play_history where channel_id = 'c0000000-0000-0000-0000-000000000001' order by played_at desc limit 1), 'Song C', 'played song recorded in history');
select is((select times_played from songs where id = '50000000-0000-0000-0000-000000000003'), 1, 'times_played incremented');
select isnt((select last_played_at from songs where id = '50000000-0000-0000-0000-000000000003'), null, 'last_played_at set');
select isnt((select current_session_id from channels where id = 'c0000000-0000-0000-0000-000000000001'), null, 'stream session created lazily');

-- skip does not record history
select play_next('c0000000-0000-0000-0000-000000000001', false);
select is((select count(*)::int from play_history where channel_id = 'c0000000-0000-0000-0000-000000000001'), 1, 'skip does not add history');

-- reorder / save / restore ----------------------------------------------------
select request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'SITE', 'carol');
select request_song('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'SITE', 'dave');
insert into r select 'ids', to_jsonb(array_agg(id order by position desc)) from queue_items where status = 'QUEUED';
select reorder_queue('c0000000-0000-0000-0000-000000000001', array(select jsonb_array_elements_text(v)::uuid from r where k = 'ids'));
select is((select id from queue_items where status = 'QUEUED' and position = 1),
          (select (v ->> 0)::uuid from r where k = 'ids'), 'reorder_queue applies new order');

select save_item((select id from queue_items where status = 'QUEUED' and position = 1));
select is((select count(*)::int from queue_items where status = 'SAVED'), 1, 'item saved for later');
select restore_saved((select id from queue_items where status = 'SAVED'));
select is((select position from queue_items q where q.id = (select (v ->> 0)::uuid from r where k = 'ids') and status = 'QUEUED'),
          (select count(*)::int from queue_items where status = 'QUEUED'), 'restored item goes to the end');

-- cooldown
select is(use_command_cooldown((select id from bot_commands where channel_id = 'c0000000-0000-0000-0000-000000000001' and command = 'song')), true, 'command usable first time');
select is(use_command_cooldown((select id from bot_commands where channel_id = 'c0000000-0000-0000-0000-000000000001' and command = 'song')), false, 'command on cooldown right after');

select * from finish();
rollback;
