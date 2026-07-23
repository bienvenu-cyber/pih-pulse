import { useRouter } from 'expo-router';
import { Bell, Check, FileText, Globe } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import PressableScale from '../../components/ui/PressableScale';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { haptic } from '../../lib/haptics';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
} from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

type Locale = 'fr' | 'en';

export default function ProfileSettingsScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>('fr');
  const [perm, setPerm] = useState<string>('undetermined');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('push_enabled, preferred_locale, expo_push_token')
        .eq('id', user.id)
        .maybeSingle();
      // Préférence seule — ON par défaut même sans token
      setPushOn(data?.push_enabled !== false);
      if (data?.preferred_locale === 'en' || data?.preferred_locale === 'fr') {
        setLocale(data.preferred_locale);
      }
      setPerm(await getPushPermissionStatus());
      setLoading(false);
    })();
  }, [router]);

  const togglePush = async (next: boolean) => {
    if (!userId || pushBusy) return;
    void haptic('light');
    setPushBusy(true);
    setMsg('');
    setPushOn(next);
    try {
      if (next) {
        const res = await enablePushNotifications(userId);
        if (!res.ok) {
          setPushOn(false);
          setMsg('Impossible d’enregistrer la préférence.');
        } else if (res.reason === 'no_token' || res.reason === 'web') {
          setMsg(
            'Notifications activées (in-app). Push natif : device physique + permission.'
          );
        } else {
          setMsg('Notifications push activées.');
        }
      } else {
        await disablePushNotifications(userId);
        setMsg('Notifications désactivées.');
      }
      setPerm(await getPushPermissionStatus());
    } finally {
      setPushBusy(false);
    }
  };

  const setLocalePref = async (loc: Locale) => {
    if (!userId) return;
    void haptic('light');
    setLocale(loc);
    const { persistLocale } = await import('../../lib/i18n');
    await persistLocale(loc);
    await supabase
      .from('profiles')
      .update({ preferred_locale: loc })
      .eq('id', userId);
    setMsg(
      loc === 'fr'
        ? 'Langue : Français (préférence enregistrée — UI progressive)'
        : 'Language: English (saved — progressive UI)'
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
        <ScreenSkeleton variant="form" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader title="Préférences" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {msg ? (
          <Text style={{ color: colors.kaki }} className="font-inter text-xs px-1">
            {msg}
          </Text>
        ) : null}

        <SoftSurface className="p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <Bell size={16} color={colors.turmeric} />
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
              Notifications push
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] leading-5">
            Permission système :{' '}
            <Text style={{ color: colors.text }} className="font-semibold">
              {perm}
            </Text>
            . Les interrupteurs détaillés (dispo, présence, notifs, rappels) sont sur l’onglet
            Profil → Contrôles.
          </Text>
          <View className="flex-row items-center justify-between pt-1">
            <Text style={{ color: colors.text }} className="font-inter text-[13px]">
              Push global
            </Text>
            {pushBusy ? (
              <ActivityIndicator color={colors.turmeric} />
            ) : (
              <Switch
                value={pushOn}
                onValueChange={togglePush}
                trackColor={{ false: colors.border, true: colors.kaki }}
                thumbColor={pushOn ? '#F5EDD6' : colors.textSecondary}
              />
            )}
          </View>
        </SoftSurface>

        <SoftSurface className="p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <Globe size={16} color={colors.turmeric} />
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
              Langue
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] leading-5">
            FR / EN via lib/i18n (clés progressives). Préférence aussi stockée en local et sur le
            profil.
          </Text>
          <View className="flex-row gap-2 pt-1">
            {(
              [
                { id: 'fr' as const, label: 'Français' },
                { id: 'en' as const, label: 'English' },
              ] as const
            ).map((l) => {
              const on = locale === l.id;
              return (
                <PressableScale
                  key={l.id}
                  onPress={() => setLocalePref(l.id)}
                  style={{
                    backgroundColor: on ? colors.turmeric : colors.deep,
                    borderColor: on ? colors.turmeric : colors.border,
                  }}
                  className="flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5"
                >
                  {on ? <Check size={12} color={colors.onTurmeric} /> : null}
                  <Text
                    style={{ color: on ? colors.onTurmeric : colors.textSecondary }}
                    className="font-inter text-xs font-bold"
                  >
                    {l.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </SoftSurface>

        <PressableScale
          onPress={() => {
            void haptic('light');
            router.push('/legal/privacy');
          }}
        >
          <SoftSurface className="p-4 flex-row items-center gap-3">
            <FileText size={16} color={colors.turmeric} />
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                Confidentialité
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                Politique de données & droits (in-app)
              </Text>
            </View>
          </SoftSurface>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}
