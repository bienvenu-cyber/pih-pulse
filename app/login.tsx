import { useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthMethodPicker, { type AuthMethod } from '../components/auth/AuthMethodPicker';
import AuthShell from '../components/auth/AuthShell';
import {
  FormAlert,
  FormField,
  PrimaryButton,
} from '../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { routeAfterAuth, signInWithOAuthProvider } from '../lib/authOAuth';
import { supabase } from '../lib/supabase';

type Step = 'method' | 'email';

export default function LoginScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const busy = loading || !!socialLoading;

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Remplis e-mail et mot de passe.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMsg('Identifiants incorrects. Réessaie.');
        setLoading(false);
        return;
      }
      // Même routing qu’OAuth : profile-setup si rôle manquant
      const dest = await routeAfterAuth();
      router.replace(dest);
    } catch {
      setErrorMsg('Une erreur est survenue.');
      setLoading(false);
    }
  };

  /** Un tap = action immédiate (plus de bouton Continuer) */
  const handleMethod = async (method: AuthMethod) => {
    setErrorMsg('');
    if (method === 'email') {
      setStep('email');
      return;
    }

    setSocialLoading(method);
    try {
      const res = await signInWithOAuthProvider(method);
      if ('error' in res) {
        if (res.error !== 'Connexion annulée.') {
          setErrorMsg(res.error);
        }
        return;
      }
      const dest = await routeAfterAuth();
      router.replace(dest);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Connexion sociale impossible.');
    } finally {
      setSocialLoading(null);
    }
  };

  if (step === 'email') {
    return (
      <AuthShell
        eyebrow="Connexion"
        title="Avec ton e-mail"
        subtitle="Entre tes identifiants hub."
        onBack={() => {
          setStep('method');
          setErrorMsg('');
        }}
        footer={
          <PrimaryButton
            label="Se connecter"
            onPress={handleEmailLogin}
            loading={loading}
            disabled={busy}
            icon={ArrowRight}
          />
        }
      >
        {errorMsg ? (
          <View className="mb-4">
            <FormAlert message={errorMsg} />
          </View>
        ) : null}

        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-4"
        >
          <FormField
            label="Email"
            required
            leftIcon={Mail}
            placeholder="nom@exemple.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!busy}
            autoFocus
          />
          <FormField
            label="Mot de passe"
            required
            leftIcon={Lock}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
          />
          <Pressable
            onPress={() => router.push('/forgot-password')}
            disabled={busy}
            className="self-end -mt-1"
          >
            <Text style={{ color: colors.turmeric }} className="font-inter text-[12px] font-semibold">
              Mot de passe oublié ?
            </Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bienvenue"
      subtitle="Choisis comment entrer dans le hub."
      onBack={() => router.replace('/onboarding')}
    >
      {errorMsg ? (
        <View className="mb-4">
          <FormAlert message={errorMsg} />
        </View>
      ) : null}

      <AuthMethodPicker
        mode="login"
        onSelect={handleMethod}
        loadingProvider={socialLoading}
        disabled={busy}
      />

      <View className="flex-row justify-center items-center gap-1.5 mt-8">
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px]">
          Pas encore de compte ?
        </Text>
        <Pressable onPress={() => router.push('/register')} disabled={busy} hitSlop={8}>
          <Text style={{ color: colors.turmeric }} className="font-inter text-[13px] font-bold">
            S’inscrire
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
