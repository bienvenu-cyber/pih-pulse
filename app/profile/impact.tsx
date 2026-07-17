import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime } from '../../lib/formatTime';
import {
  formatLevelBadge,
  getLevelProgress,
  REPUTATION_LEVELS,
} from '../../lib/reputation';
import { supabase } from '../../lib/supabase';

type ImpactLog = {
  id: string;
  points_changed: number;
  reason: string | null;
  created_at: string;
};

export default function ImpactHistoryScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [logs, setLogs] = useState<ImpactLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: 'replace' | 'refresh' = 'replace') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('reputation_points').eq('id', user.id).maybeSingle(),
        supabase
          .from('reputation_logs')
          .select('id, points_changed, reason, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(80),
      ]);

      setTotal(profile?.reputation_points ?? 0);
      setLogs((rows as ImpactLog[]) || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    load('replace');
  }, [load]);

  const level = getLevelProgress(total);

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
        <ScreenSkeleton variant="detail" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }} edges={['top']}>
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: colors.border, backgroundColor: colors.nav }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-10 h-10 rounded-full border items-center justify-center"
        >
          <Text style={{ color: colors.text }} className="font-space text-lg">
            ←
          </Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text style={{ color: colors.text }} className="font-space text-base font-bold">
            Historique Élan
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={colors.turmeric}
          />
        }
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
          className="border rounded-3xl p-5 gap-3"
        >
          <View className="flex-row items-center gap-3">
            <View
              style={{ backgroundColor: colors.turmeric + '22' }}
              className="w-12 h-12 rounded-2xl items-center justify-center"
            >
              <TrendingUp size={22} color={colors.turmeric} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                Solde actuel
              </Text>
              <Text style={{ color: colors.text }} className="font-space text-3xl font-bold">
                {total}
              </Text>
            </View>
            <View className="bg-turmeric/15 border border-turmeric/30 px-2.5 py-1 rounded-full">
              <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
                {formatLevelBadge(level.level)}
              </Text>
            </View>
          </View>
          {level.nextLevel ? (
            <View className="gap-1">
              <View style={{ backgroundColor: colors.deep }} className="h-1.5 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${level.progressPercent}%`,
                    backgroundColor: colors.turmeric,
                  }}
                />
              </View>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                {level.pointsToNext} pts → {level.nextLevel.name}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{ color: colors.textSecondary }}
          className="font-inter text-[11px] font-bold uppercase tracking-wider mt-1"
        >
          Paliers
        </Text>
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl overflow-hidden"
        >
          {REPUTATION_LEVELS.map((lv, idx) => {
            const unlocked = total >= lv.minPoints;
            const current = level.level.id === lv.id;
            const range =
              lv.maxPoints === null
                ? `${lv.minPoints}+`
                : `${lv.minPoints}–${lv.maxPoints}`;
            return (
              <View
                key={lv.id}
                className="flex-row items-center px-4 py-3 gap-3"
                style={{
                  borderBottomWidth: idx < REPUTATION_LEVELS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  backgroundColor: current ? colors.turmeric + '12' : 'transparent',
                  opacity: unlocked ? 1 : 0.45,
                }}
              >
                <Text style={{ fontSize: 20 }}>{lv.emoji}</Text>
                <View className="flex-1">
                  <Text
                    style={{ color: current ? colors.turmeric : colors.text }}
                    className="font-space text-[13px] font-bold"
                  >
                    {lv.name}
                    {current ? ' · actuel' : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                    {range} Élan
                  </Text>
                </View>
                <Text
                  style={{ color: unlocked ? colors.kaki : colors.textSecondary }}
                  className="font-inter text-[10px] font-bold"
                >
                  {unlocked ? 'OK' : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        <Text
          style={{ color: colors.textSecondary }}
          className="font-inter text-[11px] font-bold uppercase tracking-wider mt-1"
        >
          Mouvements
        </Text>

        {logs.length === 0 ? (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-6 items-center"
          >
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold mb-1">
              Aucun mouvement
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-xs text-center leading-5"
            >
              Publie un post, rejoins un projet ou complète ton profil pour gagner de l’Élan.
            </Text>
          </View>
        ) : (
          logs.map((log) => {
            const positive = (log.points_changed || 0) >= 0;
            return (
              <View
                key={log.id}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="border rounded-2xl px-4 py-3.5 flex-row items-center gap-3"
              >
                <View
                  className="min-w-[52px] px-2 py-1.5 rounded-xl items-center"
                  style={{
                    backgroundColor: positive ? colors.turmeric + '18' : colors.corail + '18',
                  }}
                >
                  <Text
                    style={{ color: positive ? colors.turmeric : colors.corail }}
                    className="font-space text-[13px] font-bold"
                  >
                    {positive ? '+' : ''}
                    {log.points_changed}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text style={{ color: colors.text }} className="font-inter text-[13px] font-semibold leading-5">
                    {log.reason || 'Mouvement Élan'}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                    {formatRelativeTime(new Date(log.created_at).getTime())}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
