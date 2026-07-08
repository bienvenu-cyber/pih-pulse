-- Seed Data for PIH Pulse
-- Execute this script in your Supabase SQL Editor to populate test profiles, projects, and missions.

-- 1. Create mock users in auth.users (this triggers public.profiles creation)
-- Passwords are set to 'password123' (hashed)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'ines@pulse.com', '$2a$10$w850Xk4aC21v6g8oRz8K0.5r12a1v1a1v1a1v1a1v1a1v1a1v1a1v', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Inès Lawani","username":"ines_law"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'koffi@pulse.com', '$2a$10$w850Xk4aC21v6g8oRz8K0.5r12a1v1a1v1a1v1a1v1a1v1a1v1a1v', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Koffi Attignon","username":"koffi_att"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'sena@pulse.com', '$2a$10$w850Xk4aC21v6g8oRz8K0.5r12a1v1a1v1a1v1a1v1a1v1a1v1a1v', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sena Ousmane","username":"sena_o"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'abdoulaye@pulse.com', '$2a$10$w850Xk4aC21v6g8oRz8K0.5r12a1v1a1v1a1v1a1v1a1v1a1v1a1v', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Abdoulaye Diallo","username":"abdou_d"}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Update public.profiles with complete bio, skills, and correct roles
UPDATE public.profiles SET
  role = 'designer',
  bio = 'Designer passionnée par la création d’interfaces mobiles intuitives et élégantes. J’accompagne les projets du Parakou Innovation Hub (PIH) de l’idée au prototype.',
  skills = ARRAY['Figma', 'UI Design', 'UX Research', 'Branding'],
  reputation_points = 240
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles SET
  role = 'developer',
  bio = 'Développeur passionné de Javascript et de plateformes Cloud. J’adore coder des API robustes sur Node/Supabase et concevoir des applications sur React Native.',
  skills = ARRAY['React Native', 'TypeScript', 'Node.js', 'Supabase'],
  reputation_points = 380
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE public.profiles SET
  role = 'product_creator',
  bio = 'Product Manager et Agile Coach. J’aide les équipes à structurer leur roadmap produit et à prioriser les tâches de développement pour livrer vite.',
  skills = ARRAY['Agile', 'Scrum', 'Gestion de Projet'],
  reputation_points = 150
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE public.profiles SET
  role = 'developer',
  bio = 'Ingénieur base de données et développeur système. Spécialisé dans l’optimisation des requêtes SQL et l’infrastructure backend distribuée.',
  skills = ARRAY['PostgreSQL', 'Docker', 'Python', 'API REST'],
  reputation_points = 290
WHERE id = '44444444-4444-4444-4444-444444444444';


-- 3. Create Projects
INSERT INTO public.projects (id, name, short_description, description, creator_id, status, skills_needed)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111', 
    'WapiFood', 
    'Application de livraison de repas locaux par Mobile Money.', 
    'WapiFood est une plateforme de livraison ultra-rapide qui permet aux habitants de Parakou de commander leurs repas préférés dans les restaurants locaux et de payer directement par MTN Mobile Money ou Moov Money.', 
    '22222222-2222-2222-2222-222222222222', -- Koffi
    'mvp', 
    ARRAY['React Native', 'Supabase', 'UI Design', 'API REST']
  ),
  (
    'b2222222-2222-2222-2222-222222222222', 
    'AgriTrack', 
    'Plateforme IoT et mobile de suivi des récoltes et des stocks.', 
    'AgriTrack aide les coopératives agricoles de Parakou à suivre en temps réel la température et l’humidité des silos de stockage grâce à des capteurs IoT connectés à une application mobile.', 
    '11111111-1111-1111-1111-111111111111', -- Inès
    'idea', 
    ARRAY['Python', 'IoT', 'TypeScript']
  ),
  (
    'c3333333-3333-3333-3333-333333333333', 
    'Edutrack', 
    'Solution de suivi académique en temps réel pour parents d’élèves.', 
    'Edutrack est un service SMS et mobile permettant aux parents d’élèves des collèges de Parakou de suivre quotidiennement les absences, les notes et les devoirs de leurs enfants.', 
    '33333333-3333-3333-3333-333333333333', -- Sena
    'prototype', 
    ARRAY['React', 'Node.js', 'PostgreSQL']
  )
ON CONFLICT (id) DO NOTHING;


-- 4. Create Project Members
INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Lead Dev & Founder'),
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'UI/UX Designer'),
  ('a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Product Owner'),
  ('b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Founder & Designer'),
  ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Founder & PO'),
  ('c3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Backend Dev'),
  ('c3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Database Engineer')
ON CONFLICT DO NOTHING;


-- 5. Create Missions
INSERT INTO public.missions (id, project_id, title, description, difficulty, points_reward, skills_required, status, assignee_id)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111', -- WapiFood
    'Intégrer les paiements Mobile Money (MTN / Moov)',
    'Nous recherchons un développeur backend ou fullstack pour intégrer l’API de paiement MTN Mobile Money (MoMo API) et Moov Money dans notre serveur Node.js.',
    'hard',
    120,
    ARRAY['Node.js', 'API REST', 'MTN MoMo API', 'Supabase'],
    'open',
    null
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111', -- WapiFood
    'Créer la charte graphique & Logo de l’application',
    'Conception de l’identité visuelle complète de WapiFood. Il s’agit de concevoir le logo et de créer un mini design system sur Figma.',
    'medium',
    50,
    ARRAY['Figma', 'UI Design', 'Branding'],
    'in_progress',
    '11111111-1111-1111-1111-111111111111' -- Inès
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222', -- AgriTrack
    'Rédiger le pitch commercial de la landing page',
    'Rédaction du contenu textuel de la page d’accueil d’AgriTrack. Le texte doit expliquer de manière simple et percutante la valeur aux agriculteurs.',
    'easy',
    30,
    ARRAY['Copywriting', 'Marketing', 'Communication'],
    'open',
    null
  ),
  (
    '04444444-4444-4444-4444-444444444444',
    'c3333333-3333-3333-3333-333333333333', -- Edutrack
    'Créer l’API d’authentification avec Supabase Auth',
    'Mise en place du flux complet de connexion et d’inscription sécurisé dans l’application Edutrack avec Supabase Auth (Email + OTP).',
    'medium',
    80,
    ARRAY['Supabase', 'TypeScript', 'Auth OTP', 'React Native'],
    'open',
    null
  )
ON CONFLICT (id) DO NOTHING;
