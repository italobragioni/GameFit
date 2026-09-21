-- ==================================================================
-- Projeto Leve — seed
-- Conteúdo inicial: níveis, 50 missões, 10 conquistas, jornada 30 dias.
-- Idempotente: pode rodar mais de uma vez.
-- ==================================================================

-- ------------------------------------------------------------------
-- Níveis (progressão crescente)
-- ------------------------------------------------------------------
insert into public.level_thresholds (level, min_xp, title) values
  (1, 0,     'Primeiros passos'),
  (2, 200,   'Aquecendo'),
  (3, 500,   'Em ritmo'),
  (4, 900,   'Consistente'),
  (5, 1400,  'Determinado'),
  (6, 2000,  'Focado'),
  (7, 2700,  'Dedicado'),
  (8, 3500,  'Imparável'),
  (9, 4400,  'Exemplar'),
  (10, 5400, 'Referência'),
  (11, 6500, 'Veterano'),
  (12, 7700, 'Inspirador'),
  (13, 9000, 'Mestre da rotina'),
  (14, 10400,'Lendário'),
  (15, 11900,'Elite'),
  (16, 13500,'Guardião do hábito'),
  (17, 15200,'Virtuoso'),
  (18, 17000,'Fenômeno'),
  (19, 18900,'Titã'),
  (20, 20900,'Ícone')
on conflict (level) do update set min_xp = excluded.min_xp, title = excluded.title;

