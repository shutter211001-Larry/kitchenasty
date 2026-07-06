import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AttendanceCorrections from './AttendanceCorrections';
import LeaveApprovals from './LeaveApprovals';

export default function Approvals() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'corrections' | 'leaves'>('corrections');

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">簽核中心</h2>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('corrections')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'corrections' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            {t('attendanceCorrections.title') || '補打卡審核'}
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'leaves' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            {t('attendance.leaveApprovalTitle') || '請假審核'}
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'corrections' ? (
          <div className="-m-6"><AttendanceCorrections /></div>
        ) : (
          <div className="-m-6"><LeaveApprovals /></div>
        )}
      </div>
    </div>
  );
}
