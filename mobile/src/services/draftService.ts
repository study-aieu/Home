import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draft } from '../types';

const DRAFTS_KEY = 'blog_drafts';

class DraftService {
  async saveDraft(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> {
    try {
      const drafts = await this.getAllDrafts();
      const now = new Date().toISOString();
      
      const newDraft: Draft = {
        ...draft,
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };

      const updatedDrafts = [...drafts, newDraft];
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));
      
      return newDraft;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  }

  async updateDraft(draftId: string, updates: Partial<Omit<Draft, 'id' | 'createdAt'>>): Promise<Draft> {
    try {
      const drafts = await this.getAllDrafts();
      const draftIndex = drafts.findIndex(d => d.id === draftId);
      
      if (draftIndex === -1) {
        throw new Error('Draft not found');
      }

      const updatedDraft: Draft = {
        ...drafts[draftIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      drafts[draftIndex] = updatedDraft;
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      
      return updatedDraft;
    } catch (error) {
      console.error('Failed to update draft:', error);
      throw error;
    }
  }

  async getDraft(draftId: string): Promise<Draft | null> {
    try {
      const drafts = await this.getAllDrafts();
      return drafts.find(d => d.id === draftId) || null;
    } catch (error) {
      console.error('Failed to get draft:', error);
      return null;
    }
  }

  async getAllDrafts(): Promise<Draft[]> {
    try {
      const draftsJson = await AsyncStorage.getItem(DRAFTS_KEY);
      return draftsJson ? JSON.parse(draftsJson) : [];
    } catch (error) {
      console.error('Failed to get drafts:', error);
      return [];
    }
  }

  async deleteDraft(draftId: string): Promise<boolean> {
    try {
      const drafts = await this.getAllDrafts();
      const filteredDrafts = drafts.filter(d => d.id !== draftId);
      
      if (filteredDrafts.length === drafts.length) {
        return false; // Draft not found
      }

      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(filteredDrafts));
      return true;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  }

  async deleteAllDrafts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFTS_KEY);
    } catch (error) {
      console.error('Failed to delete all drafts:', error);
      throw error;
    }
  }

  async getDraftsBySite(siteId?: number): Promise<Draft[]> {
    try {
      const drafts = await this.getAllDrafts();
      return drafts.filter(d => d.siteId === siteId);
    } catch (error) {
      console.error('Failed to get drafts by site:', error);
      return [];
    }
  }
}

export const draftService = new DraftService();
export default draftService;