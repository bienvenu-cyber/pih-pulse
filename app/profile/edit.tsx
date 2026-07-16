import { useRouter } from 'expo-router';
import { Camera, Save, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  ChipSelect,
  FormAlert,
  FormField,
  FormMultiline,
  FormScreen,
  FormSection,
  ImpactBanner,
  PrimaryButton,
} from '../../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { tryGrantProfileCompleteBonus } from '../../lib/hub';
import {
  getProfileCompleteness,
  IMPACT_POINTS,
} from '../../lib/impact';
import { pickAndUploadAvatar } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const SKILLS = [
  'React Native',
  'TypeScript',
  'Node.js',
  'Supabase',
  'Figma',
  'UI/UX',
  'Python',
  'Marketing',
  'Product',
  'Mobile Money',
].map((s) => ({ id: s, label: s }));

export default function ProfileEditScreen() {
  const router = useRouter();
  const { colors } = useThemeFlavor();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Record<string, string | null>>({});
  const [bonusClaimed, setBonusClaimed] = useState(false);

  const initials =
    fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const handleAvatar = async () => {
    if (!userId || avatarBusy) return;
    setAvatarBusy(true);
    setError('');
    try {
      const url = await pickAndUploadAvatar(userId);
      const { error: err } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (err) throw err;
      setAvatarUrl(url);
      const bonus = await tryGrantProfileCompleteBonus(userId);
      if (bonus) setBonusClaimed(true);
      setMsg(bonus ? `Photo mise à jour · +${IMPACT_POINTS.profileComplete} Impact !` : 'Photo mise à jour');
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') setError(e?.message || 'Upload avatar impossible');
    } finally {
      setAvatarBusy(false);
    }
  };

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
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setPhone(data.phone || '');
        setSkills(data.skills || []);
        setAvatarUrl(data.avatar_url || null);
        setPortfolio(
          data.portfolio && typeof data.portfolio === 'object' ? data.portfolio : {}
        );
        setBonusClaimed(!!data.impact_profile_bonus);
      }
      setLoading(false);
    })();
  }, [router]);

  const liveCompleteness = getProfileCompleteness({
    full_name: fullName,
    bio,
    avatar_url: avatarUrl,
    skills,
    portfolio,
    impact_profile_bonus: bonusClaimed,
  });

  const save = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim() || null,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          skills,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (err) throw err;
      const bonus = await tryGrantProfileCompleteBonus(userId);
      if (bonus) setBonusClaimed(true);
      setMsg(
        bonus
          ? `Enregistré · +${IMPACT_POINTS.profileComplete} Impact profil complet !`
          : 'Enregistré'
      );
      setTimeout(() => router.back(), 800);
    } catch (e: any) {
      setError(e?.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Profil"
      subtitle="Informations publiques"
      onBack={() => router.back()}
      loading={loading}
      footer={
        <PrimaryButton
          label="Enregistrer"
          onPress={save}
          loading={saving}
          icon={Save}
        />
      }
    >
      {liveCompleteness.showCta ? (
        <ImpactBanner
          points={IMPACT_POINTS.profileComplete}
          label={
            liveCompleteness.missingLabels.length
              ? `Encore : ${liveCompleteness.missingLabels.join(', ')} · +${IMPACT_POINTS.profileComplete} une fois.`
              : `Profil complet = +${IMPACT_POINTS.profileComplete} Impact (1×).`
          }
        />
      ) : bonusClaimed || liveCompleteness.complete ? (
        <FormAlert
          tone="success"
          message={
            bonusClaimed
              ? 'Profil complet · bonus +20 déjà crédité.'
              : 'Profil complet · enregistre pour créditer le +20 si pas encore fait.'
          }
        />
      ) : null}

      {error ? <FormAlert message={error} /> : null}
      {msg ? <FormAlert message={msg} tone="success" /> : null}

      <FormSection
        icon={User}
        title="Identité"
        subtitle="Ce que la communauté voit sur ton profil et dans le feed."
      >
        <View className="items-center gap-2 mb-2">
          <Pressable onPress={handleAvatar} disabled={avatarBusy} className="relative">
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="w-24 h-24 rounded-full border overflow-hidden items-center justify-center"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96 }} />
              ) : (
                <Text style={{ color: colors.text }} className="font-space text-2xl font-bold">
                  {initials}
                </Text>
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-turmeric items-center justify-center">
              {avatarBusy ? (
                <ActivityIndicator size={12} color="#0D0B05" />
              ) : (
                <Camera size={14} color="#0D0B05" />
              )}
            </View>
          </Pressable>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
            Touche pour changer la photo
          </Text>
        </View>
        <FormField
          label="Nom complet"
          required
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ton nom"
          maxLength={60}
          counter={{ current: fullName.length, max: 60 }}
        />
        <FormField
          label="Nom d’utilisateur"
          value={username}
          onChangeText={setUsername}
          placeholder="ex: koffi_dev"
          autoCapitalize="none"
          maxLength={30}
          hint="Minuscules, unique si possible"
        />
        <FormField
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+229 …"
          keyboardType="phone-pad"
        />
        <FormMultiline
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Quelques mots sur toi, ton focus, ce que tu cherches au PIH…"
          minHeight={110}
          maxLength={400}
          counter={{ current: bio.length, max: 400 }}
          hint="≥ 20 caractères pour le bonus profil complet"
        />
      </FormSection>

      <FormSection title="Compétences" subtitle="Utilisées pour le matching « Pour moi » du feed.">
        <ChipSelect options={SKILLS} values={skills} onChange={setSkills} />
      </FormSection>
    </FormScreen>
  );
}
