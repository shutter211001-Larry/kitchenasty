import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
}

export default function LegalPageList() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch('/api/legal', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setPages(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">法規頁面管理 (Legal Pages)</h1>

      {pages.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>目前尚無法規頁面。您可以點選下方連結來建立。</p>
          <div className="mt-4 flex gap-3 justify-center">
            <Link to="/legal/pages/privacy-policy" className="text-primary-600 hover:underline">
              建立隱私權政策 (Privacy Policy)
            </Link>
            <Link to="/legal/pages/terms-of-service" className="text-primary-600 hover:underline">
              建立服務條款 (Terms of Service)
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">標題 (Title)</th>
                <th className="px-6 py-3 text-left">網址別名 (Slug)</th>
                <th className="px-6 py-3 text-left">最後更新</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{page.title}</td>
                  <td className="px-6 py-4 text-gray-500">{page.slug}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/legal/pages/${page.slug}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      編輯
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
