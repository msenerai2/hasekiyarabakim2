import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db, toTurkishUpper, parseDateSafe, formatDateTimeTR } from './services/firebase';
import {
  Patient,
  Visit,
  EvaluationItem,
  FootMarkerSet,
  AntibioticRecord,
  DebridementRecord,
  PhotoRecord,
  PresetNote,
  PresetAntibiotic,
  FootMarker
} from './types';
import { PatientListSidebar } from './components/PatientListSidebar';
import { PatientDetailView } from './components/PatientDetailView';
import { CalculationReportView } from './components/CalculationReportView';
import { CalculationDateModal } from './components/CalculationDateModal';
import { NewPatientModal } from './components/NewPatientModal';
import { QuickEvaluationModal } from './components/QuickEvaluationModal';
import { AntibioticModal } from './components/AntibioticModal';
import { DebridementModal } from './components/DebridementModal';
import { TerminationModal } from './components/TerminationModal';
import { NoteEditModal } from './components/NoteEditModal';
import { PhotoLightboxModal } from './components/PhotoLightboxModal';
import { FullGalleryModal } from './components/FullGalleryModal';
import { PresetNotesModal } from './components/PresetNotesModal';
import { Stethoscope, AlertCircle, FileSpreadsheet } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = 'es30lfua';
const CLOUDINARY_UPLOAD_PRESET = 'yarabakim';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Active patient sub-data
  const [visits, setVisits] = useState<Visit[]>([]);
  const [evaluationNotes, setEvaluationNotes] = useState<Record<string, EvaluationItem[]>>({});
  const [markerSets, setMarkerSets] = useState<FootMarkerSet[]>([]);
  const [antibiotics, setAntibiotics] = useState<AntibioticRecord[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  // System-wide data for Calculation View
  const [allVisitsMap, setAllVisitsMap] = useState<Record<string, { id: string; zamanMs: number }[]>>({});
  const [allDebridements, setAllDebridements] = useState<DebridementRecord[]>([]);
  const [allAntibiotics, setAllAntibiotics] = useState<AntibioticRecord[]>([]);
  const [allPhotos, setAllPhotos] = useState<{ photo: PhotoRecord; patient: Patient }[]>([]);
  const [allCategoryData, setAllCategoryData] = useState<{
    hastaKaynagi: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    yaraEtyolojisi: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    klinikDurum: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    hastaYonlendirme: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    yapilanIslemler: { hastaId: string; adSoyad: string; deger: string; zamanMs: number; aciklama?: string }[];
    sonlandirmalar: { hastaId: string; adSoyad: string; zamanMs: number; metin?: string }[];
  }>({
    hastaKaynagi: [],
    yaraEtyolojisi: [],
    klinikDurum: [],
    hastaYonlendirme: [],
    yapilanIslemler: [],
    sonlandirmalar: []
  });

  // Settings
  const [presetNotes, setPresetNotes] = useState<Record<string, PresetNote[]>>({});
  const [presetAntibiotics, setPresetAntibiotics] = useState<PresetAntibiotic[]>([]);

  // Navigation & Modals
  const [isCalculationViewOpen, setIsCalculationViewOpen] = useState(false);
  const [calcStartDate, setCalcStartDate] = useState('');
  const [calcEndDate, setCalcEndDate] = useState('');

  const [isDatePickModalOpen, setIsDatePickModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [isQuickEvalModalOpen, setIsQuickEvalModalOpen] = useState(false);
  const [isAntibioticModalOpen, setIsAntibioticModalOpen] = useState(false);
  const [antibioticContext, setAntibioticContext] = useState<AntibioticRecord | null>(null);

  const [isDebridementModalOpen, setIsDebridementModalOpen] = useState(false);
  const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);

  const [isSingleNoteModalOpen, setIsSingleNoteModalOpen] = useState(false);
  const [singleNoteArea, setSingleNoteArea] = useState<string>('laboratuvar');
  const [editingNoteItem, setEditingNoteItem] = useState<EvaluationItem | null>(null);

  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [isFullGalleryOpen, setIsFullGalleryOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Selected Patient
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Last visit timestamps for sorting
  const lastVisitMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(allVisitsMap).forEach(([pId, vList]) => {
      const times = vList.map(v => v.zamanMs).filter(t => !isNaN(t));
      if (times.length > 0) map[pId] = Math.max(...times);
    });
    return map;
  }, [allVisitsMap]);

  // 1. Initial Listeners: Patients collection
  useEffect(() => {
    const q = query(collection(db, 'hastalar'), orderBy('olusturulmaZamani', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Patient[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          adSoyad: toTurkishUpper(data.adSoyad || ''), // Always uppercase
          tcNo: data.tcNo || '',
          basvuru: data.basvuru || '',
          dogumTarihi: data.dogumTarihi || '',
          cinsiyet: data.cinsiyet || '',
          sikayet: data.sikayet || [],
          oyku: data.oyku || [],
          oykuEk: data.oykuEk || '',
          olusturulmaZamani: data.olusturulmaZamani
        };
      });
      setPatients(list);

      // Auto select first patient if none selected
      if (!selectedPatientId && list.length > 0) {
        setSelectedPatientId(list[0].id);
      }
    }, (err) => {
      console.warn('Firestore patients snapshot warning (using local sync):', err);
    });

    return () => unsub();
  }, []);

  // 2. Preset notes listener from 'ayarlar/hazirNotButonlari'
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'ayarlar', 'hazirNotButonlari'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const antibioticsList = data.antibiyotikler || [];
        setPresetAntibiotics(antibioticsList);

        const notesMap: Record<string, PresetNote[]> = {};
        const areas = ['laboratuvar', 'yaraOzellikleri', 'tedaviOzgecmisi', 'aki', 'kultur', 'goruntuleme', 'plan'];
        areas.forEach(a => {
          notesMap[a] = data[a] || [];
        });
        setPresetNotes(notesMap);
      }
    });
    return () => unsub();
  }, []);

  // 3. System-wide sync for Calculation & Reporting
  useEffect(() => {
    if (patients.length === 0) return;

    let isSubscribed = true;

    const fetchAllData = async () => {
      const visitsCollector: Record<string, { id: string; zamanMs: number }[]> = {};
      const debridementsCollector: DebridementRecord[] = [];
      const antibioticsCollector: AntibioticRecord[] = [];
      const photosCollector: { photo: PhotoRecord; patient: Patient }[] = [];

      const catCollector = {
        hastaKaynagi: [] as any[],
        yaraEtyolojisi: [] as any[],
        klinikDurum: [] as any[],
        hastaYonlendirme: [] as any[],
        yapilanIslemler: [] as any[],
        sonlandirmalar: [] as any[]
      };

      await Promise.all(
        patients.map(async p => {
          try {
            // Visits
            const vSnap = await getDocs(collection(db, 'hastalar', p.id, 'gelisler'));
            const pVisits: { id: string; zamanMs: number }[] = [];
            vSnap.forEach(d => {
              const data = d.data();
              const dateObj = parseDateSafe(data.olusturulmaZamani);
              if (dateObj) pVisits.push({ id: d.id, zamanMs: dateObj.getTime() });
            });
            visitsCollector[p.id] = pVisits;

            // Debridements
            const dSnap = await getDocs(collection(db, 'hastalar', p.id, 'debridmanlar'));
            dSnap.forEach(d => {
              const data = d.data();
              const dateObj = parseDateSafe(data.tarihSaat || data.olusturulmaZamani);
              if (dateObj) {
                debridementsCollector.push({
                  id: d.id,
                  hastaId: p.id,
                  adSoyad: p.adSoyad,
                  zamanMs: dateObj.getTime(),
                  debridmanTuru: data.debridmanTuru || 'Genel Debridman',
                  islemAdi: data.islemAdi,
                  planNotu: data.planNotu
                });
              }
            });

            // Antibiotics (from kultur)
            const kSnap = await getDocs(collection(db, 'hastalar', p.id, 'kultur'));
            kSnap.forEach(d => {
              const data = d.data();
              antibioticsCollector.push({
                id: d.id,
                hastaId: p.id,
                adSoyad: p.adSoyad,
                hastaSikayetleri: p.sikayet || [],
                antibiyotikAdi: data.antibiyotikAdi || 'Bilinmeyen Antibiyotik',
                doz: data.doz,
                siklik: data.siklik,
                uygulamaYolu: data.uygulamaYolu,
                baslamaTarihi: data.baslamaTarihi,
                bitisTarihi: data.bitisTarihi,
                baslamaNedeni: data.baslamaNedeni,
                kulturDurumu: data.kulturDurumu,
                aciklama: data.aciklama,
                kombinasyonMu: data.kombinasyonMu,
                tedaviDegisikligi: data.tedaviDegisikligi,
                tedaviZinciriId: data.tedaviZinciriId,
                tedaviGrubuId: data.tedaviGrubuId
              });
            });

            // Photos
            const fSnap = await getDocs(collection(db, 'hastalar', p.id, 'fotograflar'));
            fSnap.forEach(d => {
              const data = d.data();
              const dObj = parseDateSafe(data.olusturulmaZamani);
              photosCollector.push({
                photo: { id: d.id, url: data.url, olusturulmaZamani: data.olusturulmaZamani, tarih: dObj },
                patient: p
              });
            });

            // Categories
            const catAreas = ['hastaKaynagi', 'yaraEtyolojisi', 'klinikDurum', 'hastaYonlendirme', 'yapilanIslemler'] as const;
            for (const cat of catAreas) {
              const sSnap = await getDocs(collection(db, 'hastalar', p.id, cat));
              sSnap.forEach(d => {
                const data = d.data();
                const dObj = parseDateSafe(data.olusturulmaZamani);
                if (dObj) {
                  catCollector[cat].push({
                    hastaId: p.id,
                    adSoyad: p.adSoyad,
                    deger: data.deger || data.metin || '',
                    aciklama: data.aciklama || '',
                    zamanMs: dObj.getTime()
                  });
                }
              });
            }

            // Sonlandirmalar
            const sonSnap = await getDocs(collection(db, 'hastalar', p.id, 'sonlandirmalar'));
            sonSnap.forEach(d => {
              const data = d.data();
              const dObj = parseDateSafe(data.tarihSaat || data.olusturulmaZamani);
              if (dObj) {
                catCollector.sonlandirmalar.push({
                  hastaId: p.id,
                  adSoyad: p.adSoyad,
                  zamanMs: dObj.getTime(),
                  metin: data.metin || 'Yarası kapandı, tedavi tamamlandı'
                });
              }
            });
          } catch (err) {
            console.error(`Patient ${p.id} sub-collection read error:`, err);
          }
        })
      );

      if (isSubscribed) {
        setAllVisitsMap(visitsCollector);
        setAllDebridements(debridementsCollector);
        setAllAntibiotics(antibioticsCollector);
        setAllPhotos(photosCollector);
        setAllCategoryData(catCollector);
      }
    };

    fetchAllData();
    return () => {
      isSubscribed = false;
    };
  }, [patients]);

  // 4. Active Patient Sub-Collections Real-Time Listener
  useEffect(() => {
    if (!selectedPatientId) {
      setVisits([]);
      setEvaluationNotes({});
      setMarkerSets([]);
      setAntibiotics([]);
      setPhotos([]);
      return;
    }

    const unsubs: (() => void)[] = [];

    // Gelişler
    const vQuery = query(collection(db, 'hastalar', selectedPatientId, 'gelisler'), orderBy('olusturulmaZamani', 'desc'));
    unsubs.push(
      onSnapshot(vQuery, snap => {
        const list: Visit[] = snap.docs.map(d => {
          const dt = parseDateSafe(d.data().olusturulmaZamani) || new Date();
          return { id: d.id, olusturulmaZamani: d.data().olusturulmaZamani, zamanMs: dt.getTime() };
        });
        setVisits(list);
      })
    );

    // Ayak İşaretlemeleri
    const mQuery = query(collection(db, 'hastalar', selectedPatientId, 'ayakIsaretlemeleri'), orderBy('olusturulmaZamani', 'desc'));
    unsubs.push(
      onSnapshot(mQuery, snap => {
        const list: FootMarkerSet[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as FootMarkerSet));
        setMarkerSets(list);
      })
    );

    // Fotoğraflar
    const pQuery = query(collection(db, 'hastalar', selectedPatientId, 'fotograflar'), orderBy('olusturulmaZamani', 'desc'));
    unsubs.push(
      onSnapshot(pQuery, snap => {
        const list: PhotoRecord[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            url: data.url,
            olusturulmaZamani: data.olusturulmaZamani,
            tarih: parseDateSafe(data.olusturulmaZamani)
          };
        });
        setPhotos(list);
      })
    );

    // Antibiyotikler (kultur)
    const kQuery = query(collection(db, 'hastalar', selectedPatientId, 'kultur'), orderBy('olusturulmaZamani', 'desc'));
    unsubs.push(
      onSnapshot(kQuery, snap => {
        const list: AntibioticRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as AntibioticRecord));
        setAntibiotics(list);
      })
    );

    // Evaluation Notes Areas
    const areas = [
      'hastaKaynagi',
      'yaraEtyolojisi',
      'klinikDurum',
      'hastaYonlendirme',
      'laboratuvar',
      'siniflama',
      'yaraOzellikleri',
      'tedaviOzgecmisi',
      'aki',
      'kultur',
      'goruntuleme',
      'plan',
      'yapilanIslemler'
    ];

    areas.forEach(area => {
      const aQuery = query(collection(db, 'hastalar', selectedPatientId, area), orderBy('olusturulmaZamani', 'desc'));
      unsubs.push(
        onSnapshot(aQuery, snap => {
          const notes: EvaluationItem[] = snap.docs.map(d => {
            const data = d.data();
            const dateObj = parseDateSafe(data.olusturulmaZamani);
            return {
              id: d.id,
              metin: data.metin || data.deger || '',
              deger: data.deger,
              aciklama: data.aciklama,
              olusturulmaZamani: data.olusturulmaZamani,
              zamanMs: dateObj ? dateObj.getTime() : undefined,
              tarih: dateObj
            };
          });
          setEvaluationNotes(prev => ({ ...prev, [area]: notes }));
        })
      );
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [selectedPatientId]);

  // Handlers for Patient CRUD
  const handleSavePatient = async (data: Omit<Patient, 'id'>) => {
    if (editingPatient) {
      await updateDoc(doc(db, 'hastalar', editingPatient.id), {
        ...data,
        adSoyad: toTurkishUpper(data.adSoyad) // Uppercase enforcement
      });
      setEditingPatient(null);
    } else {
      const docRef = await addDoc(collection(db, 'hastalar'), {
        ...data,
        adSoyad: toTurkishUpper(data.adSoyad), // Uppercase enforcement
        olusturulmaZamani: serverTimestamp()
      });
      setSelectedPatientId(docRef.id);
    }
  };

  const handleDeletePatient = async (p: Patient) => {
    if (window.confirm(`${toTurkishUpper(p.adSoyad)} adlı hastayı ve tüm kayıtlarını silmek istediğinize emin misiniz?`)) {
      await deleteDoc(doc(db, 'hastalar', p.id));
      if (selectedPatientId === p.id) {
        setSelectedPatientId(null);
      }
    }
  };

  // Handlers for Visits
  const handleAddVisit = async () => {
    if (!selectedPatientId) return;
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'gelisler'), {
      olusturulmaZamani: serverTimestamp()
    });
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!selectedPatientId) return;
    if (window.confirm('Bu geliş kaydını silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'hastalar', selectedPatientId, 'gelisler', visitId));
    }
  };

  // Handlers for Notes
  const handleAddNote = async (area: string, text: string, date: Date) => {
    if (!selectedPatientId) return;
    await addDoc(collection(db, 'hastalar', selectedPatientId, area), {
      metin: text,
      olusturulmaZamani: Timestamp.fromDate(date)
    });
  };

  const handleEditNote = async (area: string, noteId: string, text: string, date: Date) => {
    if (!selectedPatientId) return;
    await updateDoc(doc(db, 'hastalar', selectedPatientId, area, noteId), {
      metin: text,
      olusturulmaZamani: Timestamp.fromDate(date),
      sonDuzenlemeZamani: serverTimestamp()
    });
  };

  const handleDeleteNote = async (area: string, noteId: string) => {
    if (!selectedPatientId) return;
    if (window.confirm('Bu notu silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'hastalar', selectedPatientId, area, noteId));
    }
  };

  // Handlers for Foot Marker
  const handleAddFootMarker = async (marker: FootMarker, createNewSet: boolean) => {
    if (!selectedPatientId) return;
    if (createNewSet || markerSets.length === 0) {
      await addDoc(collection(db, 'hastalar', selectedPatientId, 'ayakIsaretlemeleri'), {
        markerlar: [marker],
        olusturulmaZamani: serverTimestamp(),
        sonDuzenleme: serverTimestamp()
      });
    } else {
      const targetSet = markerSets[0]; // add to newest
      const updatedMarkers = [...(targetSet.markerlar || []), marker];
      await updateDoc(doc(db, 'hastalar', selectedPatientId, 'ayakIsaretlemeleri', targetSet.id), {
        markerlar: updatedMarkers,
        sonDuzenleme: serverTimestamp()
      });
    }
  };

  // Handlers for Photos
  const handleUploadPhotos = async (files: FileList) => {
    if (!selectedPatientId) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const json = await res.json();
          await addDoc(collection(db, 'hastalar', selectedPatientId, 'fotograflar'), {
            url: json.secure_url,
            olusturulmaZamani: serverTimestamp()
          });
        } else {
          // Fallback to data URL
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            await addDoc(collection(db, 'hastalar', selectedPatientId, 'fotograflar'), {
              url: dataUrl,
              olusturulmaZamani: serverTimestamp()
            });
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Photo upload error:', err);
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedPatientId) return;
    if (window.confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'hastalar', selectedPatientId, 'fotograflar', photoId));
    }
  };

  // Quick Evaluation Batch Save
  const handleSaveQuickEvaluation = async (payload: {
    notes: { area: string; text: string }[];
    categories: { area: string; value: string }[];
    dateTime: Date;
  }) => {
    if (!selectedPatientId) return;
    const ts = Timestamp.fromDate(payload.dateTime);

    // Save notes
    await Promise.all(
      payload.notes.map(n =>
        addDoc(collection(db, 'hastalar', selectedPatientId, n.area), {
          metin: n.text,
          olusturulmaZamani: ts
        })
      )
    );

    // Save categories
    await Promise.all(
      payload.categories.map(c =>
        addDoc(collection(db, 'hastalar', selectedPatientId, c.area), {
          metin: c.value,
          deger: c.value,
          kategori: c.area,
          olusturulmaZamani: ts
        })
      )
    );
  };

  // Antibiotic Save
  const handleSaveAntibiotic = async (rec: Omit<AntibioticRecord, 'id'>) => {
    if (!selectedPatientId) return;
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'kultur'), {
      ...rec,
      olusturulmaZamani: serverTimestamp()
    });
  };

  // Debridement Save
  const handleSaveDebridement = async (rec: Omit<DebridementRecord, 'id'>) => {
    if (!selectedPatientId) return;
    const ts = Timestamp.fromMillis(rec.zamanMs);
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'debridmanlar'), {
      ...rec,
      olusturulmaZamani: ts
    });
    // Append to plan
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'plan'), {
      metin: 'Hastaya yara yeri debridmanı yapıldı.',
      olusturulmaZamani: ts
    });
  };

  // Termination Save
  const handleSaveTermination = async (data: { tarih: string; saat: string; metin: string }) => {
    if (!selectedPatientId) return;
    const dt = new Date(`${data.tarih}T${data.saat}`);
    const ts = Timestamp.fromDate(dt);
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'sonlandirmalar'), {
      metin: data.metin,
      tarihSaat: ts,
      olusturulmaZamani: ts
    });
    await addDoc(collection(db, 'hastalar', selectedPatientId, 'plan'), {
      metin: data.metin,
      olusturulmaZamani: ts
    });
  };

  // Preset Save
  const handleSavePresets = async (newNotes: Record<string, PresetNote[]>, newAbs: PresetAntibiotic[]) => {
    setPresetNotes(newNotes);
    setPresetAntibiotics(newAbs);
    await setDoc(doc(db, 'ayarlar', 'hazirNotButonlari'), {
      ...newNotes,
      antibiyotikler: newAbs
    });
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* 1. Left Patient List Sidebar */}
      <PatientListSidebar
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={p => {
          setSelectedPatientId(p.id);
          setIsCalculationViewOpen(false);
        }}
        onNewPatient={() => {
          setEditingPatient(null);
          setIsNewPatientModalOpen(true);
        }}
        onOpenCalculation={() => setIsDatePickModalOpen(true)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenFullGallery={() => setIsFullGalleryOpen(true)}
        onEditPatient={p => {
          setEditingPatient(p);
          setIsNewPatientModalOpen(true);
        }}
        onDeletePatient={handleDeletePatient}
        onQuickAddVisit={handleAddVisit}
        lastVisitMap={lastVisitMap}
      />

      {/* 2. Main Center / Right Area */}
      {isCalculationViewOpen ? (
        /* Redesigned Compact Calculation & Clinical Report View */
        <CalculationReportView
          patients={patients}
          startDateStr={calcStartDate}
          endDateStr={calcEndDate}
          onClose={() => setIsCalculationViewOpen(false)}
          onSelectPatient={pId => {
            setSelectedPatientId(pId);
            setIsCalculationViewOpen(false);
          }}
          visitsMap={allVisitsMap}
          categoryData={allCategoryData}
          debridementRecords={allDebridements}
          antibioticRecords={allAntibiotics}
        />
      ) : selectedPatient ? (
        /* Patient Detail View */
        <PatientDetailView
          patient={selectedPatient}
          visits={visits}
          evaluationNotes={evaluationNotes}
          markerSets={markerSets}
          antibioticRecords={antibiotics}
          photos={photos}
          onAddVisit={handleAddVisit}
          onDeleteVisit={handleDeleteVisit}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          onAddFootMarker={handleAddFootMarker}
          onUploadPhotos={handleUploadPhotos}
          onDeletePhoto={handleDeletePhoto}
          onOpenQuickEvaluation={() => setIsQuickEvalModalOpen(true)}
          onOpenNewAntibiotic={() => {
            setAntibioticContext(null);
            setIsAntibioticModalOpen(true);
          }}
          onOpenDebridement={() => setIsDebridementModalOpen(true)}
          onOpenTermination={() => setIsTerminationModalOpen(true)}
          onOpenUpdateEndDate={rec => {
            setAntibioticContext(rec);
            setIsAntibioticModalOpen(true);
          }}
          onOpenFollowupAntibiotic={rec => {
            setAntibioticContext(rec);
            setIsAntibioticModalOpen(true);
          }}
          onOpenPhotoLightbox={idx => {
            setActivePhotoIndex(idx);
            setIsPhotoLightboxOpen(true);
          }}
          onOpenSingleNoteModal={(area, note) => {
            setSingleNoteArea(area);
            setEditingNoteItem(note || null);
            setIsSingleNoteModalOpen(true);
          }}
        />
      ) : (
        /* Empty Welcome State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <Stethoscope className="w-12 h-12 text-slate-300 mb-3 stroke-[1.5]" />
          <h2 className="text-base font-bold text-slate-700 mb-1">Klinik Yara Bakım Takip Sistemi</h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
            Sol panelden bir hasta seçebilir, yeni kayıt oluşturabilir veya dönem hesaplama raporunu açabilirsiniz.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingPatient(null);
                setIsNewPatientModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              + Yeni Hasta Kaydı Oluştur
            </button>
            <button
              onClick={() => setIsDatePickModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Dönem Raporu Hesapla
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Calculation Date Range Modal */}
      <CalculationDateModal
        isOpen={isDatePickModalOpen}
        onClose={() => setIsDatePickModalOpen(false)}
        onCalculate={(s, e) => {
          setCalcStartDate(s);
          setCalcEndDate(e);
          setIsCalculationViewOpen(true);
        }}
      />

      {/* New / Edit Patient Modal (with UPPERCASE name enforcement) */}
      <NewPatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onSave={handleSavePatient}
        editingPatient={editingPatient}
      />

      {/* Quick Evaluation (Batch) Modal */}
      <QuickEvaluationModal
        isOpen={isQuickEvalModalOpen}
        onClose={() => setIsQuickEvalModalOpen(false)}
        patient={selectedPatient}
        onSaveBatch={handleSaveQuickEvaluation}
      />

      {/* Antibiotic Prescribe / Follow-up Modal */}
      <AntibioticModal
        isOpen={isAntibioticModalOpen}
        onClose={() => setIsAntibioticModalOpen(false)}
        patient={selectedPatient}
        onSave={handleSaveAntibiotic}
        contextRecord={antibioticContext}
        presetList={presetAntibiotics}
      />

      {/* Debridement Modal */}
      <DebridementModal
        isOpen={isDebridementModalOpen}
        onClose={() => setIsDebridementModalOpen(false)}
        patient={selectedPatient}
        onSave={handleSaveDebridement}
      />

      {/* Termination Modal */}
      <TerminationModal
        isOpen={isTerminationModalOpen}
        onClose={() => setIsTerminationModalOpen(false)}
        patient={selectedPatient}
        onSave={handleSaveTermination}
      />

      {/* Single Note Edit / Add Modal */}
      <NoteEditModal
        isOpen={isSingleNoteModalOpen}
        onClose={() => {
          setIsSingleNoteModalOpen(false);
          setEditingNoteItem(null);
        }}
        title={singleNoteArea}
        areaKey={singleNoteArea}
        initialText={editingNoteItem?.metin || ''}
        initialDate={editingNoteItem?.tarih || new Date()}
        onSave={async (text, date) => {
          if (editingNoteItem) {
            await handleEditNote(singleNoteArea, editingNoteItem.id, text, date);
          } else {
            await handleAddNote(singleNoteArea, text, date);
          }
        }}
        presets={presetNotes[singleNoteArea] || []}
      />

      {/* Photo Lightbox */}
      <PhotoLightboxModal
        isOpen={isPhotoLightboxOpen}
        onClose={() => setIsPhotoLightboxOpen(false)}
        photos={photos}
        activeIndex={activePhotoIndex}
        onIndexChange={setActivePhotoIndex}
        patientName={selectedPatient ? toTurkishUpper(selectedPatient.adSoyad) : undefined}
      />

      {/* Full Photo Gallery across all patients */}
      <FullGalleryModal
        isOpen={isFullGalleryOpen}
        onClose={() => setIsFullGalleryOpen(false)}
        items={allPhotos}
        onSelectPatient={pId => {
          setSelectedPatientId(pId);
          setIsCalculationViewOpen(false);
        }}
      />

      {/* Preset Notes & Antibiotics Settings Modal */}
      <PresetNotesModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presetData={presetNotes}
        antibioticPresets={presetAntibiotics}
        onSavePresets={handleSavePresets}
      />
    </div>
  );
}
