import React, { useState } from 'react';
import { Pill, Calendar, Clock, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { AntibioticRecord } from '../types';
import { formatDateTR } from '../services/firebase';

interface AntibioticTrackerPanelProps {
  records: AntibioticRecord[];
  onOpenNewAntibiotic: () => void;
  onUpdateEndDate: (record: AntibioticRecord) => void;
  onStartFollowup: (record: AntibioticRecord) => void;
}

export const AntibioticTrackerPanel: React.FC<AntibioticTrackerPanelProps> = ({
  records,
  onOpenNewAntibiotic,
  onUpdateEndDate,
  onStartFollowup
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Compute status for each antibiotic
  const computedList = records.map(rec => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = rec.baslamaTarihi ? new Date(rec.baslamaTarihi) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = rec.bitisTarihi ? new Date(rec.bitisTarihi) : null;
    if (end) end.setHours(23, 59, 59, 999);

    let status: 'active' | 'completed' | 'future' = 'active';
    let daysUsed = 0;
    let daysRemaining = 0;
    let totalDays = 0;

    if (start && end) {
      const msPerDay = 1000 * 60 * 60 * 24;
      totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));

      if (today < start) {
        status = 'future';
        daysRemaining = Math.max(0, Math.round((end.getTime() - today.getTime()) / msPerDay));
      } else if (today > end) {
        status = 'completed';
        daysUsed = totalDays;
        daysRemaining = 0;
      } else {
        status = 'active';
        daysUsed = Math.max(1, Math.round((today.getTime() - start.getTime()) / msPerDay) + 1);
        daysRemaining = Math.max(0, Math.round((end.getTime() - today.getTime()) / msPerDay));
      }
    }

    const progressPct = totalDays > 0 ? Math.min(100, Math.round((daysUsed / totalDays) * 100)) : 100;

    return {
      ...rec,
      status,
      daysUsed,
      daysRemaining,
      totalDays,
      progressPct
    };
  });

  const activeRecords = computedList.filter(r => r.status === 'active' || r.status === 'future');
  const completedRecords = computedList.filter(r => r.status === 'completed');

  const selectedItem = computedList.find(r => r.id === selectedRecordId) || computedList[0] || null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-2xs">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-teal-50/70 to-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-teal-600 text-white rounded">
            <Pill className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-tight">Antibiyotik Takibi</h3>
            <span className="text-[10px] text-slate-500 font-medium">
              {activeRecords.length > 0 ? `${activeRecords.length} Aktif Tedavi` : 'Aktif Tedavi Yok'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewAntibiotic}
          className="text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
        >
          <span>+ Yeni Başlat</span>
        </button>
      </div>

      {computedList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Pill className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-xs font-medium text-slate-600">Başlatılmış antibiyotik yok</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
            Hastaya kültür sonucu veya ampirik antibiyotik başlatmak için yukarıdaki butonu kullanın.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-y-auto">
          {/* Quick Select Buttons */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
            {computedList.map(item => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedRecordId(item.id)}
                  className={`p-2 rounded-lg border text-left transition-all text-xs truncate ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/70 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate">{item.antibiyotikAdi}</div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                    <span>{item.doz || '-'} {item.siklik || ''}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      item.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'completed' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status === 'active' ? 'Kullanıyor' : item.status === 'completed' ? 'Bitti' : 'Başlayacak'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Selected Card */}
          {selectedItem && (
            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-xs flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedItem.antibiyotikAdi}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {selectedItem.doz} · {selectedItem.siklik} · {selectedItem.uygulamaYolu || 'Oral'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedItem.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    selectedItem.status === 'completed' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedItem.status === 'active' ? 'Aktif Tedavi' : selectedItem.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                  </span>
                </div>

                {/* Badges: Combination / Switch */}
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {selectedItem.kombinasyonMu && (
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                      Kombinasyon Tedavisi
                    </span>
                  )}
                  {selectedItem.tedaviDegisikligi && (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      Önceki Tedavi Sonrası Değiştirildi
                    </span>
                  )}
                  {selectedItem.baslamaNedeni && (
                    <span className="text-[9px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Neden: {selectedItem.baslamaNedeni}
                    </span>
                  )}
                  {selectedItem.kulturDurumu && (
                    <span className="text-[9px] font-medium bg-teal-50 text-teal-800 px-2 py-0.5 rounded">
                      Kültür: {selectedItem.kulturDurumu}
                    </span>
                  )}
                </div>

                {/* Date Row */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded border border-slate-100 mb-2.5">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Başlama Tarihi</span>
                    <span className="font-semibold text-slate-800">{formatDateTR(new Date(selectedItem.baslamaTarihi))}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Bitiş Tarihi</span>
                    <span className="font-semibold text-slate-800">{formatDateTR(new Date(selectedItem.bitisTarihi))}</span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="p-2.5 bg-teal-50/40 rounded border border-teal-100/70 mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-teal-900">
                      {selectedItem.status === 'active'
                        ? `${selectedItem.daysUsed}. gününde (${selectedItem.daysRemaining} gün kaldı)`
                        : selectedItem.status === 'completed'
                        ? `${selectedItem.totalDays} gün kullanıldı (Sonlandı)`
                        : `${selectedItem.daysRemaining} gün sonra başlayacak`}
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 font-mono">
                      %{selectedItem.progressPct}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedItem.status === 'completed' ? 'bg-slate-400' : 'bg-teal-600'
                      }`}
                      style={{ width: `${selectedItem.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onUpdateEndDate(selectedItem)}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Bitiş Tarihini Güncelle / Uzat</span>
                </button>

                <button
                  type="button"
                  onClick={() => onStartFollowup(selectedItem)}
                  className="w-full py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Bitişinden Sonra Yeni Tedavi Başlat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
