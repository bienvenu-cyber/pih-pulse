-- ============================================================
-- Seed POSTS hub — users / projets déjà seedés
-- Exécuter APRÈS supabase_seeds.sql
-- Images : URLs publiques Unsplash (pas d’upload Storage requis)
-- UUID valides uniquement (hex 0-9a-f — pas de "p" / "n")
-- ============================================================

-- IDs users (seeds existants)
-- Inès  11111111-1111-1111-1111-111111111111
-- Koffi 22222222-2222-2222-2222-222222222222
-- Sena  33333333-3333-3333-3333-333333333333
-- Abdou 44444444-4444-4444-4444-444444444444

-- Projets
-- WapiFood  a1111111-1111-1111-1111-111111111111
-- AgriTrack b2222222-2222-2222-2222-222222222222
-- Edutrack  c3333333-3333-3333-3333-333333333333

-- Posts IDs (préfixe f = feed posts)
-- f1111111 … f8888888

insert into public.posts (id, author_id, title, body, media, project_id, created_at)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', -- Koffi
    null,
    'Premier build WapiFood sur device 🔥 On a branché le flow commande + mock Mobile Money. Qui veut tester ce week-end au PIH ?',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=70",
        "width": 1200,
        "height": 900,
        "mime": "image/jpeg"
      },
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'a1111111-1111-1111-1111-111111111111',
    now() - interval '2 days'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111', -- Inès
    null,
    'Direction artistique WapiFood — palette turmeric / malt validée. Voici le moodboard + écrans home. Feedbacks design bienvenus ✨',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=70",
        "width": 1200,
        "height": 1500,
        "mime": "image/jpeg"
      },
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      },
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=70",
        "width": 1200,
        "height": 1200,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'a1111111-1111-1111-1111-111111111111',
    now() - interval '36 hours'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333', -- Sena
    null,
    'Roadmap Edutrack Q3 : SMS absences + dashboard parents. On recrute un dev backend Node pour l’API notes. Mission ouverte sur le hub 🎯',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'c3333333-3333-3333-3333-333333333333',
    now() - interval '20 hours'
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444', -- Abdoulaye
    null,
    'Tip Postgres : partial indexes sur is_read = false = contenders non-lus ultra rapides. On l’a mis sur messages + activity_notifications pour scaler.',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'c3333333-3333-3333-3333-333333333333',
    now() - interval '12 hours'
  ),
  (
    'f5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111', -- Inès
    null,
    'AgriTrack — wireframes silos + alertes humidité. On part sur un MVP capteurs low-cost. Qui a de l’expérience IoT / Python au PIH ?',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      },
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=70",
        "width": 1200,
        "height": 900,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'b2222222-2222-2222-2222-222222222222',
    now() - interval '8 hours'
  ),
  (
    'f6666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222', -- Koffi
    null,
    'Session code review vendredi 18h au hub. Amenez vos PRs React Native. ☕',
    '[]'::jsonb,
    null,
    now() - interval '5 hours'
  ),
  (
    'f7777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333', -- Sena
    null,
    'Photo de l’équipe après le demo day PIH. Fiers de la communauté builders 🚀',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      },
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    null,
    now() - interval '3 hours'
  ),
  (
    'f8888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444', -- Abdoulaye
    null,
    'Schema Edutrack v2 — parents, notes, absences. Review SQL welcome.',
    '[
      {
        "type": "image",
        "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80",
        "thumbUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=70",
        "width": 1200,
        "height": 800,
        "mime": "image/jpeg"
      }
    ]'::jsonb,
    'c3333333-3333-3333-3333-333333333333',
    now() - interval '90 minutes'
  )
on conflict (id) do update set
  body = excluded.body,
  media = excluded.media,
  project_id = excluded.project_id,
  title = null;

-- Notifs seed (inbox de démo) — IDs fa… (hex valides)
insert into public.activity_notifications (id, user_id, actor_id, type, title, body, route, ref_id, ref_type, is_read, created_at)
values
  (
    'fa111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'reaction_received',
    'Hot',
    'Inès a réagi « Hot » sur ton post WapiFood.',
    '/post/f1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'post',
    false,
    now() - interval '1 hour'
  ),
  (
    'fa222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'boost_received',
    'Nouveau boost ⚡',
    'Sena a boosté ton post dans le feed.',
    '/post/f1111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'post',
    false,
    now() - interval '45 minutes'
  ),
  (
    'fa333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'reply_received',
    'Nouveau commentaire',
    'Koffi a répondu sous ton moodboard WapiFood.',
    '/post/f2222222-2222-2222-2222-222222222222',
    'f2222222-2222-2222-2222-222222222222',
    'post',
    false,
    now() - interval '30 minutes'
  ),
  (
    'fa444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'project_joined',
    'Nouveau membre',
    'Abdoulaye a rejoint Edutrack.',
    '/project/c3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'project',
    true,
    now() - interval '2 hours'
  ),
  (
    'fa555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'project_invite',
    'Invitation projet',
    'Koffi t’invite à rejoindre une mission WapiFood.',
    '/project/a1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'project',
    false,
    now() - interval '15 minutes'
  )
on conflict (id) do nothing;

-- Réactions seed
insert into public.reactions (user_id, ref_id, ref_type, type)
values
  ('11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'post', 'hot'),
  ('33333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'post', 'ship'),
  ('44444444-4444-4444-4444-444444444444', 'f2222222-2222-2222-2222-222222222222', 'post', 'idea'),
  ('22222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'post', 'hot')
on conflict do nothing;

insert into public.boosts (user_id, ref_id, ref_type)
values
  ('33333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'post'),
  ('44444444-4444-4444-4444-444444444444', 'f5555555-5555-5555-5555-555555555555', 'post')
on conflict do nothing;
