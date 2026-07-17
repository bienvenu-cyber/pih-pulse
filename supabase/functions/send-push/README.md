# Edge Function `send-push`

Envoie des push Expo **côté serveur** (scale S1).

## Deploy

```bash
# depuis la racine du repo, projet Supabase lié
npx supabase login
npx supabase link --project-ref <YOUR_REF>
npx supabase functions deploy send-push
```

Les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

## Appel client

```ts
await supabase.functions.invoke('send-push', {
  body: {
    userIds: ['uuid-…'],
    title: 'Nouveau message',
    body: '…',
    data: { route: '/chat/…' },
  },
});
```

`lib/activity.ts` appelle cette function avec **fallback** vers le push client si non déployée.
