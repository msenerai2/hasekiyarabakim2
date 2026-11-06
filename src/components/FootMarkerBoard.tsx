import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Crosshair } from 'lucide-react';
import { FootMarker, FootMarkerSet } from '../types';
import { formatDateTimeTR } from '../services/firebase';

interface FootMarkerBoardProps {
  markerSets: FootMarkerSet[];
  activeSetIndex: number;
  onSetIndexChange: (index: number) => void;
  onAddMarker: (marker: FootMarker, createNewSet: boolean) => Promise<void>;
  readOnly?: boolean;
}

export const FootMarkerBoard: React.FC<FootMarkerBoardProps> = ({
  markerSets,
  activeSetIndex,
  onSetIndexChange,
  onAddMarker,
  readOnly = false
}) => {
  const [selectedSize, setSelectedSize] = useState<number>(25);
  const [selectedColor, setSelectedColor] = useState<string>('#e53935');
  const [hoveredMarker, setHoveredMarker] = useState<{ marker: FootMarker; x: number; y: number } | null>(null);
  const [pendingCoord, setPendingCoord] = useState<{ xPx: number; yPx: number; xPercent: number; yPercent: number } | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [mousePreview, setMousePreview] = useState<{ xPercent: number; yPercent: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const REF_WIDTH = 750;
  const REF_HEIGHT = 300;

  const currentSet = markerSets[activeSetIndex] || null;

  const sizes = [
    { px: 5, label: '5px' },
    { px: 10, label: '10px' },
    { px: 25, label: '25px' },
    { px: 50, label: '50px' }
  ];

  const colors = [
    '#e53935', // Red
    '#fb8c00', // Orange
    '#fdd835', // Yellow
    '#43a047', // Green
    '#1e88e5', // Blue
    '#8e24aa', // Purple
    '#212121'  // Black
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePreview({ xPercent: xPct, yPercent: yPct });
  };

  const handleMouseLeave = () => {
    setMousePreview(null);
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPx = Math.round(Math.max(0, Math.min(REF_WIDTH, ((e.clientX - rect.left) / rect.width) * REF_WIDTH)));
    const yPx = Math.round(Math.max(0, Math.min(REF_HEIGHT, ((e.clientY - rect.top) / rect.height) * REF_HEIGHT)));
    const xPercent = (xPx / REF_WIDTH) * 100;
    const yPercent = (yPx / REF_HEIGHT) * 100;

    const coord = { xPx, yPx, xPercent, yPercent };

    if (!currentSet || markerSets.length === 0) {
      // First marker ever: create directly
      const newMarker: FootMarker = {
        xPx: coord.xPx,
        yPx: coord.yPx,
        x: coord.xPercent,
        y: coord.yPercent,
        boyut: selectedSize,
        renk: selectedColor,
        tarih: new Date().toISOString()
      };
      onAddMarker(newMarker, true);
    } else {
      setPendingCoord(coord);
      setShowQuestionModal(true);
    }
  };

  const confirmAddMarker = async (createNew: boolean) => {
    if (!pendingCoord) return;
    const newMarker: FootMarker = {
      xPx: pendingCoord.xPx,
      yPx: pendingCoord.yPx,
      x: pendingCoord.xPercent,
      y: pendingCoord.yPercent,
      boyut: selectedSize,
      renk: selectedColor,
      tarih: new Date().toISOString()
    };
    setShowQuestionModal(false);
    setPendingCoord(null);
    await onAddMarker(newMarker, createNew);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Control Strip on Top */}
      {!readOnly && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-teal-600" />
              <span>Marker Ekle:</span>
            </span>

            {/* Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Boyut:</span>
              <div className="flex items-center gap-1">
                {sizes.map(s => (
                  <button
                    key={s.px}
                    type="button"
                    onClick={() => setSelectedSize(s.px)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      selectedSize === s.px ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-500' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                    title={s.label}
                  >
                    <span
                      className="rounded-full bg-slate-700 block"
                      style={{ width: Math.max(4, s.px / 4), height: Math.max(4, s.px / 4) }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Renk:</span>
              <div className="flex items-center gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      selectedColor === c ? 'scale-115 ring-2 ring-slate-800 border-white' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                  title="Özel Renk Seç"
                />
              </div>
            </div>
          </div>

          {/* History Pagination */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">
              {markerSets.length > 0 ? `${activeSetIndex + 1} / ${markerSets.length}` : '0 / 0'}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={markerSets.length <= 1}
                onClick={() => onSetIndexChange((activeSetIndex - 1 + markerSets.length) % markerSets.length)}
                className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                title="Önceki İşaretleme"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={markerSets.length <= 1}
                onClick={() => onSetIndexChange((activeSetIndex + 1) % markerSets.length)}
                className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                title="Sonraki İşaretleme"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Board Container */}
      <div
        ref={containerRef}
        onClick={handleBoardClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full aspect-[750/300] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs cursor-crosshair select-none"
      >
        {/* Foot Image (PNG) */}
        <img
          src="/ayak.png"
          alt="Ayak Şeması"
          className="w-full h-full object-contain pointer-events-none select-none"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.endsWith('/ayak.png')) {
              target.src = '/assets/aistudio/ayak_cd401c9f.png';
            }
          }}
        />

        {/* Existing Markers for Active Set */}
        {currentSet && (currentSet.markerlar || []).map((marker, idx) => {
          const xPct = marker.x !== undefined ? marker.x : (marker.xPx / REF_WIDTH) * 100;
          const yPct = marker.y !== undefined ? marker.y : (marker.yPx / REF_HEIGHT) * 100;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredMarker({ marker, x: xPct, y: yPct })}
              onMouseLeave={() => setHoveredMarker(null)}
              onClick={e => e.stopPropagation()}
              className="absolute rounded-full border-2 border-white shadow-md transition-transform hover:scale-125 z-10"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: `${marker.boyut}px`,
                height: `${marker.boyut}px`,
                backgroundColor: marker.renk,
                transform: 'translate(-50%, -50%)'
              }}
            />
          );
        })}

        {/* Mouse Live Preview */}
        {mousePreview && !readOnly && (
          <div
            className="absolute rounded-full border border-dashed border-white pointer-events-none opacity-60 z-20"
            style={{
              left: `${mousePreview.xPercent}%`,
              top: `${mousePreview.yPercent}%`,
              width: `${selectedSize}px`,
              height: `${selectedSize}px`,
              backgroundColor: selectedColor,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}

        {/* Hover Tooltip */}
        {hoveredMarker && (
          <div
            className="absolute pointer-events-none z-30 bg-slate-900/90 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap"
            style={{
              left: `${hoveredMarker.x}%`,
              top: `${hoveredMarker.y}%`,
              transform: 'translate(-50%, -130%)'
            }}
          >
            {hoveredMarker.marker.tarih ? formatDateTimeTR(new Date(hoveredMarker.marker.tarih)) : 'Tarih bilgisi yok'}
          </div>
        )}

        {/* Marker set metadata info tag */}
        {currentSet && (
          <div className="absolute bottom-2 right-2.5 z-10 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
            {currentSet.sonDuzenleme?.toDate ? formatDateTimeTR(currentSet.sonDuzenleme.toDate()) : 'Aktif İşaretleme'}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Same set vs New set */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">İşaretleme Tercihi</h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bu yara işaretini mevcut fotoğraftaki işaretlemelerin üzerine mi eklemek istiyorsunuz, yoksa yeni bir takip tarihi (yeni fotoğraf katmanı) olarak mı açmak istersiniz?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => confirmAddMarker(false)}
                className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Aynı İşaretleme Üzerine Ekle
              </button>
              <button
                type="button"
                onClick={() => confirmAddMarker(true)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Yeni İşaretleme (Yeni Katman) Oluştur
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuestionModal(false);
                  setPendingCoord(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 py-1"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
