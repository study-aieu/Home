import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import apiService from '../services/api';

interface ConnectSiteScreenProps {
  navigation: any;
}

const ConnectSiteScreen: React.FC<ConnectSiteScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [applicationPassword, setApplicationPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    url?: string;
    username?: string;
    applicationPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      name?: string;
      url?: string;
      username?: string;
      applicationPassword?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Site name is required';
    }

    if (!url.trim()) {
      newErrors.url = 'Site URL is required';
    } else if (!/^https?:\/\/.+/.test(url.trim())) {
      newErrors.url = 'Please enter a valid URL (starting with http:// or https://)';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!applicationPassword.trim()) {
      newErrors.applicationPassword = 'Application password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    try {
      // Create a temporary connection to test
      const testData = await apiService.connectSite(
        name.trim(),
        url.trim(),
        username.trim(),
        applicationPassword.trim()
      );

      Alert.alert(
        'Connection Successful',
        'Your WordPress site has been connected successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Connection test failed:', error);
      
      let errorMessage = 'Failed to connect to WordPress site. Please check your credentials.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Connection Failed', errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await apiService.connectSite(
        name.trim(),
        url.trim(),
        username.trim(),
        applicationPassword.trim()
      );

      Alert.alert(
        'Site Connected',
        'Your WordPress site has been connected successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Connect site error:', error);
      
      let errorMessage = 'Failed to connect site. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Connection Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Connect WordPress Site</Text>
          <Text style={styles.subtitle}>
            Connect your WordPress site to start publishing blog posts
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="My Blog"
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site URL</Text>
            <TextInput
              style={[styles.input, errors.url && styles.inputError]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://yourblog.com"
              placeholderTextColor="#999"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.url && <Text style={styles.errorText}>{errors.url}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              value={username}
              onChangeText={setUsername}
              placeholder="WordPress username"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Application Password</Text>
            <TextInput
              style={[styles.input, errors.applicationPassword && styles.inputError]}
              value={applicationPassword}
              onChangeText={setApplicationPassword}
              placeholder="WordPress application password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.applicationPassword && (
              <Text style={styles.errorText}>{errors.applicationPassword}</Text>
            )}
            <Text style={styles.helpText}>
              Generate an application password in your WordPress admin under Users → Profile
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.buttonDisabled]}
              onPress={testConnection}
              disabled={isTesting || isLoading}
            >
              {isTesting ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.testButtonText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.connectButton, isLoading && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={isLoading || isTesting}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Site</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 5,
  },
  helpText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 20,
  },
  testButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ConnectSiteScreen;