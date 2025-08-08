import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Draft } from '../types';
import draftService from '../services/draftService';

interface DraftsScreenProps {
  navigation: any;
}

const DraftsScreen: React.FC<DraftsScreenProps> = ({ navigation }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDrafts = async () => {
    try {
      setIsLoading(true);
      const allDrafts = await draftService.getAllDrafts();
      setDrafts(allDrafts.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load drafts:', error);
      Alert.alert('Error', 'Failed to load drafts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDrafts();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const deleteDraft = (draft: Draft) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to delete "${draft.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await draftService.deleteDraft(draft.id);
              loadDrafts();
            } catch (error) {
              console.error('Failed to delete draft:', error);
              Alert.alert('Error', 'Failed to delete draft. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderDraftItem = ({ item: draft }: { item: Draft }) => (
    <TouchableOpacity
      style={styles.draftCard}
      onPress={() => {
        // Navigate to create post screen with draft data
        navigation.navigate('Posts', {
          screen: 'CreatePost',
          params: { 
            draftId: draft.id,
            siteId: draft.siteId,
            title: draft.title,
            content: draft.content
          },
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.draftHeader}>
        <Text style={styles.draftTitle} numberOfLines={2}>
          {draft.title || 'Untitled Draft'}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteDraft(draft)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.draftContent} numberOfLines={3}>
        {draft.content || 'No content yet...'}
      </Text>
      
      <View style={styles.draftFooter}>
        <Text style={styles.draftDate}>
          {formatDate(draft.updatedAt)}
        </Text>
        {draft.siteId && (
          <View style={styles.siteIndicator}>
            <Ionicons name="globe-outline" size={14} color="#666" />
            <Text style={styles.siteText}>Site {draft.siteId}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="create-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Drafts</Text>
      <Text style={styles.emptySubtitle}>
        Start writing a blog post and save it as a draft
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading drafts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Drafts</Text>
        <Text style={styles.headerSubtitle}>
          {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={drafts}
        renderItem={renderDraftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={drafts.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flex: 1,
  },
  draftCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  draftTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  draftContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  draftDate: {
    fontSize: 12,
    color: '#999',
  },
  siteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default DraftsScreen;