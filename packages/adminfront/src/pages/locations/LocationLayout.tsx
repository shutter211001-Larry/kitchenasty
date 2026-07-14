import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, Clock, Truck, Users, Menu, Package, Key, LayoutGrid } from 'lucide-react';
import { api } from '../../lib/api.js';

import LocationForm from '../LocationForm.js';
import TableList from '../TableList.js';
import DeliveryZoneList from '../DeliveryZoneList.js';
import LocationHoursTab from './tabs/LocationHoursTab.js';
import LocationHRTab from './tabs/LocationHRTab.js';
import LocationMenuTab from './tabs/LocationMenuTab.js';
import LocationIntegrationsTab from './tabs/LocationIntegrationsTab.js';
import LocationInventoryPanel from '../../components/inventory/LocationInventoryPanel.js';
import { PageHeader } from '../../components/layout/PageHeader.js';

export default function LocationLayout() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [locationName, setLocationName] = useState<string>('...');
  const [isMainStore, setIsMainStore] = useState(false);

  useEffect(() => {
    if (id) {
      api.get<{ data: { name: string; isMainStore: boolean } }>(`/locations/${id}`)
        .then(res => {
          if (res.data) {
            setLocationName(res.data.name);
            setIsMainStore(res.data.isMainStore);
          }
        })
        .catch(() => {});
    }
  }, [id]);

  const navItems = [
    { path: 'basic', label: t('locations.basicInfo', '基本資訊'), icon: Store },
    { path: 'hours', label: t('locations.operatingHours', '營業時間'), icon: Clock },
    { path: 'delivery-zones', label: t('locations.deliveryZones', '外送區域'), icon: Truck },
    { path: 'tables', label: t('locations.tables', '桌位管理'), icon: LayoutGrid },
    { path: 'menu', label: t('locations.menuSettings', '門市菜單配置'), icon: Menu },
    { path: 'inventory', label: t('locations.inventory', '門市庫存'), icon: Package },
    { path: 'hr', label: t('locations.hrRules', '人力資源'), icon: Users },
    { path: 'integrations', label: t('locations.integrations', '整合覆寫'), icon: Key },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={locationName} 
          subtitle={isMainStore ? t('locations.mainStoreBadge', '主店家 (旗艦店)') : t('locations.branchBadge', '分店')}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1 bg-white p-2 rounded-lg border border-gray-200">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="basic" replace />} />
            <Route path="basic" element={<LocationForm isTabMode />} />
            <Route path="hours" element={<LocationHoursTab locationId={id!} />} />
            <Route path="delivery-zones" element={<DeliveryZoneList locationId={id!} />} />
            <Route path="tables" element={<TableList locationId={id!} />} />
            <Route path="menu" element={<LocationMenuTab locationId={id!} />} />
            <Route path="inventory" element={<div className="bg-white p-6 rounded-lg border border-gray-200"><LocationInventoryPanel locationId={id!} /></div>} />
            <Route path="hr" element={<LocationHRTab locationId={id!} />} />
            <Route path="integrations" element={<LocationIntegrationsTab locationId={id!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
