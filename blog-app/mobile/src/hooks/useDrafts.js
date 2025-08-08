import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFTS_STORAGE_KEY = 'blog_drafts';

export const useDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load drafts from AsyncStorage on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const storedDrafts = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (storedDrafts) {
        setDrafts(JSON.parse(storedDrafts));
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (draft) => {
    try {
      const newDraft = {
        id: Date.now().toString(),
        ...draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedDrafts = [...drafts, newDraft];
      setDrafts(updatedDrafts);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      
      return { success: true, draft: newDraft };
    } catch (error) {
      console.error('Error saving draft:', error);
      return { success: false, error: error.message };
    }
  };

  const updateDraft = async (draftId, updates) => {
    try {
      const updatedDrafts = drafts.map(draft => 
        draft.id === draftId 
          ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
          : draft
      );
      
      setDrafts(updatedDrafts);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      
      const updatedDraft = updatedDrafts.find(d => d.id === draftId);
      return { success: true, draft: updatedDraft };
    } catch (error) {
      console.error('Error updating draft:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
      setDrafts(updatedDrafts);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting draft:', error);
      return { success: false, error: error.message };
    }
  };

  const getDraft = (draftId) => {
    return drafts.find(draft => draft.id === draftId);
  };

  const clearAllDrafts = async () => {
    try {
      setDrafts([]);
      await AsyncStorage.removeItem(DRAFTS_STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Error clearing drafts:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    drafts,
    loading,
    saveDraft,
    updateDraft,
    deleteDraft,
    getDraft,
    clearAllDrafts,
    loadDrafts,
  };
};