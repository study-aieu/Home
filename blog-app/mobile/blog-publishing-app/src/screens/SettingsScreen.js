import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { List, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <Ionicons name="person-circle" size={64} color={COLORS.primary} />
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Settings List */}
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="Profile"
            description="Edit your profile information"
            left={props => <List.Icon {...props} icon="account-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="Connected Sites"
            description="Manage your WordPress connections"
            left={props => <List.Icon {...props} icon="link" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>App Settings</List.Subheader>
          
          <List.Item
            title="Notifications"
            description="Manage notification preferences"
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="Storage"
            description="Manage local data and drafts"
            left={props => <List.Icon {...props} icon="folder" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Support</List.Subheader>
          
          <List.Item
            title="Help & Support"
            description="Get help and contact support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="About"
            description="App version and information"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={COLORS.error}
            icon="logout"
          >
            Logout
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  userSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  userEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  divider: {
    marginVertical: SPACING.md,
  },
  logoutSection: {
    padding: SPACING.lg,
    marginTop: 'auto',
  },
  logoutButton: {
    borderColor: COLORS.error,
  },
});

export default SettingsScreen;