/**
 * Politique de confidentialité — version in-app (FR).
 * Remplacer l’URL publique dans SHIP.md quand un site est en ligne.
 */
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Qui sommes-nous ?',
    body: 'PIH Pulse est une application communautaire pour talents et fondateurs (hub projets, missions, messagerie). Éditeur : l’équipe PIH Pulse. Contact : via l’app (messagerie / profil support).',
  },
  {
    title: '2. Données collectées',
    body: 'Compte : e-mail, nom d’affichage, bio, compétences, photo de profil, liens portfolio. Contenu : posts, projets, missions, messages, réactions. Technique : jetons de session, jetons push (si activés), horodatage de présence « en ligne » si tu l’actives.',
  },
  {
    title: '3. Finalités',
    body: 'Fournir le service hub (profils, feed, collaboration, chat, notifications). Améliorer la fiabilité (sécurité, anti-abus, logs techniques). Pas de revente de données personnelles à des tiers publicitaires.',
  },
  {
    title: '4. Base légale',
    body: 'Exécution du contrat (fourniture du service) et intérêt légitime (sécurité, prévention des abus). Consentement pour les notifications push et l’accès galerie/caméra.',
  },
  {
    title: '5. Hébergement',
    body: 'Données applicatives hébergées via Supabase (PostgreSQL + Auth + Storage). Région du projet configurable dans le dashboard Supabase. Transferts selon la politique du prestataire.',
  },
  {
    title: '6. Conservation',
    body: 'Compte : jusqu’à suppression. Notifications lues : purgées périodiquement (rétention technique ~90 jours). Messages anciens peuvent être archivés. Tu peux supprimer ton compte dans Profil → Sécurité.',
  },
  {
    title: '7. Tes droits',
    body: 'Accès, rectification (édition profil), suppression de compte, opposition aux push (réglages). Pour toute demande : utilise l’app ou contacte l’équipe PIH.',
  },
  {
    title: '8. Sécurité',
    body: 'Auth Supabase, sessions persistées de façon sécurisée (SecureStore / localStorage web). Row Level Security sur les tables. Ne partage jamais ton mot de passe.',
  },
  {
    title: '9. Mineurs',
    body: 'Le service s’adresse à un public professionnel / formation. Si tu as moins de 16 ans, utilise l’app avec l’accord d’un responsable légal selon ton pays.',
  },
  {
    title: '10. Mises à jour',
    body: 'Cette notice peut évoluer. Version in-app à jour avec l’application. Dernière révision : juillet 2026.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader title="Confidentialité" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}>
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] leading-5">
          Politique de confidentialité PIH Pulse — version intégrée à l’application. Une URL
          publique pourra être publiée pour les stores (voir SHIP.md).
        </Text>
        {SECTIONS.map((s) => (
          <View
            key={s.title}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-2"
          >
            <Text style={{ color: colors.text }} className="font-space text-[14px] font-bold">
              {s.title}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px] leading-5">
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
