import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlogSite } from '../types';
import apiService from '../services/api';

interface SitesScreenProps {
  navigation: any;
}

const SitesScreen: React.FC<SitesScreenProps> = ({ navigation }) => {
  const [sites, setSites] = useState<BlogSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSites = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await apiService.getSites();
      setSites(response.sites);
    } catch (error: any) {
      console.error('Failed to load sites:', error);
      Alert.alert('Error', 'Failed to load sites. Please try again.');
    } finally {
      if (showLoader) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSites(false);
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSites(false);
  };

  const testSiteConnection = async (site: BlogSite) => {
    try {
      const response = await apiService.testSiteConnection(site.id);
      Alert.alert(
        'Connection Test',
        response.connected ? 'Connection successful!' : 'Connection failed',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Connection test failed:', error);
      Alert.alert('Error', 'Failed to test connection. Please try again.');
    }
  };

  const disconnectSite = (site: BlogSite) => {
    Alert.alert(
      'Disconnect Site',
      `Are you sure you want to disconnect "${site.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.disconnectSite(site.id);
              Alert.alert('Success', 'Site disconnected successfully');
              loadSites(false);
            } catch (error: any) {
              console.error('Failed to disconnect site:', error);
              Alert.alert('Error', 'Failed to disconnect site. Please try again.');
            }
          },
        },
      ]
    );
  };

  const navigateToPosts = (site: BlogSite) => {
    navigation.navigate('Posts', {
      screen: 'PostsList',
      params: { siteId: site.id, siteName: site.name },
    });
  };

  const renderSiteItem = ({ item: site }: { item: BlogSite }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => navigateToPosts(site)}
      activeOpacity={0.7}
    >
      <View style={styles.siteHeader}>
        <View style={styles.siteInfo}>
          <Text style={styles.siteName}>{site.name}</Text>
          <Text style={styles.siteUrl}>{site.url}</Text>
          <Text style={styles.siteUsername}>@{site.username}</Text>
        </View>
        <View style={styles.siteActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => testSiteConnection(site)}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => disconnectSite(site)}
          >
            <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.siteFooter}>
        <Text style={styles.siteDate}>
          Connected {new Date(site.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={styles.viewPostsButton}
          onPress={() => navigateToPosts(site)}
        >
          <Text style={styles.viewPostsText}>View Posts</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="globe-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Sites Connected</Text>
      <Text style={styles.emptySubtitle}>
        Connect your WordPress site to start publishing blog posts
      </Text>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => navigation.navigate('ConnectSite')}
      >
        <Text style={styles.connectButtonText}>Connect Site</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My WordPress Sites</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ConnectSite')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sites}
        renderItem={renderSiteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={sites.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flex: 1,
  },
  siteCard: {
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
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  siteUrl: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  siteUsername: {
    fontSize: 14,
    color: '#999',
  },
  siteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
  siteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  siteDate: {
    fontSize: 12,
    color: '#999',
  },
  viewPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPostsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 5,
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
    marginBottom: 30,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

export default SitesScreen;