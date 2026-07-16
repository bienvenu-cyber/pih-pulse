import { useRouter } from 'expo-router';
import { ArrowRight, KeyRound, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
  FormAlert,
  FormField,
  FormScreen,
  FormSection,
  PrimaryButton,
} from '../components/ui/form/FormPrimitives';
import { supabase } from '../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg('Veuillez saisir votre adresse e-mail.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setErrorMsg('Adresse e-mail invalide.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) {
        setErrorMsg(
          error.message?.includes('rate') || error.status === 429
            ? 'Trop de tentatives. Réessayez dans quelques minutes.'
            : "Impossible d'envoyer le code. Vérifiez l'e-mail et réessayez."
        );
        setLoading(false);
        return;
      }
      router.push(`/reset-password?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  return (
    <FormScreen
      title="Mot de passe oublié"
      subtitle="Code OTP par e-mail"
      onBack={() => router.replace('/login')}
      footer={
        <PrimaryButton
          label="Envoyer le code"
          onPress={handleSendCode}
          loading={loading}
          icon={ArrowRight}
        />
      }
    >
      <FormSection
        icon={KeyRound}
        title="Récupération"
        subtitle="Nous envoyons un code 6–8 chiffres (pas de lien magique requis dans l’app)."
      >
        {errorMsg ? <FormAlert message={errorMsg} /> : null}
        <FormField
          label="Email du compte"
          required
          leftIcon={Mail}
          placeholder="nom@exemple.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          editable={!loading}
          onSubmitEditing={handleSendCode}
        />
      </FormSection>
    </FormScreen>
  );
}
