import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import KeyboardSafe from '../../components/ui/KeyboardSafe';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import PressableScale from '../../components/ui/PressableScale';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { haptic } from '../../lib/haptics';
import { tryGrantProfileCompleteBonus } from '../../lib/hub';
import { supabase } from '../../lib/supabase';

const FIELDS = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'figma', label: 'Figma', placeholder: 'https://figma.com/…' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { key: 'website', label: 'Site / portfolio', placeholder: 'https://…' },
] as const;

export default function ProfilePortfolioScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({
    github: '',
    figma: '',
    linkedin: '',
    website: '',
  });

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
        .select('portfolio')
        .eq('id', user.id)
        .single();
      const p = data?.portfolio || {};
      setValues({
        github: p.github || '',
        figma: p.figma || '',
        linkedin: p.linkedin || '',
        website: p.website || '',
      });
      setLoading(false);
    })();
  }, [router]);

  const save = async () => {
    if (!userId) return;
    void haptic('medium');
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const portfolio = {
        github: values.github.trim() || null,
        figma: values.figma.trim() || null,
        linkedin: values.linkedin.trim() || null,
        website: values.website.trim() || null,
      };
      const { error: err } = await supabase
        .from('profiles')
        .update({ portfolio, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (err) throw err;
      const bonus = await tryGrantProfileCompleteBonus(userId);
      void haptic('success');
      setMsg(bonus ? 'Portfolio OK · +20 Élan profil complet !' : 'Portfolio enregistré');
      setTimeout(() => router.back(), 700);
    } catch (e: any) {
      void haptic('light');
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ScreenSkeleton variant="detail" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader title="Portfolio" onBack={() => router.back()} />
      <KeyboardSafe className="flex-1" offset={0}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5 mb-1 px-1">
            Ces liens aident les leads à évaluer ton profil (matching talent ↔ projets).
          </Text>

          {error ? <Text className="text-corail font-inter text-xs px-1">{error}</Text> : null}
          {msg ? (
            <Text style={{ color: colors.kaki }} className="font-inter text-xs px-1">
              {msg}
            </Text>
          ) : null}

          {FIELDS.map((f) => (
            <View key={f.key} className="gap-1.5">
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[10px] uppercase font-bold px-1"
              >
                {f.label}
              </Text>
              <SoftSurface className="px-3 h-11 flex-row items-center">
                <TextInput
                  value={values[f.key]}
                  onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ color: colors.text, flex: 1 }}
                  className="font-inter text-sm h-full"
                />
                {values[f.key] ? (
                  <PressableScale
                    onPress={() => {
                      void haptic('light');
                      const u = values[f.key];
                      Linking.openURL(u.startsWith('http') ? u : `https://${u}`);
                    }}
                  >
                    <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
                      Ouvrir
                    </Text>
                  </PressableScale>
                ) : null}
              </SoftSurface>
            </View>
          ))}

          <PressableScale
            onPress={save}
            disabled={saving}
            className="bg-turmeric h-12 rounded-2xl items-center justify-center mt-3"
          >
            {saving ? (
              <ActivityIndicator color="#0D0B05" />
            ) : (
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Enregistrer</Text>
            )}
          </PressableScale>
        </ScrollView>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
