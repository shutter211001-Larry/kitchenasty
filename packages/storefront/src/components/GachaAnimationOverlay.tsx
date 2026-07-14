import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface GachaResult {
  parentItemId: string;
  parentItemName: string;
  hasGachaAnimation: boolean;
  image?: string | null;
  results: {
    childItemId: string;
    childItemName: string;
    quantity: number;
    image?: string | null;
  }[];
}

interface Props {
  results: GachaResult[];
  onComplete: () => void;
}

export function GachaAnimationOverlay({ results, onComplete }: Props) {
  const { t } = useTranslation();
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'flash' | 'reveal' | 'done'>('intro');

  // Filter only results that want animation
  const animatingResults = results.filter(r => r.hasGachaAnimation);

  useEffect(() => {
    if (animatingResults.length === 0) {
      onComplete();
      return;
    }

    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('flash'), 1800);
      return () => clearTimeout(timer);
    } else if (phase === 'flash') {
      const timer = setTimeout(() => setPhase('reveal'), 800);
      return () => clearTimeout(timer);
    } else if (phase === 'reveal') {
      const timer = setTimeout(() => {
        if (activeResultIndex < animatingResults.length - 1) {
          setActiveResultIndex(prev => prev + 1);
          setPhase('intro');
        } else {
          setPhase('done');
          setTimeout(onComplete, 800); // 0.8s buffer before unmounting
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [phase, activeResultIndex, animatingResults.length, onComplete]);

  if (animatingResults.length === 0) return null;

  const currentResult = animatingResults[activeResultIndex];
  const resultsCount = currentResult.results.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden font-sans">
      <style>{`
        @keyframes floatGacha {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes popInGacha {
          0% { transform: scale(0.8) translateY(30px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes burstLight {
          0% { transform: scale(0); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes shimmerGacha {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
      `}</style>

      {/* Background Overlay */}
      <div 
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-1000 ${
          phase === 'done' ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Light Burst during flash phase */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          phase === 'flash' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="w-[300px] h-[300px] bg-yellow-100 rounded-full blur-[80px]"
          style={{ animation: phase === 'flash' ? 'burstLight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none' }}
        />
        <div 
          className="w-[150px] h-[150px] bg-white rounded-full blur-[40px] absolute"
          style={{ animation: phase === 'flash' ? 'burstLight 0.8s ease-out forwards' : 'none' }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-6 text-center">
        {/* Intro Box */}
        <div 
          className={`absolute flex flex-col items-center space-y-8 transition-all duration-500 w-full max-w-md ${
            phase === 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-widest text-white/90 drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
            {t('gacha.opening') || (t('gachaAnimationOverlay.ca3b2e') || '準備開箱...')}
          </h2>
          <div 
            className="relative w-56 h-56 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.15)] ring-1 ring-white/20 bg-white/10 backdrop-blur-md"
            style={{ animation: 'floatGacha 3s ease-in-out infinite' }}
          >
            {currentResult.image ? (
              <img 
                src={currentResult.image} 
                alt={currentResult.parentItemName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-white/40">
                🎁
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-6">
               <p className="text-2xl text-white font-medium drop-shadow-md">{currentResult.parentItemName}</p>
            </div>
          </div>
        </div>

        {/* Reveal Items */}
        <div 
          className={`absolute flex flex-col items-center space-y-8 transition-all duration-700 w-full ${
            phase === 'reveal' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-widest drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-500">
            {t('gacha.congratulations') || (t('gachaAnimationOverlay.adfd47') || '恭喜抽中！')}
          </h2>
          
          <div className={`grid gap-4 w-full px-4 ${
            resultsCount === 1 ? 'grid-cols-1 max-w-[280px]' : 
            resultsCount === 2 ? 'grid-cols-2 max-w-[500px]' : 
            'grid-cols-2 md:grid-cols-3 max-w-[700px]'
          }`}>
            {currentResult.results.map((child, idx) => (
              <div 
                key={idx}
                className="relative aspect-square rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-yellow-400/40 bg-white/10 backdrop-blur-xl group"
                style={{ 
                  animation: phase === 'reveal' ? `popInGacha 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 150}ms forwards` : 'none',
                  opacity: 0
                }}
              >
                {/* Glowing border effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent opacity-50" />
                
                {/* Shimmer line */}
                <div 
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full pointer-events-none"
                  style={{ animation: 'shimmerGacha 2.5s infinite', animationDelay: `${idx * 150 + 800}ms` }}
                />

                {child.image ? (
                  <img 
                    src={child.image} 
                    alt={child.childItemName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner">
                    ✨
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent p-4 pt-12 flex flex-col items-center justify-end h-full opacity-100">
                  <p className="text-lg md:text-xl font-bold text-white/90 leading-tight text-center drop-shadow-md">
                    {child.childItemName}
                  </p>
                  {child.quantity > 1 && (
                    <p className="text-yellow-400 font-bold text-lg mt-1 tracking-wide">
                      x{child.quantity}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
