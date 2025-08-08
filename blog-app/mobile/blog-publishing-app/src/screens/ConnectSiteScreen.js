import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Card, 
  Title, 
  Paragraph,
  Divider,
  List,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { wordpressAPI } from '../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

const ConnectSiteScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    applicationPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Site name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    }

    // URL validation
    if (!formData.url.trim()) {
      newErrors.url = 'WordPress site URL is required';
    } else {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(formData.url.trim())) {
        newErrors.url = 'Please enter a valid URL (include http:// or https://)';
      }
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    // Application password validation
    if (!formData.applicationPassword.trim()) {
      newErrors.applicationPassword = 'Application password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const siteData = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        username: formData.username.trim(),
        applicationPassword: formData.applicationPassword.trim(),
      };

      const result = await wordpressAPI.connectSite(siteData);

      if (result.success) {
        Alert.alert(
          'Success!',
          'WordPress site connected successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Connection Failed', result.message || 'Failed to connect to WordPress site');
      }
    } catch (error) {
      console.error('Connect site error:', error);
      const message = error.response?.data?.message || 'Failed to connect to WordPress site';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const openApplicationPasswordHelp = () => {
    Linking.openURL('https://wordpress.org/support/article/application-passwords/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.header}>
              <Ionicons name="link" size={32} color={COLORS.primary} />
              <Title style={styles.title}>Connect WordPress Site</Title>
              <Paragraph style={styles.subtitle}>
                Enter your WordPress site credentials to start publishing
              </Paragraph>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Site Name"
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                mode="outlined"
                placeholder="My Blog"
                style={styles.input}
                error={!!errors.name}
                disabled={isLoading}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}

              <TextInput
                label="WordPress Site URL"
                value={formData.url}
                onChangeText={(value) => updateFormData('url', value)}
                mode="outlined"
                placeholder="https://yourblog.com"
                autoCapitalize="none"
                keyboardType="url"
                style={styles.input}
                error={!!errors.url}
                disabled={isLoading}
              />
              {errors.url && (
                <Text style={styles.errorText}>{errors.url}</Text>
              )}

              <TextInput
                label="WordPress Username"
                value={formData.username}
                onChangeText={(value) => updateFormData('username', value)}
                mode="outlined"
                placeholder="your-username"
                autoCapitalize="none"
                style={styles.input}
                error={!!errors.username}
                disabled={isLoading}
              />
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}

              <TextInput
                label="Application Password"
                value={formData.applicationPassword}
                onChangeText={(value) => updateFormData('applicationPassword', value)}
                mode="outlined"
                placeholder="xxxx xxxx xxxx xxxx"
                autoCapitalize="none"
                secureTextEntry
                style={styles.input}
                error={!!errors.applicationPassword}
                disabled={isLoading}
              />
              {errors.applicationPassword && (
                <Text style={styles.errorText}>{errors.applicationPassword}</Text>
              )}

              <Button
                mode="contained"
                onPress={handleConnect}
                loading={isLoading}
                disabled={isLoading}
                style={styles.connectButton}
                contentStyle={styles.buttonContent}
              >
                Connect Site
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.instructionsCard}>
          <Card.Content>
            <List.Accordion
              title="How to get Application Password"
              titleStyle={styles.accordionTitle}
              expanded={showInstructions}
              onPress={() => setShowInstructions(!showInstructions)}
              left={props => <List.Icon {...props} icon="help-circle" />}
            >
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionStep}>
                  1. Log into your WordPress admin dashboard
                </Text>
                <Text style={styles.instructionStep}>
                  2. Go to Users → Profile
                </Text>
                <Text style={styles.instructionStep}>
                  3. Scroll down to "Application Passwords"
                </Text>
                <Text style={styles.instructionStep}>
                  4. Enter a name (e.g., "Mobile App")
                </Text>
                <Text style={styles.instructionStep}>
                  5. Click "Add New Application Password"
                </Text>
                <Text style={styles.instructionStep}>
                  6. Copy the generated password
                </Text>
                
                <Divider style={styles.divider} />
                
                <Button
                  mode="outlined"
                  onPress={openApplicationPasswordHelp}
                  style={styles.helpButton}
                  icon="open-in-new"
                >
                  WordPress Documentation
                </Button>
              </View>
            </List.Accordion>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoTitle}>Important Notes</Text>
            </View>
            <Text style={styles.infoText}>
              • Your credentials are stored securely on your device
            </Text>
            <Text style={styles.infoText}>
              • Application passwords are safer than regular passwords
            </Text>
            <Text style={styles.infoText}>
              • You can revoke access anytime from WordPress admin
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContainer: {
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  connectButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  buttonContent: {
    height: 48,
  },
  instructionsCard: {
    marginBottom: SPACING.md,
    elevation: 1,
  },
  accordionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  instructionsContent: {
    padding: SPACING.md,
  },
  instructionStep: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.md,
  },
  divider: {
    marginVertical: SPACING.md,
  },
  helpButton: {
    borderColor: COLORS.primary,
  },
  infoCard: {
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.md,
  },
});

export default ConnectSiteScreen;