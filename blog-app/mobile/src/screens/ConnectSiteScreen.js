import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Card,
  Snackbar,
  HelperText,
} from 'react-native-paper';
import api from '../config/api';

const ConnectSiteScreen = ({ navigation }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleConnect = async () => {
    if (!siteUrl.trim() || !username.trim() || !appPassword.trim()) {
      showSnackbar('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/wordpress/connect-site', {
        siteUrl: siteUrl.trim(),
        username: username.trim(),
        appPassword: appPassword.trim(),
      });

      if (response.data.success) {
        showSnackbar('Site connected successfully!');
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to connect to WordPress site';
      showSnackbar(message);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Connect WordPress Site</Title>
            <Paragraph style={styles.description}>
              Enter your WordPress site details to start publishing posts directly from your phone.
            </Paragraph>

            <TextInput
              label="WordPress Site URL"
              value={siteUrl}
              onChangeText={setSiteUrl}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              placeholder="https://yoursite.wordpress.com"
              keyboardType="url"
              autoCapitalize="none"
            />
            <HelperText type="info" visible={siteUrl.length > 0 && !isValidUrl(siteUrl)}>
              Please enter a valid URL
            </HelperText>

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              placeholder="Your WordPress username"
              autoCapitalize="none"
            />

            <TextInput
              label="Application Password"
              value={appPassword}
              onChangeText={setAppPassword}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              secureTextEntry
              placeholder="WordPress Application Password"
            />

            <Card style={styles.infoCard}>
              <Card.Content>
                <Title style={styles.infoTitle}>📝 How to get Application Password:</Title>
                <Paragraph style={styles.infoText}>
                  1. Go to your WordPress admin → Users → Profile{'\n'}
                  2. Scroll down to "Application Passwords"{'\n'}
                  3. Enter a name (e.g., "Blog Publisher App"){'\n'}
                  4. Click "Add New Application Password"{'\n'}
                  5. Copy the generated password and paste it above
                </Paragraph>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleConnect}
              loading={loading}
              disabled={loading || !siteUrl.trim() || !username.trim() || !appPassword.trim()}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {loading ? 'Connecting...' : 'Connect Site'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 8,
  },
  infoCard: {
    marginVertical: 16,
    backgroundColor: '#e3f2fd',
  },
  infoTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default ConnectSiteScreen;