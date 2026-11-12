-- Renomeia os comandos padrão que colidem com bots comuns (StreamElements, Streamlabs Cloudbot,
-- Nightbot, Fossabot): !sr/!songrequest/!request, !wrongsong, !song/!currentsong, !queue, !commands.
--   sr → pedir (alias pedido) · ws → errei · song → tocando · sq → fila · commands → comandos
-- Os demais padrões não mudam.

create or replace function public.create_default_commands(p_channel_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into bot_commands (channel_id, name, description, command, aliases, action, response_template, cooldown_sec, is_default)
  values
    (p_channel_id, 'Song request', 'Request a song from the songlist', 'pedir', '{pedido}', 'REQUEST',
      '{{song}} added to queue at position: {{position}}', 0, true),
    (p_channel_id, 'Wrong song', 'Remove your last request', 'errei', '{}', 'REMOVE_LAST',
      'Your request for {{song}} has been removed from position {{position}}', 0, true),
    (p_channel_id, 'Replace last request', 'Replace your last request with another song', 'replace', '{replaceLastRequest,replaceLast}', 'REPLACE_LAST',
      'Replaced {{previous_song}} with {{song}} at position: {{position}}', 0, true),
    (p_channel_id, 'Current song', 'Show the song playing now', 'tocando', '{}', 'CURRENT_SONG',
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
    (p_channel_id, 'Queue', 'Link to the queue', 'fila', '{}', 'QUEUE_LINK',
      'Queue: {{queue_link}}', 10, true),
    (p_channel_id, 'Commands', 'Link to the command list', 'comandos', '{}', 'COMMANDS_LINK',
      'Commands: {{commands_link}}', 10, true)
  on conflict (channel_id, command) do nothing;
$$;

-- Canais existentes: só renomeia o comando se ele ainda tem o nome padrão antigo e o novo nome está livre
-- (não sobrescreve personalizações do streamer).
with renames(action, old_command, new_command, new_aliases) as (
  values
    ('REQUEST'::public.bot_action,       'sr',       'pedir',    '{pedido}'::text[]),
    ('REMOVE_LAST'::public.bot_action,   'ws',       'errei',    '{}'::text[]),
    ('CURRENT_SONG'::public.bot_action,  'song',     'tocando',  '{}'::text[]),
    ('QUEUE_LINK'::public.bot_action,    'sq',       'fila',     '{}'::text[]),
    ('COMMANDS_LINK'::public.bot_action, 'commands', 'comandos', '{}'::text[])
)
update public.bot_commands b
set command = r.new_command, aliases = r.new_aliases
from renames r
where b.is_default
  and b.action = r.action
  and b.command = r.old_command
  and not exists (
    select 1 from public.bot_commands x
    where x.channel_id = b.channel_id and lower(x.command) = r.new_command
  );
