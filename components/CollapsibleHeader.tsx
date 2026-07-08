import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, DeviceEventEmitter } from 'react-native';
import { Bell, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface CollapsibleHeaderProps {
  title: string;
  visible: boolean;
}

export default function CollapsibleHeader({ title, visible }: CollapsibleHeaderProps) {
  const router = useRouter();
  const [themeFlavor, setThemeFlavor] = useState<'malt' | 'oled' | 'light'>('malt');

  useEffect(() => {
    SecureStore.getItemAsync('theme_flavor').then((val) => {
      if (val === 'oled' || val === 'malt' || val === 'light') {
        setThemeFlavor(val as any);
      }
    });

    const sub = DeviceEventEmitter.addListener('THEME_FLAVOR_CHANGED', (flavor) => {
      if (flavor === 'oled' || flavor === 'malt' || flavor === 'light') {
        setThemeFlavor(flavor);
      }
    });

    return () => sub.remove();
  }, []);

  if (!visible) return null;

  const isLight = themeFlavor === 'light';
  const bg = isLight ? 'rgba(240, 234, 214, 0.8)' : 'rgba(8, 7, 3, 0.8)';
  const border = isLight ? '#E6DCBD' : '#261F12';
  const titleColor = isLight ? '#0D0B05' : '#F5EDD6';
  const iconColor = isLight ? '#705F40' : '#A39171';
  const btnBg = isLight ? '#FFFFFF' : '#18140B';
  const btnBorder = isLight ? '#E6DCBD' : '#261F12';

  return (
    <View 
      style={{ 
        backdropFilter: 'blur(20px)', 
        webkitBackdropFilter: 'blur(20px)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: bg,
        borderBottomColor: border,
        borderBottomWidth: 1,
      } as any}
      className="h-14 flex-row items-center justify-between px-6"
    >
      <Text style={{ color: titleColor }} className="font-space text-lg font-bold">{title}</Text>
      
      <View className="flex-row items-center gap-2">
        <Pressable 
          onPress={() => router.push('/notifications')}
          style={{ backgroundColor: btnBg, borderColor: btnBorder }}
          className="w-9 h-9 rounded-full border items-center justify-center active:opacity-85"
        >
          <Bell size={16} color={iconColor} />
        </Pressable>
        <Pressable 
          onPress={() => router.push('/chat')}
          style={{ backgroundColor: btnBg, borderColor: btnBorder }}
          className="w-9 h-9 rounded-full border items-center justify-center active:opacity-85"
        >
          <Send size={14} color={iconColor} style={{ transform: [{ rotate: '30deg' }, { translateX: -0.5 }, { translateY: -0.5 }] }} />
        </Pressable>
      </View>
    </View>
  );
}
