-- Migration: Add expo_push_token to profiles
-- Date: 2026-07-08

alter table public.profiles add column expo_push_token text;
