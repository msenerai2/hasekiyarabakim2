import React, { useMemo } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Settings,
  Images,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Patient } from '../types';
import { toTurkishUpper } from '../services/firebase';

interface PatientListSidebarProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (p: Patient) => void;
  onNewPatient: () => void;
  onOpenCalculation: () => void;
  onOpenPresets: () => void;
  onOpenFullGallery: () => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (p: Patient) => void;
  onQuickAddVisit: (patientId: string) => void;
  lastVisitMap: Record<string, number>;
}

export const PatientListSidebar: React.FC<PatientListSidebarProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onNewPatient,
  onOpenCalculation,
  onOpenPresets,
  onOpenFullGallery,
  onEditPatient,
  onDeletePatient,
  onQuickAddVisit,
  lastVisitMap
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<string>('basvuru-desc');

  // Filter and sort patients
  const sortedPatients = useMemo(() => {
    let list = [...patients];

    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase('tr-TR');
      list = list.filter(p =>
        p.adSoyad.toLocaleLowerCase('tr-TR').includes(q) ||
        (p.tcNo && p.tcNo.includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'isim-asc') {
        return a.adSoyad.localeCompare(b.adSoyad, 'tr');
      }
      if (sortBy === 'isim-desc') {
        return b.adSoyad.localeCompare(a.adSoyad, 'tr');
      }
      if (sortBy === 'gelis-desc') {
        return (lastVisitMap[b.id] || 0) - (lastVisitMap[a.id] || 0);
      }
      if (sortBy === 'gelis-asc') {
        return (lastVisitMap[a.id] || 0) - (lastVisitMap[b.id] || 0);
      }
      if (sortBy === 'basvuru-asc') {
        return (a.olusturulmaZamani?.toDate?.()?.getTime() || 0) - (b.olusturulmaZamani?.toDate?.()?.getTime() || 0);
      }
      // default: basvuru-desc
      return (b.olusturulmaZamani?.toDate?.()?.getTime() || 0) - (a.olusturulmaZamani?.toDate?.()?.getTime() || 0);
    });

    return list;
  }, [patients, searchQuery, sortBy, lastVisitMap]);

  return (
    <aside className="w-80 lg:w-88 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-200 select-none shrink-0">
      {/* Top action header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Hasta İşlemleri</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenPresets}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Hazır Not Butonları Ayarları"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenFullGallery}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Tüm Hasta Fotoğrafları Galerisi"
            >
              <Images className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewPatient}
            className="w-full py-2 px-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Hasta Kaydı Oluştur</span>
          </button>

          <button
            type="button"
            onClick={onOpenCalculation}
            className="w-full py-2 px-3 bg-slate-800/90 hover:bg-slate-800 text-teal-300 hover:text-teal-200 border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Hasta Hesapla & Raporla</span>
          </button>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900/80">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-300">
            Hastalar ({sortedPatients.length})
          </span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-[10.5px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="basvuru-desc">Başvuru · En Yeni</option>
            <option value="basvuru-asc">Başvuru · En Eski</option>
            <option value="isim-asc">İsim · A-Z</option>
            <option value="isim-desc">İsim · Z-A</option>
            <option value="gelis-desc">Son Geliş · En Yeni</option>
            <option value="gelis-asc">Son Geliş · En Eski</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ad, soyad veya T.C. ile ara..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sortedPatients.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            {searchQuery ? 'Aramaya uygun hasta bulunamadı.' : 'Henüz hasta kaydı eklenmedi.'}
          </div>
        ) : (
          sortedPatients.map(p => {
            const isSelected = selectedPatientId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p)}
                className={`rounded-lg border transition-all cursor-pointer overflow-hidden text-xs ${
                  isSelected
                    ? 'border-teal-500 bg-slate-800/90 shadow-md ring-1 ring-teal-500/50'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                {/* Top Name Bar */}
                <div className="p-2.5 flex items-center justify-between gap-2 border-b border-slate-800/50">
                  <span className="font-bold text-slate-100 uppercase tracking-wide truncate">
                    {toTurkishUpper(p.adSoyad)}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Visit Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onQuickAddVisit(p.id);
                      }}
                      className="p-1 rounded bg-teal-950/60 text-teal-300 hover:bg-teal-700 hover:text-white border border-teal-800/80 transition-colors"
                      title="Yeni Geliş Kaydı Ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onEditPatient(p);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Hastayı Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeletePatient(p);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                      title="Kaydı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub info */}
                <div className="px-2.5 py-2 bg-slate-950/70 space-y-1 text-[11px] text-slate-400">
                  {/* Complaint badges */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {(p.sikayet || []).map(s => (
                      <span
                        key={s}
                        className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded ${
                          s.includes('DM') || s.includes('Diyabetik')
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : s.includes('Basınç')
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-500">T.C. No:</span>
                    <span className="text-slate-300 font-mono">{p.tcNo || '-'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-500">Başvuru:</span>
                    <span className="text-slate-300">{p.basvuru || '-'}</span>
                  </div>

                  {p.dogumTarihi && (
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Doğum:</span>
                      <span className="text-slate-300">{p.dogumTarihi} ({p.cinsiyet || '-'})</span>
                    </div>
                  )}

                  {p.oyku && p.oyku.length > 0 && (
                    <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                      <span className="text-slate-500">Özgeçmiş:</span>
                      <span className="text-slate-300 truncate max-w-[130px]">{p.oyku.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
