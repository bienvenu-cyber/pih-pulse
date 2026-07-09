import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, DeviceEventEmitter, Platform } from 'react-native';
import { Award, Layers, LogOut, CheckCircle, Clock, Palette, Bell, Lock, HelpCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../lib/supabase';
import CollapsibleHeader from '../../components/CollapsibleHeader';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [projectsCount, setProjectsCount] = useState(0);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [themeFlavor, setThemeFlavor] = useState<'malt' | 'oled' | 'light'>('malt');
  const lastOffsetY = useRef(0);
  const router = useRouter();

  const handleScroll = (event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    if (currentOffsetY <= 10) {
      setHeaderVisible(true);
      return;
    }
    if (currentOffsetY > lastOffsetY.current + 15) {
      setHeaderVisible(false);
    } else if (currentOffsetY < lastOffsetY.current - 15) {
      setHeaderVisible(true);
    }
    lastOffsetY.current = currentOffsetY;
  };

  useEffect(() => {
    fetchProfileData();
    async function loadSavedTheme() {
      try {
        const val = Platform.OS === 'web'
          ? localStorage.getItem('theme_flavor')
          : await SecureStore.getItemAsync('theme_flavor');
        if (val === 'oled' || val === 'malt' || val === 'light') {
          setThemeFlavor(val as any);
        }
      } catch (e) {
        console.warn('Could not load theme flavor:', e);
      }
    }
    loadSavedTheme();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // 1. Fetch user's profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }

      // 2. Fetch user's projects count
      const { data: projects, error: projError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (!projError && projects) {
        setProjectsCount(projects.length);
      }

      // 3. Fetch user's assigned missions
      const { data: missions, error: missError } = await supabase
        .from('missions')
        .select('id, title, status, points_reward, projects(name)')
        .eq('assignee_id', user.id);

      if (!missError && missions) {
        setMyMissions(missions);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const toggleThemeFlavor = async (flavor: 'malt' | 'oled' | 'light') => {
    setThemeFlavor(flavor);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('theme_flavor', flavor);
      } else {
        await SecureStore.setItemAsync('theme_flavor', flavor);
      }
    } catch (e) {
      console.warn('Could not save theme flavor:', e);
    }
    DeviceEventEmitter.emit('THEME_FLAVOR_CHANGED', flavor);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  const name = profile?.full_name || 'Utilisateur';
  const username = profile?.username ? `@${profile.username}` : '@sans_nom';
  const roleLabel = profile?.role 
    ? (profile.role === 'product_creator' ? 'Product Owner' : profile.role.charAt(0).toUpperCase() + profile.role.slice(1))
    : 'Développeur';
  const points = profile?.reputation_points ?? 20;
  const skills = profile?.skills || [];
  const bio = profile?.bio || 'Aucune biographie rédigée pour le moment.';

  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const isLight = themeFlavor === 'light';
  
  const colors = {
    bg: isLight ? '#F8F5EC' : (themeFlavor === 'oled' ? '#000000' : '#0D0B05'),
    card: isLight ? '#FFFFFF' : (themeFlavor === 'oled' ? '#0A0A0A' : '#18140B'),
    border: isLight ? '#E6DCBD' : (themeFlavor === 'oled' ? '#1F1F1F' : '#261F12'),
    text: isLight ? '#0D0B05' : '#F5EDD6',
    sable: isLight ? '#705F40' : '#A39171',
    deepBg: isLight ? '#F0EAD6' : (themeFlavor === 'oled' ? '#000000' : '#0D0B05'),
    turmeric: isLight ? '#D9A000' : '#FFBE0B',
  };

  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: colors.bg }}
    >
      <CollapsibleHeader title="Profil" visible={headerVisible} />
      
      <ScrollView 
        className="flex-1"
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 20, paddingTop: 76, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Header Card */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 flex-row items-center gap-4 mb-6"
        >
          {/* Left: Initials Avatar */}
          <View 
            style={{ backgroundColor: colors.deepBg, borderColor: colors.border }}
            className="w-16 h-16 rounded-full border items-center justify-center"
          >
            <Text style={{ color: colors.text }} className="font-space text-2xl font-bold">
              {initials}
            </Text>
          </View>
          
          {/* Right: User Details */}
          <View className="flex-1 gap-1">
            <Text style={{ color: colors.text }} className="font-space text-base font-bold">
              {name}
            </Text>
            <Text style={{ color: colors.sable }} className="font-inter text-xs">
              {username}
            </Text>
            <View 
              style={{ backgroundColor: isLight ? 'rgba(217, 160, 0, 0.1)' : 'rgba(255, 190, 11, 0.1)', borderColor: isLight ? 'rgba(217, 160, 0, 0.2)' : 'rgba(255, 190, 11, 0.2)' }}
              className="border px-2 py-0.5 rounded mt-0.5 self-start"
            >
              <Text style={{ color: colors.turmeric }} className="font-inter-semibold text-[8px] font-bold uppercase tracking-wider">
                {roleLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Scoreboard / Stats Grid */}
        <View className="flex-row gap-4 mb-6">
          {/* Reputation Score Card */}
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-1 border rounded-3xl p-5 justify-between gap-4"
          >
            <View className="flex-row justify-between items-center">
              <Text style={{ color: colors.sable }} className="font-inter text-[10px] font-bold uppercase tracking-wider">
                Réputation
              </Text>
              <Award size={14} color={colors.turmeric} />
            </View>
            <View>
              <Text style={{ color: colors.text }} className="font-space text-3xl font-bold mb-1">
                {points}
              </Text>
              <Text style={{ color: colors.sable }} className="font-inter text-xs">
                points totaux
              </Text>
            </View>
          </View>

          {/* Stats Card */}
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-1 border rounded-3xl p-5 justify-between gap-4"
          >
            <View className="flex-row justify-between items-center">
              <Text style={{ color: colors.sable }} className="font-inter text-[10px] font-bold uppercase tracking-wider">
                Mon Activité
              </Text>
              <Layers size={14} color={colors.sable} />
            </View>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text style={{ color: colors.sable }} className="font-inter text-xs">Projets :</Text>
                <Text style={{ color: colors.text }} className="font-inter-bold text-xs font-bold">{projectsCount}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text style={{ color: colors.sable }} className="font-inter text-xs">Missions :</Text>
                <Text style={{ color: colors.text }} className="font-inter-bold text-xs font-bold">{myMissions.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bio / Bio Detail Card */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-3 mb-6"
        >
          <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">À propos de moi</Text>
          <Text style={{ color: colors.sable }} className="font-inter text-sm leading-6">
            {bio}
          </Text>
        </View>

        {/* Skills Section */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-4 mb-6"
        >
          <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
            Mes Compétences
          </Text>
          {skills.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {skills.map((skill: string) => (
                <View 
                  key={skill}
                  style={{ backgroundColor: colors.deepBg, borderColor: colors.border }}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <Text style={{ color: colors.text }} className="font-inter text-xs font-medium">
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.sable }} className="font-inter text-xs">
              Aucune compétence renseignée.
            </Text>
          )}
        </View>

        {/* My Missions List */}
        {myMissions.length > 0 && (
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-3xl p-5 gap-4 mb-6"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">Missions assignées</Text>
            <View className="gap-3">
              {myMissions.map((miss: any) => {
                const pName = miss.projects?.name || 'Projet';
                const isDone = miss.status === 'completed';
                return (
                  <View 
                    key={miss.id} 
                    style={{ backgroundColor: colors.deepBg, borderColor: colors.border }}
                    className="flex-row items-center justify-between border p-3.5 rounded-2xl"
                  >
                    <View className="flex-1 pr-3 gap-1">
                      <Text style={{ color: colors.sable }} className="font-inter text-[9px] uppercase font-bold tracking-wider">
                        {pName}
                      </Text>
                      <Text style={{ color: colors.text }} className="font-space text-xs font-bold leading-5">
                        {miss.title}
                      </Text>
                    </View>

                    <View className="items-end gap-1.5">
                      <Text style={{ color: colors.turmeric }} className="font-inter-semibold text-xs font-semibold">
                        +{miss.points_reward} pts
                      </Text>
                      <View className="flex-row items-center gap-1">
                        {isDone ? (
                          <>
                            <CheckCircle size={10} color="#7CB87A" />
                            <Text className="text-kaki font-inter text-[10px]">Validée</Text>
                          </>
                        ) : (
                          <>
                            <Clock size={10} color={colors.turmeric} />
                            <Text style={{ color: colors.turmeric }} className="font-inter text-[10px]">En cours</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Theme Customizer Card */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-4 mb-6"
        >
          <View className="flex-row items-center gap-2">
            <Palette size={16} color={colors.turmeric} />
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">Apparence de l'app</Text>
          </View>
          
          <Text style={{ color: colors.sable }} className="font-inter text-xs leading-5">
            Sélectionnez votre style de thème. Vous pouvez basculer entre nos saveurs sombres exclusives ou notre thème papier clair.
          </Text>
          
          <View className="gap-2 mt-1">
            {/* Malt Premium (Sombre Doré) */}
            <Pressable
              onPress={() => toggleThemeFlavor('malt')}
              style={{ 
                backgroundColor: themeFlavor === 'malt' ? colors.turmeric : colors.deepBg,
                borderColor: themeFlavor === 'malt' ? colors.turmeric : colors.border
              }}
              className="flex-row justify-between items-center px-4 h-12 rounded-xl border"
            >
              <Text 
                style={{ color: themeFlavor === 'malt' ? '#0D0B05' : colors.text }}
                className="font-inter text-xs font-bold"
              >
                Malt Premium (Sombre Doré)
              </Text>
              {themeFlavor === 'malt' && <CheckCircle size={14} color="#0D0B05" />}
            </Pressable>

            {/* Noir Absolu OLED */}
            <Pressable
              onPress={() => toggleThemeFlavor('oled')}
              style={{ 
                backgroundColor: themeFlavor === 'oled' ? colors.turmeric : colors.deepBg,
                borderColor: themeFlavor === 'oled' ? colors.turmeric : colors.border
              }}
              className="flex-row justify-between items-center px-4 h-12 rounded-xl border"
            >
              <Text 
                style={{ color: themeFlavor === 'oled' ? '#0D0B05' : colors.text }}
                className="font-inter text-xs font-bold"
              >
                Noir Absolu OLED (Sombre Noir)
              </Text>
              {themeFlavor === 'oled' && <CheckCircle size={14} color="#0D0B05" />}
            </Pressable>

            {/* Papier & Or (Mode Clair) */}
            <Pressable
              onPress={() => toggleThemeFlavor('light')}
              style={{ 
                backgroundColor: themeFlavor === 'light' ? colors.turmeric : colors.deepBg,
                borderColor: themeFlavor === 'light' ? colors.turmeric : colors.border
              }}
              className="flex-row justify-between items-center px-4 h-12 rounded-xl border"
            >
              <Text 
                style={{ color: themeFlavor === 'light' ? '#0D0B05' : colors.text }}
                className="font-inter text-xs font-bold"
              >
                Papier & Or (Mode Clair)
              </Text>
              {themeFlavor === 'light' && <CheckCircle size={14} color="#0D0B05" />}
            </Pressable>
          </View>
        </View>

        {/* Preferences / Options Card */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-1 mb-6"
        >
          <View className="flex-row items-center gap-2 px-1 py-2 mb-2">
            <Bell size={16} color={colors.sable} />
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">Options de compte</Text>
          </View>

          <Pressable 
            style={{ borderBottomColor: isLight ? 'rgba(230, 220, 189, 0.4)' : 'rgba(38, 31, 18, 0.4)' }}
            className="flex-row justify-between items-center py-3 border-b active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Lock size={14} color={colors.sable} />
              <Text style={{ color: colors.text }} className="font-inter text-xs">Sécurité & Connexion</Text>
            </View>
            <ChevronRight size={14} color={colors.sable} />
          </Pressable>

          <Pressable className="flex-row justify-between items-center py-3 active:opacity-80">
            <View className="flex-row items-center gap-3">
              <HelpCircle size={14} color={colors.sable} />
              <Text style={{ color: colors.text }} className="font-inter text-xs">Centre d'aide & FAQ</Text>
            </View>
            <ChevronRight size={14} color={colors.sable} />
          </Pressable>
        </View>

        {/* Disconnect CTA */}
        <Pressable 
          onPress={handleLogout}
          className="bg-corail/10 border border-corail/25 h-14 rounded-2xl flex-row justify-center items-center gap-2 active:bg-corail/20 mt-4"
        >
          <LogOut size={16} color="#E8634A" />
          <Text className="text-corail font-inter-bold text-base font-bold">
            Se déconnecter
          </Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
