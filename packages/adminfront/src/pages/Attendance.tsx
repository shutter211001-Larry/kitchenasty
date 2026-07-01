import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Attendance() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render((decodedText) => {
        scanner.clear();
        setShowScanner(false);
        handleCheckIn(decodedText);
      }, (err) => {
        // ignore scan errors
      });

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner]);

  useEffect(() => {
    fetchLocations();
    fetchMyRecords();
    
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
        },
        (error) => {
          setGeoError(error.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGeoError('Geolocation is not supported by this browser.');
    }
  }, []);
  
  useEffect(() => {
    if (user?.locationId) {
      setSelectedLocation(user.locationId);
    } else if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [user, locations, selectedLocation]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMyRecords() {
    try {
      const res = await fetch('/api/attendance/my-records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyRecords(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleCheckIn = async (qrToken?: string) => {
    if (!qrToken && !selectedLocation) {
      toast.error('請選擇打卡門市');
      return;
    }
    
    if (!qrToken && (currentLat === null || currentLng === null)) {
      toast.error('無法取得定位，無法使用 GPS 打卡');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          locationId: selectedLocation || 'scan',
          lat: currentLat,
          lng: currentLng,
          device: navigator.userAgent,
          qrToken
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.isOutOfRange) {
           toast.success('打卡成功 (距離過遠標記為異常)', { icon: '⚠️' });
        } else {
           toast.success('打卡成功');
        }
        fetchMyRecords();
      } else {
        toast.error(data.error || '打卡失敗');
      }
    } catch (err) {
      toast.error('系統錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/check-out/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('下班打卡成功');
        fetchMyRecords();
      } else {
        toast.error(data.error || '打卡失敗');
      }
    } catch (err) {
      toast.error('系統錯誤');
    } finally {
      setLoading(false);
    }
  };

  // Find if checked in but not checked out
  const todayRecord = myRecords.find(r => !r.checkOut && new Date(r.checkIn).setHours(0,0,0,0) === new Date().setHours(0,0,0,0));

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('nav.checkIn')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-bold mb-4">目前狀態</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">打卡門市</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded border-gray-300"
              disabled={!!todayRecord}
            >
              <option value="">請選擇</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              定位狀態: {currentLat !== null ? '已取得' : (geoError || '定位中...')}
            </p>
          </div>

          {todayRecord ? (
            <div>
              <p className="text-green-600 font-bold mb-4">您已經打卡上班</p>
              <p className="mb-4">上班時間: {new Date(todayRecord.checkIn).toLocaleString()}</p>
              <button
                onClick={() => handleCheckOut(todayRecord.id)}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50"
              >
                下班打卡
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => handleCheckIn()}
                disabled={loading || currentLat === null}
                className="flex-1 bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                GPS 上班打卡
              </button>
              <button
                onClick={() => setShowScanner(true)}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                掃描 QR Code
              </button>
            </div>
          )}
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">掃描門市 QR Code</h3>
                <button onClick={() => setShowScanner(false)} className="text-gray-500 hover:text-gray-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div id="reader" className="w-full"></div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-bold mb-4">{t('nav.attendanceRecords')}</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">上班時間</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">下班時間</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">門市</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">狀態</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {myRecords.map(record => (
                  <tr key={record.id}>
                    <td className="px-4 py-2">{new Date(record.checkIn).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{new Date(record.checkIn).toLocaleTimeString()}</td>
                    <td className="px-4 py-2">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                    <td className="px-4 py-2">{record.location?.name}</td>
                    <td className="px-4 py-2">
                      {record.isOutOfRange ? (
                        <span className="text-red-500 font-medium">距離異常</span>
                      ) : (
                        <span className="text-green-500 font-medium">正常</span>
                      )}
                    </td>
                  </tr>
                ))}
                {myRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">尚無紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
