import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useDrafts } from '../hooks/useDrafts';

const DraftsScreen = ({ navigation }) => {
  const { drafts, loading, deleteDraft } = useDrafts();

  const handleEditDraft = (draft) => {
    navigation.navigate('CreatePost', { draftId: draft.id, draft });
  };

  const handleDeleteDraft = (draftId) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteDraft(draftId) 
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDraft = ({ item }) => (
    <Card style={styles.draftCard}>
      <Card.Content>
        <View style={styles.draftHeader}>
          <Title style={styles.draftTitle} numberOfLines={2}>
            {item.title}
          </Title>
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleDeleteDraft(item.id)}
            style={styles.deleteButton}
          />
        </View>
        
        <Paragraph style={styles.draftContent} numberOfLines={3}>
          {item.content}
        </Paragraph>
        
        <View style={styles.draftFooter}>
          <Chip icon="clock" compact style={styles.dateChip}>
            {formatDate(item.updatedAt)}
          </Chip>
          <Button
            mode="outlined"
            onPress={() => handleEditDraft(item)}
            compact
          >
            Edit
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading drafts...</Paragraph>
      </View>
    );
  }

  if (drafts.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Title style={styles.emptyTitle}>No Drafts Yet</Title>
        <Paragraph style={styles.emptyText}>
          Start writing a new post and save it as a draft to see it here.
        </Paragraph>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('CreatePost')}
          style={styles.createButton}
        >
          Create New Post
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={drafts}
        renderItem={renderDraft}
        keyExtractor={(item) => item.id}
        style={styles.list}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  createButton: {
    paddingHorizontal: 24,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  draftCard: {
    marginBottom: 16,
    elevation: 2,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  draftTitle: {
    fontSize: 18,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    margin: 0,
  },
  draftContent: {
    marginBottom: 16,
    opacity: 0.7,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateChip: {
    backgroundColor: '#e3f2fd',
  },
});

export default DraftsScreen;