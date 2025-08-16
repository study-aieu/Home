import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList, RootStackParamList, User } from '../types';

// Import main screens
import HomeScreen from '../screens/main/HomeScreen';
import DraftsScreen from '../screens/main/DraftsScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';
import PostsScreen from '../screens/main/PostsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Import detail screens
import DraftEditorScreen from '../screens/drafts/DraftEditorScreen';
import AddConnectionScreen from '../screens/connections/AddConnectionScreen';
import EditConnectionScreen from '../screens/connections/EditConnectionScreen';
import ProvidersScreen from '../screens/providers/ProvidersScreen';
import ProviderDetailScreen from '../screens/providers/ProviderDetailScreen';
import PostDetailScreen from '../screens/posts/PostDetailScreen';
import PublishScreen from '../screens/publish/PublishScreen';
import MultiPublishScreen from '../screens/publish/MultiPublishScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

interface MainNavigatorProps {
  user: User;
  onLogout: () => void;
}

const TabNavigator: React.FC<MainNavigatorProps> = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Drafts':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Connections':
              iconName = focused ? 'link' : 'link-outline';
              break;
            case 'Posts':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Drafts">
        {(props) => <DraftsScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Connections">
        {(props) => <ConnectionsScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Posts">
        {(props) => <PostsScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC<MainNavigatorProps> = ({ user, onLogout }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Home">
        {(props) => <TabNavigator {...props} user={user} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen 
        name="DraftEditor" 
        component={DraftEditorScreen}
        options={{
          headerShown: true,
          title: 'Edit Draft',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="AddConnection" 
        component={AddConnectionScreen}
        options={{
          headerShown: true,
          title: 'Add Connection',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="EditConnection" 
        component={EditConnectionScreen}
        options={{
          headerShown: true,
          title: 'Edit Connection',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="Providers" 
        component={ProvidersScreen}
        options={{
          headerShown: true,
          title: 'Website Builders',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="ProviderDetail" 
        component={ProviderDetailScreen}
        options={{
          headerShown: true,
          title: 'Provider Details',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{
          headerShown: true,
          title: 'Post Details',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="Publish" 
        component={PublishScreen}
        options={{
          headerShown: true,
          title: 'Publish Post',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="MultiPublish" 
        component={MultiPublishScreen}
        options={{
          headerShown: true,
          title: 'Multi-Publish',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;