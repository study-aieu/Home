import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import api from '../api/client';

export default function ConnectSiteScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onConnect = async () => {
    setLoading(true);
    try {
      await api.post('/connect-site', { url, username, appPassword });
      navigation.replace('Posts');
    } catch (e) {
      Alert.alert('Connection failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Connect WordPress Site</Text>
      <TextInput placeholder="Site URL (example.com)" autoCapitalize="none" value={url} onChangeText={setUrl} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <TextInput placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <TextInput placeholder="Application Password" autoCapitalize="none" secureTextEntry value={appPassword} onChangeText={setAppPassword} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <Button title={loading ? '...' : 'Connect'} onPress={onConnect} />
    </View>
  );
}