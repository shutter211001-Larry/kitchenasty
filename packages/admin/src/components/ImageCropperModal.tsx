import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperModalProps {
  src: string;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

type AspectRatioPreset = '4:3' | '16:9' | '1:1' | 'free';

export default function ImageCropperModal({ src, onCrop, onClose }: ImageCropperModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('4:3');
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startCrop: typeof crop;
    containerRect: DOMRect;
  } | null>(null);

  // Initialize crop coordinates based on image natural aspect ratio and selected target ratio
  const initializeCrop = (naturalWidth: number, naturalHeight: number, preset: AspectRatioPreset) => {
    if (preset === 'free') {
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
      return;
    }

    const R = preset === '1:1' ? 1 : preset === '4:3' ? 4 / 3 : 16 / 9;
    const imgRatio = naturalWidth / naturalHeight;
    const k = R / imgRatio;

    let Wc = 80;
    let Hc = 80;

    if (k <= 1) {
      Wc = 80 * k;
      Hc = 80;
    } else {
      Wc = 80;
      Hc = 80 / k;
    }

    setCrop({
      x: (100 - Wc) / 2,
      y: (100 - Hc) / 2,
      width: Wc,
      height: Hc,
    });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
    initializeCrop(naturalWidth, naturalHeight, aspectRatio);
  };

  // Re-adjust crop area when user switches presets
  useEffect(() => {
    if (!imgDimensions) return;
    initializeCrop(imgDimensions.width, imgDimensions.height, aspectRatio);
  }, [aspectRatio]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      containerRect: rect,
    };

    setIsDragging(true);
    setActiveHandle(handle);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStateRef.current || !imgDimensions) return;
    const { handle, startX, startY, startCrop, containerRect } = dragStateRef.current;

    // Convert mouse movement to percentage relative to the container width & height
    const dx = ((e.clientX - startX) / containerRect.width) * 100;
    const dy = ((e.clientY - startY) / containerRect.height) * 100;

    let newCrop = { ...startCrop };

    if (aspectRatio === 'free') {
      // Unlocked aspect ratio: allow dragging individual edges and corner nodes freely
      if (handle === 'se') {
        newCrop.width = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + dx));
        newCrop.height = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + dy));
      } else if (handle === 'sw') {
        const targetX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + dx));
        newCrop.width = startCrop.x + startCrop.width - targetX;
        newCrop.x = targetX;
        newCrop.height = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + dy));
      } else if (handle === 'ne') {
        newCrop.width = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + dx));
        const targetY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + dy));
        newCrop.height = startCrop.y + startCrop.height - targetY;
        newCrop.y = targetY;
      } else if (handle === 'nw') {
        const targetX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + dx));
        newCrop.width = startCrop.x + startCrop.width - targetX;
        newCrop.x = targetX;
        const targetY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + dy));
        newCrop.height = startCrop.y + startCrop.height - targetY;
        newCrop.y = targetY;
      } else if (handle === 'n') {
        const targetY = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + dy));
        newCrop.height = startCrop.y + startCrop.height - targetY;
        newCrop.y = targetY;
      } else if (handle === 's') {
        newCrop.height = Math.max(10, Math.min(100 - startCrop.y, startCrop.height + dy));
      } else if (handle === 'w') {
        const targetX = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + dx));
        newCrop.width = startCrop.x + startCrop.width - targetX;
        newCrop.x = targetX;
      } else if (handle === 'e') {
        newCrop.width = Math.max(10, Math.min(100 - startCrop.x, startCrop.width + dx));
      } else if (handle === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + dy));
      }
    } else {
      // Locked aspect ratio: maintain geometry using the predefined coefficients
      const R = aspectRatio === '1:1' ? 1 : aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
      const k = R / (imgDimensions.width / imgDimensions.height);

      if (handle === 'se') {
        const maxWidth = Math.min(100 - startCrop.x, (100 - startCrop.y) * k);
        const newWidth = Math.max(10, Math.min(maxWidth, startCrop.width + dx));
        const newHeight = newWidth / k;
        newCrop = {
          x: startCrop.x,
          y: startCrop.y,
          width: newWidth,
          height: newHeight,
        };
      } else if (handle === 'sw') {
        const maxWidth = Math.min(startCrop.x + startCrop.width, (100 - startCrop.y) * k);
        const newWidth = Math.max(10, Math.min(maxWidth, startCrop.width - dx));
        const newHeight = newWidth / k;
        newCrop = {
          x: startCrop.x + startCrop.width - newWidth,
          y: startCrop.y,
          width: newWidth,
          height: newHeight,
        };
      } else if (handle === 'ne') {
        const maxWidth = Math.min(100 - startCrop.x, (startCrop.y + startCrop.height) * k);
        const newWidth = Math.max(10, Math.min(maxWidth, startCrop.width + dx));
        const newHeight = newWidth / k;
        newCrop = {
          x: startCrop.x,
          y: startCrop.y + startCrop.height - newHeight,
          width: newWidth,
          height: newHeight,
        };
      } else if (handle === 'nw') {
        const maxWidth = Math.min(startCrop.x + startCrop.width, (startCrop.y + startCrop.height) * k);
        const newWidth = Math.max(10, Math.min(maxWidth, startCrop.width - dx));
        const newHeight = newWidth / k;
        newCrop = {
          x: startCrop.x + startCrop.width - newWidth,
          y: startCrop.y + startCrop.height - newHeight,
          width: newWidth,
          height: newHeight,
        };
      } else if (handle === 'move') {
        const newX = Math.max(0, Math.min(100 - startCrop.width, startCrop.x + dx));
        const newY = Math.max(0, Math.min(100 - startCrop.height, startCrop.y + dy));
        newCrop = {
          ...startCrop,
          x: newX,
          y: newY,
        };
      }
    }

    setCrop(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setActiveHandle(null);
    if (dragStateRef.current) {
      dragStateRef.current = null;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleConfirm = () => {
    if (!imgDimensions) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sx = (crop.x / 100) * imgDimensions.width;
      const sy = (crop.y / 100) * imgDimensions.height;
      const sw = (crop.width / 100) * imgDimensions.width;
      const sh = (crop.height / 100) * imgDimensions.height;

      // Restrict max width of cropped menu image to 1200px to maintain supreme quality yet small size
      const targetWidth = Math.min(sw, 1200);
      const targetHeight = (sh / sw) * targetWidth;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw cropped section onto the canvas
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      // Convert to blob and trigger callback
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCrop(blob);
          }
        },
        'image/jpeg',
        0.9
      );
    };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-100">
        
        {/* Left Side: Drag & Crop Workspace */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative select-none min-h-[320px] md:min-h-[480px]">
          {loadingPlaceholder()}

          {src && (
            <div
              ref={containerRef}
              className="relative inline-block overflow-hidden rounded-lg shadow-inner max-w-full max-h-[50vh]"
            >
              <img
                src={src}
                onLoad={handleImageLoad}
                className="max-h-[50vh] max-w-full block select-none pointer-events-none"
                alt="Original food preview"
              />

              {/* Background dark overlay outside the crop box */}
              <div
                className="absolute bg-black/60 inset-0 pointer-events-none transition-opacity"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% 0%,
                    ${crop.x}% ${crop.y}%,
                    ${crop.x + crop.width}% ${crop.y}%,
                    ${crop.x + crop.width}% ${crop.y + crop.height}%,
                    ${crop.x}% ${crop.y + crop.height}%,
                    ${crop.x}% ${crop.y}%
                  )`,
                }}
              />

              {/* The Interactive Crop Box container */}
              <div
                className={`absolute border-2 border-white cursor-move flex flex-col justify-between transition-shadow ${
                  isDragging ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.7)] border-primary-500' : ''
                }`}
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Rule of Thirds Grid overlay */}
                <div
                  className={`absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none transition-opacity duration-300 ${
                    isDragging ? 'opacity-75' : 'opacity-30'
                  }`}
                >
                  <div className="border-r border-dashed border-white/60 border-b border-dashed" />
                  <div className="border-r border-dashed border-white/60 border-b border-dashed" />
                  <div className="border-b border-dashed border-white/60" />
                  <div className="border-r border-dashed border-white/60 border-b border-dashed" />
                  <div className="border-r border-dashed border-white/60 border-b border-dashed" />
                  <div className="border-b border-dashed border-white/60" />
                  <div className="border-r border-dashed border-white/60" />
                  <div className="border-r border-dashed border-white/60" />
                  <div />
                </div>

                {/* Corner Resizing Handles */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                />

                {/* Edge controls only rendered for free resizing to keep interface sleek */}
                {aspectRatio === 'free' && (
                  <>
                    <div
                      className="absolute top-1/2 -left-1 w-2 h-4 bg-white border border-primary-600 rounded -translate-y-1/2 cursor-w-resize hover:scale-110 transition-transform"
                      onPointerDown={(e) => handlePointerDown(e, 'w')}
                    />
                    <div
                      className="absolute top-1/2 -right-1 w-2 h-4 bg-white border border-primary-600 rounded -translate-y-1/2 cursor-e-resize hover:scale-110 transition-transform"
                      onPointerDown={(e) => handlePointerDown(e, 'e')}
                    />
                    <div
                      className="absolute left-1/2 -top-1 w-4 h-2 bg-white border border-primary-600 rounded -translate-x-1/2 cursor-n-resize hover:scale-110 transition-transform"
                      onPointerDown={(e) => handlePointerDown(e, 'n')}
                    />
                    <div
                      className="absolute left-1/2 -bottom-1 w-4 h-2 bg-white border border-primary-600 rounded -translate-x-1/2 cursor-s-resize hover:scale-110 transition-transform"
                      onPointerDown={(e) => handlePointerDown(e, 's')}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Options & Device Display Guides */}
        <div className="md:w-80 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-between bg-gray-50/50 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">裁切產品圖片</h3>
              <p className="text-xs text-gray-500 mt-1">調整並確認圖片顯示範圍，讓前台點餐畫面更精緻。</p>
            </div>

            {/* Aspect Ratio Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                選擇裁切比例 (Aspect Ratio)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['4:3', '16:9', '1:1', 'free'] as AspectRatioPreset[]).map((preset) => {
                  let label = '';
                  if (preset === '4:3') label = '4:3 平衡比例';
                  else if (preset === '16:9') label = '16:9 寬螢幕';
                  else if (preset === '1:1') label = '1:1 正方形';
                  else label = '自由比例';

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAspectRatio(preset)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                        aspectRatio === preset
                          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Device-Specific Rendering Tips */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-xs text-primary-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-primary-800">
                <span className="text-sm">💡</span>
                <span>電腦與手機顯示範圍提醒</span>
              </div>
              <div className="space-y-1 text-primary-700 leading-relaxed">
                <p>
                  <strong>📱 手機 App 畫面</strong>：採用雙排網格，圖片視覺顯示比例約為 <strong>4:3 (或 3:2)</strong>。
                </p>
                <p>
                  <strong>💻 電腦瀏覽器</strong>：多以寬卡片呈現，顯示比例約為 <strong>16:9</strong>。
                </p>
                <div className="border-t border-primary-200/60 my-1.5" />
                <p className="font-semibold text-primary-800">
                  ⭐️ 推薦指南：
                </p>
                <p>
                  若您的顧客多由手機點餐，建議優先裁切為 <strong>4:3</strong> 比例，並將美食<strong>主體置於中央九宮格內</strong>，能確保各裝置上皆有最完美的顯圖效果，免於上下細節遭系統遮蔽！
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all text-center cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium active:scale-95 transition-all text-center cursor-pointer"
            >
              確認裁切
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  function loadingPlaceholder() {
    if (imgDimensions) return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 gap-2">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
        <span className="text-sm">圖片載入中...</span>
      </div>
    );
  }
}
