/**
 * useAddAsset — Custom hook encapsulating all Add Asset business logic
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import supabase, { getCurrentUser } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { searchStocks, StockItem } from '../../data/stockList';
import { fetchExchangeRate } from '../../services/stockDataService';
import { SHARED_PORTFOLIO_KEY } from '../../hooks/useSharedPortfolio';
import { grantAssetRegistrationReward, REWARD_AMOUNTS } from '../../services/rewardService';
import { classifyTicker } from '../../services/gemini';
import { getTickerProfile } from '../../data/tickerProfile';
import { ParsedAsset, normalizeParsedAssets } from '../../features/assets/ocrImport';
import {
  savePortfolioAsset as persistAssetToPortfolio,
  SavePortfolioAssetInput,
  withTimeout,
} from '../../features/assets/portfolioPersistence';

import {
  RecentAsset,
  ExistingAsset,
  LAST_SCAN_DATE_KEY,
  RECENT_ASSETS_KEY,
  CASH_META,
} from './types';
import { AssetCategory } from './AssetCategoryTabs';

export function useAddAsset() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { t } = useLocale();

  // --- Asset category tab ---
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('stock');
  const [cashType, setCashType] = useState<'CASH_KRW' | 'CASH_USD' | 'CASH_CMA'>('CASH_KRW');
  const [cashAmount, setCashAmount] = useState('');
  const [cashSaving, setCashSaving] = useState(false);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- Selected stock ---
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // --- Screenshot ---
  const [screenshotParsing, setScreenshotParsing] = useState(false);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[] | null>(null);

  // --- Save ---
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // --- Recent assets ---
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);

  // --- Existing assets ---
  const [existingAssets, setExistingAssets] = useState<ExistingAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);

  // --- Edit mode ---
  const [editingAsset, setEditingAsset] = useState<ExistingAsset | null>(null);

  // ─── Init ───

  useEffect(() => {
    loadRecentAssets();
    loadExistingAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  // Safety timeout: 10s loading
  useEffect(() => {
    if (!loadingAssets) return;
    const timer = setTimeout(() => {
      console.warn('[AddAsset] 10초 안전 타임아웃 — 로딩 강제 종료');
      setLoadingAssets(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loadingAssets]);

  // Safety timeout: 30s saving
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => {
      console.warn('[AddAsset] 30초 안전 타임아웃 — 저장 강제 종료');
      setSaving(false);
      savingRef.current = false;
      Alert.alert(t('add_asset.alert_save_timeout_title'), t('add_asset.alert_save_timeout_msg'));
    }, 30000);
    return () => clearTimeout(timer);
  }, [saving, t]);

  // ─── Data loading ───

  const loadRecentAssets = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_ASSETS_KEY);
      if (stored) setRecentAssets(JSON.parse(stored));
    } catch (err) {
      console.warn('[AddAsset] 최근 종목 로드 실패:', err);
    }
  };

  const saveRecentAsset = async (stock: StockItem) => {
    try {
      const newRecent: RecentAsset = { ticker: stock.ticker, name: stock.name, category: stock.category };
      const updated = [newRecent, ...recentAssets.filter(r => r.ticker !== stock.ticker)].slice(0, 5);
      setRecentAssets(updated);
      await AsyncStorage.setItem(RECENT_ASSETS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[AddAsset] 최근 종목 저장 실패:', err);
    }
  };

  const loadExistingAssets = async () => {
    try {
      setLoadingAssets(true);
      const user = authUser ?? await getCurrentUser();
      if (!user) {
        setAuthFailed(true);
        setLoadingAssets(false);
        return;
      }
      setAuthFailed(false);
      const { data, error } = await withTimeout(
        supabase.from('portfolios').select('id, ticker, name, quantity, avg_price, current_value')
          .eq('user_id', user.id).not('ticker', 'like', 'RE_%').order('current_value', { ascending: false }),
        15000, t('add_asset.loading_assets'),
      );
      if (!error && data) setExistingAssets(data);
    } catch (err) {
      console.warn('[AddAsset] 보유 자산 로드 실패:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  // ─── Search ───

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchStocks(searchQuery);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  const selectStock = useCallback((stock: StockItem) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setShowDropdown(false);
    setPrice('');
    Keyboard.dismiss();
  }, []);

  const selectRecentAsset = useCallback((recent: RecentAsset) => {
    selectStock({ ticker: recent.ticker, name: recent.name, nameEn: '', category: recent.category });
  }, [selectStock]);

  // ─── Edit / Delete ───

  const startEditAsset = useCallback((asset: ExistingAsset) => {
    const found = searchStocks(asset.ticker)[0] || searchStocks(asset.name)[0];
    setSelectedStock(found || { ticker: asset.ticker, name: asset.name, nameEn: '', category: 'kr_stock' as const });
    setSearchQuery(asset.name);
    setQuantity(String(asset.quantity || 0));
    setPrice(String(Math.round((asset.quantity || 0) * (asset.avg_price || 0))));
    setEditingAsset(asset);
  }, []);

  const deleteAsset = useCallback(async (asset: ExistingAsset) => {
    Alert.alert(
      t('add_asset.alert_delete_title'),
      t('add_asset.alert_delete_msg', { name: asset.name, ticker: asset.ticker }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('portfolios').delete().eq('id', asset.id);
              if (error) throw error;
              setExistingAssets(prev => prev.filter(a => a.id !== asset.id));
              queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
            } catch (err) {
              Alert.alert(t('add_asset.alert_delete_failed_title'), t('add_asset.alert_delete_failed_msg'));
            }
          },
        },
      ],
    );
  }, [queryClient, t]);

  // ─── Computed ───

  const totalValue = useMemo(() => parseFloat(price) || 0, [price]);

  const matchingExisting = useMemo(() => {
    if (!selectedStock) return null;
    return existingAssets.find(a => a.ticker === selectedStock.ticker || a.name === selectedStock.name) ?? null;
  }, [selectedStock, existingAssets]);

  const doSavePortfolioAsset = useCallback(
    async (input: SavePortfolioAssetInput) =>
      persistAssetToPortfolio(supabase, input, t('add_asset.alert_save_timeout_msg')),
    [t],
  );

  // ─── Cash save ───

  const handleCashSave = async () => {
    const amount = parseFloat(cashAmount.replace(/,/g, ''));
    if (!amount || amount <= 0) {
      Alert.alert(t('add_asset.alert_cash_amount_title'), t('add_asset.alert_cash_amount_msg'));
      return;
    }
    if (cashSaving) return;
    setCashSaving(true);
    try {
      const user = authUser ?? await getCurrentUser();
      if (!user) throw new Error(t('add_asset.alert_login_required'));
      let krwAmount = amount;
      if (cashType === 'CASH_USD') {
        const rate = await fetchExchangeRate().catch(() => 1450);
        krwAmount = Math.round(amount * rate);
      }
      const meta = CASH_META[cashType];
      const existingCash = existingAssets.find((a) => a.ticker === cashType);
      await doSavePortfolioAsset({
        userId: user.id, ticker: cashType, name: meta.name,
        quantity: 1, avgPrice: krwAmount, currentValue: krwAmount,
        currency: 'KRW', existingId: existingCash?.id ?? null,
      });
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      await loadExistingAssets();
      setCashAmount('');
      Alert.alert(
        t('add_asset.alert_cash_done_title'),
        t('add_asset.alert_cash_done_msg', { name: meta.name, amount: krwAmount.toLocaleString() }),
        [
          { text: t('add_asset.alert_done_view_prescription'), onPress: () => router.push('/(tabs)/rebalance') },
          { text: t('add_asset.alert_done_add_more'), style: 'cancel' },
        ],
      );
    } catch (err) {
      Alert.alert(t('add_asset.alert_save_failed_title'), err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCashSaving(false);
    }
  };

  // ─── Stock save ───

  const resetForm = () => {
    setSelectedStock(null);
    setSearchQuery('');
    setQuantity('');
    setPrice('');
    setEditingAsset(null);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    if (!selectedStock) {
      savingRef.current = false;
      Alert.alert(t('add_asset.alert_select_stock_title'), t('add_asset.alert_select_stock_msg'));
      return;
    }
    const q = parseFloat(quantity);
    const totalCost = price.trim() ? (parseFloat(price) || 0) : 0;
    if (!q || q <= 0) {
      savingRef.current = false;
      Alert.alert(t('add_asset.alert_quantity_title'), t('add_asset.alert_quantity_msg'));
      return;
    }
    setSaving(true);
    try {
      const user = authUser ?? await getCurrentUser();
      if (!user) throw new Error(t('add_asset.alert_login_required'));
      const ticker = selectedStock.ticker.trim();
      const name = selectedStock.name.trim();
      const existing = existingAssets.find(a => a.ticker === ticker || a.name === name);
      let finalQuantity = q;
      let finalAvgPrice = totalCost > 0 && q > 0 ? Math.round(totalCost / q) : 0;
      if (existing && totalCost > 0 && existing.avg_price > 0) {
        const existingTotalCost = existing.quantity * existing.avg_price;
        finalQuantity = existing.quantity + q;
        finalAvgPrice = Math.round((existingTotalCost + totalCost) / finalQuantity);
      } else if (existing && totalCost <= 0) {
        finalQuantity = existing.quantity + q;
        finalAvgPrice = existing.avg_price;
      }
      const currentValue = finalAvgPrice > 0 ? finalQuantity * finalAvgPrice : 0;
      const currency = 'KRW' as const;
      await doSavePortfolioAsset({
        userId: user.id, ticker, name, quantity: finalQuantity, avgPrice: finalAvgPrice,
        currentValue, currency, existingId: existing?.id ?? null,
      });
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(LAST_SCAN_DATE_KEY, today);
      if (ticker && !getTickerProfile(ticker)) {
        classifyTicker(ticker, name).catch(() => {});
      }
      await saveRecentAsset(selectedStock);
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      resetForm();
      await loadExistingAssets();
      const updatedCount = existingAssets.length + 1;
      let rewardMsg = '';
      try {
        const reward = await grantAssetRegistrationReward(updatedCount);
        if (reward.success) {
          rewardMsg = t('add_asset.alert_done_reward', {
            amount: REWARD_AMOUNTS.assetRegistration, krw: REWARD_AMOUNTS.assetRegistration * 100,
          });
        }
      } catch (err) {
        console.warn('[AddAsset] 자산 등록 보상 확인 실패:', err);
      }
      const unit = selectedStock.category === 'crypto'
        ? t('add_asset.alert_done_unit_crypto') : t('add_asset.alert_done_unit_stock');
      const valueInfo = currentValue > 0 ? ` (₩${currentValue.toLocaleString()})` : '';
      Alert.alert(
        t('add_asset.alert_done_title'),
        `${name} ${finalQuantity}${unit}${valueInfo}이(가) 등록되었습니다.${rewardMsg}`,
        [
          { text: t('add_asset.alert_done_view_prescription'), onPress: () => router.push('/(tabs)/rebalance') },
          { text: t('add_asset.alert_done_add_more'), style: 'cancel' },
        ],
      );
    } catch (error) {
      console.error('[AddAsset] 저장 실패:', error);
      Alert.alert(t('add_asset.alert_save_failed_title'), error instanceof Error ? error.message : t('common.error'));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  // ─── Screenshot ───

  const handleScreenshotParse = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('add_asset.alert_ocr_perm_title'), t('add_asset.alert_ocr_perm_msg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: false, quality: 0.8, base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setScreenshotParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { type: 'parse-screenshot', data: { imageBase64: result.assets[0].base64, mimeType: result.assets[0].mimeType || 'image/jpeg' } },
      });
      // 서버 응답이 어떤 래퍼 구조로 오든 자산 배열만 추출하면 성공 처리
      const payload = data?.data ?? data;
      let normalizedAssets = normalizeParsedAssets(payload);
      // 구조화 파싱 실패 시, 서버가 보낸 rawText로 클라이언트 측 재파싱 시도
      if (normalizedAssets.length === 0 && payload?.rawText) {
        normalizedAssets = normalizeParsedAssets({ text: payload.rawText });
      }
      if (normalizedAssets.length === 0) {
        console.warn('[AddAsset] OCR 파싱 실패 — error:', error, 'data:', JSON.stringify(data)?.slice(0, 500));
        Alert.alert(t('add_asset.alert_ocr_fail_title'), t('add_asset.alert_ocr_fail_msg'));
        return;
      }
      setParsedAssets(normalizedAssets);
    } catch (err) {
      Alert.alert(t('add_asset.alert_ocr_error_title'), t('add_asset.alert_ocr_error_msg'));
    } finally {
      setScreenshotParsing(false);
    }
  };

  const handleBulkSave = async (assets: ParsedAsset[]) => {
    const user = authUser ?? await getCurrentUser();
    if (!user) {
      Alert.alert(t('common.error'), t('add_asset.alert_bulk_fail_msg'));
      return;
    }
    let successCount = 0;
    const normalizedAssets = normalizeParsedAssets(assets);
    for (const asset of normalizedAssets) {
      try {
        const avgPrice = asset.totalCostKRW > 0 && asset.quantity > 0
          ? Math.round(asset.totalCostKRW / asset.quantity) : 0;
        const existing = existingAssets.find((row) => row.ticker === asset.ticker || row.name === asset.name);
        const currentValue = asset.currentValueKRW ?? asset.totalCostKRW;
        await doSavePortfolioAsset({
          userId: user.id, ticker: asset.ticker, name: asset.name, quantity: asset.quantity,
          avgPrice, currentValue, currency: 'KRW', existingId: existing?.id ?? null,
        });
        successCount++;
      } catch (err) {
        console.warn(`[AddAsset] 일괄 등록 실패 (${asset.name}):`, err);
      }
    }
    setParsedAssets(null);
    queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
    await loadExistingAssets();
    Alert.alert(t('add_asset.alert_bulk_done_title'), t('add_asset.alert_bulk_done_msg', { count: successCount }));
  };

  // ─── Category change ───

  const handleCategoryChange = (category: AssetCategory) => {
    setAssetCategory(category);
    resetForm();
    setCashAmount('');
  };

  const handleClearSelection = () => {
    setSelectedStock(null);
    setPrice('');
  };

  return {
    // Category
    assetCategory,
    handleCategoryChange,
    // Cash
    cashType, setCashType,
    cashAmount, setCashAmount,
    cashSaving,
    handleCashSave,
    // Search
    searchQuery, setSearchQuery,
    searchResults,
    showDropdown, setShowDropdown,
    // Selected stock
    selectedStock,
    selectStock,
    handleClearSelection,
    // Input
    quantity, setQuantity,
    price, setPrice,
    totalValue,
    matchingExisting,
    // Edit
    editingAsset,
    startEditAsset,
    deleteAsset,
    // Save
    saving,
    handleSave,
    resetForm,
    // Recent
    recentAssets,
    selectRecentAsset,
    // Existing
    existingAssets,
    loadingAssets,
    authFailed,
    loadExistingAssets,
    // Screenshot
    screenshotParsing,
    handleScreenshotParse,
    parsedAssets,
    setParsedAssets,
    handleBulkSave,
  };
}
