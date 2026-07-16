import { Apple, ChevronRight, Mail } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

export type AuthMethod = 'email' | 'google' | 'github' | 'apple';

const GithubIcon = ({ size = 20, color = '#F5EDD6' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </Svg>
);

const GoogleIcon = ({ size = 20, color = '#F5EDD6' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill={color}
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill={color}
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill={color}
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill={color}
    />
  </Svg>
);

interface Props {
  mode: 'login' | 'register';
  /** Appelé immédiatement au tap (pas d’étape Continuer) */
  onSelect: (m: AuthMethod) => void;
  loadingProvider?: string | null;
  disabled?: boolean;
}

/**
 * Méthodes de connexion — un tap = action immédiate.
 */
export default function AuthMethodPicker({
  mode,
  onSelect,
  loadingProvider,
  disabled,
}: Props) {
  const { colors } = useThemeFlavor();

  const methods: {
    id: AuthMethod;
    label: string;
    hint: string;
    disabled?: boolean;
    primary?: boolean;
    icon: ReactNode;
  }[] = [
    {
      id: 'email',
      label: 'Continuer avec e-mail',
      hint: mode === 'login' ? 'Adresse et mot de passe' : 'Créer un compte e-mail',
      primary: true,
      icon: <Mail size={20} color={colors.onTurmeric} strokeWidth={2.3} />,
    },
    {
      id: 'google',
      label: 'Continuer avec Google',
      hint: 'Rapide et sécurisé',
      icon: <GoogleIcon size={18} color={colors.text} />,
    },
    {
      id: 'github',
      label: 'Continuer avec GitHub',
      hint: 'Pour les builders',
      icon: <GithubIcon size={18} color={colors.text} />,
    },
    {
      id: 'apple',
      label: 'Continuer avec Apple',
      hint: 'Sign in with Apple',
      icon: <Apple size={20} color={colors.text} />,
    },
  ];

  return (
    <View className="gap-3">
      {methods.map((m) => {
        const busy = loadingProvider === m.id;
        const locked = disabled || m.disabled || (!!loadingProvider && !busy);

        if (m.primary) {
          return (
            <Pressable
              key={m.id}
              onPress={() => !m.disabled && onSelect(m.id)}
              disabled={locked}
              className="rounded-2xl px-4 py-4 flex-row items-center gap-3.5 active:opacity-90 bg-turmeric"
              style={{ opacity: locked && !busy ? 0.55 : 1 }}
            >
              <View className="w-11 h-11 rounded-xl items-center justify-center bg-black/10">
                {busy ? (
                  <ActivityIndicator size="small" color={colors.onTurmeric} />
                ) : (
                  m.icon
                )}
              </View>
              <View className="flex-1">
                <Text
                  style={{ color: colors.onTurmeric }}
                  className="font-space text-[15px] font-bold"
                >
                  {m.label}
                </Text>
                <Text
                  style={{ color: 'rgba(13,11,5,0.65)' }}
                  className="font-inter text-[11px] mt-0.5"
                >
                  {m.hint}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.onTurmeric} strokeWidth={2.4} />
            </Pressable>
          );
        }

        return (
          <Pressable
            key={m.id}
            onPress={() => !m.disabled && onSelect(m.id)}
            disabled={locked}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: m.disabled ? 0.4 : locked && !busy ? 0.6 : 1,
            }}
            className="rounded-2xl border px-4 py-4 flex-row items-center gap-3.5 active:opacity-90"
          >
            <View
              style={{
                backgroundColor: colors.deep,
                borderColor: colors.border,
              }}
              className="w-11 h-11 rounded-xl border items-center justify-center"
            >
              {busy ? <ActivityIndicator size="small" color={colors.turmeric} /> : m.icon}
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
                {m.label}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[11px] mt-0.5"
              >
                {m.hint}
              </Text>
            </View>
            {!m.disabled ? (
              <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
