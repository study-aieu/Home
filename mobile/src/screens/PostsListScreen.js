import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import api from '../api/client';

export default function PostsListScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get('/posts');
      setPosts(data);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load posts');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    Alert.alert('Delete post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/posts/${id}`);
          await load();
        } catch (e) {
          Alert.alert('Error', e?.response?.data?.error || 'Failed to delete');
        }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('EditPost', { post: item })} style={{ padding: 12, borderBottomWidth: 1 }}>
      <Text style={{ fontWeight: 'bold' }}>{item.title?.rendered || '(no title)'}</Text>
      <Text numberOfLines={2}>{item.excerpt?.rendered?.replace(/<[^>]+>/g, '')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button title="Edit" onPress={() => navigation.navigate('EditPost', { post: item })} />
        <Button title="Delete" color="#b00020" onPress={() => onDelete(item.id)} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <Button title="New Post" onPress={() => navigation.navigate('EditPost')} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      />
    </View>
  );
}