import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Button, Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://slserver:3003';

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/profiles`);
      const data = await response.json();
      setProfiles(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch profiles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createTestProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          phone: '+1234567890',
        }),
      });
      const data = await response.json();
      Alert.alert('Success', 'Profile created!');
      fetchProfiles();
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile');
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Moydrug V2</Text>
      <View style={styles.buttonContainer}>
        <Button title="Refresh Profiles" onPress={fetchProfiles} />
        <Button title="Create Test Profile" onPress={createTestProfile} />
      </View>
      <View style={styles.profilesContainer}>
        <Text style={styles.subtitle}>Profiles ({profiles.length})</Text>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          profiles.map((profile, index) => (
            <View key={index} style={styles.profileItem}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          ))
        )}
        {!loading && profiles.length === 0 && (
          <Text style={styles.emptyText}>No profiles found. Create one!</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  profilesContainer: {
    marginTop: 20,
  },
  profileItem: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});