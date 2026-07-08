import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Layers, Target, Trophy } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Pulse de l’Écosystème',
    description: 'Une plateforme active pour connecter les talents du Parakou Innovation Hub (PIH). Partagez vos idées et bâtissez ensemble.',
    icon: Layers,
    color: '#FFBE0B', // Turmeric
  },
  {
    title: 'Projets Réels & MVPs',
    description: 'Rejoignez des équipes pluridisciplinaires pour transformer de simples concepts en produits technologiques concrets et viables.',
    icon: Target,
    color: '#7CB87A', // Kaki
  },
  {
    title: 'Missions & Réputation',
    description: 'Réalisez des missions techniques (code, design, marketing), accumulez des points de réputation et validez vos compétences aux yeux de tous.',
    icon: Trophy,
    color: '#E8634A', // Corail
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  const IconComponent = SLIDES[currentSlide].icon;

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* Skip Button (uniquement si ce n'est pas le dernier slide) */}
      <View className="h-12 justify-center items-end px-6">
        {currentSlide < SLIDES.length - 1 && (
          <Pressable onPress={handleSkip}>
            <Text className="text-sable font-inter text-sm font-medium">Passer</Text>
          </Pressable>
        )}
      </View>

      {/* Slide Content */}
      <View className="flex-1 justify-center items-center px-8">
        {/* Animated Icon Circle */}
        <View 
          className="w-40 h-40 rounded-full justify-center items-center mb-12 border border-malt"
          style={{ backgroundColor: '#18140B' }}
        >
          <IconComponent size={64} color={SLIDES[currentSlide].color} strokeWidth={1.5} />
        </View>

        {/* Text Area */}
        <View className="items-center">
          <Text className="text-creme font-space text-3xl font-bold text-center mb-4 tracking-tight">
            {SLIDES[currentSlide].title}
          </Text>
          <Text className="text-sable font-inter text-base text-center leading-6">
            {SLIDES[currentSlide].description}
          </Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View className="px-8 pb-12">
        {/* Pagination Dots */}
        <View className="flex-row justify-center gap-2 mb-8">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-6 bg-turmeric' : 'w-2 bg-sable/30'
              }`}
            />
          ))}
        </View>

        {/* CTA Button */}
        <Pressable 
          onPress={handleNext}
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
