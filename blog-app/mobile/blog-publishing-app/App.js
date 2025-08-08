import 'react-native-get-random-values'; // Must be first import
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/config';

export default function App() {
  return (
    <PaperProvider theme={{
      colors: {
        primary: COLORS.primary,
        surface: COLORS.surface,
        background: COLORS.background,
        onSurface: COLORS.text,
        onBackground: COLORS.text,
      }
    }}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </PaperProvider>
  );
}
