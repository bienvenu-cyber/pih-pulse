import { ActivityIndicator, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

type Props = {
  /** En train de charger la page suivante */
  loading?: boolean;
  /** Encore du contenu possible (sinon footer vide / min-height) */
  hasMore?: boolean;
  /** Hauteur / padding bas */
  compact?: boolean;
};

/**
 * Footer infinite scroll premium :
 * - spinner discret uniquement pendant le load
 * - aucun « Charger plus » / texte mémoire
 * - hauteur stable pour éviter les sauts de layout
 */
export default function LoadMoreFooter({
  loading = false,
  hasMore = false,
  compact = false,
}: Props) {
  const { colors } = useThemeFlavor();
  const pad = compact ? 12 : 20;

  if (!loading) {
    // Réserve un peu d’air en bas sans message
    return <View style={{ height: hasMore ? pad : 8 }} />;
  }

  return (
    <View
      style={{ paddingVertical: pad }}
      className="items-center justify-center"
      accessibilityLabel="Chargement"
    >
      <ActivityIndicator size="small" color={colors.textSecondary} />
    </View>
  );
}
