import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Card,
  Snackbar,
  Chip,
  ActivityIndicator,
  Menu,
  Divider,
} from 'react-native-paper';
import { useDrafts } from '../hooks/useDrafts';
import api from '../config/api';

const CreatePostScreen = ({ navigation, route }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { saveDraft, updateDraft } = useDrafts();

  // Check if editing existing draft
  const draftId = route?.params?.draftId;
  const isEditing = Boolean(draftId);

  useEffect(() => {
    loadSites();
    if (isEditing && route?.params?.draft) {
      const draft = route.params.draft;
      setTitle(draft.title);
      setContent(draft.content);
      setExcerpt(draft.excerpt || '');
    }
  }, []);

  const loadSites = async () => {
    try {
      const response = await api.get('/wordpress/sites');
      if (response.data.success) {
        const sitesList = response.data.data.sites;
        setSites(sitesList);
        if (sitesList.length > 0) {
          setSelectedSite(sitesList[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      showSnackbar('Title is required');
      return;
    }

    try {
      if (isEditing) {
        await updateDraft(draftId, { title, content, excerpt });
        showSnackbar('Draft updated successfully');
      } else {
        await saveDraft({ title, content, excerpt });
        showSnackbar('Draft saved successfully');
      }
    } catch (error) {
      showSnackbar('Failed to save draft');
    }
  };

  const handlePublish = async (status = 'publish') => {
    if (!title.trim() || !content.trim()) {
      showSnackbar('Title and content are required');
      return;
    }

    if (!selectedSite) {
      showSnackbar('Please select a site to publish to');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/wordpress/sites/${selectedSite.id}/posts`, {
        title,
        content,
        excerpt,
        status,
      });

      if (response.data.success) {
        showSnackbar(`Post ${status === 'publish' ? 'published' : 'saved as draft'} successfully`);
        // Clear form after successful publish
        if (status === 'publish') {
          setTitle('');
          setContent('');
          setExcerpt('');
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish post';
      showSnackbar(message);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const generateExcerpt = () => {
    if (content.length > 150) {
      setExcerpt(content.substring(0, 147) + '...');
    } else {
      setExcerpt(content);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              {isEditing ? 'Edit Post' : 'Create New Post'}
            </Title>

            <TextInput
              label="Post Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              placeholder="Enter your post title..."
            />

            <TextInput
              label="Content"
              value={content}
              onChangeText={setContent}
              style={[styles.input, styles.contentInput]}
              mode="outlined"
              multiline
              numberOfLines={10}
              disabled={loading}
              placeholder="Write your post content here..."
            />

            <View style={styles.excerptSection}>
              <TextInput
                label="Excerpt (Optional)"
                value={excerpt}
                onChangeText={setExcerpt}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
                disabled={loading}
                placeholder="Brief description of your post..."
              />
              <Button
                mode="text"
                onPress={generateExcerpt}
                disabled={!content.trim() || loading}
                compact
              >
                Generate from content
              </Button>
            </View>

            {sites.length > 0 && (
              <View style={styles.siteSelection}>
                <Title style={styles.subsectionTitle}>Publish to:</Title>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <Chip
                      mode="outlined"
                      onPress={() => setMenuVisible(true)}
                      style={styles.siteChip}
                    >
                      {selectedSite?.site_name || 'Select Site'}
                    </Chip>
                  }
                >
                  {sites.map((site) => (
                    <Menu.Item
                      key={site.id}
                      onPress={() => {
                        setSelectedSite(site);
                        setMenuVisible(false);
                      }}
                      title={site.site_name}
                    />
                  ))}
                </Menu>
              </View>
            )}

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={handleSaveDraft}
                disabled={loading}
                style={styles.actionButton}
                icon="content-save"
              >
                Save Draft
              </Button>

              <Button
                mode="contained"
                onPress={() => handlePublish('draft')}
                disabled={loading || sites.length === 0}
                style={styles.actionButton}
                icon="upload"
                loading={loading}
              >
                Save to WordPress
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={() => handlePublish('publish')}
              disabled={loading || sites.length === 0}
              style={[styles.actionButton, styles.publishButton]}
              icon="publish"
              loading={loading}
            >
              Publish Now
            </Button>

            {sites.length === 0 && (
              <View style={styles.noSitesWarning}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ConnectSite')}
                  icon="plus"
                >
                  Connect WordPress Site
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 200,
  },
  excerptSection: {
    marginBottom: 16,
  },
  siteSelection: {
    marginBottom: 16,
  },
  siteChip: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  publishButton: {
    backgroundColor: '#4caf50',
  },
  noSitesWarning: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 16,
  },
});

export default CreatePostScreen;