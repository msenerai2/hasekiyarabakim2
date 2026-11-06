import React from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react';
import { PhotoRecord } from '../types';
import { formatDateTimeTR, formatDateTR } from '../services/firebase';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoRecord[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  matchingNotes?: { title: string; text: string; date?: Date }[];
  patientName?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photos,
  activeIndex,
  onIndexChange,
  matchingNotes = [],
  patientName
}) => {
  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[activeIndex] || photos[0];

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-5 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 z-20"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => onIndexChange((activeIndex - 1 + photos.length) % photos.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => onIndexChange((activeIndex + 1) % photos.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-20 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content wrapper */}
      <div className="flex flex-col lg:flex-row bg-slate-900 rounded-2xl overflow-hidden max-w-5xl w-full max-h-[85vh] border border-white/10 shadow-2xl">
        {/* Photo Left Side */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[350px]">
          <img
            src={currentPhoto.url}
            alt="Klinik Fotoğraf"
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Info Right Side */}
        <div className="w-full lg:w-80 bg-white p-5 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">
              Fotoğraf Detayı
            </div>
            {patientName && (
              <h3 className="text-base font-bold text-slate-900 mb-2 truncate">
                {patientName}
              </h3>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentPhoto.tarih ? formatDateTimeTR(currentPhoto.tarih) : 'Tarih bilgisi yok'}</span>
              <span className="ml-auto font-bold text-slate-600 font-mono text-[11px]">
                {activeIndex + 1}/{photos.length}
              </span>
            </div>

            {/* Matching Evaluation Notes on this Date */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Bu Güne Ait Değerlendirme Notları:</span>
              </h4>

              {matchingNotes.length > 0 ? (
                <div className="space-y-2">
                  {matchingNotes.map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-100 text-xs">
                      <div className="font-bold text-teal-900 text-[11px] mb-0.5">{note.title}</div>
                      <p className="text-slate-700 leading-relaxed text-[11px] whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                  Bu tarihe ait kaydedilmiş bir değerlendirme notu bulunmuyor.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400">
              Klavye yön tuşları (← →) ile fotoğraflar arasında geçiş yapabilirsiniz.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
