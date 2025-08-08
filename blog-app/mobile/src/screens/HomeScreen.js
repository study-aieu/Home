import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Avatar,
  IconButton,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useDrafts } from '../hooks/useDrafts';
import api from '../config/api';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { drafts, loading: draftsLoading } = useDrafts();
  const [posts, setPosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadConnectedSites(),
        loadRecentPosts(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showSnackbar('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedSites = async () => {
    try {
      const response = await api.get('/wordpress/sites');
      if (response.data.success) {
        setSites(response.data.data.sites);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadRecentPosts = async () => {
    try {
      if (sites.length > 0) {
        // Load posts from the first connected site
        const siteId = sites[0].id;
        const response = await api.get(`/wordpress/sites/${siteId}/posts?per_page=5`);
        if (response.data.success) {
          setPosts(response.data.data.posts);
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPostStatusColor = (status) => {
    switch (status) {
      case 'publish': return '#4caf50';
      case 'draft': return '#ff9800';
      case 'pending': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading dashboard...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={48}
              label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Title style={styles.userName}>
                Welcome back, {user?.name || 'User'}!
              </Title>
              <Paragraph style={styles.userEmail}>
                {user?.email}
              </Paragraph>
            </View>
          </View>
          <IconButton
            icon="logout"
            size={24}
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <View style={styles.quickActions}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('CreatePost')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              New Post
            </Button>
            <Button
              mode="outlined"
              icon="file-document-outline"
              onPress={() => navigation.navigate('Drafts')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Drafts ({drafts.length})
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Connected Sites */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Connected Sites</Title>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Sites')}
              compact
            >
              Manage
            </Button>
          </View>
          {sites.length === 0 ? (
            <View style={styles.emptyState}>
              <Paragraph style={styles.emptyText}>
                No WordPress sites connected yet
              </Paragraph>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ConnectSite')}
                style={styles.connectButton}
              >
                Connect Site
              </Button>
            </View>
          ) : (
            <View>
              {sites.slice(0, 2).map((site) => (
                <Card key={site.id} style={styles.siteCard}>
                  <Card.Content style={styles.siteContent}>
                    <View style={styles.siteInfo}>
                      <Title style={styles.siteName}>{site.site_name}</Title>
                      <Paragraph style={styles.siteUrl}>{site.site_url}</Paragraph>
                    </View>
                    <Chip
                      icon="check-circle"
                      style={styles.connectedChip}
                      textStyle={styles.chipText}
                    >
                      Connected
                    </Chip>
                  </Card.Content>
                </Card>
              ))}
              {sites.length > 2 && (
                <Paragraph style={styles.moreText}>
                  +{sites.length - 2} more sites
                </Paragraph>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Recent Posts */}
      {posts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Recent Posts</Title>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Posts')}
                compact
              >
                View All
              </Button>
            </View>
            {posts.map((post) => (
              <Card key={post.id} style={styles.postCard}>
                <Card.Content style={styles.postContent}>
                  <View style={styles.postInfo}>
                    <Title style={styles.postTitle} numberOfLines={2}>
                      {post.title}
                    </Title>
                    <Paragraph style={styles.postDate}>
                      {formatDate(post.date)}
                    </Paragraph>
                  </View>
                  <Chip
                    style={[
                      styles.statusChip,
                      { backgroundColor: getPostStatusColor(post.status) }
                    ]}
                    textStyle={styles.statusChipText}
                  >
                    {post.status}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Local Drafts */}
      {drafts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Local Drafts</Title>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Drafts')}
                compact
              >
                View All
              </Button>
            </View>
            {drafts.slice(0, 3).map((draft) => (
              <Card key={draft.id} style={styles.draftCard}>
                <Card.Content style={styles.draftContent}>
                  <Title style={styles.draftTitle} numberOfLines={1}>
                    {draft.title}
                  </Title>
                  <Paragraph style={styles.draftDate}>
                    {formatDate(draft.updatedAt)}
                  </Paragraph>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
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
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  logoutButton: {
    margin: 0,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  connectButton: {
    paddingHorizontal: 24,
  },
  siteCard: {
    marginBottom: 8,
    elevation: 1,
  },
  siteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    marginBottom: 4,
  },
  siteUrl: {
    fontSize: 12,
    opacity: 0.7,
  },
  connectedChip: {
    backgroundColor: '#e8f5e8',
  },
  chipText: {
    color: '#4caf50',
    fontSize: 12,
  },
  moreText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  postCard: {
    marginBottom: 8,
    elevation: 1,
  },
  postContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  postDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusChip: {
    marginLeft: 8,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  draftCard: {
    marginBottom: 8,
    elevation: 1,
  },
  draftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftTitle: {
    fontSize: 16,
    flex: 1,
  },
  draftDate: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 8,
  },
});

export default HomeScreen;