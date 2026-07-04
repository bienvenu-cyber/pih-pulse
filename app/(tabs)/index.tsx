import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PIH Pulse</Text>
      <Text style={styles.subtitle}>Projet initialisé avec succès.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2312',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFBE0B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#F5EDD6',
  },
});
