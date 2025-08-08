import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import api, { setToken } from '../api/client';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email, password });
      await setToken(data.token);
      navigation.replace('ConnectSite');
    } catch (e) {
      Alert.alert('Login failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Login</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <Button title={loading ? '...' : 'Login'} onPress={onLogin} />
      <Button title="Need an account? Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}