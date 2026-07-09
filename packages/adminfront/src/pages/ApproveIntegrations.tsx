import React, { useState } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Key, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export default function ApproveIntegrations() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Security check: Must be SUPER_ADMIN
  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" />;
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">無效的連結</h2>
          <p className="text-gray-500 mb-6">缺少驗證權杖，請確認您點擊的連結是否完整。</p>
          <button onClick={() => navigate('/')} className="w-full bg-gray-900 text-white rounded-xl py-3 font-medium hover:bg-gray-800 transition-colors">
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.post('/settings/integrations/approve', { token });
      setSuccess(true);
      toast.success('整合金鑰已成功套用！');
    } catch (error: any) {
      toast.error(error.error || '套用失敗或連結已失效');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">設定已生效！</h2>
          <p className="text-gray-500 mb-8">新的整合金鑰已經成功套用到您的系統中，相關功能已可正常運作。</p>
          <button onClick={() => navigate('/')} className="flex items-center justify-center w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 gap-2">
            前往管理中心
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-primary-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">確認整合金鑰更新</h2>
          <p className="text-orange-50 mt-2 text-sm">來自 SaaS 平台的系統通知</p>
        </div>
        
        <div className="p-8">
          <p className="text-gray-600 leading-relaxed mb-8">
            平台管理員為您的餐廳配置了新的第三方整合金鑰（可能包含 LINE, Google, 信箱或金流設定）。
            <br/><br/>
            請點擊下方按鈕以套用並啟用這些新設定。如果您不知道這是什麼，請先向平台管理員確認。
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleApprove} 
              disabled={loading}
              className="w-full bg-primary-600 text-white rounded-xl py-3.5 font-bold hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  確認並套用設定
                </>
              )}
            </button>
            <button 
              onClick={() => navigate('/')}
              disabled={loading}
              className="w-full bg-white text-gray-500 border border-gray-200 rounded-xl py-3.5 font-medium hover:bg-gray-50 transition-colors"
            >
              取消並返回首頁
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
