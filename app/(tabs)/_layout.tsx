import { Tabs } from 'expo-router';
import { Home, Rocket, Target, Users, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFBE0B', // Turmeric
        tabBarInactiveTintColor: '#A89060', // Sable
        tabBarStyle: {
          backgroundColor: '#1A150A', // Malt noir
          borderTopColor: '#3D3118', // Malt clair
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#1A150A', // Malt noir
          borderBottomColor: '#3D3118',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: '#F5EDD6', // Crème
          fontWeight: '700',
        },
        headerTintColor: '#F5EDD6',
        headerTitleAlign: 'left',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'PIH Pulse',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projets"
        options={{
          title: 'Projets',
          headerTitle: 'Projets en cours',
          tabBarIcon: ({ color, size }) => (
            <Rocket size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          headerTitle: 'Missions pratiques',
          tabBarIcon: ({ color, size }) => (
            <Target size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipes"
        options={{
          title: 'Équipes',
          headerTitle: 'Communauté',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Profil',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

