import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SitesScreen from './src/screens/SitesScreen';
import ConnectSiteScreen from './src/screens/ConnectSiteScreen';
import PostsScreen from './src/screens/PostsScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import DraftsScreen from './src/screens/DraftsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const AuthStack = createStackNavigator();
const MainTab = createBottomTabNavigator();
const PostsStack = createStackNavigator();
const SitesStack = createStackNavigator();

function PostsStackNavigator() {
  return (
    <PostsStack.Navigator>
      <PostsStack.Screen 
        name="PostsList" 
        component={PostsScreen} 
        options={{ title: 'Posts' }}
      />
      <PostsStack.Screen 
        name="CreatePost" 
        component={CreatePostScreen} 
        options={{ title: 'Create Post', presentation: 'modal' }}
      />
    </PostsStack.Navigator>
  );
}

function SitesStackNavigator() {
  return (
    <SitesStack.Navigator>
      <SitesStack.Screen 
        name="SitesList" 
        component={SitesScreen} 
        options={{ title: 'My Sites' }}
      />
      <SitesStack.Screen 
        name="ConnectSite" 
        component={ConnectSiteScreen} 
        options={{ title: 'Connect Site', presentation: 'modal' }}
      />
    </SitesStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Sites') {
            iconName = focused ? 'globe' : 'globe-outline';
          } else if (route.name === 'Posts') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Drafts') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <MainTab.Screen name="Sites" component={SitesStackNavigator} />
      <MainTab.Screen name="Posts" component={PostsStackNavigator} />
      <MainTab.Screen name="Drafts" component={DraftsScreen} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
