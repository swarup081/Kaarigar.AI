import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Modal, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useProducts, productTitle, productThumbnail } from '@/hooks/useProducts';
import type { LocalProduct } from '@/services/offline/database';

type TabType = 'products' | 'categories';

/** Shape the existing table rows expect, built from a saved product. */
interface ProductRow {
  id: string;
  name: string;
  stock: string;
  stockStatus: string;
  price: string;
  category: string;
  thumbnail?: string;
  status: string;
  synced: boolean;
}

function toRow(product: LocalProduct, language: string): ProductRow {
  return {
    id: product.localId,
    name: productTitle(product, language),
    // Stock is not captured anywhere yet, so say so rather than inventing a
    // number that would read as real inventory.
    stock: '—',
    stockStatus: 'green',
    price: product.finalPrice != null ? `₹${Math.round(product.finalPrice).toLocaleString('en-IN')}` : '—',
    category: (product.category ?? 'uncategorized').toUpperCase(),
    thumbnail: productThumbnail(product),
    status: product.status,
    synced: product.syncStatus === 'synced',
  };
}

export default function CatalogScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { products, isLoading } = useProducts();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);

  const rows = useMemo(
    () => products.map((product) => toRow(product, i18n.language)),
    [products, i18n.language]
  );

  const renderProductMenu = (productId: string) => {
    if (openMenuId !== productId) return null;

    return (
      <View style={styles.menuPopover}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            const prod = rows.find((r) => r.id === productId) ?? null;
            setSelectedProduct(prod);
            setOpenMenuId(null);
          }}
        >
          <Feather name="eye" size={14} color="#4B5563" />
          <Text style={styles.menuItemText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Feather name="edit-2" size={14} color="#4B5563" />
          <Text style={styles.menuItemText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Feather name="trash-2" size={14} color="#DC2626" />
          <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: ProductRow }) => (
    <View style={[styles.tableRow, { zIndex: openMenuId === item.id ? 1000 : 1 }]}>
      <View style={[styles.tableCol, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.productImagePlaceholder} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Feather name="image" size={16} color="#9CA3AF" />
          </View>
        )}
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={[styles.tableCol, { flex: 1.5 }]}>
        <Text style={styles.productStock}>{item.stock}</Text>
        <View style={[styles.stockDot, { backgroundColor: item.stockStatus === 'green' ? '#10B981' : '#F59E0B' }]} />
      </View>
      <View style={[styles.tableCol, { flex: 1.5 }]}>
        <Text style={styles.productPrice}>{item.price}</Text>
      </View>
      <View style={[styles.tableCol, { flex: 0.5, alignItems: 'flex-end', position: 'relative' }]}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
        >
          <Feather name="more-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        {renderProductMenu(item.id)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Tabs.Screen options={{ headerShown: false }} />
      
      <Pressable style={styles.container} onPress={() => setOpenMenuId(null)}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{activeTab === 'products' ? 'Products' : 'Categories'}</Text>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/create/camera')}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {activeTab === 'products' ? 'Add Product' : 'Add Category'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filters */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput} 
              placeholder={activeTab === 'products' ? "Search Name, ID, Category..." : "Search Categories..."}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity style={styles.iconBtnFilled}>
            <Feather name="filter" size={18} color="#7C3AED" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtnOutline}>
            <Feather name="settings" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActive]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'categories' && styles.tabBtnActive]}
            onPress={() => setActiveTab('categories')}
          >
            <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>Categories</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'products' ? (
          <>
            {/* Products Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>PRODUCT</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>STOCK</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>PRICE</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.5, textAlign: 'right' }]}>ACTION</Text>
            </View>
            
            {/* Products List */}
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#7C3AED" />
              </View>
            ) : rows.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="package" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('catalog.empty')}</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/create/camera')}>
                  <Feather name="camera" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCtaText}>{t('catalog.addFirst')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                renderItem={renderProductItem}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        ) : (
          <>
            {/* Categories Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>CATEGORY NAME</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'center' }]}>TOTAL ITEMS</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>ACTION</Text>
            </View>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No categories found.</Text>
            </View>
          </>
        )}

      </Pressable>

      {/* Product Details Modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          {selectedProduct && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Product Details</Text>
                  <Text style={styles.modalSubtitle}>ID: 78</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalImagePlaceholder} />
                
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{selectedProduct.category}</Text>
                </View>

                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatCard}>
                    <View style={styles.modalStatHeader}>
                      <Feather name="dollar-sign" size={14} color="#6B7280" />
                      <Text style={styles.modalStatLabel}>PRICE</Text>
                    </View>
                    <Text style={styles.modalStatValue}>{selectedProduct.price}</Text>
                  </View>
                  
                  <View style={styles.modalStatCard}>
                    <View style={styles.modalStatHeader}>
                      <Feather name="package" size={14} color="#6B7280" />
                      <Text style={styles.modalStatLabel}>STOCK</Text>
                    </View>
                    <Text style={styles.modalStatIconValue}>∞</Text>
                    <Text style={styles.modalStatValue}>{selectedProduct.stock}</Text>
                    <Text style={styles.modalStatSubValue}>{selectedProduct.stock}</Text>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Feather name="trending-up" size={16} color="#7C3AED" />
                    <Text style={styles.sectionTitle}>Sales Performance</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>Last 7 Days</Text>
                </View>
                
                <View style={styles.salesCard}>
                  <Text style={styles.emptyText}>No sales data recorded yet.</Text>
                </View>

                <Text style={styles.sectionTitleOnly}>Description</Text>
                <Text style={styles.descriptionText}>No description available.</Text>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
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
    fontSize: 14,
    color: '#111827',
  },
  iconBtnFilled: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#111827',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tableHeaderText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableCol: {
    justifyContent: 'center',
  },
  productImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  productStock: {
    fontSize: 13,
    color: '#111827',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#111827',
  },
  actionBtn: {
    padding: 4,
  },
  menuPopover: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: '#4B5563',
  },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  emptyCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  
  /* Modal Styles */
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 24,
    alignItems: 'center',
  },
  modalImagePlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 24,
  },
  modalProductName: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 32,
  },
  categoryBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalStatsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  modalStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalStatIconValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalStatSubValue: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  salesCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleOnly: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    width: '100%',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    width: '100%',
  }
});
