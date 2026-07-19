import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { useLocations } from '../hooks/useLocations.js';
import type { Location } from '../hooks/useLocations.js';

export default function LocationSelectorModal() {
  const { t } = useTranslation();
  const { 
    locationId, 
    setLocationId, 
    isLocationModalOpen, 
    setLocationModalOpen,
    itemCount,
    clear
  } = useCart();
  
  const { locations, isLoading } = useLocations();
  const [selectedToChange, setSelectedToChange] = useState<Location | null>(null);

  // Auto-select if only 1 location exists and none is selected
  useEffect(() => {
    if (!isLoading && locations.length === 1 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [isLoading, locations, locationId, setLocationId]);

  // Determine if the modal should be visible
  const isForced = !isLoading && locations.length > 1 && !locationId;
  const isOpen = isForced || isLocationModalOpen;

  if (!isOpen) return null;

  const handleSelectLocation = (loc: Location) => {
    if (loc.id === locationId) {
      setLocationModalOpen(false);
      return;
    }

    if (itemCount > 0) {
      setSelectedToChange(loc);
    } else {
      setLocationId(loc.id);
      setLocationModalOpen(false);
    }
  };

  const confirmChange = () => {
    if (selectedToChange) {
      clear();
      setLocationId(selectedToChange.id);
      setSelectedToChange(null);
      setLocationModalOpen(false);
    }
  };

  const cancelChange = () => {
    setSelectedToChange(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('locations.selectLocation', '請選擇您要點餐的分店')}
          </h2>
          {!isForced && (
            <button 
              onClick={() => setLocationModalOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {selectedToChange ? (
          <div className="p-6">
            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-xl mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-bold mb-1">切換分店將清空購物車</h3>
                  <p className="text-sm opacity-90">
                    您目前購物車內有 {itemCount} 項商品。不同分店可能有不同的菜單與價格，切換至「{selectedToChange.name}」將會清空您目前的購物車，是否繼續？
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={cancelChange}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmChange}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                確認切換並清空
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                目前沒有可用的分店
              </div>
            ) : (
              <div className="grid gap-3">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      locationId === loc.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-gray-100 dark:border-gray-800 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-bold ${locationId === loc.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                        {loc.name}
                      </h3>
                      {locationId === loc.id && (
                        <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs px-2 py-1 rounded-md font-medium">
                          目前選擇
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {loc.address}
                    </p>
                    {loc.phone && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {loc.phone}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