-- ------------------------------------------------------------------
-- Missões diárias (catálogo). free = is_premium false.
-- xp: fácil 10, média 20, importante 30, desafio 50+
-- ------------------------------------------------------------------
insert into public.missions (title, description, category, xp, difficulty, icon, is_premium, sort_order) values
  -- Hidratação
  ('Beber sua meta diária de água', 'Mantenha-se hidratado ao longo do dia.', 'hidratacao', 20, 'media', '💧', false, 1),
  ('Começar o dia com um copo de água', 'Um copo de água logo ao acordar.', 'hidratacao', 10, 'facil', '🚰', false, 2),
  ('Trocar um refrigerante por água', 'Escolha água em uma das refeições.', 'hidratacao', 20, 'media', '💦', true, 3),
  ('Levar uma garrafa de água com você', 'Tenha água por perto o dia todo.', 'hidratacao', 10, 'facil', '🍶', true, 4),
  ('Beber água antes de cada refeição', 'Um copo antes das principais refeições.', 'hidratacao', 20, 'media', '🥤', true, 5),
  ('Adicionar fruta na água', 'Água saborizada natural.', 'hidratacao', 10, 'facil', '🍋', true, 6),
  ('Reduzir bebidas açucaradas hoje', 'Menos açúcar líquido no dia.', 'hidratacao', 30, 'importante', '🚫', true, 7),
  ('Hidratar-se após atividade física', 'Reponha líquidos depois de se mover.', 'hidratacao', 10, 'facil', '💧', true, 8),
  -- Alimentação
  ('Fazer uma refeição equilibrada', 'Inclua proteína, carboidrato e vegetais.', 'alimentacao', 30, 'importante', '🥗', false, 10),
  ('Incluir fruta ou vegetal no dia', 'Pelo menos uma porção.', 'alimentacao', 20, 'media', '🍎', false, 11),
  ('Comer devagar e com atenção', 'Preste atenção à comida, sem telas.', 'alimentacao', 20, 'media', '🍽️', true, 12),
  ('Planejar as refeições do dia', 'Pense com antecedência no que comer.', 'alimentacao', 20, 'media', '📝', true, 13),
  ('Incluir uma porção de proteína', 'Proteína em uma refeição.', 'alimentacao', 20, 'media', '🍳', true, 14),
  ('Comer 3 cores diferentes no prato', 'Variedade de vegetais no prato.', 'alimentacao', 20, 'media', '🌈', true, 15),
  ('Preparar um lanche saudável', 'Tenha uma opção prática por perto.', 'alimentacao', 10, 'facil', '🥕', true, 16),
  ('Evitar comer em frente à tela', 'Refeição sem distrações.', 'alimentacao', 10, 'facil', '📵', true, 17),
  ('Incluir grãos integrais', 'Prefira versões integrais hoje.', 'alimentacao', 20, 'media', '🌾', true, 18),
  ('Montar uma lista de compras saudável', 'Planeje suas compras da semana.', 'alimentacao', 30, 'importante', '🛒', true, 19),
  -- Movimento
  ('Fazer 20 minutos de movimento', 'Caminhada, dança ou o que preferir.', 'movimento', 30, 'importante', '🚶', false, 20),
  ('Fazer um alongamento rápido', 'Alongue-se por alguns minutos.', 'movimento', 10, 'facil', '🧘', false, 21),
  ('Subir escadas em vez do elevador', 'Escolha as escadas hoje.', 'movimento', 10, 'facil', '🪜', true, 22),
  ('Caminhar após uma refeição', 'Uma caminhada leve depois de comer.', 'movimento', 20, 'media', '🚶‍♀️', true, 23),
  ('Fazer uma pausa ativa no trabalho', 'Levante e mexa o corpo.', 'movimento', 10, 'facil', '🤸', true, 24),
  ('Completar 6.000 passos', 'Movimente-se ao longo do dia.', 'movimento', 30, 'importante', '👟', true, 25),
  ('Fazer 10 minutos de exercício em casa', 'Um treino curto em casa.', 'movimento', 20, 'media', '🏋️', true, 26),
  ('Dançar sua música favorita', 'Movimento divertido conta também.', 'movimento', 10, 'facil', '💃', true, 27),
  ('Alongar antes de dormir', 'Relaxe o corpo à noite.', 'movimento', 10, 'facil', '🤙', true, 28),
  ('Fazer uma atividade ao ar livre', 'Movimente-se ao ar livre hoje.', 'movimento', 30, 'importante', '🌳', true, 29),
  -- Sono
  ('Preparar-se para dormir em horário adequado', 'Comece a desacelerar no horário.', 'sono', 20, 'media', '😴', false, 30),
  ('Desligar telas 30 min antes de dormir', 'Menos telas antes de deitar.', 'sono', 20, 'media', '🌙', true, 31),
  ('Manter horário de sono consistente', 'Durma e acorde em horários próximos.', 'sono', 30, 'importante', '⏰', true, 32),
  ('Criar um ambiente escuro para dormir', 'Reduza luzes no quarto.', 'sono', 10, 'facil', '🕯️', true, 33),
  ('Evitar cafeína à noite', 'Sem café no fim do dia.', 'sono', 20, 'media', '☕', true, 34),
  ('Fazer um ritual relaxante antes de dormir', 'Leitura, respiração ou banho morno.', 'sono', 20, 'media', '🛁', true, 35),
  ('Anotar 3 coisas boas do dia', 'Feche o dia com gratidão.', 'sono', 10, 'facil', '📓', true, 36),
  -- Organização
  ('Organizar as tarefas do dia', 'Liste o que é prioridade hoje.', 'organizacao', 20, 'media', '✅', false, 40),
  ('Preparar a roupa do dia seguinte', 'Deixe tudo pronto na noite anterior.', 'organizacao', 10, 'facil', '👕', true, 41),
  ('Arrumar um espaço da casa', 'Organize um cantinho hoje.', 'organizacao', 10, 'facil', '🧹', true, 42),
  ('Planejar a semana', 'Dê uma olhada nos próximos dias.', 'organizacao', 30, 'importante', '🗓️', true, 43),
  ('Definir 3 prioridades do dia', 'Escolha o que realmente importa.', 'organizacao', 20, 'media', '🎯', true, 44),
  ('Revisar seus objetivos', 'Relembre onde quer chegar.', 'organizacao', 20, 'media', '🧭', true, 45),
  ('Separar um tempo só para você', 'Reserve um momento no dia.', 'organizacao', 10, 'facil', '⏳', true, 46),
  -- Mindfulness
  ('Fazer 5 minutos de respiração', 'Respire com calma e atenção.', 'mindfulness', 20, 'media', '🌬️', false, 50),
  ('Praticar gratidão', 'Reconheça algo bom de hoje.', 'mindfulness', 10, 'facil', '🙏', true, 51),
  ('Fazer uma pausa consciente', 'Pare e observe como você está.', 'mindfulness', 10, 'facil', '🧘‍♂️', true, 52),
  ('Passar 10 min sem celular', 'Um intervalo sem tela.', 'mindfulness', 20, 'media', '📴', true, 53),
  ('Observar a natureza por alguns minutos', 'Conecte-se com o ambiente.', 'mindfulness', 10, 'facil', '🌿', true, 54),
  ('Anotar como você está se sentindo', 'Registre suas emoções.', 'mindfulness', 20, 'media', '💭', true, 55),
  -- Outros
  ('Fazer o check-in diário', 'Registre como foi seu dia.', 'outros', 10, 'facil', '📊', false, 60),
  ('Compartilhar seu progresso com alguém', 'Conte a alguém sobre sua jornada.', 'outros', 20, 'media', '🤝', true, 61)
on conflict do nothing;

