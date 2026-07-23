import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, MapPin } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import EmptyState from '../../components/ui/EmptyState';
import SoftSurface from '../../components/ui/SoftSurface';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime } from '../../lib/formatTime';
import { supabase } from '../../lib/supabase';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError('Événement introuvable.');
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('hub_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (err || !data) {
        setError('Événement introuvable ou non disponible.');
        setEvent(null);
      } else {
        setEvent(data);
        setError(null);
      }
    } catch {
      setError('Impossible de charger l’événement.');
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
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ThemedStackHeader title="Événement" onBack={() => router.back()} />
        <View className="px-4 pt-8">
          <EmptyState
            icon={Calendar}
            title="Introuvable"
            description={error || 'Cet événement n’existe pas.'}
            actionLabel="Retour au feed"
            onAction={() => router.replace('/(tabs)')}
          />
        </View>
      </View>
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
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader
        title="Événement"
        subtitle={formatRelativeTime(event.created_at)}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} className="flex-1">
        <SoftSurface variant="card" className="p-5 gap-3 mb-4">
          <View
            className="self-start px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.corail + '22' }}
          >
            <Text
              style={{ color: colors.corail }}
              className="font-inter text-[10px] font-bold uppercase"
            >
              Événement
            </Text>
          </View>
          <Text style={{ color: colors.text }} className="font-space text-[22px] font-bold leading-7">
            {event.title}
          </Text>
          {event.description ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px] leading-5">
              {event.description}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-1">
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs flex-1">
              {startsLabel}
              {endsLabel ? ` → ${endsLabel}` : ''}
            </Text>
          </View>
          {event.location ? (
            <View className="flex-row items-center gap-2">
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                {event.location}
              </Text>
            </View>
          ) : null}
        </SoftSurface>

        <SoftSurface variant="card" className="p-4 gap-2">
          <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
            Participation
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5">
            Les inscriptions en ligne arriveront bientôt. Pour l’instant, contacte l’organisateur ou
            le hub.
          </Text>
        </SoftSurface>
      </ScrollView>
    </View>
  );
}
