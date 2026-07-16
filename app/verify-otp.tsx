import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  FormAlert,
  FormField,
  FormScreen,
  FormSection,
  PrimaryButton,
} from '../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { supabase } from '../lib/supabase';

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyOtpScreen() {
  const { email: emailParam } = useLocalSearchParams();
  const email = String(emailParam || '').trim();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const router = useRouter();
  const { colors } = useThemeFlavor();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email) {
      setErrorMsg('E-mail manquant. Reprends l’inscription.');
      return;
    }
    if (code.length < 6) {
      setErrorMsg('Veuillez entrer le code de validation reçu.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });
      if (error) {
        setErrorMsg('Code incorrect ou expiré. Vérifie ta boîte mail ou renvoie un code.');
        setLoading(false);
        return;
      }
      router.replace('/profile-setup');
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        setErrorMsg(error.message || 'Impossible de renvoyer le code.');
      } else {
        setInfoMsg(`Nouveau code envoyé à ${email}`);
        setCooldown(RESEND_COOLDOWN_SEC);
        setCode('');
      }
    } catch {
      setErrorMsg('Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <FormScreen
      title="Vérification"
      subtitle={email || 'Code e-mail'}
      onBack={() => router.back()}
      footer={
        <PrimaryButton
          label="Valider le compte"
          onPress={handleVerify}
          loading={loading}
          icon={ArrowRight}
          disabled={!email}
        />
      }
    >
      <FormSection
        icon={ShieldCheck}
        title="Code de validation"
        subtitle="Saisis le code reçu par e-mail pour activer ton compte."
      >
        {errorMsg ? <FormAlert message={errorMsg} /> : null}
        {infoMsg ? <FormAlert message={infoMsg} tone="success" /> : null}
        {!email ? (
          <FormAlert message="E-mail manquant. Retourne à l’inscription." />
        ) : null}
        <FormField
          label="Code OTP"
          required
          placeholder="00000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={8}
          autoFocus
          editable={!loading && !!email}
          hint="6 à 8 chiffres"
        />
        <Pressable
          onPress={handleResend}
          disabled={!email || resending || cooldown > 0 || loading}
          className="items-center py-2 active:opacity-80"
        >
          <Text
            style={{
              color:
                !email || cooldown > 0 ? colors.textSecondary : colors.turmeric,
            }}
            className="font-inter text-xs font-bold"
          >
            {resending
              ? 'Envoi…'
              : cooldown > 0
                ? `Renvoyer le code (${cooldown}s)`
                : 'Renvoyer le code'}
          </Text>
        </Pressable>
      </FormSection>
    </FormScreen>
  );
}
