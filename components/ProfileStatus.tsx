import { Text, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

type Props = {
  /** Présence en ligne (opt-in + heartbeat) */
  online?: boolean;
  /** Dispo pour missions */
  available?: boolean;
  /** Rôle / label métier (optionnel, même ligne méta) */
  roleLabel?: string | null;
  /** Variante compacte (listes) */
  compact?: boolean;
};

/**
 * Statuts profil premium / épurés :
 * - pas de chips kaki bordés « Dispo / En ligne »
 * - présence = point discret (souvent sur l’avatar via PresenceDot)
 * - dispo + rôle = ligne méta texte fine
 */
export function ProfileStatusMeta({
  online,
  available,
  roleLabel,
  compact,
}: Props) {
  const { colors } = useThemeFlavor();
  const parts: string[] = [];
  if (roleLabel?.trim()) parts.push(roleLabel.trim());
  if (available) parts.push('Dispo');
  if (online) parts.push('En ligne');

  if (!parts.length) return null;

  return (
    <View
      className="flex-row flex-wrap items-center"
      style={{ marginTop: compact ? 2 : 4, gap: 0 }}
    >
      {parts.map((part, i) => {
        const isLive = part === 'En ligne';
        const isDispo = part === 'Dispo';
        const color = isLive || isDispo ? colors.kaki : colors.textSecondary;

        return (
          <View key={`${part}-${i}`} className="flex-row items-center">
            {i > 0 ? (
              <Text
                style={{ color: colors.border, marginHorizontal: 6 }}
                className="font-inter text-[10px]"
              >
                ·
              </Text>
            ) : null}
            {isLive ? (
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colors.kaki,
                  marginRight: 5,
                }}
              />
            ) : null}
            <Text
              style={{ color, letterSpacing: isDispo || isLive ? 0.2 : 0.4 }}
              className={`font-inter ${compact ? 'text-[10px]' : 'text-[11px]'} ${
                isDispo || isLive ? 'font-semibold' : 'font-medium'
              } ${!isDispo && !isLive ? 'uppercase' : ''}`}
            >
              {part}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Point de présence sur avatar (style social apps).
 * Place en bas-gauche pour ne pas croiser le badge caméra (bas-droite).
 */
export function PresenceDot({
  online,
  size = 12,
  borderColor,
}: {
  online?: boolean;
  size?: number;
  borderColor?: string;
}) {
  const { colors } = useThemeFlavor();
  if (!online) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 1,
        bottom: 1,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.kaki,
        borderWidth: 2,
        borderColor: borderColor || colors.card,
      }}
    />
  );
}
