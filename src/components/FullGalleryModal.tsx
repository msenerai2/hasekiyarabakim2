import React, { useState } from 'react';
import { X, Images, Calendar, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoRecord, Patient } from '../types';
import { toTurkishUpper, formatDateTimeTR } from '../services/firebase';

interface FullGalleryItem {
  photo: PhotoRecord;
  patient: Patient;
}

interface FullGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FullGalleryItem[];
  onSelectPatient: (patientId: string) => void;
}

export const FullGalleryModal: React.FC<FullGalleryModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectPatient
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLocaleLowerCase('tr-TR');
    return (
      item.patient.adSoyad.toLocaleLowerCase('tr-TR').includes(q) ||
      (item.patient.tcNo && item.patient.tcNo.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Images className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tüm Hasta Fotoğrafları Galerisi</h3>
              <span className="text-xs text-slate-500 font-medium">Toplam {filteredItems.length} Fotoğraf</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Hasta adına göre filtrele..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <Images className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="font-semibold text-slate-600">Fotoğraf Bulunamadı</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Henüz sisteme hasta fotoğrafı yüklenmemiş veya arama sonucu boş.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredItems.map((item, idx) => (
                <div
                  key={item.photo.id || idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-teal-400 hover:shadow-md transition-all group flex flex-col"
                >
                  <div
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className="aspect-square bg-slate-100 overflow-hidden cursor-pointer relative"
                  >
                    <img
                      src={item.photo.url}
                      alt={item.patient.adSoyad}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow">
                        Büyüt
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {toTurkishUpper(item.patient.adSoyad)}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {item.photo.tarih ? formatDateTimeTR(item.photo.tarih) : '-'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPatient(item.patient.id);
                        onClose();
                      }}
                      className="mt-2 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 py-1 rounded text-center transition-colors"
                    >
                      Hastayı Aç
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for clicked gallery item */}
      {selectedPhotoIndex !== null && filteredItems[selectedPhotoIndex] && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-5 text-white/70 hover:text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-4xl w-full border border-white/10 flex flex-col md:flex-row">
            <div className="flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[350px]">
              <img
                src={filteredItems[selectedPhotoIndex].photo.url}
                alt="Detay"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="w-full md:w-72 bg-white p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Hasta Bilgisi</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {toTurkishUpper(filteredItems[selectedPhotoIndex].patient.adSoyad)}
                </h3>
                <span className="text-xs text-slate-500">
                  TC: {filteredItems[selectedPhotoIndex].patient.tcNo || 'Belirtilmedi'}
                </span>

                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Yükleme Tarihi:</span>
                    <span>
                      {filteredItems[selectedPhotoIndex].photo.tarih
                        ? formatDateTimeTR(filteredItems[selectedPhotoIndex].photo.tarih)
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Tanı / Etyoloji:</span>
                    <span className="font-semibold text-teal-800">
                      {(filteredItems[selectedPhotoIndex].patient.sikayet || []).join(', ') || 'Belirtilmemiş'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPatient(filteredItems[selectedPhotoIndex].patient.id);
                    setSelectedPhotoIndex(null);
                    onClose();
                  }}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Hasta Dosyasına Git
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
