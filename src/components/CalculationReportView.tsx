import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  Users,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
  Stethoscope,
  Pill,
  Filter,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Search,
  Eye,
  Scissors
} from 'lucide-react';
import { Patient, WoundEtiology, DebridementRecord } from '../types';
import { toTurkishUpper, formatDateTR, formatDateTimeTR } from '../services/firebase';

interface CalculationReportViewProps {
  patients: Patient[];
  startDateStr: string;
  endDateStr: string;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  // Raw sub-collection data passed from App
  visitsMap: Record<string, { id: string; zamanMs: number }[]>;
  categoryData: {
    hastaKaynagi: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    yaraEtyolojisi: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    klinikDurum: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    hastaYonlendirme: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    yapilanIslemler: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    sonlandirmalar: { hastaId: string; adSoyad: string; zamanMs: number; metin?: string }[];
  };
  debridementRecords: DebridementRecord[];
  antibioticRecords: any[];
}

export const CalculationReportView: React.FC<CalculationReportViewProps> = ({
  patients,
  startDateStr,
  endDateStr,
  onClose,
  onSelectPatient,
  visitsMap,
  categoryData,
  debridementRecords,
  antibioticRecords
}) => {
  // Selected inspection group on the LEFT side drawer
  const [selectedInspection, setSelectedInspection] = useState<{
    title: string;
    description?: string;
    patientIds: string[];
    records?: { hastaId: string; adSoyad: string; label: string; zamanMs?: number; aciklama?: string; etiology?: string }[];
  } | null>(null);

  const [etiologyFilterTab, setEtiologyFilterTab] = useState<string>('all');
  const [leftSearchQuery, setLeftSearchQuery] = useState('');

  // Normalize start and end ms
  const { startMs, endMs } = useMemo(() => {
    const s = new Date(startDateStr);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDateStr);
    e.setHours(23, 59, 59, 999);
    return { startMs: s.getTime(), endMs: e.getTime() };
  }, [startDateStr, endDateStr]);

  // Patients map for fast lookup
  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  // Visits in range
  const filteredVisitsByPatient = useMemo(() => {
    const result: Record<string, { id: string; zamanMs: number }[]> = {};
    Object.entries(visitsMap).forEach(([pId, vList]) => {
      const inRange = vList.filter(v => v.zamanMs >= startMs && v.zamanMs <= endMs);
      if (inRange.length > 0) {
        result[pId] = inRange.sort((a, b) => b.zamanMs - a.zamanMs);
      }
    });
    return result;
  }, [visitsMap, startMs, endMs]);

  // Overall General Stats
  const generalStats = useMemo(() => {
    const patientIds = Object.keys(filteredVisitsByPatient);
    let totalVisits = 0;
    patientIds.forEach(id => {
      totalVisits += filteredVisitsByPatient[id].length;
    });

    // Detect new patients vs control patients in period
    // A patient is "new" if their very first recorded visit ever happened in this date range,
    // or if they had a closed wound episode and re-admitted in this range.
    const newPatientIds = new Set<string>();
    const controlPatientIds = new Set<string>();

    patientIds.forEach(id => {
      const allVisits = (visitsMap[id] || []).map(v => v.zamanMs).sort((a, b) => a - b);
      const firstEver = allVisits[0] || 0;
      if (firstEver >= startMs && firstEver <= endMs) {
        newPatientIds.add(id);
      } else {
        controlPatientIds.add(id);
      }
    });

    const closedPatientIds = new Set(
      categoryData.sonlandirmalar
        .filter(s => s.zamanMs >= startMs && s.zamanMs <= endMs)
        .map(s => s.hastaId)
    );

    return {
      totalVisits,
      uniquePatients: patientIds.length,
      newPatientsCount: newPatientIds.size,
      newPatientIds: Array.from(newPatientIds),
      controlPatientsCount: controlPatientIds.size,
      controlPatientIds: Array.from(controlPatientIds),
      closedCount: closedPatientIds.size,
      closedPatientIds: Array.from(closedPatientIds),
      patientIds
    };
  }, [filteredVisitsByPatient, visitsMap, startMs, endMs, categoryData.sonlandirmalar]);

  // Etiologies breakdown
  const etiologiesList: WoundEtiology[] = [
    'Diyabetik Ayak',
    'Basınç Yarası',
    'Venöz Ülser',
    'Arteriyel Ülser',
    'Cerrahi Yara',
    'Kronik Yara'
  ];

  const etiologyStats = useMemo(() => {
    return etiologiesList.map(et => {
      // Find patients matching etiology
      const matchedPatients = Object.keys(filteredVisitsByPatient).filter(id => {
        const p = patientsById.get(id);
        if (!p) return false;
        const sikayet = p.sikayet || [];
        if (et === 'Diyabetik Ayak') {
          return sikayet.includes('Diyabetik Ayak') || sikayet.includes('DM Ayak');
        }
        return sikayet.includes(et);
      });

      let totalVisits = 0;
      const patientVisits: { hastaId: string; adSoyad: string; label: string; zamanMs?: number }[] = [];

      matchedPatients.forEach(id => {
        const vList = filteredVisitsByPatient[id] || [];
        totalVisits += vList.length;
        const p = patientsById.get(id);
        vList.forEach(v => {
          patientVisits.push({
            hastaId: id,
            adSoyad: p ? p.adSoyad : 'BİLİNMEYEN HASTA',
            label: `${et} Gelişi (${formatDateTimeTR(new Date(v.zamanMs))})`,
            zamanMs: v.zamanMs
          });
        });
      });

      const uniqueCount = matchedPatients.length;
      const newPatients = matchedPatients.filter(id => generalStats.newPatientIds.includes(id));
      const controlPatients = matchedPatients.filter(id => !generalStats.newPatientIds.includes(id));

      return {
        etiology: et,
        totalVisits,
        uniqueCount,
        newCount: newPatients.length,
        controlCount: controlPatients.length,
        matchedPatientIds: matchedPatients,
        newPatientIds: newPatients,
        controlPatientIds: controlPatients,
        records: patientVisits
      };
    });
  }, [filteredVisitsByPatient, patientsById, generalStats.newPatientIds]);

  // Helper to compute diagnosis breakdown for any list of category records
  const computeDiagnosisBreakdown = (records: { hastaId: string }[]) => {
    const counts: Record<string, { count: number; patientIds: Set<string> }> = {};
    records.forEach(r => {
      const p = patientsById.get(r.hastaId);
      const etiologies = p?.sikayet?.length ? p.sikayet : ['Belirtilmemiş'];
      etiologies.forEach(rawEt => {
        const et = rawEt === 'DM Ayak' ? 'Diyabetik Ayak' : rawEt;
        if (!counts[et]) {
          counts[et] = { count: 0, patientIds: new Set() };
        }
        counts[et].count += 1;
        counts[et].patientIds.add(r.hastaId);
      });
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      count: data.count,
      uniquePatients: data.patientIds.size,
      patientIds: Array.from(data.patientIds)
    })).sort((a, b) => b.count - a.count);
  };

  // Helper to build category cards with diagnosis breakdown
  const buildCategoryBreakdown = (
    title: string,
    fieldItems: string[],
    rawList: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[]
  ) => {
    // Filter to date range
    const filtered = rawList.filter(item => item.zamanMs >= startMs && item.zamanMs <= endMs);

    return fieldItems.map(itemVal => {
      const matchingRecords = filtered.filter(x => x.deger === itemVal);
      const uniquePatients = Array.from(new Set(matchingRecords.map(x => x.hastaId)));
      const breakdown = computeDiagnosisBreakdown(matchingRecords);

      return {
        itemVal,
        totalCount: matchingRecords.length,
        uniqueCount: uniquePatients.length,
        records: matchingRecords,
        uniquePatients,
        diagnosisBreakdown: breakdown
      };
    });
  };

  const hastaKaynagiItems = [
    'Evde Sağlık',
    'Doğrudan Başvuru',
    'Yatan Servis',
    'Palyatif Bakım',
    'Yoğun Bakım Taburculuğu',
    'Acil Servis',
    'Diğer Kurumlardan Sevk'
  ];

  const klinikDurumItems = [
    'Enfekte Yara',
    'İskemik Yara',
    'Nekrotik Yara',
    'Diğer Komplikasyonlar'
  ];

  const yapilanIslemlerItems = [
    'Debridman',
    'Pansuman',
    'Apse Drenajı',
    'VAC',
    'Hiperbarik Oksijen Tedavisi'
  ];

  const hastaYonlendirmeItems = [
    'Konsültasyon istenildi',
    'Hastaneye Yatışı yapıldı',
    'Başka Hastaneye Sevk Edildi',
    'Evde Sağlık Hizmetlerine Yönlendirildi'
  ];

  const hastaKaynagiData = useMemo(() => buildCategoryBreakdown('Hasta Kaynağı', hastaKaynagiItems, categoryData.hastaKaynagi), [categoryData.hastaKaynagi, startMs, endMs, patientsById]);
  const klinikDurumData = useMemo(() => buildCategoryBreakdown('Yaranın Klinik Durumu', klinikDurumItems, categoryData.klinikDurum), [categoryData.klinikDurum, startMs, endMs, patientsById]);
  const yapilanIslemlerData = useMemo(() => buildCategoryBreakdown('Yapılan İşlemler', yapilanIslemlerItems, categoryData.yapilanIslemler), [categoryData.yapilanIslemler, startMs, endMs, patientsById]);
  const hastaYonlendirmeData = useMemo(() => buildCategoryBreakdown('Hasta Yönlendirme Durumu', hastaYonlendirmeItems, categoryData.hastaYonlendirme), [categoryData.hastaYonlendirme, startMs, endMs, patientsById]);

  // Debridement Analysis
  const debridementStats = useMemo(() => {
    const inRange = debridementRecords.filter(d => d.zamanMs >= startMs && d.zamanMs <= endMs);
    const uniquePatients = Array.from(new Set(inRange.map(d => d.hastaId)));
    const dmAyakDeb = inRange.filter(d => d.debridmanTuru?.includes('DM Ayak') || d.debridmanTuru?.includes('Diyabetik'));
    const dmAyakUnique = Array.from(new Set(dmAyakDeb.map(d => d.hastaId)));
    const kronikDeb = inRange.filter(d => d.debridmanTuru?.includes('Kronik Yara'));
    const kronikUnique = Array.from(new Set(kronikDeb.map(d => d.hastaId)));

    return {
      total: inRange.length,
      unique: uniquePatients.length,
      average: uniquePatients.length ? (inRange.length / uniquePatients.length).toFixed(1) : '0.0',
      dmTotal: dmAyakDeb.length,
      dmUnique: dmAyakUnique.length,
      dmAverage: dmAyakUnique.length ? (dmAyakDeb.length / dmAyakUnique.length).toFixed(1) : '0.0',
      kronikTotal: kronikDeb.length,
      kronikUnique: kronikUnique.length,
      kronikAverage: kronikUnique.length ? (kronikDeb.length / kronikUnique.length).toFixed(1) : '0.0',
      records: inRange.map(d => ({
        hastaId: d.hastaId,
        adSoyad: d.adSoyad,
        label: d.debridmanTuru || 'Genel Debridman',
        zamanMs: d.zamanMs
      }))
    };
  }, [debridementRecords, startMs, endMs]);

  // Antibiotics stats (at the bottom)
  const antibioticStats = useMemo(() => {
    // Filter antibiotics whose start date falls in the range
    const inRange = (antibioticRecords || []).filter(rec => {
      if (!rec.baslamaTarihi) return false;
      const t = new Date(rec.baslamaTarihi).getTime();
      return t >= startMs && t <= endMs;
    });

    const uniquePatients = Array.from(new Set(inRange.map(r => r.hastaId).filter(Boolean)));

    // Group by drug name
    const drugMap = new Map<string, { name: string; count: number; patientIds: Set<string>; routes: Record<string, number> }>();
    inRange.forEach(r => {
      const name = r.antibiyotikAdi || 'Bilinmeyen Antibiyotik';
      if (!drugMap.has(name)) {
        drugMap.set(name, { name, count: 0, patientIds: new Set(), routes: {} });
      }
      const entry = drugMap.get(name)!;
      entry.count += 1;
      if (r.hastaId) entry.patientIds.add(r.hastaId);
      const route = r.uygulamaYolu || 'Belirtilmedi';
      entry.routes[route] = (entry.routes[route] || 0) + 1;
    });

    const comboCount = inRange.filter(r => r.kombinasyonMu).length;
    const switchedCount = inRange.filter(r => r.tedaviDegisikligi).length;

    return {
      total: inRange.length,
      unique: uniquePatients.length,
      comboCount,
      switchedCount,
      drugs: Array.from(drugMap.values()).sort((a, b) => b.count - a.count),
      records: inRange.map(r => ({
        hastaId: r.hastaId || '',
        adSoyad: r.adSoyad || 'BİLİNMEYEN HASTA',
        label: `${r.antibiyotikAdi} (${r.doz || ''} ${r.siklik || ''} - ${r.uygulamaYolu || ''})`,
        zamanMs: r.baslamaTarihi ? new Date(r.baslamaTarihi).getTime() : undefined
      }))
    };
  }, [antibioticRecords, startMs, endMs]);

  // Filtered left drawer patients
  const leftDrawerPatients = useMemo(() => {
    if (!selectedInspection) return [];
    let list: {
      patient: Patient;
      records: { label: string; zamanMs?: number; aciklama?: string }[];
    }[] = [];

    // Map each unique patient
    const ids = Array.from(new Set(selectedInspection.patientIds));
    ids.forEach(id => {
      const p = patientsById.get(id);
      if (!p) return;
      const matchingRecs = (selectedInspection.records || []).filter(r => r.hastaId === id);
      list.push({
        patient: p,
        records: matchingRecs
      });
    });

    // Search query filter
    if (leftSearchQuery.trim()) {
      const q = leftSearchQuery.toLocaleLowerCase('tr-TR');
      list = list.filter(item =>
        item.patient.adSoyad.toLocaleLowerCase('tr-TR').includes(q) ||
        (item.patient.tcNo && item.patient.tcNo.includes(q))
      );
    }

    return list.sort((a, b) => a.patient.adSoyad.localeCompare(b.patient.adSoyad, 'tr'));
  }, [selectedInspection, patientsById, leftSearchQuery]);

  // Handle clicking on any metric card
  const handleInspectCard = (
    title: string,
    patientIds: string[],
    records?: { hastaId: string; adSoyad: string; label: string; zamanMs?: number; aciklama?: string; etiology?: string }[],
    description?: string
  ) => {
    setSelectedInspection({
      title,
      patientIds,
      records,
      description
    });
    setLeftSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Top compact bar */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Ana Panele Dön"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>Geri Dön</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-md">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Klinik Hesaplama ve Rapor Özeti</h1>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium ml-2">
              {formatDateTR(new Date(startDateStr))} — {formatDateTR(new Date(endDateStr))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedInspection && (
            <button
              onClick={() => setSelectedInspection(null)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100"
            >
              Sol Paneli Temizle
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          >
            Yazdır / PDF
          </button>
        </div>
      </header>

      {/* Main Container: 2-Panel layout (Left: Inspection drawer, Right: Main calculation rows) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL: Dedicated inspection drawer (Keeps left clean or opens detailed patient records) */}
        <aside
          className={`shrink-0 border-r border-slate-200 bg-white transition-all duration-200 flex flex-col ${
            selectedInspection ? 'w-84 lg:w-96' : 'w-72 lg:w-80'
          }`}
        >
          {selectedInspection ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                    Detaylı Hasta Listesi
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full">
                    {leftDrawerPatients.length} Hasta
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                  {selectedInspection.title}
                </h3>
                {selectedInspection.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{selectedInspection.description}</p>
                )}

                <div className="relative mt-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={leftSearchQuery}
                    onChange={e => setLeftSearchQuery(e.target.value)}
                    placeholder="Listede hasta veya TC ara..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Patient List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
                {leftDrawerPatients.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Aramaya uygun hasta bulunamadı.
                  </div>
                ) : (
                  leftDrawerPatients.map(({ patient, records }) => (
                    <div
                      key={patient.id}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all bg-white shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {toTurkishUpper(patient.adSoyad)}
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            {patient.tcNo ? `TC: ${patient.tcNo}` : 'TC Belirtilmemiş'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onSelectPatient(patient.id);
                            onClose();
                          }}
                          className="shrink-0 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded transition-colors flex items-center gap-0.5"
                          title="Hastayı Aç"
                        >
                          <span>Dosyaya Git</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Etiology chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(patient.sikayet || []).map(sk => (
                          <span
                            key={sk}
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded-sm ${
                              sk.includes('DM') || sk.includes('Diyabetik')
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                : sk.includes('Basınç')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/50'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Specific records under this context */}
                      {records.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1">
                          {records.slice(0, 3).map((r, idx) => (
                            <div key={idx} className="text-[10px] text-slate-600 flex items-center justify-between">
                              <span className="truncate pr-1">• {r.label}</span>
                              {r.zamanMs && (
                                <span className="text-[9px] text-slate-400 shrink-0">
                                  {formatDateTimeTR(new Date(r.zamanMs))}
                                </span>
                              )}
                            </div>
                          ))}
                          {records.length > 3 && (
                            <span className="text-[9px] text-teal-600 font-medium">
                              +{records.length - 3} kayıt daha...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Clean Empty State on the Left - exactly as requested: "En solu boş bırak, detayları görmek istediğimde sol tarafta göreyim" */
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 mb-1">Sol İnceleme Bölgesi</h4>
              <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
                Rapor ekranında herhangi bir metriğe veya tanı rozetine tıkladığınızda, o gruba ait hastaların detaylı kayıtları burada sıralanır.
              </p>
              <div className="mt-4 text-[10px] bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium border border-teal-100">
                Ekran karmaşasını önler
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT PANEL: Calculation Dashboard (Compact, Organized, Clean Rows, No "1. SATIR" prefixes, Antibiotics at bottom) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-slate-50">

          {/* 1. HASTA BAZINDA GELİŞLER — İLGİLİ AY */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Hasta Bazında Gelişler — İlgili Ay
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Seçilen Dönem Genel Özeti
              </span>
            </div>

            {/* Compact grid: 5 metrics on 1 neat row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Toplam Başvuru */}
              <button
                type="button"
                onClick={() =>
                  handleInspectCard(
                    'Toplam Başvuru (Gelişler)',
                    generalStats.patientIds,
                    undefined,
                    'Seçili tarih aralığında gerçekleşen tüm hasta gelişleri'
                  )
                }
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-teal-50/50 hover:border-teal-300 transition-all text-left group cursor-pointer"
              >
                <div className="text-xl font-extrabold text-slate-900 group-hover:text-teal-700">
                  {generalStats.totalVisits}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Toplam Başvuru</div>
                <div className="text-[10px] text-slate-400 mt-1">İlgili ay içindeki tüm gelişler</div>
              </button>

              {/* Toplam Tekil Hasta */}
              <button
                type="button"
                onClick={() =>
                  handleInspectCard(
                    'Toplam Tekil Hasta',
                    generalStats.patientIds,
                    undefined,
                    'Dönem içinde en az bir kez başvuran farklı hasta sayısı'
                  )
                }
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-teal-50/50 hover:border-teal-300 transition-all text-left group cursor-pointer"
              >
                <div className="text-xl font-extrabold text-teal-700">
                  {generalStats.uniquePatients}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Toplam Tekil Hasta</div>
                <div className="text-[10px] text-slate-400 mt-1">Tekil hasta sayısı</div>
              </button>

              {/* Yeni Hasta */}
              <button
                type="button"
                onClick={() =>
                  handleInspectCard(
                    'Yeni Hasta Kayıtları',
                    generalStats.newPatientIds,
                    undefined,
                    'Bu ay içinde ilk kez başvuran yeni hastalar'
                  )
                }
                className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group cursor-pointer"
              >
                <div className="text-xl font-extrabold text-emerald-700">
                  {generalStats.newPatientsCount}
                </div>
                <div className="text-[11px] font-semibold text-emerald-900 mt-0.5">Yeni Hasta</div>
                <div className="text-[10px] text-emerald-600/80 mt-1">Dönemdeki ilk başvurular</div>
              </button>

              {/* Kontrol Hasta */}
              <button
                type="button"
                onClick={() =>
                  handleInspectCard(
                    'Kontrol Hasta Başvuruları',
                    generalStats.controlPatientIds,
                    undefined,
                    'Daha önce kaydı olup bu dönem kontrole gelen hastalar'
                  )
                }
                className="p-3 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300 transition-all text-left group cursor-pointer"
              >
                <div className="text-xl font-extrabold text-blue-700">
                  {generalStats.controlPatientsCount}
                </div>
                <div className="text-[11px] font-semibold text-blue-900 mt-0.5">Kontrol Hasta</div>
                <div className="text-[10px] text-blue-600/80 mt-1">Düzenli takip hastaları</div>
              </button>

              {/* Yarası Kapanan / Tedavisi Tamamlanan */}
              <button
                type="button"
                onClick={() =>
                  handleInspectCard(
                    'Yarası Kapanan / Tedavisi Tamamlanan',
                    generalStats.closedPatientIds,
                    categoryData.sonlandirmalar.map(s => ({
                      hastaId: s.hastaId,
                      adSoyad: s.adSoyad,
                      label: s.metin || 'Tedavisi tamamlandı',
                      zamanMs: s.zamanMs
                    })),
                    'Yarası kapanarak tedavisi başarıyla sonlandırılan hasta sayısı'
                  )
                }
                className="p-3 rounded-lg border border-teal-200 bg-teal-50/40 hover:bg-teal-100/50 hover:border-teal-400 transition-all text-left group cursor-pointer"
              >
                <div className="text-xl font-extrabold text-teal-800">
                  {generalStats.closedCount}
                </div>
                <div className="text-[11px] font-semibold text-teal-950 mt-0.5">Yarası Kapanan</div>
                <div className="text-[10px] text-teal-700/80 mt-1">Tedavisi tamamlananlar</div>
              </button>
            </div>
          </section>

          {/* 2. YARA ETYOLOJİSİNE GÖRE HASTA GELİŞLERİ (1 SATIRDA 4 METRİK IZGARASI) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Yara Etyolojisine Göre Hasta Gelişleri
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Her etyoloji için 4 metrik aynı satırda karşılaştırmalı
              </span>
            </div>

            {/* Etiology comparison rows - 4 metrics per etiology in 1 unified row */}
            <div className="space-y-2.5">
              {etiologyStats.map(stat => (
                <div
                  key={stat.etiology}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        stat.etiology.includes('Diyabetik') ? 'bg-rose-500' :
                        stat.etiology.includes('Basınç') ? 'bg-amber-500' :
                        stat.etiology.includes('Venöz') ? 'bg-blue-500' :
                        stat.etiology.includes('Arteriyel') ? 'bg-purple-500' :
                        stat.etiology.includes('Cerrahi') ? 'bg-emerald-500' : 'bg-slate-500'
                      }`} />
                      {stat.etiology}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `${stat.etiology} — Tüm Başvurular`,
                          stat.matchedPatientIds,
                          stat.records,
                          `${stat.etiology} tanılı hastaların bu dönemdeki tüm gelişleri`
                        )
                      }
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
                    >
                      <span>Hastaları Sol Panele Getir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 1 Satırda 4 Metrik Izgarası: Toplam Başvuru, Tekil Hasta, Yeni Hasta, Kontrol Hasta */}
                  <div className="grid grid-cols-4 gap-2">
                    {/* Toplam Başvuru */}
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `${stat.etiology} · Toplam Başvuru`,
                          stat.matchedPatientIds,
                          stat.records
                        )
                      }
                      className="p-2 bg-white rounded-md border border-slate-200/70 hover:border-teal-400 text-center transition-all cursor-pointer"
                    >
                      <div className="text-base font-bold text-slate-900">{stat.totalVisits}</div>
                      <div className="text-[10px] text-slate-600 truncate">{stat.etiology} · Toplam Başvuru</div>
                    </button>

                    {/* Tekil Hasta */}
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `${stat.etiology} · Tekil Hasta`,
                          stat.matchedPatientIds,
                          stat.records
                        )
                      }
                      className="p-2 bg-white rounded-md border border-slate-200/70 hover:border-teal-400 text-center transition-all cursor-pointer"
                    >
                      <div className="text-base font-bold text-teal-700">{stat.uniqueCount}</div>
                      <div className="text-[10px] text-slate-600 truncate">{stat.etiology} · Tekil Hasta</div>
                    </button>

                    {/* Yeni Hasta */}
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `${stat.etiology} · Yeni Hasta`,
                          stat.newPatientIds,
                          stat.records.filter(r => stat.newPatientIds.includes(r.hastaId))
                        )
                      }
                      className="p-2 bg-white rounded-md border border-slate-200/70 hover:border-emerald-400 text-center transition-all cursor-pointer"
                    >
                      <div className="text-base font-bold text-emerald-700">{stat.newCount}</div>
                      <div className="text-[10px] text-slate-600 truncate">{stat.etiology} · Yeni Hasta</div>
                    </button>

                    {/* Kontrol Hasta */}
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `${stat.etiology} · Kontrol Hasta`,
                          stat.controlPatientIds,
                          stat.records.filter(r => stat.controlPatientIds.includes(r.hastaId))
                        )
                      }
                      className="p-2 bg-white rounded-md border border-slate-200/70 hover:border-blue-400 text-center transition-all cursor-pointer"
                    >
                      <div className="text-base font-bold text-blue-700">{stat.controlCount}</div>
                      <div className="text-[10px] text-slate-600 truncate">{stat.etiology} · Kontrol Hasta</div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. HASTA KAYNAĞI (TOPLAM & TEKİL AYNI SATIRDA + ALTINDA TANI DAĞILIMI) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Hasta Kaynağı
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Toplam & Tekil aynı satırda + tanı bazlı döküm
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hastaKaynagiData.map(item => (
                <div
                  key={item.itemVal}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/30 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{item.itemVal}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `Hasta Kaynağı: ${item.itemVal}`,
                          item.uniquePatients,
                          item.records.map(r => ({ hastaId: r.hastaId, adSoyad: r.adSoyad, label: `${item.itemVal} kaydı`, zamanMs: r.zamanMs }))
                        )
                      }
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold"
                    >
                      Listele
                    </button>
                  </div>

                  {/* Toplam & Tekil in same row */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-slate-900">{item.totalCount}</span>
                      <span className="block text-[10px] text-slate-500">{item.itemVal} · Toplam</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-teal-700">{item.uniqueCount}</span>
                      <span className="block text-[10px] text-slate-500">{item.itemVal} · Tekil</span>
                    </div>
                  </div>

                  {/* Tanı Dağılımı (Diagnosis Breakdown) */}
                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Tanılara Göre Dağılım:
                    </span>
                    {item.diagnosisBreakdown.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.diagnosisBreakdown.map(diag => (
                          <button
                            key={diag.name}
                            type="button"
                            onClick={() =>
                              handleInspectCard(
                                `${item.itemVal} → ${diag.name} Hastaları`,
                                diag.patientIds,
                                undefined,
                                `${item.itemVal} kaynağından gelen ${diag.name} tanılı hastalar`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200/90 hover:border-teal-400 px-2 py-0.5 rounded-full text-slate-700 hover:bg-teal-50/50 transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-teal-800">{diag.count}</span>
                            <span>{diag.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Kayıt bulunamadı</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. YARANIN KLİNİK DURUMU (TOPLAM & TEKİL AYNI SATIRDA + TANI DAĞILIMI) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Yaranın Klinik Durumu
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Enfekte, iskemik, nekrotik yaralar ve tanı kırılımları
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {klinikDurumData.map(item => (
                <div
                  key={item.itemVal}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/30 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{item.itemVal}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `Klinik Durum: ${item.itemVal}`,
                          item.uniquePatients,
                          item.records.map(r => ({ hastaId: r.hastaId, adSoyad: r.adSoyad, label: `${item.itemVal} kaydı`, zamanMs: r.zamanMs }))
                        )
                      }
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold"
                    >
                      Listele
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-slate-900">{item.totalCount}</span>
                      <span className="block text-[10px] text-slate-500">{item.itemVal} · Toplam</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-amber-700">{item.uniqueCount}</span>
                      <span className="block text-[10px] text-slate-500">{item.itemVal} · Tekil</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Tanılara Göre Dağılım:
                    </span>
                    {item.diagnosisBreakdown.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.diagnosisBreakdown.map(diag => (
                          <button
                            key={diag.name}
                            type="button"
                            onClick={() =>
                              handleInspectCard(
                                `${item.itemVal} → ${diag.name} Hastaları`,
                                diag.patientIds,
                                undefined,
                                `${item.itemVal} durumundaki ${diag.name} hastaları`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200/90 hover:border-amber-400 px-2 py-0.5 rounded-full text-slate-700 hover:bg-amber-50/50 transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-amber-800">{diag.count}</span>
                            <span>{diag.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Kayıt bulunamadı</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. YAPILAN İŞLEMLER (DEBRİDMAN, PANSUMAN, VAC, VS. + TANI DAĞILIMI) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Yapılan İşlemler
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Pansuman, debridman, VAC ve tanı bazında döküm
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {yapilanIslemlerData.map(item => (
                <div
                  key={item.itemVal}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/30 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{item.itemVal}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `Yapılan İşlem: ${item.itemVal}`,
                          item.uniquePatients,
                          item.records.map(r => ({ hastaId: r.hastaId, adSoyad: r.adSoyad, label: `${item.itemVal} işlemi`, zamanMs: r.zamanMs }))
                        )
                      }
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold"
                    >
                      Listele
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-slate-900">{item.totalCount}</span>
                      <span className="block text-[10px] text-slate-500">Toplam İşlem</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-blue-700">{item.uniqueCount}</span>
                      <span className="block text-[10px] text-slate-500">Tekil Hasta</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Tanılara Göre Dağılım:
                    </span>
                    {item.diagnosisBreakdown.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.diagnosisBreakdown.map(diag => (
                          <button
                            key={diag.name}
                            type="button"
                            onClick={() =>
                              handleInspectCard(
                                `${item.itemVal} → ${diag.name} Hastaları`,
                                diag.patientIds,
                                undefined,
                                `${item.itemVal} uygulanan ${diag.name} hastaları`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200/90 hover:border-blue-400 px-2 py-0.5 rounded-full text-slate-700 hover:bg-blue-50/50 transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-blue-800">{diag.count}</span>
                            <span>{diag.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Kayıt bulunamadı</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. HASTA YÖNLENDİRME DURUMU (TOPLAM & TEKİL + TANI DAĞILIMI) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Hasta Yönlendirme Durumu
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Konsültasyon, sevk, yatış ve tanı kırılımları
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hastaYonlendirmeData.map(item => (
                <div
                  key={item.itemVal}
                  className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/30 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{item.itemVal}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectCard(
                          `Hasta Yönlendirme: ${item.itemVal}`,
                          item.uniquePatients,
                          item.records.map(r => ({ hastaId: r.hastaId, adSoyad: r.adSoyad, label: `${item.itemVal} yönlendirmesi`, zamanMs: r.zamanMs }))
                        )
                      }
                      className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold"
                    >
                      Listele
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-slate-900">{item.totalCount}</span>
                      <span className="block text-[10px] text-slate-500">Toplam Yönlendirme</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200/70 text-center">
                      <span className="text-sm font-bold text-purple-700">{item.uniqueCount}</span>
                      <span className="block text-[10px] text-slate-500">Tekil Hasta</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Tanılara Göre Dağılım:
                    </span>
                    {item.diagnosisBreakdown.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.diagnosisBreakdown.map(diag => (
                          <button
                            key={diag.name}
                            type="button"
                            onClick={() =>
                              handleInspectCard(
                                `${item.itemVal} → ${diag.name} Hastaları`,
                                diag.patientIds,
                                undefined,
                                `${item.itemVal} yapılan ${diag.name} hastaları`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200/90 hover:border-purple-400 px-2 py-0.5 rounded-full text-slate-700 hover:bg-purple-50/50 transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-purple-800">{diag.count}</span>
                            <span>{diag.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Kayıt bulunamadı</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. DEBRİDMAN İSTATİSTİKLERİ */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Debridman İstatistikleri
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Genel ve etyoloji bazında debridman yoğunluğu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Genel Debridman */}
              <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/80">
                <div className="text-xs font-bold text-slate-800 mb-2">Genel Debridman</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-slate-200/70">
                    <span className="text-sm font-bold text-slate-900">{debridementStats.total}</span>
                    <span className="block text-[9px] text-slate-500">Toplam</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/70">
                    <span className="text-sm font-bold text-teal-700">{debridementStats.unique}</span>
                    <span className="block text-[9px] text-slate-500">Tekil Hasta</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/70">
                    <span className="text-sm font-bold text-slate-700">{debridementStats.average}</span>
                    <span className="block text-[9px] text-slate-500">Ortalama</span>
                  </div>
                </div>
              </div>

              {/* DM Ayak Debridman */}
              <div className="p-3 bg-rose-50/30 rounded-lg border border-rose-200/60">
                <div className="text-xs font-bold text-rose-900 mb-2">Diyabetik Ayak Debridmanı</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-rose-200/70">
                    <span className="text-sm font-bold text-rose-800">{debridementStats.dmTotal}</span>
                    <span className="block text-[9px] text-rose-600">Toplam</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-rose-200/70">
                    <span className="text-sm font-bold text-rose-700">{debridementStats.dmUnique}</span>
                    <span className="block text-[9px] text-rose-600">Tekil Hasta</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-rose-200/70">
                    <span className="text-sm font-bold text-rose-800">{debridementStats.dmAverage}</span>
                    <span className="block text-[9px] text-rose-600">Ortalama</span>
                  </div>
                </div>
              </div>

              {/* Kronik Yara Debridman */}
              <div className="p-3 bg-amber-50/30 rounded-lg border border-amber-200/60">
                <div className="text-xs font-bold text-amber-900 mb-2">Kronik Yara Debridmanı</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-amber-200/70">
                    <span className="text-sm font-bold text-amber-800">{debridementStats.kronikTotal}</span>
                    <span className="block text-[9px] text-amber-600">Toplam</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-200/70">
                    <span className="text-sm font-bold text-amber-700">{debridementStats.kronikUnique}</span>
                    <span className="block text-[9px] text-amber-600">Tekil Hasta</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-200/70">
                    <span className="text-sm font-bold text-amber-800">{debridementStats.kronikAverage}</span>
                    <span className="block text-[9px] text-amber-600">Ortalama</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. ANTİBİYOTİK İSTATİSTİKLERİ — EN ALTA ALINDI (USER REQUIREMENT) */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-teal-100 text-teal-800 rounded">
                  <Pill className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Antibiyotik İstatistikleri
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Seçilen aralıkta başlanan tedaviler
              </span>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-center">
                <span className="text-lg font-bold text-slate-900">{antibioticStats.total}</span>
                <span className="block text-[10px] text-slate-500">Başlanan İlaç Kaydı</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-center">
                <span className="text-lg font-bold text-teal-700">{antibioticStats.unique}</span>
                <span className="block text-[10px] text-slate-500">Tekil Hasta</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-center">
                <span className="text-lg font-bold text-indigo-700">{antibioticStats.comboCount}</span>
                <span className="block text-[10px] text-slate-500">Kombinasyon Başlangıcı</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-center">
                <span className="text-lg font-bold text-amber-700">{antibioticStats.switchedCount}</span>
                <span className="block text-[10px] text-slate-500">Tedavi Değişikliği</span>
              </div>
            </div>

            {/* Detailed Drug Breakdown Table */}
            {antibioticStats.drugs.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Antibiyotik Adı</th>
                      <th className="py-2.5 px-3">Toplam Başlama</th>
                      <th className="py-2.5 px-3">Tekil Hasta</th>
                      <th className="py-2.5 px-3">Uygulama Yolları</th>
                      <th className="py-2.5 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {antibioticStats.drugs.map(drug => (
                      <tr key={drug.name} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{drug.name}</td>
                        <td className="py-2 px-3 text-slate-700 font-bold">{drug.count}</td>
                        <td className="py-2 px-3 text-teal-700 font-semibold">{drug.patientIds.size}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">
                          {Object.entries(drug.routes).map(([r, c]) => `${r} (${c})`).join(', ')}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleInspectCard(
                                `Antibiyotik: ${drug.name}`,
                                Array.from(drug.patientIds),
                                antibioticStats.records.filter(r => r.label.includes(drug.name))
                              )
                            }
                            className="text-[10px] text-teal-700 hover:text-teal-900 font-bold px-2 py-1 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                          >
                            Hastaları Gör
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Seçili tarih aralığında başlanmış antibiyotik kaydı bulunmamaktadır.
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
};
