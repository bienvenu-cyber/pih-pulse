import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { supabase } from '../../lib/supabase';

export default function ProfileSecurityScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPass, setBusyPass] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email || '');
      setNewEmail(user.email || '');
      setLoading(false);
    })();
  }, [router]);

  const updateEmail = async () => {
    const next = newEmail.trim().toLowerCase();
    if (!next || next === email) {
      setError('Saisis une nouvelle adresse e-mail.');
      return;
    }
    setBusyEmail(true);
    setError('');
    setMsg('');
    try {
      const { error: err } = await supabase.auth.updateUser({ email: next });
      if (err) throw err;
      setMsg(
        'E-mail mis à jour. Si la confirmation est activée, vérifie ta boîte (ancien + nouveau).'
      );
      setEmail(next);
    } catch (e: any) {
      setError(e?.message || 'Impossible de changer l’e-mail.');
    } finally {
      setBusyEmail(false);
    }
  };

  const updatePassword = async () => {
    if (password.length < 8) {
      setError('Mot de passe : 8 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusyPass(true);
    setError('');
    setMsg('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setPassword('');
      setConfirm('');
      setMsg('Mot de passe mis à jour.');
    } catch (e: any) {
      setError(e?.message || 'Impossible de changer le mot de passe.');
    } finally {
      setBusyPass(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'SUPPRIMER') {
      setError('Tape SUPPRIMER pour confirmer la suppression.');
      return;
    }
    const run = async () => {
      setBusyDelete(true);
      setError('');
      setMsg('');
      try {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        const providers = (u?.identities || []).map((i) => i.provider);
        const hasPasswordProvider =
          providers.includes('email') || providers.length === 0;

        // Re-auth e-mail/mdp uniquement (OAuth = SUPPRIMER suffit)
        if (hasPasswordProvider) {
          if (!deletePassword || deletePassword.length < 6) {
            setError('Confirme avec ton mot de passe pour supprimer le compte.');
            setBusyDelete(false);
            return;
          }
          const { error: reauthErr } = await supabase.auth.signInWithPassword({
            email,
            password: deletePassword,
          });
          if (reauthErr) {
            setError('Mot de passe incorrect. Suppression annulée.');
            setBusyDelete(false);
            return;
          }
        }

        const { error: rpcErr } = await supabase.rpc('delete_own_account');
        if (rpcErr) {
          // Fallback soft : anonymise profil + signOut si RPC absente
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({
                full_name: 'Compte supprimé',
                username: null,
                bio: null,
                avatar_url: null,
                phone: null,
                skills: [],
                portfolio: {},
                expo_push_token: null,
                push_enabled: false,
                show_online_presence: false,
                available_for_missions: false,
              })
              .eq('id', user.id);
          }
          await supabase.auth.signOut();
          setMsg(
            rpcErr.message?.includes('function')
              ? 'Profil anonymisé. Lance FIX_INVITES_DELETE_ACCOUNT.sql pour suppression auth complète.'
              : 'Session fermée. Compte partiellement désactivé.'
          );
          router.replace('/login');
          return;
        }
        await supabase.auth.signOut();
        router.replace('/login');
      } catch (e: any) {
        setError(e?.message || 'Suppression impossible.');
      } finally {
        setBusyDelete(false);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Supprimer définitivement ton compte ?')) {
        await run();
      }
      return;
    }
    Alert.alert(
      'Supprimer le compte',
      'Action irréversible. Profil anonymisé et accès révoqué.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void run() },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.turmeric} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader title="Sécurité" onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text className="text-corail font-inter text-xs">{error}</Text> : null}
          {msg ? (
            <Text style={{ color: colors.kaki }} className="font-inter text-xs leading-5">
              {msg}
            </Text>
          ) : null}

          {/* Email */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Adresse e-mail
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
              Actuelle : {email}
            </Text>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-xl px-3 h-11 justify-center"
            >
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="nouvel@email.com"
                placeholderTextColor={colors.textSecondary}
                style={{ color: colors.text }}
                className="font-inter text-sm h-full"
              />
            </View>
            <Pressable
              onPress={updateEmail}
              disabled={busyEmail}
              className="bg-turmeric h-11 rounded-xl items-center justify-center"
            >
              {busyEmail ? (
                <ActivityIndicator color="#0D0B05" />
              ) : (
                <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                  Mettre à jour l’e-mail
                </Text>
              )}
            </Pressable>
          </View>

          {/* Password */}
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Mot de passe
            </Text>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-xl px-3 h-11 justify-center"
            >
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Nouveau mot de passe"
                placeholderTextColor={colors.textSecondary}
                style={{ color: colors.text }}
                className="font-inter text-sm h-full"
              />
            </View>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-xl px-3 h-11 justify-center"
            >
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="Confirmer"
                placeholderTextColor={colors.textSecondary}
                style={{ color: colors.text }}
                className="font-inter text-sm h-full"
              />
            </View>
            <Pressable
              onPress={updatePassword}
              disabled={busyPass}
              className="bg-turmeric h-11 rounded-xl items-center justify-center"
            >
              {busyPass ? (
                <ActivityIndicator color="#0D0B05" />
              ) : (
                <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                  Changer le mot de passe
                </Text>
              )}
            </Pressable>
          </View>

          {/* Suppression compte */}
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.corail + '55',
            }}
            className="border rounded-2xl p-4 gap-3"
          >
            <Text style={{ color: colors.corail }} className="font-space text-[15px] font-bold">
              Zone danger
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] leading-5">
              Supprime ton compte PIH Pulse. Tes données profil sont anonymisées. Mot de passe + tape{' '}
              <Text style={{ color: colors.text }} className="font-bold">
                SUPPRIMER
              </Text>{' '}
              pour confirmer.
            </Text>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-xl px-3 h-11 justify-center"
            >
              <TextInput
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Mot de passe actuel"
                placeholderTextColor={colors.textSecondary}
                style={{ color: colors.text }}
                className="font-inter text-sm h-full"
              />
            </View>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-xl px-3 h-11 justify-center"
            >
              <TextInput
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                autoCapitalize="characters"
                placeholder="SUPPRIMER"
                placeholderTextColor={colors.textSecondary}
                style={{ color: colors.text }}
                className="font-inter text-sm h-full"
              />
            </View>
            <Pressable
              onPress={deleteAccount}
              disabled={busyDelete}
              style={{ backgroundColor: colors.corail + '22', borderColor: colors.corail }}
              className="border h-11 rounded-xl items-center justify-center"
            >
              {busyDelete ? (
                <ActivityIndicator color={colors.corail} />
              ) : (
                <Text style={{ color: colors.corail }} className="font-inter-bold text-sm font-bold">
                  Supprimer mon compte
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
