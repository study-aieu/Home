import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../services/api';
import draftService from '../services/draftService';

interface CreatePostScreenProps {
  navigation: any;
  route: any;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ navigation, route }) => {
  const { siteId, siteName, draftId, title: initialTitle, content: initialContent } = route.params || {};
  
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState(initialContent || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    // Load draft if editing existing draft
    if (draftId && !initialTitle && !initialContent) {
      loadDraft();
    }
  }, [draftId]);

  const loadDraft = async () => {
    try {
      const draft = await draftService.getDraft(draftId);
      if (draft) {
        setTitle(draft.title);
        setContent(draft.content);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage || !siteId) return null;

    try {
      setIsUploadingImage(true);
      const response = await apiService.uploadImage(siteId, selectedImage);
      return response.media.id;
    } catch (error) {
      console.error('Failed to upload image:', error);
      Alert.alert('Error', 'Failed to upload image. The post will be created without the image.');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Warning', 'Please add a title or content before saving.');
      return;
    }

    try {
      setIsSavingDraft(true);
      
      if (draftId) {
        // Update existing draft
        await draftService.updateDraft(draftId, { title, content, siteId });
        Alert.alert('Success', 'Draft updated successfully!');
      } else {
        // Create new draft
        await draftService.saveDraft({ title, content, siteId });
        Alert.alert('Success', 'Draft saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const publishPost = async (status: 'draft' | 'publish' = 'publish') => {
    if (!siteId) {
      Alert.alert('Error', 'No site selected. Please select a site to publish to.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Warning', 'Please add a title before publishing.');
      return;
    }

    try {
      setIsPublishing(true);
      
      let featuredMediaId = null;
      if (selectedImage) {
        featuredMediaId = await uploadImage();
      }

      await apiService.createPost(
        siteId,
        title.trim(),
        content.trim(),
        status,
        undefined, // excerpt
        featuredMediaId || undefined
      );

      // Delete draft if it exists
      if (draftId) {
        await draftService.deleteDraft(draftId);
      }

      const action = status === 'publish' ? 'published' : 'saved as draft';
      Alert.alert(
        'Success',
        `Post ${action} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Failed to publish post:', error);
      
      let errorMessage = 'Failed to publish post. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Post</Text>
          {siteName && <Text style={styles.headerSubtitle}>{siteName}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.headerButton, isSavingDraft && styles.buttonDisabled]}
          onPress={saveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Ionicons name="save-outline" size={24} color="#666" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Post title..."
            placeholderTextColor="#999"
            multiline
            autoCorrect={false}
          />

          {selectedImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={20} color="#007AFF" />
            <Text style={styles.imageButtonText}>Add Image</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Write your post content here..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            autoCorrect={false}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.draftButton, isPublishing && styles.buttonDisabled]}
          onPress={() => publishPost('draft')}
          disabled={isPublishing}
        >
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, isPublishing && styles.buttonDisabled]}
          onPress={() => publishPost('publish')}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  imageButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  contentInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  draftButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  draftButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginLeft: 10,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CreatePostScreen;