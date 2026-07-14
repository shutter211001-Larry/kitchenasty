import { useTranslation } from 'react-i18next';
import { Menu, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LocationMenuTab({ locationId }: { locationId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Menu className="w-5 h-5 text-gray-500" />
          {t('locationForm.b81019', '店家菜單配置')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">管理該門市專屬的菜單品項，或是覆寫全域菜單的價格與庫存狀態。</p>
      </div>

      <div className="p-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
          <Info className="w-8 h-8 text-blue-500 mx-auto mb-4" />
          <h3 className="text-blue-900 font-semibold mb-2">菜單管理中心</h3>
          <p className="text-sm text-blue-700 max-w-md mx-auto mb-6">
            本系統採用集中式的菜單主檔庫架構。若您需要覆寫該門市的品項價格、設定售完狀態 (Sold Out)，或是新增該門市專屬的私房菜色，請前往統一的菜單管理介面。
          </p>
          <button
            onClick={() => navigate('/menu/items')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            前往菜單主檔庫
          </button>
        </div>
      </div>
    </div>
  );
}
