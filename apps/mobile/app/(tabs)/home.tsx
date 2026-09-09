import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const network = useNetworkStatus();

  // TODO: Replace with real data from Zustand store / SQLite
  const artisan = {
    name: t('common.defaultName', 'कारीगर'),
    shopProgress: 30,
    productCount: 0,
    draftCount: 0,
    viewsCount: 5,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Tabs.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>B</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.updatePlanBtn}>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" style={styles.boltIcon} />
              <Text style={styles.updatePlanText}>Update Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="bell" size={20} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="menu" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Banner */}
        {!network.isConnected && (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={18} color="#991B1B" />
            <View style={styles.offlineTextContainer}>
              <Text style={styles.offlineText}>{t('common.offline', 'You are offline')}</Text>
              <Text style={styles.offlineSubtext}>{t('common.offlineNote', 'Some features may be unavailable')}</Text>
            </View>
          </View>
        )}

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {artisan.name && artisan.name.trim() !== '' && artisan.name !== 'कारीगर'
              ? t('home.greeting', `Good Morning, ${artisan.name}!`)
              : t('home.greetingFallback', 'Namaste!')}
          </Text>
          <Text style={styles.greetingSub}>{t('home.greetingSub', "Here's what's happening with your store today.")}</Text>
        </View>

        {/* Search & Actions */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search products..." 
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity style={styles.actionIconBtn}>
            <Feather name="upload" size={18} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionIconBtn, styles.filterBtn]}>
            <Feather name="filter" size={18} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* Horizontal Scroll Cards - Key Metrics */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
          
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrapper}>
                <Feather name="percent" size={16} color="#111827" />
              </View>
              <Text style={styles.cardTitle}>Shop Profile</Text>
            </View>
            <Text style={styles.cardAmount}>{artisan.shopProgress}%</Text>
            <View style={styles.cardGrowth}>
              <Feather name="check-circle" size={14} color="#10B981" />
              <Text style={styles.growthPercent}>Completed</Text>
              <Text style={styles.growthText}>Add more details</Text>
            </View>
          </View>
          
          <View style={[styles.mainCard, { marginLeft: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrapper}>
                <Feather name="package" size={16} color="#111827" />
              </View>
              <Text style={styles.cardTitle}>Published</Text>
            </View>
            <Text style={styles.cardAmount}>{artisan.productCount}</Text>
            <View style={styles.cardGrowth}>
              <Feather name="arrow-up" size={14} color="#10B981" />
              <Text style={styles.growthPercent}>0</Text>
              <Text style={styles.growthText}>new this month</Text>
            </View>
          </View>

        </ScrollView>

        {/* 2-Column Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridCardTitle}>Store{'\n'}Views</Text>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>This Week</Text>
                <Feather name="chevron-down" size={14} color="#6B7280" />
              </View>
            </View>
            <Text style={styles.gridNumber}>{artisan.viewsCount}</Text>
            <Text style={styles.gridLabel}>TOTAL VIEWS</Text>
            <View style={styles.globeBadge}>
              <Feather name="eye" size={14} color="#7C3AED" style={{marginRight: 6}} />
              <View>
                <Text style={styles.globeTitle}>NEW{'\n'}TODAY</Text>
              </View>
              <Text style={styles.globeCount}>2</Text>
            </View>
          </View>

          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridCardTitle}>Saved{'\n'}Drafts</Text>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>All</Text>
                <Feather name="chevron-down" size={14} color="#6B7280" />
              </View>
            </View>
            {artisan.draftCount === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No drafts in this{'\n'}period.</Text>
              </View>
            ) : (
              <View style={styles.draftsCenter}>
                <Text style={styles.gridNumber}>{artisan.draftCount}</Text>
                <Text style={styles.gridLabel}>SAVED ITEMS</Text>
              </View>
            )}
          </View>
        </View>

        {/* Add Product CTA (Hero Button) */}
        <TouchableOpacity
          style={styles.addProductHeroBtn}
          onPress={() => router.push('/create/camera')}
          activeOpacity={0.8}
        >
          <View style={styles.addProductIconWrapper}>
            <Feather name="plus" size={24} color="#7C3AED" />
          </View>
          <View style={styles.addProductTextContainer}>
            <Text style={styles.addProductHeroTitle}>{t('home.addProduct', 'Add New Product')}</Text>
            <Text style={styles.addProductHeroSub}>{t('create.step1', 'Capture photo & details')}</Text>
          </View>
          <Feather name="arrow-right" size={20} color="#111827" />
        </TouchableOpacity>

        {/* Recent Products (Replaces Recent Orders) */}
        <View style={styles.ordersSection}>
          <View style={styles.ordersHeader}>
            <Text style={styles.ordersTitle}>Recent Products</Text>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>This Week</Text>
              <Feather name="chevron-down" size={14} color="#6B7280" />
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>ITEM</Text>
            <Text style={styles.tableHeaderText}>CATEGORY</Text>
            <Text style={styles.tableHeaderText}>STATUS</Text>
            <Text style={styles.tableHeaderText}>VIEWS</Text>
          </View>

          {artisan.productCount === 0 ? (
            <View style={styles.ordersEmptyState}>
              <Text style={styles.emptyText}>No products found in this period.</Text>
            </View>
          ) : (
            <View>
              {/* Product rows will go here */}
            </View>
          )}

          <TouchableOpacity 
            style={styles.ordersFooter}
            onPress={() => router.push('/catalog')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All Products</Text>
            <Feather name="arrow-right" size={16} color="#111827" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoText: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  updatePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1B3D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  boltIcon: {
    marginRight: 6,
  },
  updatePlanText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  iconBtn: {
    padding: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  offlineTextContainer: {
    marginLeft: 12,
  },
  offlineText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineSubtext: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 2,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    fontFamily: 'serif',
  },
  greetingSub: {
    fontSize: 15,
    color: '#6B7280',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterBtn: {
    backgroundColor: '#F3E8FF',
    borderColor: '#F3E8FF',
  },
  horizontalScroll: {
    marginBottom: 24,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
  mainCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 36,
    fontFamily: 'serif',
    color: '#111827',
    marginBottom: 12,
  },
  cardGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthPercent: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    marginRight: 6,
  },
  growthText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 220,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  dropdownText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  gridNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  draftsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  addProductHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E9D8FD',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  addProductIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addProductTextContainer: {
    flex: 1,
  },
  addProductHeroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  addProductHeroSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  gridLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  globeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignSelf: 'center',
    marginTop: 'auto',
  },
  globeTitle: {
    fontSize: 8,
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '600',
  },
  globeCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  ordersSection: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
    marginBottom: 32,
  },
  tableHeaderText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  ordersEmptyState: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ordersFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
