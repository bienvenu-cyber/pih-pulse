import { Target } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

type Props = {
  /** Présence en ligne (opt-in + heartbeat) */
  online?: boolean;
  /** Dispo pour missions */
  available?: boolean;
  /** Rôle / label métier (optionnel) */
  roleLabel?: string | null;
  /** Variante compacte (listes) */
  compact?: boolean;
  /**
   * Si true, n’affiche pas le point « en ligne » ici
   * (déjà sur l’avatar via PresenceDot).
   */
  hideOnlineDot?: boolean;
};

/**
 * Statuts profil — icônes discrètes, pas de libellés « En ligne / Dispo ».
 * - rôle = texte
 * - dispo missions = icône Target kaki
 * - en ligne = point vert (sauf si déjà sur l’avatar)
 */
export function ProfileStatusMeta({
  online,
  available,
  roleLabel,
  compact,
  hideOnlineDot = false,
}: Props) {
  const { colors } = useThemeFlavor();
  const role = roleLabel?.trim() || '';
  const showOnline = !!online && !hideOnlineDot;
  const showAvailable = !!available;
  const iconSize = compact ? 11 : 12;
  const gap = compact ? 6 : 8;

  if (!role && !showOnline && !showAvailable) return null;

  return (
    <View
      className="flex-row flex-wrap items-center"
      style={{ marginTop: compact ? 2 : 4, gap }}
      accessibilityLabel={[
        role || null,
        showAvailable ? 'Disponible pour missions' : null,
        showOnline ? 'En ligne' : null,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {role ? (
        <Text
          style={{ color: colors.textSecondary, letterSpacing: 0.4 }}
          className={`font-inter ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium uppercase`}
          numberOfLines={1}
        >
          {role}
        </Text>
      ) : null}

      {(showOnline || showAvailable) && role ? (
        <Text style={{ color: colors.border }} className="font-inter text-[10px]">
          ·
        </Text>
      ) : null}

      {showOnline || showAvailable ? (
        <View className="flex-row items-center" style={{ gap: compact ? 7 : 8 }}>
          {showOnline ? (
            <View
              accessibilityLabel="En ligne"
              style={{
                width: compact ? 7 : 8,
                height: compact ? 7 : 8,
                borderRadius: 4,
                backgroundColor: colors.kaki,
              }}
            />
          ) : null}
          {showAvailable ? (
            <Target
              size={iconSize}
              color={colors.kaki}
              strokeWidth={2.4}
              accessibilityLabel="Disponible pour missions"
            />
          ) : null}
        </View>
      ) : null}
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
      accessibilityLabel="En ligne"
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

/**
 * Rangée d’icônes statut pour listes (Talents, etc.) — sans texte.
 */
export function ProfileStatusIcons({
  online,
  available,
  size = 14,
}: {
  online?: boolean;
  available?: boolean;
  size?: number;
}) {
  const { colors } = useThemeFlavor();
  if (!online && !available) return null;

  return (
    <View
      className="flex-row items-center gap-2.5"
      accessibilityLabel={[
        online ? 'En ligne' : null,
        available ? 'Disponible pour missions' : null,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {online ? (
        <View
          style={{
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: size,
            backgroundColor: colors.kaki,
          }}
        />
      ) : null}
      {available ? (
        <Target size={size} color={colors.kaki} strokeWidth={2.3} />
      ) : null}
    </View>
  );
}
