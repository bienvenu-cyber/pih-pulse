import { useRouter } from 'expo-router';
import { ArrowRight, Lock, Mail, User } from 'lucide-react-native';
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

export default function RegisterScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [step, setStep] = useState<Step>('method');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const busy = loading || !!socialLoading;

  const lowerAlphanumeric = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9_]/g, '_') +
    '_' +
    Math.floor(1000 + Math.random() * 9000);

  const handleEmailRegister = async () => {
    if (!fullName || !email || !password) {
      setErrorMsg('Remplis tous les champs.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Mot de passe : 8 caractères minimum.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            username: lowerAlphanumeric(fullName),
          },
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      router.replace(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const handleMethod = async (method: AuthMethod) => {
    setErrorMsg('');
    if (method === 'email') {
      setStep('email');
      return;
    }

    setSocialLoading(method);
    const res = await signInWithOAuthProvider(method);
    setSocialLoading(null);
    if ('error' in res) {
      if (res.error !== 'Connexion annulée.') setErrorMsg(res.error);
      return;
    }
    const dest = await routeAfterAuth();
    router.replace(dest);
  };

  if (step === 'email') {
    return (
      <AuthShell
        eyebrow="Inscription"
        title="Compte e-mail"
        subtitle="Quelques infos pour rejoindre le hub."
        onBack={() => {
          setStep('method');
          setErrorMsg('');
        }}
        footer={
          <PrimaryButton
            label="Créer mon compte"
            onPress={handleEmailRegister}
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
            label="Nom complet"
            required
            leftIcon={User}
            placeholder="Inès Lawani"
            value={fullName}
            onChangeText={setFullName}
            editable={!busy}
            autoFocus
          />
          <FormField
            label="Email"
            required
            leftIcon={Mail}
            placeholder="ines@exemple.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!busy}
          />
          <FormField
            label="Mot de passe"
            required
            leftIcon={Lock}
            placeholder="Min. 8 caractères"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
          />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Rejoindre le hub"
      subtitle="Un tap pour commencer — le reste suit."
      onBack={() => router.back()}
    >
      {errorMsg ? (
        <View className="mb-4">
          <FormAlert message={errorMsg} />
        </View>
      ) : null}

      <AuthMethodPicker
        mode="register"
        onSelect={handleMethod}
        loadingProvider={socialLoading}
        disabled={busy}
      />

      <View className="flex-row justify-center items-center gap-1.5 mt-8">
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px]">
          Déjà membre ?
        </Text>
        <Pressable onPress={() => router.push('/login')} disabled={busy} hitSlop={8}>
          <Text style={{ color: colors.turmeric }} className="font-inter text-[13px] font-bold">
            Se connecter
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
