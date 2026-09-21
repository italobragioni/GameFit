-- ==================================================================
-- Projeto Leve — 0004 missões com foco em emagrecimento saudável
-- Idempotente (não duplica se rodar de novo). Sem metas extremas,
-- sem prescrição de dieta — apenas hábitos seguros.
-- ==================================================================

insert into public.missions (title, description, category, xp, difficulty, icon, is_premium, sort_order)
select v.title, v.description, v.category::mission_category, v.xp, v.difficulty::mission_difficulty, v.icon, v.is_premium, v.sort_order
from (values
  ('Registrar seu peso hoje', 'Acompanhe sua evolução no seu ritmo.', 'outros', 20, 'media', '⚖️', false, 100),
  ('Comer devagar e mastigar bem', 'Comer com calma ajuda a sentir saciedade.', 'alimentacao', 20, 'media', '🍽️', false, 101),
  ('Incluir vegetais em 2 refeições', 'Mais volume e nutrientes com menos calorias.', 'alimentacao', 30, 'importante', '🥦', true, 102),
  ('Fazer refeições em horários definidos', 'Uma rotina que ajuda a evitar exageros.', 'alimentacao', 20, 'media', '⏰', true, 103),
  ('Trocar bebida açucarada por água', 'Menos açúcar líquido no seu dia.', 'hidratacao', 20, 'media', '🥤', false, 104),
  ('Comer uma fruta no lugar de um doce', 'Uma troca simples e gostosa.', 'alimentacao', 20, 'media', '🍎', true, 105),
  ('Caminhar 30 minutos', 'Movimento constante faz diferença.', 'movimento', 30, 'importante', '🚶', false, 106),
  ('Fazer um treino de 15 minutos', 'Curto, mas conta muito.', 'movimento', 30, 'importante', '🏋️', true, 107),
  ('Montar um prato equilibrado', 'Proteína, vegetais e um carboidrato de qualidade.', 'alimentacao', 30, 'importante', '🍱', true, 108),
  ('Dormir de 7 a 8 horas', 'Sono de qualidade apoia o emagrecimento.', 'sono', 20, 'media', '😴', true, 109),
  ('Planejar as refeições do dia seguinte', 'Planejar ajuda a fazer boas escolhas.', 'organizacao', 20, 'media', '📝', true, 110),
  ('Fazer uma pausa antes de repetir o prato', 'Dê tempo ao corpo de sinalizar saciedade.', 'mindfulness', 20, 'media', '⏸️', true, 111)
) as v(title, description, category, xp, difficulty, icon, is_premium, sort_order)
where not exists (select 1 from public.missions m where m.title = v.title);
