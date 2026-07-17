/**
 * AuthGuard — redirige vers /login si pas de session.
 * Usage : const { ready, userId } = useRequireAuth();
 * if (!ready) return <Loader />;
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRequireAuth(opts?: { redirectTo?: string }) {
  const router = useRouter();
  const redirectTo = opts?.redirectTo || '/login';
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        router.replace(redirectTo as any);
        return;
      }
      setUserId(session.user.id);
      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setReady(false);
        setUserId(null);
        router.replace(redirectTo as any);
      } else if (session.user) {
        setUserId(session.user.id);
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  return { ready, userId };
}