-- ------------------------------------------------------------------
-- Conquistas
-- ------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, criteria_type, criteria_value, criteria_category, sort_order) values
  ('first_step',   'Primeiro passo',      'Conclua sua primeira missão.',                 '🌱', 'first_mission', 1,  null, 1),
  ('streak_7',     '7 dias',              'Complete uma semana de consistência.',         '🔥', 'streak', 7,          null, 2),
  ('streak_30',    '30 dias',             'Complete 30 dias de sequência.',               '🔥', 'streak', 30,         null, 3),
  ('hydrated',     'Hidratado',           'Complete 30 missões de hidratação.',           '💧', 'category_count', 30, 'hidratacao', 4),
  ('balanced',     'Rotina equilibrada',  'Complete 50 missões de alimentação.',          '🥗', 'category_count', 50, 'alimentacao', 5),
  ('in_motion',    'Em movimento',        'Complete 50 missões de atividade.',            '🚶', 'category_count', 50, 'movimento', 6),
  ('rested',       'Bem descansado',      'Complete 30 missões de sono.',                 '😴', 'category_count', 30, 'sono', 7),
  ('mindful',      'Mente tranquila',     'Complete 20 missões de mindfulness.',          '🧘', 'category_count', 20, 'mindfulness', 8),
  ('xp_1000',      '1.000 XP',            'Alcance mil pontos de experiência.',           '⭐', 'xp', 1000,           null, 9),
  ('xp_10000',     '10.000 XP',           'Alcance dez mil pontos de experiência.',       '🌟', 'xp', 10000,          null, 10)
on conflict (code) do nothing;

-- ------------------------------------------------------------------
-- Jornada de 30 dias
-- ------------------------------------------------------------------
insert into public.challenges (slug, title, description, total_days, is_premium)
values ('jornada-30-dias', 'Jornada de 30 Dias', 'Pequenos passos diários para construir uma rotina mais leve e consistente.', 30, true)
on conflict (slug) do nothing;

do $$
declare
  v_challenge uuid;
  v_day uuid;
  i int;
  themes text[] := array[
    'Comece bem: hidratação',
    'Movimento leve',
    'Prato colorido',
    'Sono com qualidade',
    'Organize seu dia',
    'Respire fundo',
    'Semana da consistência',
    'Água em foco',
    'Caminhe mais',
    'Frutas e vegetais',
    'Desacelere à noite',
    'Planeje a semana',
    'Pausa consciente',
    'Refeição sem telas',
    'Passos extras',
    'Proteína no prato',
    'Ritual do sono',
    'Gratidão diária',
    'Menos açúcar líquido',
    'Alongamento do corpo',
    'Cozinhe em casa',
    'Ambiente tranquilo',
    'Momento para você',
    'Lanche inteligente',
    'Atividade ao ar livre',
    'Rotina matinal',
    'Foco nas prioridades',
    'Corpo em movimento',
    'Reflexão da jornada',
    'Celebre sua evolução'
  ];
  descs text[] := array[
    'Beba água ao acordar e mantenha uma garrafa por perto.',
    'Faça 10 minutos de movimento no seu ritmo.',
    'Inclua ao menos 3 cores de vegetais nas refeições.',
    'Prepare o ambiente e desacelere antes de dormir.',
    'Liste as 3 tarefas mais importantes do dia.',
    'Reserve 5 minutos para respirar com atenção.',
    'Mantenha os hábitos da semana com leveza.',
    'Atinja sua meta de água hoje.',
    'Some mais passos do que ontem.',
    'Coma frutas e vegetais em duas refeições.',
    'Reduza as telas 30 minutos antes de deitar.',
    'Organize os próximos dias com calma.',
    'Faça uma pausa consciente no meio do dia.',
    'Faça uma refeição sem distrações.',
    'Caminhe um pouco mais durante o dia.',
    'Inclua proteína em duas refeições.',
    'Crie um ritual relaxante para o sono.',
    'Anote três coisas boas do seu dia.',
    'Troque bebidas açucaradas por água.',
    'Alongue o corpo pela manhã e à noite.',
    'Prepare uma refeição simples em casa.',
    'Deixe seu espaço mais tranquilo e organizado.',
    'Reserve um tempo só para você hoje.',
    'Tenha um lanche saudável à mão.',
    'Faça uma atividade ao ar livre.',
    'Crie uma pequena rotina para começar o dia.',
    'Concentre-se no que realmente importa hoje.',
    'Movimente o corpo por 20 minutos.',
    'Relembre o quanto você já avançou.',
    'Reconheça sua evolução e planeje continuar.'
  ];
begin
  select id into v_challenge from public.challenges where slug = 'jornada-30-dias';

  for i in 1..30 loop
    insert into public.challenge_days (challenge_id, day_number, title, description)
    values (v_challenge, i, 'Dia ' || i || ' — ' || themes[i], descs[i])
    on conflict (challenge_id, day_number) do nothing
    returning id into v_day;

    if v_day is null then
      select id into v_day from public.challenge_days
      where challenge_id = v_challenge and day_number = i;
    end if;

    -- 3 mini-missões por dia (só insere se ainda não houver)
    if not exists (select 1 from public.challenge_missions where challenge_day_id = v_day) then
      insert into public.challenge_missions (challenge_day_id, title, description, icon, xp, sort_order) values
        (v_day, 'Objetivo principal do dia', descs[i], '🎯', 30, 1),
        (v_day, 'Beba água e se hidrate', 'Mantenha-se hidratado hoje.', '💧', 10, 2),
        (v_day, 'Check-in de como você está', 'Registre como se sentiu hoje.', '📊', 10, 3);
    end if;
  end loop;
end $$;
