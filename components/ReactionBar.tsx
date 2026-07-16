/**
 * Barre de réactions — UX type Insta / YouTube :
 * - optimistic (instantané, pas de loader)
 * - micro-scale au tap (prêt pour animations plus riches plus tard)
 * - rollback si l’API échoue
 */
import { Flame, Lightbulb, Rocket, Wrench, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import WorldCupBallIcon from './WorldCupBallBurst';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { REACTION_META } from '../lib/impact';
import {
  fetchReactions,
  toggleBoost,
  toggleReaction,
  type ReactionCounts,
  type ReactionType,
  type RefType,
} from '../lib/reactions';
import { supabase } from '../lib/supabase';

/** Easter egg World Cup branché sur « Ship it » 🚀 */
const WORLD_CUP_REACTION: ReactionType = 'ship';

interface ReactionBarProps {
  refId: string;
  refType: RefType;
  /** Afficher 💡 Bonne idée (projets early / posts) */
  showIdea?: boolean;
  /** Compteurs préchargés (batch listes) — évite N requêtes */
  initialCounts?: ReactionCounts | null;
}

const ICONS: Record<ReactionType, typeof Flame> = {
  idea: Lightbulb,
  hot: Flame,
  ship: Rocket,
  contribute: Wrench,
};

const ACTIVE_COLORS: Record<ReactionType, string> = {
  idea: '#FFBE0B',
  hot: '#E8634A',
  ship: '#7CB87A',
  contribute: '#A39171',
};

const EMPTY: ReactionCounts = {
  hot: 0,
  idea: 0,
  ship: 0,
  contribute: 0,
  boosts: 0,
  userReactions: [],
  userBoosted: false,
};

function countKey(type: ReactionType): keyof Pick<
  ReactionCounts,
  'idea' | 'hot' | 'ship' | 'contribute'
> {
  return type;
}

function applyOptimisticReaction(
  prev: ReactionCounts,
  type: ReactionType
): ReactionCounts {
  const active = prev.userReactions.includes(type);
  const key = countKey(type);
  const nextCount = Math.max(0, (prev[key] as number) + (active ? -1 : 1));
  return {
    ...prev,
    [key]: nextCount,
    userReactions: active
      ? prev.userReactions.filter((t) => t !== type)
      : [...prev.userReactions, type],
  };
}

function applyOptimisticBoost(prev: ReactionCounts): ReactionCounts {
  const on = prev.userBoosted;
  return {
    ...prev,
    userBoosted: !on,
    boosts: Math.max(0, prev.boosts + (on ? -1 : 1)),
  };
}

/** Icône avec pop scale (YouTube/Insta-like) */
function PopIcon({
  children,
  popToken,
}: {
  children: ReactNode;
  popToken: number;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (popToken <= 0) return;
    scale.value = withSequence(
      withSpring(1.28, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 14, stiffness: 280 })
    );
  }, [popToken, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function ReactionBar({
  refId,
  refType,
  showIdea = true,
  initialCounts = null,
}: ReactionBarProps) {
  const { colors } = useThemeFlavor();
  const [userId, setUserId] = useState<string | null>(null);
  const [counts, setCounts] = useState<ReactionCounts>(
    initialCounts ? { ...initialCounts, userReactions: [...initialCounts.userReactions] } : EMPTY
  );
  const [hint, setHint] = useState('');
  const [pop, setPop] = useState<Record<string, number>>({});
  const [ballTrigger, setBallTrigger] = useState(0);
  /** Pendant l’anim ballon, on masque la fusée ; ensuite on la réaffiche active */
  const [shipBallPlaying, setShipBallPlaying] = useState(false);

  /** Verrou silencieux anti double-tap (pas de spinner) */
  const pendingRef = useRef<Set<string>>(new Set());
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const seededRef = useRef(!!initialCounts);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Sync batch initial (listes)
  useEffect(() => {
    if (!initialCounts) return;
    if (pendingRef.current.size > 0) return;
    setCounts({
      ...initialCounts,
      userReactions: [...initialCounts.userReactions],
    });
    seededRef.current = true;
  }, [initialCounts]);

  const loadCounts = useCallback(async () => {
    if (!refId) return;
    const data = await fetchReactions(refId, refType, userId);
    // Ne pas écraser pendant un pending (évite flash)
    if (pendingRef.current.size > 0) return;
    setCounts(data);
  }, [refId, refType, userId]);

  useEffect(() => {
    if (!refId) return;
    // Skip fetch initial si batch déjà fourni
    if (seededRef.current && initialCounts) return;
    loadCounts();
  }, [refId, userId, loadCounts, initialCounts]);

  const bumpPop = (key: string) => {
    setPop((p) => ({ ...p, [key]: (p[key] || 0) + 1 }));
  };

  const types: ReactionType[] = showIdea
    ? ['idea', 'hot', 'ship', 'contribute']
    : ['hot', 'ship', 'contribute'];

  const onReact = (type: ReactionType, e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (!userId) return;
    if (pendingRef.current.has(type)) return;

    setHint('');
    const snapshot = countsRef.current;
    const wasActive = snapshot.userReactions.includes(type);
    const optimistic = applyOptimisticReaction(snapshot, type);
    setCounts(optimistic);
    bumpPop(type);
    pendingRef.current.add(type);

    // World Cup : ballon sur l’icône UNIQUEMENT à l’activation (pas un-ship)
    if (type === WORLD_CUP_REACTION && !wasActive) {
      setShipBallPlaying(true);
      setBallTrigger((n) => n + 1);
    }

    // Fire-and-forget : UI déjà à jour, sync serveur en arrière-plan
    void (async () => {
      try {
        const result = await toggleReaction(refId, refType, type, userId);
        if (typeof result === 'object' && 'error' in result) {
          setCounts(snapshot);
          setHint(result.error);
          return;
        }
        // Reconcile silencieux si plus aucune action en vol
        const fresh = await fetchReactions(refId, refType, userId);
        pendingRef.current.delete(type);
        if (pendingRef.current.size === 0) {
          setCounts(fresh);
        }
      } catch {
        setCounts(snapshot);
        setHint('Action impossible. Réessaie.');
      } finally {
        pendingRef.current.delete(type);
      }
    })();
  };

  const onBoost = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (!userId) return;
    if (pendingRef.current.has('boost')) return;

    setHint('');
    const snapshot = countsRef.current;
    setCounts(applyOptimisticBoost(snapshot));
    bumpPop('boost');
    pendingRef.current.add('boost');

    void (async () => {
      try {
        await toggleBoost(refId, refType, userId);
        const fresh = await fetchReactions(refId, refType, userId);
        pendingRef.current.delete('boost');
        if (pendingRef.current.size === 0) {
          setCounts(fresh);
        }
      } catch {
        setCounts(snapshot);
        setHint('Boost impossible. Réessaie.');
        pendingRef.current.delete('boost');
      } finally {
        pendingRef.current.delete('boost');
      }
    })();
  };

  const muted = colors.textSecondary;
  const formatCount = (n: number) => {
    if (n <= 0) return '';
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
  };

  return (
    <View className="gap-0.5">
      <View className="flex-row items-center justify-between pt-0.5">
        <View className="flex-row items-center flex-wrap" style={{ gap: 0 }}>
          {types.map((type) => {
            const active = counts.userReactions.includes(type);
            const count = counts[countKey(type)] as number;
            const Icon = ICONS[type];
            const activeColor = ACTIVE_COLORS[type];
            const meta = REACTION_META[type];
            const isShip = type === WORLD_CUP_REACTION;
            // Fusée visible sauf pendant le ballon ; après anim → état actif clair
            const hideRocket = isShip && shipBallPlaying;

            return (
              <Pressable
                key={type}
                onPress={(ev) => onReact(type, ev as any)}
                disabled={!userId}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  isShip ? `${meta.label} · World Cup` : meta.label
                }
                accessibilityState={{ selected: active }}
                className="flex-row items-center px-2 py-1.5 rounded-lg"
                style={{
                  backgroundColor: active ? activeColor + '18' : 'transparent',
                }}
              >
                <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <PopIcon popToken={pop[type] || 0}>
                    <Icon
                      size={18}
                      color={active ? activeColor : muted}
                      fill={active ? activeColor : 'transparent'}
                      strokeWidth={active ? 2.2 : 1.8}
                      style={{ opacity: hideRocket ? 0 : 1 }}
                    />
                  </PopIcon>
                  {isShip ? (
                    <WorldCupBallIcon
                      trigger={ballTrigger}
                      onDone={() => setShipBallPlaying(false)}
                    />
                  ) : null}
                </View>
                {count > 0 ? (
                  <Text
                    className="font-inter text-[11px] font-semibold ml-1"
                    style={{ color: active ? activeColor : muted }}
                  >
                    {formatCount(count)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={(ev) => onBoost(ev as any)}
          disabled={!userId}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Boost"
          accessibilityState={{ selected: counts.userBoosted }}
          className="flex-row items-center px-2.5 py-2 rounded-lg"
          style={{
            backgroundColor: counts.userBoosted
              ? 'rgba(124, 184, 122, 0.12)'
              : 'transparent',
          }}
        >
          <PopIcon popToken={pop.boost || 0}>
            <Zap
              size={18}
              color={counts.userBoosted ? colors.kaki : muted}
              fill={counts.userBoosted ? colors.kaki : 'transparent'}
              strokeWidth={counts.userBoosted ? 2.2 : 1.8}
            />
          </PopIcon>
          {counts.boosts > 0 ? (
            <Text
              className="font-inter text-xs font-semibold ml-1.5"
              style={{ color: counts.userBoosted ? colors.kaki : muted }}
            >
              {formatCount(counts.boosts)}
            </Text>
          ) : null}
        </Pressable>
      </View>

      {hint ? (
        <Text
          style={{ color: colors.turmeric }}
          className="font-inter text-[10px] leading-4 px-1"
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
