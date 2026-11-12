-- Repertório pré-carregado do canal lucaslongaresi (99 músicas) + suporte a "Nova" nos presets.

alter table public.song_presets add column is_new boolean not null default false;

create or replace function public.apply_song_presets(p_channel_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  v_count integer;
begin
  select slug into v_slug from channels where id = p_channel_id;
  insert into songs (channel_id, title, artist, times_played, last_played_at, is_new)
  select p_channel_id, p.title, p.artist, p.times_played, p.last_played_at, p.is_new
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

insert into public.song_presets (channel_slug, title, artist, times_played, last_played_at, is_new) values
  ('lucaslongaresi', 'Nutshell', 'Alice in Chains', 0, null, true),
  ('lucaslongaresi', 'Body and Soul (instrumental)', 'Johnny Green', 9, now() - interval '3.3 months', false),
  ('lucaslongaresi', 'All the Things You Are [instrumental]', 'Jerome Kern / Oscar Hammerstein II', 8, now() - interval '3.3 months', false),
  ('lucaslongaresi', 'Freddie Freeloader (instrumental)', 'Miles Davis', 11, now() - interval '3 months', false),
  ('lucaslongaresi', 'Turnaround (instrumental)', 'Ornette Coleman', 10, now() - interval '2.9 months', false),
  ('lucaslongaresi', 'Angel From Montgomery', 'John Prine', 10, now() - interval '2.9 months', false),
  ('lucaslongaresi', 'Strange Meeting (instrumental)', 'Bill Frisell', 20, now() - interval '2.8 months', false),
  ('lucaslongaresi', 'Knockin'' On Heaven''s Door / Batendo na Porta do Céu', 'Bob Dylan / Zé Ramalho', 15, now() - interval '2.8 months', false),
  ('lucaslongaresi', 'Cheese Universo (instrumental)', 'Lucas Longaresi', 25, now() - interval '2.6 months', false),
  ('lucaslongaresi', 'Equinox (instrumenal)', 'John Coltrane', 16, now() - interval '2.6 months', false),
  ('lucaslongaresi', 'Lovesong', 'The Cure', 25, now() - interval '2.6 months', false),
  ('lucaslongaresi', 'Times Like These', 'Foo Fighters', 19, now() - interval '2.5 months', false),
  ('lucaslongaresi', 'Pela Vida Inteira', 'Kiloucura (Riquinho / Charles André)', 7, now() - interval '2.5 months', false),
  ('lucaslongaresi', 'Empatia e Compaixão (instrumental)', 'Lucas Longaresi', 17, now() - interval '2.4 months', false),
  ('lucaslongaresi', 'Crepuscule With Nellie (instrumental)', 'Thelonious Monk', 20, now() - interval '2.4 months', false),
  ('lucaslongaresi', 'Walking After You', 'Dave Grohl [Foo Fighters]', 9, now() - interval '2.4 months', false),
  ('lucaslongaresi', 'Blue Monk (instrumental)', 'Thelonious Monk', 12, now() - interval '2.4 months', false),
  ('lucaslongaresi', 'Shape Of My Heart', 'Sting / Dominic Miller', 12, now() - interval '2.4 months', false),
  ('lucaslongaresi', 'Autumn Leaves (instrumental)', 'Joseph Kosma/ Johnny Mercer/ Jacques Prévert', 11, now() - interval '2.3 months', false),
  ('lucaslongaresi', 'O Que Será (A Flor Da Terra)', 'Chico Buarque', 16, now() - interval '2.3 months', false),
  ('lucaslongaresi', 'Blue In Green (instrumental)', 'Bill Evans/Miles Davis', 14, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Central Park West (instrumenal)', 'John Coltrane', 18, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Naima (instrumenal)', 'John Coltrane', 28, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Cinema Paradiso (Love Theme) [Instrumental]', 'Andrea Morricone', 2, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Fazenda', 'Nelson Angelo [Milton Nascimento]', 15, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Comportamento Geral', 'Gonzaguinha', 15, now() - interval '2.2 months', false),
  ('lucaslongaresi', 'Stella By Starlight (instrumental)', 'Victor Young', 17, now() - interval '2.1 months', false),
  ('lucaslongaresi', 'First Song [Instrumental]', 'Charlie Haden', 7, now() - interval '2.1 months', false),
  ('lucaslongaresi', 'Zelda''s Lullaby [The Legend Of Zelda: Ocarina Of Time] (instrumental)', 'Koji Kondo', 26, now() - interval '2.1 months', false),
  ('lucaslongaresi', 'So What? (instrumental)', 'Miles Davis', 14, now() - interval '2.1 months', false),
  ('lucaslongaresi', 'Hope (instrumental)', 'Lucas Longaresi', 23, now() - interval '2.1 months', false),
  ('lucaslongaresi', 'Future Days', 'Pearl Jam', 18, now() - interval '1.9 months', false),
  ('lucaslongaresi', 'Never Gonna Give You Up', 'Rick Astley (Pete Waterman, Matt Aitken, Mike Stock)', 14, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'Gostava Tanto De Você', 'Tim Maia', 24, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'Quero Te Encontrar', 'Claudinho e Buchecha', 25, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'Razões e Emoções', 'Nx Zero (Di Ferrero / Gee Rocha)', 23, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'Di Menor', 'Guinga / Celso Viáfora', 9, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'Oriental Folk Song [instrumental]', 'Wayne Shorter', 20, now() - interval '1.1 months', false),
  ('lucaslongaresi', 'In a Sentimental Mood (instrumental)', 'Duke Ellington', 10, now() - interval '1.1 months', false),
  ('lucaslongaresi', '505', 'Arctic Monkeys (Alex Turner)', 33, now() - interval '3.9 weeks', false),
  ('lucaslongaresi', 'Papel Machê', 'João Bosco / João Carlos Capinam', 21, now() - interval '3.9 weeks', false),
  ('lucaslongaresi', 'Heart Shaped Box (instrumental)', 'Kurt Cobain [Nirvana]', 24, now() - interval '3.9 weeks', false),
  ('lucaslongaresi', 'Só os loucos sabem', 'Charlie Brown Jr. (Alexandre Magno Abrao / Thiago Raphael Castanho)', 20, now() - interval '3.8 weeks', false),
  ('lucaslongaresi', 'Lá Vou Eu', 'Rita Lee / Luiz Carlini', 15, now() - interval '3.8 weeks', false),
  ('lucaslongaresi', 'Vapor Barato', 'O Rappa (Waly Salomão, Jards Macalé)', 10, now() - interval '3.8 weeks', false),
  ('lucaslongaresi', 'Three Little Birds', 'Bob Marley', 5, now() - interval '3.7 weeks', false),
  ('lucaslongaresi', 'Learn To Fly', 'Dave Grohl [Foo Fighters]', 20, now() - interval '3.7 weeks', false),
  ('lucaslongaresi', 'The Only Exception', 'Paramore', 12, now() - interval '3.7 weeks', false),
  ('lucaslongaresi', 'Paciência', 'Lenine/Dudu Falcão', 19, now() - interval '3.7 weeks', false),
  ('lucaslongaresi', 'O Trem Azul', 'Lô Borges/Ronaldo Bastos', 32, now() - interval '3.7 weeks', false),
  ('lucaslongaresi', 'Hino da URSS (instrumental)', 'Alexander Alexandrov / Sergey Mikhalkov / El-Registan', 41, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'Message In A Bottle', 'The Police [Sting]', 11, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'Linger', 'The Cranberries', 13, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'Pescador De Ilusões', 'O Rappa', 28, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'I Have A Dream (instrumental)', 'Lucas Longaresi', 19, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'Careless Whisper', 'George Michael', 17, now() - interval '2.9 weeks', false),
  ('lucaslongaresi', 'Zero', 'Liniker', 14, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Samurai', 'Djavan', 32, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Take Me Home, Country Roads', 'John Denver', 23, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'À Primeira Vista', 'Chico Cesar', 23, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'I Am The Highway', 'Audioslave', 17, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Espumas Ao Vento', 'Fagner', 15, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Paisagem Na Janela', 'Lô Borges/ Fernando Brant', 19, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Telegrama', 'Zeca Baleiro', 22, now() - interval '2.8 weeks', false),
  ('lucaslongaresi', 'Alone Together (instrumental)', 'Arthur Schwartz / Howard Dietz', 15, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Don''t Know Why (instrumental)', 'Jesse Harris [Norah Jones]', 27, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Little Wing (Instrumental)', 'Jimi Hendrix', 21, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Giant Steps', 'John Coltrane', 8, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Visssssh [instrumental]', 'Lucas Longaresi', 13, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Wave (instrumental)', 'Tom Jobim', 17, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Footprints (instrumental)', 'Wayne Shorter', 14, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Beatrice [Instrumental]', 'Sam Rivers', 1, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Zombie', 'The Cranberries', 2, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Like A Stone', 'Audioslave', 31, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'A Lua E Eu', 'Cassiano', 20, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Não Vou Me Adaptar', 'Nando Reis', 10, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Palco', 'Gilberto Gil', 11, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Sangue Latino (voz)', '(João Ricardo / Paulinho Mendonça) [ Secos E Molhados]', 29, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Paulinha', 'Calcinha Preta', 21, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Improviso sobre Vida Loka Pt II (instrumental)', 'Racionais MC''s', 14, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Eu Só Quero Um Xodó', 'Dominguinhos', 15, now() - interval '1.7 weeks', false),
  ('lucaslongaresi', 'Você É Linda', 'Caetano Veloso', 27, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Faltando Um Pedaço', 'Djavan', 2, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Snuff', 'Slipknot', 16, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Não Sei Dançar', 'Alvin L. (Marina Lima)', 2, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Onda', 'Cassiano, Paulo Zdanowski', 2, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Something In The Way', 'Nirvana', 2, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Não Existe Amor Em SP (instrumental)', 'Criolo', 29, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Estrela (instrumenal)', 'Gilberto Gil', 27, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Lindo Lago do Amor', 'Gonzaguinha', 27, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Para Lennon e McCartney', 'Lô Borges/ Márcio Borges/ Fernando Brant', 15, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Dias Atrás', 'CPM 22', 35, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Um Minuto Para o Fim do Mundo', 'CPM 22', 26, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Wicked Game', 'Chris Isaak', 27, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Don’t Look Back In Anger', 'Oasis (Noel Gallagher)', 7, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Azul da Cor Do Mar', 'Tim Maia', 10, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'what''s wrong with me', 'Olivia Rodrigo', 2, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Tocando Em Frente', 'Almir Sater/ Renato Teixeira', 23, now() - interval '1.6 weeks', false),
  ('lucaslongaresi', 'Numb', 'Linkin Park', 15, now() - interval '1.6 weeks', false);

-- se o canal já existir
select public.apply_song_presets(id) from public.channels where slug = 'lucaslongaresi';
