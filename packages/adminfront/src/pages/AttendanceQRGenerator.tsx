import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

export default function AttendanceQRGenerator() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (user?.locationId && !selectedLocation) {
      setSelectedLocation(user.locationId);
    } else if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [user, locations, selectedLocation]);

  useEffect(() => {
    let interval: any;
    if (selectedLocation) {
      fetchQrToken();
      // Fetch new token every 20 seconds
      interval = setInterval(() => {
        fetchQrToken();
      }, 20000);
    }
    return () => clearInterval(interval);
  }, [selectedLocation]);

  useEffect(() => {
    let timer: any;
    if (qrToken) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [qrToken]);

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

  async function fetchQrToken() {
    if (!selectedLocation) return;
    try {
      const res = await fetch(`/api/attendance/qr-token?locationId=${selectedLocation}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQrToken(data.data.token);
        setTimeLeft(30);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const selectedLocName = locations.find((l) => l.id === selectedLocation)?.name || '';

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('autoGen.admin.key98')}</h2>
      <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
            {t('autoGen.admin.key99')}
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full rounded border-gray-300 p-2 border"
          >
            <option value="">{t('autoGen.admin.key100')}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {selectedLocation && qrToken ? (
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-xl font-bold mb-4">{selectedLocName}</h3>
            <div className="bg-white p-4 border rounded-xl inline-block mb-4">
              <QRCodeSVG
                value={qrToken}
                size={256}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-gray-500 font-medium">
              {t('autoGen.admin.key101')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('autoGen.admin.key102')} <span className="font-bold text-blue-600">{timeLeft}</span> {t('autoGen.admin.key103')}
            </p>
          </div>
        ) : (
          <div className="py-12 text-gray-400">
            {t('autoGen.admin.key104')}
          </div>
        )}
      </div>
    </div>
  );
}
