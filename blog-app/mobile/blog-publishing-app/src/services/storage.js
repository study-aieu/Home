import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/config';

// Secure storage for sensitive data (tokens, passwords)
export const secureStorage = {
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw error;
    }
  },
  
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Failed to get secure item ${key}:`, error);
      return null;
    }
  },
  
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
      throw error;
    }
  },
};

// Regular storage for non-sensitive data
export const storage = {
  setItem: async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Failed to store item ${key}:`, error);
      throw error;
    }
  },
  
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  },
  
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      throw error;
    }
  },
  
  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  },
};

// Auth storage helpers
export const authStorage = {
  saveAuthData: async (token, userData) => {
    try {
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await storage.setItem(STORAGE_KEYS.USER_DATA, userData);
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw error;
    }
  },
  
  getAuthData: async () => {
    try {
      const [token, userData] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        storage.getItem(STORAGE_KEYS.USER_DATA),
      ]);
      
      return { token, userData };
    } catch (error) {
      console.error('Failed to get auth data:', error);
      return { token: null, userData: null };
    }
  },
  
  clearAuthData: async () => {
    try {
      await Promise.all([
        secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        storage.removeItem(STORAGE_KEYS.USER_DATA),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  },
};

// Draft storage helpers
export const draftStorage = {
  saveDraft: async (draft) => {
    try {
      const drafts = await storage.getItem(STORAGE_KEYS.DRAFTS) || [];
      const draftIndex = drafts.findIndex(d => d.id === draft.id);
      
      if (draftIndex >= 0) {
        drafts[draftIndex] = { ...draft, updatedAt: new Date().toISOString() };
      } else {
        drafts.push({
          ...draft,
          id: draft.id || Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      await storage.setItem(STORAGE_KEYS.DRAFTS, drafts);
      return drafts;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  },
  
  getDrafts: async () => {
    try {
      return await storage.getItem(STORAGE_KEYS.DRAFTS) || [];
    } catch (error) {
      console.error('Failed to get drafts:', error);
      return [];
    }
  },
  
  deleteDraft: async (draftId) => {
    try {
      const drafts = await storage.getItem(STORAGE_KEYS.DRAFTS) || [];
      const filteredDrafts = drafts.filter(d => d.id !== draftId);
      await storage.setItem(STORAGE_KEYS.DRAFTS, filteredDrafts);
      return filteredDrafts;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      throw error;
    }
  },
  
  clearDrafts: async () => {
    try {
      await storage.setItem(STORAGE_KEYS.DRAFTS, []);
    } catch (error) {
      console.error('Failed to clear drafts:', error);
      throw error;
    }
  },
};

// Site selection storage
export const siteStorage = {
  setSelectedSite: async (siteId) => {
    try {
      await storage.setItem(STORAGE_KEYS.SELECTED_SITE, siteId);
    } catch (error) {
      console.error('Failed to set selected site:', error);
      throw error;
    }
  },
  
  getSelectedSite: async () => {
    try {
      return await storage.getItem(STORAGE_KEYS.SELECTED_SITE);
    } catch (error) {
      console.error('Failed to get selected site:', error);
      return null;
    }
  },
  
  clearSelectedSite: async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.SELECTED_SITE);
    } catch (error) {
      console.error('Failed to clear selected site:', error);
      throw error;
    }
  },
};