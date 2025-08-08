import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import Markdown from 'react-native-markdown-display';
import api from '../api/client';

const db = SQLite.openDatabase('drafts.db');

function initDb() {
  db.transaction((tx) => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, image_uri TEXT)'
    );
  });
}

export default function EditPostScreen({ route, navigation }) {
  const post = route?.params?.post;
  const [title, setTitle] = useState(post?.title?.rendered || '');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    initDb();
    if (post?.content?.rendered) {
      const plain = post.content.rendered.replace(/<[^>]+>/g, '');
      setContent(plain);
    }
  }, []);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
    }
  };

  const saveDraft = () => {
    db.transaction((tx) => {
      tx.executeSql('INSERT INTO drafts (title, content, image_uri) VALUES (?, ?, ?)', [title, content, imageUri]);
    });
    Alert.alert('Saved', 'Draft saved locally');
  };

  async function uploadImageIfAny() {
    if (!imageUri) return undefined;
    const info = await FileSystem.getInfoAsync(imageUri);
    if (!info.exists) return undefined;
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const mimeType = 'image/jpeg';
    const formData = new FormData();
    formData.append('image', { uri: imageUri, name: filename, type: mimeType });
    const { data } = await api.post('/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.id;
  }

  const publish = async () => {
    try {
      const featured_media = await uploadImageIfAny();
      const payload = { title, content, status: 'publish', featured_media };
      if (post?.id) {
        await api.put(`/posts/${post.id}`, payload);
        Alert.alert('Updated', 'Post updated');
      } else {
        await api.post('/posts', payload);
        Alert.alert('Published', 'Post published');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Publish failed');
    }
  };

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={{ borderWidth: 1, padding: 8, borderRadius: 6 }} />

      <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>Body (Markdown)</Text>
      {!preview ? (
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={10}
          style={{ borderWidth: 1, padding: 8, borderRadius: 6, minHeight: 200 }}
        />
      ) : (
        <View style={{ minHeight: 200, borderWidth: 1, borderRadius: 6, padding: 8 }}>
          <Markdown>{content || ''}</Markdown>
        </View>
      )}

      <View style={{ marginTop: 12, gap: 8 }}>
        <Button title={preview ? 'Edit' : 'Preview'} onPress={() => setPreview(!preview)} />
        <Button title="Pick Image" onPress={pickImage} />
        {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, marginTop: 8 }} /> : null}
        <Button title="Save Draft" onPress={saveDraft} />
        <Button title={post?.id ? 'Update' : 'Publish'} onPress={publish} />
      </View>
    </ScrollView>
  );
}