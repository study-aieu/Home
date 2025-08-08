import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import DraftsScreen from '../screens/DraftsScreen';
import PostsScreen from '../screens/PostsScreen';
import SitesScreen from '../screens/SitesScreen';
import ConnectSiteScreen from '../screens/ConnectSiteScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Posts':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Drafts':
              iconName = focused ? 'document' : 'document-outline';
              break;
            case 'Sites':
              iconName = focused ? 'globe' : 'globe-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
      <Tab.Screen 
        name="Posts" 
        component={PostsScreen}
        options={{ title: 'My Posts' }}
      />
      <Tab.Screen 
        name="Drafts" 
        component={DraftsScreen}
        options={{ title: 'Drafts' }}
      />
      <Tab.Screen 
        name="Sites" 
        component={SitesScreen}
        options={{ title: 'Sites' }}
      />
    </Tab.Navigator>
  );
};

// Main Stack
const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MainTabs"
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ConnectSite"
      component={ConnectSiteScreen}
      options={{ title: 'Connect WordPress Site' }}
    />
    <Stack.Screen
      name="CreatePost"
      component={CreatePostScreen}
      options={{ title: 'Create New Post' }}
    />
  </Stack.Navigator>
);

// Loading Component
const LoadingScreen = () => (
  <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <div>Loading...</div>
  </div>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;