import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();

  const handleVerify = async () => {
    if (code.length < 6) {
      setErrorMsg('Veuillez entrer le code de validation reçu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Vérification du code OTP auprès de Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        email: (email as string).trim(),
        token: code.trim(),
        type: 'signup' // Indique qu'il s'agit d'une confirmation d'inscription
      });

      if (error) {
        setErrorMsg('Code incorrect ou expiré. Veuillez vérifier votre boîte mail.');
        setLoading(false);
        return;
      }

      // Code validé avec succès ! L'utilisateur est connecté.
      // Redirection vers l'étape de configuration du profil
      router.replace('/profile-setup');
    } catch (err: any) {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-malt-deep justify-center">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
          className="px-6 py-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[400px] self-center gap-8 py-6">
            
            {/* Header */}
            <View className="items-center gap-1.5 mb-2">
              <View className="w-12 h-12 rounded-2xl bg-malt-card border border-malt items-center justify-center mb-3">
                <ShieldCheck size={24} color="#FFBE0B" />
              </View>
              <Text className="text-creme font-space text-2xl font-bold tracking-tight">
                Vérification
              </Text>
              <Text className="text-sable font-inter text-xs text-center px-4">
                Saisissez le code de validation reçu par e-mail à {email}
              </Text>
            </View>

            {/* Error Message */}
            {errorMsg ? (
              <View className="bg-corail/10 border border-corail/20 p-3.5 rounded-xl">
                <Text className="text-corail font-inter text-xs font-medium text-center">
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* OTP Input Field */}
            <View className="gap-2">
              <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider ml-1 text-center">
                Code de validation
              </Text>
              <TextInput
                placeholder="00000000"
                placeholderTextColor="#A39171"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
                editable={!loading}
                className="h-14 border border-malt bg-malt-card rounded-2xl text-center text-creme font-space text-2xl tracking-[6px] font-bold"
              />
            </View>

            {/* CTA Verify */}
            <View className="gap-4">
              <Pressable 
                onPress={handleVerify}
                disabled={loading}
                className="bg-turmeric h-12 rounded-xl flex-row justify-center items-center gap-2 active:opacity-90"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0D0B05" />
                ) : (
                  <>
                    <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                      Valider le compte
                    </Text>
                    <ArrowRight size={16} color="#0D0B05" strokeWidth={2.5} />
                  </>
                )}
              </Pressable>

              {/* Back to register link */}
              <Pressable 
                onPress={handleBack} 
                disabled={loading}
                className="flex-row justify-center items-center gap-1.5"
              >
                <ArrowLeft size={12} color="#A39171" />
                <Text className="text-sable font-inter text-xs font-semibold hover:text-creme">
                  Retour à l'inscription
                </Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
