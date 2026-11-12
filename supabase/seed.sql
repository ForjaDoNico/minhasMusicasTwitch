-- Local development seed: demo streamer + viewer (email/password, LOCAL ONLY),
-- channel "demo", ~50 songs, past sessions and play history.

-- ---------------------------------------------------------------------------
-- Users (password login only works because the local Supabase has email auth on)
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'streamer@demo.local', extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"demo","slug":"DemoStreamer","provider_id":"100000001","avatar_url":null}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'viewer@demo.local', extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"demo_viewer","slug":"DemoViewer","provider_id":"100000002","avatar_url":null}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'mod@demo.local', extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"demo_mod","slug":"DemoMod","provider_id":"100000003","avatar_url":null}',
   now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u where u.email like '%@demo.local';

-- ---------------------------------------------------------------------------
-- Channel (bot_enabled so `pnpm simulate:chat` works locally)
-- ---------------------------------------------------------------------------
insert into public.channels (id, owner_id, twitch_id, slug, display_name, queue_open, bot_enabled, settings)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '100000001', 'demo',
        'DemoStreamer', true, true, public.default_channel_settings() || '{"maxRequestsPerUser": 3}');

insert into public.moderators (channel_id, twitch_login) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'demo_mod');

-- ---------------------------------------------------------------------------
-- Songs (50)
-- ---------------------------------------------------------------------------
insert into public.songs (channel_id, title, artist, tags, is_new, is_premium, created_at)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', s.title, s.artist, s.tags, s.is_new, s.is_premium, now() - (random() * interval '200 days')
from (values
  ('Garota de Ipanema', 'Tom Jobim', '{Bossa Nova}'::text[], false, false),
  ('Águas de Março', 'Elis Regina & Tom Jobim', '{Bossa Nova}', false, false),
  ('Chega de Saudade', 'João Gilberto', '{Bossa Nova}', false, false),
  ('Asa Branca', 'Luiz Gonzaga', '{Forró}', false, false),
  ('Evidências', 'Chitãozinho & Xororó', '{Sertanejo}', false, false),
  ('Tempo Perdido', 'Legião Urbana', '{Rock Nacional}', false, false),
  ('Pais e Filhos', 'Legião Urbana', '{Rock Nacional}', false, false),
  ('Que País É Este', 'Legião Urbana', '{Rock Nacional}', false, false),
  ('Lanterna dos Afogados', 'Os Paralamas do Sucesso', '{Rock Nacional}', false, false),
  ('Pro Dia Nascer Feliz', 'Barão Vermelho', '{Rock Nacional}', false, false),
  ('Exagerado', 'Cazuza', '{Rock Nacional}', false, false),
  ('Anna Júlia', 'Los Hermanos', '{Rock Nacional}', false, false),
  ('Velha Infância', 'Tribalistas', '{MPB}', false, false),
  ('Trem-Bala', 'Ana Vilela', '{MPB}', true, false),
  ('Oceano', 'Djavan', '{MPB}', false, false),
  ('Sina', 'Djavan', '{MPB}', false, false),
  ('Como Nossos Pais', 'Elis Regina', '{MPB}', false, false),
  ('O Leãozinho', 'Caetano Veloso', '{MPB}', false, false),
  ('Aquarela', 'Toquinho', '{MPB}', false, false),
  ('Ainda Bem', 'Marisa Monte', '{MPB}', true, false),
  ('Wonderwall', 'Oasis', '{Rock}', false, false),
  ('Don''t Look Back in Anger', 'Oasis', '{Rock}', false, false),
  ('Hotel California', 'Eagles', '{Rock}', false, true),
  ('Wish You Were Here', 'Pink Floyd', '{Rock}', false, false),
  ('Stairway to Heaven', 'Led Zeppelin', '{Rock}', false, true),
  ('Hallelujah', 'Leonard Cohen', '{Folk}', false, false),
  ('Blackbird', 'The Beatles', '{Rock,Fingerstyle}', false, false),
  ('Yesterday', 'The Beatles', '{Rock}', false, false),
  ('Let It Be', 'The Beatles', '{Rock}', false, false),
  ('Here Comes the Sun', 'The Beatles', '{Rock}', false, false),
  ('Tears in Heaven', 'Eric Clapton', '{Rock}', false, false),
  ('Nothing Else Matters', 'Metallica', '{Metal}', false, false),
  ('Fade to Black', 'Metallica', '{Metal}', true, false),
  ('Creep', 'Radiohead', '{Alternative}', false, false),
  ('Karma Police', 'Radiohead', '{Alternative}', false, false),
  ('Fast Car', 'Tracy Chapman', '{Folk}', false, false),
  ('The Sound of Silence', 'Simon & Garfunkel', '{Folk}', false, false),
  ('Dust in the Wind', 'Kansas', '{Rock,Fingerstyle}', false, false),
  ('Shape of My Heart', 'Sting', '{Pop}', false, false),
  ('Perfect', 'Ed Sheeran', '{Pop}', false, false),
  ('Thinking Out Loud', 'Ed Sheeran', '{Pop}', false, false),
  ('Someone Like You', 'Adele', '{Pop}', false, false),
  ('Riptide', 'Vance Joy', '{Pop}', true, false),
  ('Banana Pancakes', 'Jack Johnson', '{Pop}', false, false),
  ('Canon in D', 'Pachelbel', '{Instrumental,Clássica}', false, false),
  ('Gymnopédie No. 1', 'Erik Satie', '{Instrumental,Clássica}', false, false),
  ('Comptine d''un autre été', 'Yann Tiersen', '{Instrumental}', false, true),
  ('Merry Christmas Mr. Lawrence', 'Ryuichi Sakamoto', '{Instrumental}', true, true),
  ('Lagrima', 'Francisco Tárrega', '{Instrumental,Clássica,Fingerstyle}', false, false),
  ('Brasileirinho', 'Waldir Azevedo', '{Instrumental,Choro}', true, false)
) as s(title, artist, tags, is_new, is_premium);

-- ---------------------------------------------------------------------------
-- Past sessions + history (fictional)
-- ---------------------------------------------------------------------------
insert into public.stream_sessions (channel_id, started_at, ended_at)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', d, d + interval '3 hours'
from generate_series(now() - interval '70 days', now() - interval '2 days', interval '7 days') as d;

insert into public.play_history (channel_id, song_id, song_title, song_artist, requester_name, source, played_at, stream_session_id)
select ss.channel_id, s.id, s.title, s.artist,
       (array['Anonymous','lucas_br','marimusic','joaopedro','violao_fan','ana_beatriz','gamer123'])[1 + floor(random() * 7)::int],
       (case when random() < 0.7 then 'TWITCH' else 'SITE' end)::public.request_source,
       ss.started_at + (random() * interval '170 minutes'),
       ss.id
from public.stream_sessions ss
cross join lateral (
  select * from public.songs where channel_id = ss.channel_id and ss.id is not null
  order by random() limit 8
) s;

insert into public.request_log (channel_id, stream_session_id, created_at)
select channel_id, stream_session_id, played_at from public.play_history;

-- derive counters from history
update public.songs s set times_played = h.cnt, last_played_at = h.last
from (select song_id, count(*) cnt, max(played_at) last from public.play_history group by song_id) h
where h.song_id = s.id;

-- a couple of open learning requests
insert into public.learning_requests (channel_id, title, artist, requested_by, votes) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bohemian Rhapsody', 'Queen', 'lucas_br', 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cálice', 'Chico Buarque', 'marimusic', 2);
