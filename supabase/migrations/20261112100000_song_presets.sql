-- Repertórios pré-carregados por canal (slug = login da Twitch).
-- Quando o streamer cria o canal, as músicas são copiadas para o repertório dele
-- (com vezes tocadas e última vez tocada aproximada). Canais que já existem recebem agora.

create table public.song_presets (
  id bigint generated always as identity primary key,
  channel_slug text not null,
  title text not null,
  artist text not null default '',
  times_played integer not null default 0,
  last_played_at timestamptz
);
create index song_presets_slug_idx on public.song_presets (channel_slug);

-- privada: só o banco/service role lê
alter table public.song_presets enable row level security;
revoke all on public.song_presets from anon, authenticated;

create or replace function public.apply_song_presets(p_channel_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  v_count integer;
begin
  select slug into v_slug from channels where id = p_channel_id;
  insert into songs (channel_id, title, artist, times_played, last_played_at)
  select p_channel_id, p.title, p.artist, p.times_played, p.last_played_at
  from song_presets p
  where p.channel_slug = v_slug
    and not exists (
      select 1 from songs s
      where s.channel_id = p_channel_id
        and lower(s.title) = lower(p.title) and lower(s.artist) = lower(p.artist)
    )
  order by p.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.apply_song_presets(uuid) from public, anon, authenticated;
grant execute on function public.apply_song_presets(uuid) to service_role;

create or replace function public.handle_channel_presets()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.apply_song_presets(new.id);
  return new;
end $$;

create trigger on_channel_created_presets after insert on public.channels
  for each row execute function public.handle_channel_presets();

-- wallbavaria (87 músicas)
insert into public.song_presets (channel_slug, title, artist, times_played, last_played_at) values
  ('wallbavaria', 'A Multa', 'Falcão', 14, now() - interval '7.8 months'),
  ('wallbavaria', 'A esperança É A Única Que Morre', 'Falcão', 13, now() - interval '7 months'),
  ('wallbavaria', 'You Are My Sunshine', 'Johnny Cash', 15, now() - interval '6.9 months'),
  ('wallbavaria', 'Nova Baby', 'The Black Keys', 3, now() - interval '6.1 months'),
  ('wallbavaria', 'Cold Little Heart', 'Michael Kiwanuka', 34, now() - interval '5.2 months'),
  ('wallbavaria', 'Deslizes', 'Fagner', 25, now() - interval '4.9 months'),
  ('wallbavaria', 'Poison Heart', 'Ramones', 34, now() - interval '4.2 months'),
  ('wallbavaria', 'Cruel World', 'Willie Nelson (RDR2)', 2, now() - interval '4.2 months'),
  ('wallbavaria', 'Wayfaring Stranger', 'Johnny Cash (TLOU)', 7, now() - interval '4.2 months'),
  ('wallbavaria', 'Last Kiss', 'Pearl Jam', 11, now() - interval '3.8 months'),
  ('wallbavaria', 'Bate Na Porta Do Céu', 'Zé Ramalho', 6, now() - interval '3.6 months'),
  ('wallbavaria', 'Onde Houver Fé, Que Eu Leve A Dúvida', 'Falcão', 15, now() - interval '3.6 months'),
  ('wallbavaria', 'Dois', 'Paulo Ricardo', 2, now() - interval '3.6 months'),
  ('wallbavaria', 'Marasmo', 'Ventania', 11, now() - interval '3.3 months'),
  ('wallbavaria', 'O Destino Não Quis', 'Maneva', 7, now() - interval '3.3 months'),
  ('wallbavaria', 'Dia Do Corno', 'Reginaldo Rossi', 23, now() - interval '3.3 months'),
  ('wallbavaria', 'No Cume', 'Falcão', 38, now() - interval '3.2 months'),
  ('wallbavaria', 'Can''t Catch Me Now', 'Olivia Rodrigo', 9, now() - interval '3.2 months'),
  ('wallbavaria', 'O Que Eu Bebi', 'Clarice Falcão', 20, now() - interval '3.2 months'),
  ('wallbavaria', 'Amor Pra Recomeçar', 'Frejat', 11, now() - interval '3.2 months'),
  ('wallbavaria', 'The Only Exception', 'Paramore', 10, now() - interval '3 months'),
  ('wallbavaria', 'Macaé', 'Clarice Falcão', 33, now() - interval '3 months'),
  ('wallbavaria', 'Não Há Quem Aguente', 'Falcão', 18, now() - interval '3 months'),
  ('wallbavaria', 'Monomania', 'Clarice Falcão', 34, now() - interval '3 months'),
  ('wallbavaria', 'Medo Da Chuva', 'Raul Seixas', 24, now() - interval '2.9 months'),
  ('wallbavaria', 'Meu Eu Em Você', 'Victor e Leo', 18, now() - interval '2.9 months'),
  ('wallbavaria', 'That''s The Way It Is', 'Daniel Lanois (RDR2)', 7, now() - interval '2.9 months'),
  ('wallbavaria', 'Lonely Day', 'System Of A Down', 52, now() - interval '2.9 months'),
  ('wallbavaria', 'Telegrama', 'Zeca Baleiro', 11, now() - interval '2.2 months'),
  ('wallbavaria', 'Espumas Ao Vento', 'Fagner', 20, now() - interval '2.2 months'),
  ('wallbavaria', 'Disco Voador', 'Raul Seixas', 20, now() - interval '2.2 months'),
  ('wallbavaria', 'Toxic', 'Britney Spears', 39, now() - interval '2.2 months'),
  ('wallbavaria', 'Meu Disfarce', 'Bruno e Marrone', 12, now() - interval '2.2 months'),
  ('wallbavaria', 'Desliga', 'Bruno e Marrone', 11, now() - interval '2.1 months'),
  ('wallbavaria', 'Snuff', 'Slipknot', 20, now() - interval '2.1 months'),
  ('wallbavaria', 'Borboletas', 'Victor e Leo', 30, now() - interval '2.1 months'),
  ('wallbavaria', 'Can''t Help Falling In Love', 'Elvis Presley', 40, now() - interval '2.1 months'),
  ('wallbavaria', 'Wind Of Change', 'Scorpions', 20, now() - interval '2.1 months'),
  ('wallbavaria', 'Little Black Submarines', 'The Black Keys', 4, now() - interval '2.1 months'),
  ('wallbavaria', 'Unshaken', 'D''Angelo (RDR2)', 10, now() - interval '1.2 months'),
  ('wallbavaria', 'Suspicious Minds', 'Elvis Presley', 24, now() - interval '1.2 months'),
  ('wallbavaria', 'Cavalgada', 'Bruno e Marrone', 21, now() - interval '1.2 months'),
  ('wallbavaria', 'Future Days', 'Pearl Jam (TLOU)', 10, now() - interval '1.2 months'),
  ('wallbavaria', 'Você Não Me Ensinou a Te Esquecer', 'Fernando Mendes', 10, now() - interval '1.2 months'),
  ('wallbavaria', 'Take Me Home, Country Roads', 'John Dever', 11, now() - interval '1.2 months'),
  ('wallbavaria', 'Passaro de Fogo', 'Paula Fernandes', 8, now() - interval '1.2 months'),
  ('wallbavaria', 'Não Olhe Assim', 'Leandro e Leonardo', 12, now() - interval '1.2 months'),
  ('wallbavaria', 'Tocando Em Frente', 'Almir Sater', 28, now() - interval '1.2 months'),
  ('wallbavaria', 'Tempo Ruim', 'Matanza', 31, now() - interval '1.2 months'),
  ('wallbavaria', 'Like A Stone', 'Audioslave', 48, now() - interval '1.2 months'),
  ('wallbavaria', 'Agora Estou Sofrendo', 'Calcinha Preta', 6, now() - interval '1.2 months'),
  ('wallbavaria', 'TV', 'Billie Eilish', 21, now() - interval '1.2 months'),
  ('wallbavaria', 'A Dança Das Borboletas', 'Zé Ramalho', 21, now() - interval '1.2 months'),
  ('wallbavaria', 'Father and Son', 'Cat Stevens', 3, now() - interval '1.2 months'),
  ('wallbavaria', 'Sem Você', 'Luiz Lins', 32, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Amizades Virtuais', 'Celso Portiolli', 16, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Na Sua Estante', 'Pitty', 35, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Glimpse of Us', 'Joji', 14, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Ela Só Pensa em Beijar', 'MC Leozinho', 17, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Flor de Tangerina', 'Alceu Valença', 8, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Fazer Falta', 'MC Livinho', 16, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Amolda Um Bicho Na Parede (Atirei o pau no gato)', 'Falcão', 37, now() - interval '2.9 weeks'),
  ('wallbavaria', 'Coração de Frango', 'Falcão', 71, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Mundo Animal', 'Mamonas Assassinas', 9, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Wicked Game', 'Corey Talor', 26, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Wish You Were Here', 'Pink Floyd', 25, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Too Sweet', 'Hozier', 29, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Lenha', 'Zeca Baleiro', 10, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Maluco Beleza', 'Raul Seixas', 26, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Hurt', 'Johnny Cash', 55, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Garçom', 'Reginaldo Rossi', 40, now() - interval '1.8 weeks'),
  ('wallbavaria', 'A Raposa E As Uvas', 'Reginaldo Rossi', 17, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Sinônimo', 'Ze Ramalho', 13, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Yellow', 'Coldplay', 29, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Mistérios Da Meia Noite', 'Zé Ramalho', 21, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Runaway', 'Aurora', 5, now() - interval '1.8 weeks'),
  ('wallbavaria', 'Eu Que Não Amo Você', 'Engenheiros do Hawaii', 4, now() - interval '1.7 days'),
  ('wallbavaria', 'Chão De Giz', 'Zé Ramalho', 53, now() - interval '1.7 days'),
  ('wallbavaria', 'Cowboy Fora Da Lei', 'Raul Seixas', 47, now() - interval '1.7 days'),
  ('wallbavaria', 'Por Enquanto', 'Cassia Eller', 20, now() - interval '1.7 days'),
  ('wallbavaria', 'A Palo Seco', 'Belchior', 16, now() - interval '1.7 days'),
  ('wallbavaria', 'Take On Me', 'A-Ha (TLOU)', 12, now() - interval '1.7 days'),
  ('wallbavaria', 'The Night We Met', 'Lord Huron', 66, now() - interval '1.7 days'),
  ('wallbavaria', 'Ghost Riders In The Sky', 'Johnny Cash', 3, now() - interval '1.7 days'),
  ('wallbavaria', 'All I Want', 'Kodaline', 20, now() - interval '1.7 days'),
  ('wallbavaria', 'Um Sonhador', 'Leandro e Leonardo', 7, now() - interval '1.7 days'),
  ('wallbavaria', 'Happier Than Ever', 'Billie Eilish', 28, now() - interval '1.7 days');

-- canais que já existem
select public.apply_song_presets(id) from public.channels
where slug in (select distinct channel_slug from public.song_presets);
