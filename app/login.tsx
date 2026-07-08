import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, Apple } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';

// Custom SVG Icons for OAuth
const GithubIcon = ({ size = 20, color = "#F5EDD6" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </Svg>
);

const GoogleIcon = ({ size = 20, color = "#F5EDD6" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={color} />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={color} />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill={color} />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={color} />
  </Svg>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMsg("Identifiants incorrects. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg('Une erreur est survenue.');
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    router.push('/register');
  };

  const handleSocialLogin = (provider: string) => {
    router.replace('/profile-setup');
  };

  return (
    <SafeAreaView className="flex-1 bg-malt-deep justify-center">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1 justify-center"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
          className="px-6 py-8"
          showsVerticalScrollIndicator={false}
        >
          {/* Centered card wrapper for wider screens (web/Safari) */}
          <View className="w-full max-w-[400px] self-center gap-8 py-6">
            
            {/* Header Area */}
            <View className="items-center gap-1.5 mb-2">
              <View className="w-12 h-12 rounded-2xl bg-malt-card border border-malt items-center justify-center mb-3">
                <Text className="text-turmeric font-space text-lg font-bold">P</Text>
              </View>
              <Text className="text-creme font-space text-2xl font-bold tracking-tight">
                Connexion
              </Text>
              <Text className="text-sable font-inter text-xs">
                Entrez vos accès pour accéder à Pulse
              </Text>
            </View>

            {/* Error Message Card */}
            {errorMsg ? (
              <View className="bg-corail/10 border border-corail/20 p-3.5 rounded-xl">
                <Text className="text-corail font-inter text-xs font-medium text-center">
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View className="gap-4">
              {/* Email Field */}
              <View className="gap-1.5">
                <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider ml-1">
                  Email
                </Text>
                <View className="flex-row items-center h-12 rounded-xl border px-3 bg-malt-card border-malt active:border-sable">
                  <Mail size={16} color="#A39171" />
                  <TextInput
                    placeholder="nom@exemple.com"
                    placeholderTextColor="#A39171"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                    className="flex-1 text-creme font-inter text-sm h-full ml-2"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="gap-1.5">
                <View className="flex-row justify-between items-center ml-1 pr-1">
                  <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">
                    Mot de passe
                  </Text>
                  <Pressable disabled={loading}>
                    <Text className="text-sable font-inter text-[10px] font-medium hover:text-creme">
                      Oublié ?
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-row items-center h-12 rounded-xl border px-3 bg-malt-card border-malt">
                  <Lock size={16} color="#A39171" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#A39171"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                    className="flex-1 text-creme font-inter text-sm h-full ml-2"
                  />
                </View>
              </View>
            </View>

            {/* Login Button */}
            <View className="gap-4 mt-2">
              <Pressable 
                onPress={handleLogin}
                disabled={loading}
                className="bg-turmeric h-12 rounded-xl flex-row justify-center items-center gap-2 active:opacity-90"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0D0B05" />
                ) : (
                  <>
                    <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                      Se connecter
                    </Text>
                    <ArrowRight size={16} color="#0D0B05" strokeWidth={2.5} />
                  </>
                )}
              </Pressable>

              {/* Register Link */}
              <View className="flex-row justify-center items-center gap-1.5 mt-1">
                <Text className="text-sable font-inter text-xs">
                  Pas encore membre ?
                </Text>
                <Pressable onPress={handleGoToRegister} disabled={loading}>
                  <Text className="text-turmeric font-inter-bold text-xs font-bold">
                    S'inscrire
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Divider "OU" */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1px] bg-malt" />
              <span className="text-sable font-inter text-[9px] font-bold uppercase tracking-widest">
                Ou continuer avec
              </span>
              <div className="flex-1 h-[1px] bg-malt" />
            </div>

            {/* Social Logins */}
            <View className="flex-row justify-center gap-3.5">
              {/* Google */}
              <Pressable 
                onPress={() => handleSocialLogin('google')}
                disabled={loading}
                className="w-11 h-11 rounded-full border bg-malt-card border-malt items-center justify-center active:bg-malt-hover"
              >
                <GoogleIcon size={16} color="#F5EDD6" />
              </Pressable>

              {/* GitHub */}
              <Pressable 
                onPress={() => handleSocialLogin('github')}
                disabled={loading}
                className="w-11 h-11 rounded-full border bg-malt-card border-malt items-center justify-center active:bg-malt-hover"
              >
                <GithubIcon size={16} color="#F5EDD6" />
              </Pressable>

              {/* Apple */}
              <Pressable 
                onPress={() => handleSocialLogin('apple')}
                disabled={loading}
                className="w-11 h-11 rounded-full border bg-malt-card border-malt items-center justify-center active:bg-malt-hover"
              >
                <Apple size={16} color="#F5EDD6" />
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
