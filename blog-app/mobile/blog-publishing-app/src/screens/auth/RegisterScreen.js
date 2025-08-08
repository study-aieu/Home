import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/config';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const { register, isLoading } = useAuth();

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const result = await register(userData);
      
      if (!result.success) {
        Alert.alert('Registration Failed', result.message);
      }
      // Navigation will be handled by the auth state change
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons 
              name="create-outline" 
              size={64} 
              color={COLORS.primary} 
              style={styles.logo}
            />
            <Title style={styles.title}>Create Account</Title>
            <Paragraph style={styles.subtitle}>
              Join us to start publishing your blog posts
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <TextInput
                    label="First Name"
                    value={formData.firstName}
                    onChangeText={(value) => updateFormData('firstName', value)}
                    mode="outlined"
                    autoCapitalize="words"
                    style={[styles.input, styles.nameInput]}
                    error={!!errors.firstName}
                    disabled={isLoading}
                  />
                  <TextInput
                    label="Last Name"
                    value={formData.lastName}
                    onChangeText={(value) => updateFormData('lastName', value)}
                    mode="outlined"
                    autoCapitalize="words"
                    style={[styles.input, styles.nameInput]}
                    error={!!errors.lastName}
                    disabled={isLoading}
                  />
                </View>
                {(errors.firstName || errors.lastName) && (
                  <View style={styles.nameErrorRow}>
                    {errors.firstName && (
                      <Text style={[styles.errorText, styles.nameErrorText]}>
                        {errors.firstName}
                      </Text>
                    )}
                    {errors.lastName && (
                      <Text style={[styles.errorText, styles.nameErrorText]}>
                        {errors.lastName}
                      </Text>
                    )}
                  </View>
                )}

                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  error={!!errors.email}
                  disabled={isLoading}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  style={styles.input}
                  error={!!errors.password}
                  disabled={isLoading}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                <TextInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  error={!!errors.confirmPassword}
                  disabled={isLoading}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? "eye-off" : "eye"}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                >
                  Create Account
                </Button>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  card: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  form: {
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  nameInput: {
    flex: 1,
  },
  nameErrorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  nameErrorText: {
    flex: 1,
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
  registerButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  buttonContent: {
    height: 48,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  linkText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;