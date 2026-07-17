/**
 * Fiche événement hub (hub_events) — détail minimal.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/ui/EmptyState';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import { supabase } from '../../lib/supabase';

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function EventDetailScreen() {
  const { colors } = useThemeFlavor();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('hub_events')
        .select(
          `
          id, title, description, location, starts_at, ends_at, created_at, created_by,
          creator:profiles!created_by(id, full_name, role, avatar_url)
        `
        )
        .eq('id', id)
        .single();

      if (err || !data) {
        setEvent(null);
        setError('Événement introuvable ou non disponible.');
        return;
      }

      const creator = pickProfile(data.creator);
      setEvent({
        ...data,
        creatorName: creator?.full_name || 'PIH Pulse',
        creatorRole: formatRoleLabel(creator?.role),
        creatorId: creator?.id || data.created_by,
      });
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement');
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ScreenSkeleton variant="detail" />
      </View>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
        <View
          style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
          className="h-14 flex-row items-center px-4 border-b gap-3"
        >
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-10 h-10 rounded-full border items-center justify-center"
          >
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text }} className="font-space text-base font-bold">
            Événement
          </Text>
        </View>
        <View className="px-4 pt-8">
          <EmptyState
            icon={Calendar}
            title="Introuvable"
            description={error || 'Cet événement n’existe pas.'}
            actionLabel="Retour au feed"
            onAction={() => router.replace('/(tabs)')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const startsLabel = event.starts_at
    ? new Date(event.starts_at).toLocaleString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date à confirmer';

  const endsLabel = event.ends_at
    ? new Date(event.ends_at).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <View
        style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
        className="h-14 flex-row items-center px-4 border-b gap-3"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-10 h-10 rounded-full border items-center justify-center"
        >
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="font-space text-base font-bold" numberOfLines={1}>
            Événement
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
            {formatRelativeTime(event.created_at)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} className="flex-1">
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-3 mb-4"
        >
          <View className="self-start px-2.5 py-1 rounded-full" style={{ backgroundColor: colors.corail + '22' }}>
            <Text style={{ color: colors.corail }} className="font-inter text-[10px] font-bold uppercase">
              Événement
            </Text>
          </View>
          <Text style={{ color: colors.text }} className="font-space text-[22px] font-bold leading-7">
            {event.title}
          </Text>
          {event.description ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[14px] leading-6">
              {event.description}
            </Text>
          ) : null}
        </View>

        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-4 mb-4"
        >
          <View className="flex-row items-start gap-3">
            <Calendar size={18} color={colors.turmeric} />
            <View className="flex-1">
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold uppercase">
                Quand
              </Text>
              <Text style={{ color: colors.text }} className="font-inter text-sm font-semibold mt-0.5">
                {startsLabel}
              </Text>
              {endsLabel ? (
                <Text style={{ color: colors.textSecondary }} className="font-inter text-xs mt-0.5">
                  Fin · {endsLabel}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row items-start gap-3">
            <MapPin size={18} color={colors.textSecondary} />
            <View className="flex-1">
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold uppercase">
                Où
              </Text>
              <Text style={{ color: colors.text }} className="font-inter text-sm font-semibold mt-0.5">
                {event.location || 'Parakou · PIH'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-start gap-3">
            <Users size={18} color={colors.textSecondary} />
            <View className="flex-1">
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold uppercase">
                Organisé par
              </Text>
              <Pressable
                onPress={() =>
                  event.creatorId ? router.push(`/profile/${event.creatorId}`) : undefined
                }
                disabled={!event.creatorId}
              >
                <Text style={{ color: colors.turmeric }} className="font-inter text-sm font-semibold mt-0.5">
                  {event.creatorName}
                  {event.creatorRole ? ` · ${event.creatorRole}` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] text-center leading-5 px-4">
          Les inscriptions en ligne arriveront bientôt. Pour l’instant, contacte l’organisateur ou le
          PIH pour participer.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
