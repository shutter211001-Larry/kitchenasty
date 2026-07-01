import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { useRef } from 'react';

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

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const startScanner = async () => {
    try {
      setIsCameraStarting(true);
      let availableCameras = cameras;
      if (availableCameras.length === 0) {
        availableCameras = await Html5Qrcode.getCameras();
        setCameras(availableCameras);
      }
      
      if (availableCameras && availableCameras.length > 0) {
        const cameraId = availableCameras[currentCameraIndex].id;
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode("reader");
        }
        await html5QrCodeRef.current.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => {
            stopScanner();
            setShowScanner(false);
            handleCheckIn(decodedText);
          },
          (errorMessage) => {
            // Ignore background scan errors
          }
        );
      } else {
        toast.error("No cameras found.");
        setShowScanner(false);
      }
    } catch (err) {
      console.error("Camera start error:", err);
      toast.error("Camera access denied or unavailable.");
      setShowScanner(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length > 1) {
      await stopScanner();
      setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
    }
  };

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [showScanner, currentCameraIndex]);

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
      toast.error(t('autoGen.admin.key56'));
      return;
    }
    
    if (!qrToken && (currentLat === null || currentLng === null)) {
      toast.error(t('autoGen.admin.key57'));
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
           toast.success(t('autoGen.admin.key58'), { icon: '⚠️' });
        } else {
           toast.success(t('autoGen.admin.key59'));
        }
        fetchMyRecords();
      } else {
        toast.error(data.error || t('autoGen.admin.key60'));
      }
    } catch (err) {
      toast.error(t('autoGen.admin.key61'));
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
        toast.success(t('autoGen.admin.key62'));
        fetchMyRecords();
      } else {
        toast.error(data.error || t('autoGen.admin.key63'));
      }
    } catch (err) {
      toast.error(t('autoGen.admin.key64'));
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
          <h3 className="text-xl font-bold mb-4">{t('autoGen.admin.key65')}</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key66')}</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded border-gray-300"
              disabled={!!todayRecord}
            >
              <option value="">{t('autoGen.admin.key67')}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {t('autoGen.admin.key68')} {currentLat !== null ? t('autoGen.admin.key69') : (geoError || t('autoGen.admin.key70'))}
            </p>
          </div>

          {todayRecord ? (
            <div>
              <p className="text-green-600 font-bold mb-4">{t('autoGen.admin.key71')}</p>
              <p className="mb-4">{t('autoGen.admin.key72')} {new Date(todayRecord.checkIn).toLocaleString()}</p>
              <button
                onClick={() => handleCheckOut(todayRecord.id)}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {t('autoGen.admin.key73')}
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => handleCheckIn()}
                disabled={loading || currentLat === null}
                className="flex-1 bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {t('autoGen.admin.key74')}
              </button>
              <button
                onClick={() => setShowScanner(true)}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('autoGen.admin.key75')}
              </button>
            </div>
          )}
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
            <style>{`
              @keyframes scan-laser {
                0% { top: 0; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }
              #reader video {
                object-fit: cover !important;
                border-radius: 1.5rem !important;
              }
            `}</style>
            
            <div className="relative w-full max-w-[400px] h-[75vh] max-h-[700px] flex flex-col bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-700/50">
              
              {/* Header */}
              <div className="flex justify-between items-center p-5 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
                <h3 className="text-white text-lg font-medium tracking-wide drop-shadow-md">{t('autoGen.admin.key76')}</h3>
                <button onClick={() => setShowScanner(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all hover:scale-105 active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Camera Feed Container */}
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden rounded-[2rem]">
                {isCameraStarting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 bg-gray-900">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-primary-500 rounded-full animate-spin mb-4" />
                    <p className="animate-pulse font-medium text-sm">Starting camera...</p>
                  </div>
                )}
                
                {/* The html5-qrcode element */}
                <div id="reader" className="w-full h-full [&>video]:h-full [&>video]:w-full"></div>
                
                {/* Custom Animated Overlay Viewfinder */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]">
                  <div className="w-64 h-64 relative overflow-hidden">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary-500 rounded-tl-3xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary-500 rounded-tr-3xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary-500 rounded-bl-3xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary-500 rounded-br-3xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                    
                    {/* Laser line */}
                    <div className="w-full h-1 bg-primary-400 absolute left-0 shadow-[0_0_15px_rgba(168,85,247,1),0_0_30px_rgba(168,85,247,0.8)] opacity-0 animate-[scan-laser_2s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <p className="text-white/80 text-sm mt-8 font-medium drop-shadow-md tracking-wide bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    Align QR code within the frame
                  </p>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="p-6 bg-gradient-to-t from-gray-900 to-gray-900/80 flex justify-center gap-6 z-10 absolute bottom-0 w-full backdrop-blur-md pb-8">
                {cameras.length > 1 && (
                  <button onClick={switchCamera} disabled={isCameraStarting} className="flex flex-col items-center gap-2 text-white/70 hover:text-white group disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all border border-white/10 group-active:scale-95 shadow-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </div>
                    <span className="text-xs font-medium tracking-wide">Switch Camera</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-bold mb-4">{t('nav.attendanceRecords')}</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('autoGen.admin.key77')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('autoGen.admin.key78')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('autoGen.admin.key79')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('autoGen.admin.key80')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('autoGen.admin.key81')}</th>
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
                        <span className="text-red-500 font-medium">{t('autoGen.admin.key82')}</span>
                      ) : (
                        <span className="text-green-500 font-medium">{t('autoGen.admin.key83')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {myRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">{t('autoGen.admin.key84')}</td>
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
