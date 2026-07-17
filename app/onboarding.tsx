import { useRouter } from 'expo-router';
import { ArrowRight, Layers, Target, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { markOnboardingDone } from '../lib/onboarding';

const SLIDES = [
  {
    title: 'Pulse de l’Écosystème',
    description:
      'Une plateforme active pour connecter les talents du Parakou Innovation Hub (PIH). Partagez vos idées et bâtissez ensemble.',
    icon: Layers,
    accent: 'turmeric' as const,
  },
  {
    title: 'Projets Réels & MVPs',
    description:
      'Rejoignez des équipes pluridisciplinaires pour transformer de simples concepts en produits technologiques concrets et viables.',
    icon: Target,
    accent: 'kaki' as const,
  },
  {
    title: 'Missions & Élan',
    description:
      'Réalisez des missions techniques (code, design, marketing), accumulez de l’Élan et validez vos compétences aux yeux de tous.',
    icon: Trophy,
    accent: 'corail' as const,
  },
];

export default function OnboardingScreen() {
  const { colors } = useThemeFlavor();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();

  /** Fin d’onboarding = une seule fois (flag local) → login */
  const finishOnboarding = async () => {
    if (leaving) return;
    setLeaving(true);
    await markOnboardingDone();
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      void finishOnboarding();
    }
  };

  const handleSkip = () => {
    void finishOnboarding();
  };

  const slide = SLIDES[currentSlide];
  const IconComponent = slide.icon;
  const accentColor =
    slide.accent === 'kaki'
      ? colors.kaki
      : slide.accent === 'corail'
        ? colors.corail
        : colors.turmeric;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <View className="h-12 justify-center items-end px-6">
        {currentSlide < SLIDES.length - 1 ? (
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Passer l’onboarding"
            hitSlop={10}
          >
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-sm font-medium"
            >
              Passer
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
          className="w-40 h-40 rounded-full justify-center items-center mb-12 border"
        >
          <IconComponent size={64} color={accentColor} strokeWidth={1.5} />
        </View>

        <View className="items-center">
          <Text
            style={{ color: colors.text }}
            className="font-space text-3xl font-bold text-center mb-4 tracking-tight"
            accessibilityRole="header"
          >
            {slide.title}
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="font-inter text-base text-center leading-6"
          >
            {slide.description}
          </Text>
        </View>
      </View>

      <View className="px-8 pb-8">
        <View className="flex-row justify-center gap-2 mb-8" accessibilityRole="tablist">
          {SLIDES.map((_, index) => {
            const active = index === currentSlide;
            return (
              <View
                key={index}
                accessibilityLabel={`Slide ${index + 1}${active ? ', actuel' : ''}`}
                style={{
                  backgroundColor: active ? colors.turmeric : colors.border,
                  width: active ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                }}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={
            currentSlide === SLIDES.length - 1 ? 'Commencer' : 'Suivant'
          }
          className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
        >
          <Text className="text-malt-deep font-inter-bold text-base font-bold">
            {currentSlide === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
          <ArrowRight size={18} color="#0D0B05" strokeWidth={2.5} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
