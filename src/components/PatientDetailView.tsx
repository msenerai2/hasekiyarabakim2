import React, { useState } from 'react';
import {
  Stethoscope,
  Calendar,
  Images,
  Pill,
  Scissors,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  Patient,
  Visit,
  EvaluationItem,
  FootMarkerSet,
  AntibioticRecord,
  PhotoRecord,
  FootMarker
} from '../types';
import { toTurkishUpper, formatDateTR, formatDateTimeTR } from '../services/firebase';
import { FootMarkerBoard } from './FootMarkerBoard';
import { AntibioticTrackerPanel } from './AntibioticTrackerPanel';

interface PatientDetailViewProps {
  patient: Patient;
  visits: Visit[];
  evaluationNotes: Record<string, EvaluationItem[]>;
  markerSets: FootMarkerSet[];
  antibioticRecords: AntibioticRecord[];
  photos: PhotoRecord[];
  onAddVisit: () => Promise<void>;
  onDeleteVisit: (visitId: string) => Promise<void>;
  onAddNote: (area: string, text: string, date: Date) => Promise<void>;
  onEditNote: (area: string, noteId: string, text: string, date: Date) => Promise<void>;
  onDeleteNote: (area: string, noteId: string) => Promise<void>;
  onAddFootMarker: (marker: FootMarker, createNewSet: boolean) => Promise<void>;
  onUploadPhotos: (files: FileList) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onOpenQuickEvaluation: () => void;
  onOpenNewAntibiotic: () => void;
  onOpenDebridement: () => void;
  onOpenTermination: () => void;
  onOpenUpdateEndDate: (record: AntibioticRecord) => void;
  onOpenFollowupAntibiotic: (record: AntibioticRecord) => void;
  onOpenPhotoLightbox: (index: number) => void;
  onOpenSingleNoteModal: (areaKey: string, note?: EvaluationItem) => void;
}

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
  visits,
  evaluationNotes,
  markerSets,
  antibioticRecords,
  photos,
  onAddVisit,
  onDeleteVisit,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onAddFootMarker,
  onUploadPhotos,
  onDeletePhoto,
  onOpenQuickEvaluation,
  onOpenNewAntibiotic,
  onOpenDebridement,
  onOpenTermination,
  onOpenUpdateEndDate,
  onOpenFollowupAntibiotic,
  onOpenPhotoLightbox,
  onOpenSingleNoteModal
}) => {
  const [activeTab, setActiveTab] = useState<'degerlendirme' | 'gelisler' | 'fotograflar'>('degerlendirme');
  const [selectedEvalArea, setSelectedEvalArea] = useState<string>('tarihegore');
  const [activeMarkerSetIndex, setActiveMarkerSetIndex] = useState<number>(0);

  const evalAreas = [
    { key: 'tarihegore', label: 'Tarihe Göre Değerlendirmeler', isSpecial: true },
    { key: 'hastaKaynagi', label: 'Hasta Kaynağı' },
    { key: 'yaraEtyolojisi', label: 'Yara Etyolojisi' },
    { key: 'klinikDurum', label: 'Yaranın Klinik Durumu' },
    { key: 'hastaYonlendirme', label: 'Hasta Yönlendirme Durumu' },
    { key: 'laboratuvar', label: 'Laboratuvar' },
    { key: 'siniflama', label: 'Sınıflama (Wagner)' },
    { key: 'yaraOzellikleri', label: 'Yara Özellikleri' },
    { key: 'tedaviOzgecmisi', label: 'Tedavi Özgeçmişi' },
    { key: 'aki', label: 'AKİ' },
    { key: 'kultur', label: 'Kültür / Antibiyotik' },
    { key: 'goruntuleme', label: 'Görüntüleme Bulguları' },
    { key: 'plan', label: 'Tedavi Planı' },
    { key: 'yapilanIslemler', label: 'Yapılan İşlemler' }
  ];

  // Consolidate all evaluation notes for "Tarihe Göre" grouped by date
  const groupedTimeline = React.useMemo(() => {
    const all: { areaKey: string; areaLabel: string; item: EvaluationItem; date: Date }[] = [];

    evalAreas.forEach(a => {
      if (a.isSpecial) return;
      (evaluationNotes[a.key] || []).forEach(item => {
        let d: Date | null = null;
        if (item.tarih instanceof Date) d = item.tarih;
        else if (item.olusturulmaZamani?.toDate) d = item.olusturulmaZamani.toDate();
        else if (item.zamanMs) d = new Date(item.zamanMs);

        if (d && !isNaN(d.getTime())) {
          all.push({
            areaKey: a.key,
            areaLabel: a.label,
            item,
            date: d
          });
        }
      });
    });

    // Group by Day (YYYY-MM-DD)
    const map = new Map<string, { date: Date; entries: typeof all }>();
    all.sort((a, b) => b.date.getTime() - a.date.getTime());

    all.forEach(entry => {
      const key = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}-${String(entry.date.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, { date: entry.date, entries: [] });
      }
      map.get(key)!.entries.push(entry);
    });

    return Array.from(map.values());
  }, [evaluationNotes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Patient Header (Uppercase name, TC, complaint badges) */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 shadow-2xs">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-wide uppercase">
                {toTurkishUpper(patient.adSoyad)}
              </h1>
              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                TC: {patient.tcNo || 'Belirtilmedi'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(patient.sikayet || []).map(s => (
                <span
                  key={s}
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    s.includes('DM') || s.includes('Diyabetik')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : s.includes('Basınç')
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-teal-50 text-teal-800 border border-teal-200'
                  }`}
                >
                  {s}
                </span>
              ))}

              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">
                Başvuru: {patient.basvuru || '-'}
              </span>
              {patient.dogumTarihi && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    Doğum: {patient.dogumTarihi} ({patient.cinsiyet || '-'})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenDebridement}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Debridman Ekle</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewAntibiotic}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-1.5"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Antibiyotik Başlat</span>
            </button>

            <button
              type="button"
              onClick={onOpenTermination}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Yarayı Sonlandır</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mt-4 border-b border-slate-200 -mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('degerlendirme')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'degerlendirme'
                ? 'text-teal-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hasta Değerlendirme
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gelisler')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'gelisler'
                ? 'text-teal-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hasta Gelişleri ({visits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fotograflar')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'fotograflar'
                ? 'text-teal-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hasta Fotoğrafları ({photos.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden p-4 lg:p-6">
        {/* TAB 1: HASTA DEĞERLENDİRME */}
        {activeTab === 'degerlendirme' && (
          <div className="flex h-full gap-5 overflow-hidden">
            {/* Left Evaluation Sidebar Menu */}
            <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={onOpenQuickEvaluation}
                className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-2 mb-1"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Hasta Değerlendirme Başlat</span>
              </button>

              <div className="space-y-1">
                {evalAreas.map(area => {
                  const isSelected = selectedEvalArea === area.key;
                  const count = area.key === 'tarihegore' ? groupedTimeline.length : (evaluationNotes[area.key] || []).length;
                  return (
                    <div
                      key={area.key}
                      onClick={() => setSelectedEvalArea(area.key)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {!area.isSpecial && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onOpenSingleNoteModal(area.key);
                            }}
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Hızlı Not Ekle"
                          >
                            +
                          </button>
                        )}
                        <span className="truncate">{area.label}</span>
                      </div>
                      {count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 shrink-0 ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Evaluation Workspace */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-4 pr-1">
              {/* If "Tarihe Göre Değerlendirmeler" is active, show the Foot Marker Board + Antibiotic Tracker side-by-side! */}
              {selectedEvalArea === 'tarihegore' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 shrink-0">
                  {/* Foot Marker Board */}
                  <div className="xl:col-span-8 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <FootMarkerBoard
                      markerSets={markerSets}
                      activeSetIndex={activeMarkerSetIndex}
                      onSetIndexChange={setActiveMarkerSetIndex}
                      onAddMarker={onAddFootMarker}
                    />
                  </div>

                  {/* Antibiotic Tracker Side Panel */}
                  <div className="xl:col-span-4 min-h-[300px]">
                    <AntibioticTrackerPanel
                      records={antibioticRecords}
                      onOpenNewAntibiotic={onOpenNewAntibiotic}
                      onUpdateEndDate={onOpenUpdateEndDate}
                      onStartFollowup={onOpenFollowupAntibiotic}
                    />
                  </div>
                </div>
              )}

              {/* Timeline Notes Listing */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex-1">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {evalAreas.find(a => a.key === selectedEvalArea)?.label}
                  </h3>
                  {selectedEvalArea !== 'tarihegore' && (
                    <button
                      type="button"
                      onClick={() => onOpenSingleNoteModal(selectedEvalArea)}
                      className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Bu Alana Not Ekle</span>
                    </button>
                  )}
                </div>

                {selectedEvalArea === 'tarihegore' ? (
                  /* Grouped by Date Timeline */
                  groupedTimeline.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Henüz bu hastaya ait bir klinik değerlendirme notu kaydedilmedi.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedTimeline.map(group => (
                        <div key={group.date.toISOString()} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {formatDateTR(group.date)}
                            </span>
                            <div className="h-px bg-slate-200 flex-1" />
                          </div>

                          <div className="space-y-1.5 pl-2">
                            {group.entries.map(({ areaKey, areaLabel, item, date }) => (
                              <div
                                key={item.id}
                                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-teal-50/30 hover:border-teal-200 transition-all text-xs"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-teal-800 text-[11px]">
                                      {areaLabel}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formatDateTimeTR(date)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenSingleNoteModal(areaKey, item)}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                      title="Düzenle"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteNote(areaKey, item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{item.metin}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* Single category view */
                  (evaluationNotes[selectedEvalArea] || []).length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Bu başlık altında henüz kayıt bulunmuyor. Yukarıdaki butondan yeni not ekleyebilirsiniz.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(evaluationNotes[selectedEvalArea] || []).map(note => {
                        const noteDate = note.tarih instanceof Date ? note.tarih : (note.olusturulmaZamani?.toDate?.() || null);
                        return (
                          <div
                            key={note.id}
                            className="p-3 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-white hover:border-teal-200 transition-all text-xs"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {noteDate ? formatDateTimeTR(noteDate) : 'Tarih bilgisi yok'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenSingleNoteModal(selectedEvalArea, note)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteNote(selectedEvalArea, note.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{note.metin}</p>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HASTA GELİŞLERİ */}
        {activeTab === 'gelisler' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs max-w-2xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hasta Geliş Kayıtları</h3>
                <span className="text-xs text-slate-500">Toplam {visits.length} geliş kaydı bulunmaktadır</span>
              </div>
              <button
                type="button"
                onClick={onAddVisit}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Geliş Kaydı Ekle</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {visits.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Henüz bir geliş kaydı bulunmuyor.
                </div>
              ) : (
                visits.map((v, i) => {
                  const d = new Date(v.zamanMs);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-teal-50/40 hover:border-teal-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center font-mono">
                          #{visits.length - i}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{formatDateTR(d)}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteVisit(v.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                        title="Geliş Kaydını Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HASTA FOTOĞRAFLARI */}
        {activeTab === 'fotograflar' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hasta Fotoğrafları ({photos.length})</h3>
                <span className="text-xs text-slate-500">Klinik yara iyileşme fotoğrafları</span>
              </div>

              <div>
                <label className="py-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Fotoğraf Ekle (Tekli / Toplu)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        onUploadPhotos(e.target.files);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  <Images className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600">Henüz Fotoğraf Eklenmedi</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Yukarıdaki butona tıklayarak yara fotoğrafları yükleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-teal-400 group relative flex flex-col shadow-2xs"
                    >
                      <div
                        onClick={() => onOpenPhotoLightbox(idx)}
                        className="aspect-square bg-slate-100 cursor-pointer overflow-hidden relative"
                      >
                        <img
                          src={photo.url}
                          alt="Yara fotoğrafı"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeletePhoto(photo.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-rose-600 text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Fotoğrafı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 text-[10px] text-slate-500 font-medium text-center truncate">
                        {photo.tarih ? formatDateTimeTR(photo.tarih) : 'Tarih yok'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
