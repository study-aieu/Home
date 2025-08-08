import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { wordpressAPI } from '../services/api';
import { draftStorage, siteStorage } from '../services/storage';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [draftsCount, setDraftsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadSites(),
        loadDraftsCount(),
        loadSelectedSite(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const result = await wordpressAPI.getSites();
      if (result.success) {
        setSites(result.data.blogSites);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const loadDraftsCount = async () => {
    try {
      const drafts = await draftStorage.getDrafts();
      setDraftsCount(drafts.length);
    } catch (error) {
      console.error('Failed to load drafts count:', error);
    }
  };

  const loadSelectedSite = async () => {
    try {
      const siteId = await siteStorage.getSelectedSite();
      if (siteId && sites.length > 0) {
        const site = sites.find(s => s.id === parseInt(siteId));
        setSelectedSite(site);
      }
    } catch (error) {
      console.error('Failed to load selected site:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const selectSite = async (site) => {
    try {
      await siteStorage.setSelectedSite(site.id.toString());
      setSelectedSite(site);
    } catch (error) {
      console.error('Failed to select site:', error);
    }
  };

  const QuickActionCard = ({ title, subtitle, icon, onPress, color = COLORS.primary }) => (
    <TouchableOpacity onPress={onPress} style={styles.quickActionWrapper}>
      <Surface style={[styles.quickAction, { borderLeftColor: color }]}>
        <Ionicons name={icon} size={24} color={color} />
        <View style={styles.quickActionText}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </Surface>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <Card style={styles.welcomeCard}>
          <Card.Content style={styles.welcomeContent}>
            <View style={styles.welcomeHeader}>
              <Ionicons name="person-circle" size={48} color={COLORS.primary} />
              <View style={styles.welcomeText}>
                <Title style={styles.welcomeTitle}>
                  Welcome back, {user?.firstName}!
                </Title>
                <Paragraph style={styles.welcomeSubtitle}>
                  Ready to publish your next blog post?
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Connected Sites Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Connected Sites</Title>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('ConnectSite')}
                compact
              >
                Add Site
              </Button>
            </View>

            {sites.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="link-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateText}>No WordPress sites connected</Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('ConnectSite')}
                  style={styles.connectButton}
                >
                  Connect Your First Site
                </Button>
              </View>
            ) : (
              <View style={styles.sitesContainer}>
                {sites.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    onPress={() => selectSite(site)}
                    style={[
                      styles.siteItem,
                      selectedSite?.id === site.id && styles.selectedSiteItem
                    ]}
                  >
                    <View style={styles.siteInfo}>
                      <Text style={styles.siteName}>{site.name}</Text>
                      <Text style={styles.siteUrl}>{site.url}</Text>
                    </View>
                    {selectedSite?.id === site.id && (
                      <Chip icon="check" style={styles.selectedChip}>
                        Selected
                      </Chip>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        {sites.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Quick Actions</Title>
              
              <QuickActionCard
                title="Create New Post"
                subtitle="Write and publish a new blog post"
                icon="create-outline"
                onPress={() => navigation.navigate('Create')}
                color={COLORS.primary}
              />
              
              <QuickActionCard
                title="View My Posts"
                subtitle="Manage your published posts"
                icon="document-text-outline"
                onPress={() => navigation.navigate('Posts')}
                color={COLORS.secondary}
              />
              
              <QuickActionCard
                title={`Drafts (${draftsCount})`}
                subtitle="Continue working on saved drafts"
                icon="folder-outline"
                onPress={() => navigation.navigate('Drafts')}
                color={COLORS.warning}
              />
            </Card.Content>
          </Card>
        )}

        {/* Stats Overview */}
        {selectedSite && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Current Site: {selectedSite.name}</Title>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>Total Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{draftsCount}</Text>
                  <Text style={styles.statLabel}>Local Drafts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: SPACING.md,
  },
  welcomeCard: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  welcomeContent: {
    padding: SPACING.lg,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionCard: {
    marginBottom: SPACING.md,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
  },
  sitesContainer: {
    gap: SPACING.sm,
  },
  siteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedSiteItem: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  siteUrl: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  selectedChip: {
    backgroundColor: COLORS.primary,
  },
  quickActionWrapper: {
    marginBottom: SPACING.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 1,
  },
  quickActionText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickActionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

export default HomeScreen;