import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, CheckCircle, Lock, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  FormAlert,
  FormField,
  FormScreen,
  FormSection,
  PrimaryButton,
} from '../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { supabase } from '../lib/supabase';

type Step = 'otp' | 'password' | 'done';

const RESEND_COOLDOWN_SEC = 60;
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const { colors } = useThemeFlavor();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam || '').trim().toLowerCase();
  const router = useRouter();

  const [step, setStep] = useState<Step>('otp');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!email) router.replace('/forgot-password');
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerifyOtp = async () => {
    const token = code.trim();
    if (token.length < 6 || token.length > 8) {
      setErrorMsg('Saisissez le code reçu par e-mail (6 à 8 chiffres).');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) {
        setErrorMsg(
          error.message?.toLowerCase().includes('expired')
            ? 'Code expiré. Demandez un nouveau code.'
            : 'Code incorrect ou expiré. Vérifiez votre e-mail.'
        );
        setLoading(false);
        return;
      }
      setStep('password');
      setInfoMsg('Code validé. Choisis un nouveau mot de passe.');
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setErrorMsg(
          error.status === 429
            ? 'Trop de tentatives. Réessayez plus tard.'
            : 'Impossible de renvoyer le code.'
        );
      } else {
        setInfoMsg('Un nouveau code a été envoyé à ' + email);
        setCooldown(RESEND_COOLDOWN_SEC);
        setCode('');
      }
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
    } finally {
      setResending(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('Session expirée. Recommencez depuis le début.');
        setStep('otp');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(
          error.message?.includes('same')
            ? 'Choisissez un mot de passe différent de l’ancien.'
            : error.message || 'Impossible de mettre à jour le mot de passe.'
        );
        setLoading(false);
        return;
      }
      await supabase.auth.signOut();
      setStep('done');
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  const progress = step === 'done' ? 1 : step === 'password' ? 0.66 : 0.33;

  return (
    <FormScreen
      title={
        step === 'done'
          ? 'C’est fait'
          : step === 'password'
            ? 'Nouveau mot de passe'
            : 'Code de confirmation'
      }
      subtitle={step === 'done' ? 'Tu peux te reconnecter' : email}
      onBack={() => {
        if (step === 'password') {
          setStep('otp');
          setPassword('');
          setConfirm('');
          setErrorMsg('');
        } else if (step === 'done') {
          router.replace('/login');
        } else {
          router.replace('/forgot-password');
        }
      }}
      progress={progress}
      footer={
        step === 'done' ? (
          <PrimaryButton
            label="Se connecter"
            onPress={() => router.replace('/login')}
            icon={ArrowRight}
          />
        ) : step === 'password' ? (
          <PrimaryButton
            label="Enregistrer le mot de passe"
            onPress={handleUpdatePassword}
            loading={loading}
            icon={Lock}
          />
        ) : (
          <PrimaryButton
            label="Vérifier le code"
            onPress={handleVerifyOtp}
            loading={loading}
            icon={ArrowRight}
          />
        )
      }
    >
      {errorMsg ? <FormAlert message={errorMsg} /> : null}
      {infoMsg && step !== 'done' ? <FormAlert message={infoMsg} tone="success" /> : null}

      {step === 'otp' ? (
        <FormSection
          icon={ShieldCheck}
          title="Code reçu par e-mail"
          subtitle="6 à 8 chiffres. Vérifie aussi les spams."
        >
          <FormField
            label="Code OTP"
            required
            placeholder="00000000"
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            editable={!loading}
            onSubmitEditing={handleVerifyOtp}
          />
          <Pressable onPress={handleResendCode} disabled={resending || cooldown > 0} className="items-center py-1">
            {resending ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text
                className="font-inter text-xs font-semibold"
                style={{ color: cooldown > 0 ? colors.textSecondary : colors.turmeric }}
              >
                {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : 'Renvoyer le code'}
              </Text>
            )}
          </Pressable>
        </FormSection>
      ) : null}

      {step === 'password' ? (
        <FormSection icon={Lock} title="Choisis un mot de passe fort" subtitle="Minimum 8 caractères.">
          <FormField
            label="Nouveau mot de passe"
            required
            leftIcon={Lock}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoFocus
            editable={!loading}
          />
          <FormField
            label="Confirmer"
            required
            leftIcon={Lock}
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={handleUpdatePassword}
            hint={
              password.length === 0
                ? `Minimum ${MIN_PASSWORD_LENGTH} caractères`
                : password.length < MIN_PASSWORD_LENGTH
                  ? `Encore ${MIN_PASSWORD_LENGTH - password.length} caractère(s)`
                  : password === confirm && confirm.length > 0
                    ? '✓ Les mots de passe correspondent'
                    : confirm.length > 0
                      ? 'Les mots de passe ne correspondent pas'
                      : 'Mot de passe assez long'
            }
          />
        </FormSection>
      ) : null}

      {step === 'done' ? (
        <FormSection icon={CheckCircle} title="Mot de passe mis à jour">
          <FormAlert
            tone="success"
            message="Tu peux maintenant te connecter avec ton nouveau mot de passe."
          />
        </FormSection>
      ) : null}
    </FormScreen>
  );
}
