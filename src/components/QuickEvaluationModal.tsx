import React, { useState } from 'react';
import { Stethoscope, X, Check, Calendar, Clock } from 'lucide-react';
import { Patient } from '../types';
import { toTurkishUpper } from '../services/firebase';

interface QuickEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSaveBatch: (payload: {
    notes: { area: string; text: string }[];
    categories: { area: string; value: string }[];
    dateTime: Date;
  }) => Promise<void>;
}

export const QuickEvaluationModal: React.FC<QuickEvaluationModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSaveBatch
}) => {
  const now = new Date();
  const dateDefault = now.toISOString().split('T')[0];
  const timeDefault = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [date, setDate] = useState(dateDefault);
  const [time, setTime] = useState(timeDefault);

  // Categories
  const [selectedKaynagi, setSelectedKaynagi] = useState<string[]>([]);
  const [selectedEtyoloji, setSelectedEtyoloji] = useState<string>('Diyabetik Ayak');
  const [selectedKlinik, setSelectedKlinik] = useState<string[]>([]);
  const [selectedYonlendirme, setSelectedYonlendirme] = useState<string[]>([]);
  const [selectedIslemler, setSelectedIslemler] = useState<string[]>([]);

  // Text notes
  const [laboratuvar, setLaboratuvar] = useState('');
  const [wagner, setWagner] = useState('');
  const [yaraOzellikleri, setYaraOzellikleri] = useState('');
  const [tedaviOzgecmisi, setTedaviOzgecmisi] = useState('');
  const [aki, setAki] = useState('');
  const [kultur, setKultur] = useState('');
  const [goruntuleme, setGoruntuleme] = useState('');
  const [plan, setPlan] = useState('');

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const wagnerOptions = [
    { evre: 'Evre 0', desc: 'Açık yara yok; deformite veya nöropati nedeniyle yüksek riskli ayak', val: 'Evre 0 – Açık yara yok; deformite, kallus veya nöropati nedeniyle yüksek riskli ayak' },
    { evre: 'Evre 1', desc: 'Yüzeyel ülser; sadece deri katmanını tutar', val: 'Evre 1 – Yüzeyel ülser; sadece deri katmanını tutar, derin doku tutulumu yok' },
    { evre: 'Evre 2', desc: 'Derin ülser; tendon, kapsül veya kemiğe ilerlemiş, abse yok', val: 'Evre 2 – Derin ülser; tendon, kapsül veya kemiğe ilerlemiş ancak abse/osteomiyelit yok' },
    { evre: 'Evre 3', desc: 'Derin ülser; abse, osteomiyelit veya septik artrit eşlik ediyor', val: 'Evre 3 – Derin ülser; abse, osteomiyelit veya septik artrit eşlik ediyor' },
    { evre: 'Evre 4', desc: 'Lokalize gangren (ayak parmağı veya ön ayak)', val: 'Evre 4 – Ayak parmağı veya ön ayakta sınırlı (lokalize) gangren' },
    { evre: 'Evre 5', desc: 'Tüm ayağı kaplayan yaygın gangren', val: 'Evre 5 – Tüm ayağı kaplayan yaygın gangren' }
  ];

  const kaynakOptions = ['Evde Sağlık', 'Doğrudan Başvuru', 'Yatan Servis', 'Palyatif Bakım', 'Yoğun Bakım Taburculuğu', 'Acil Servis', 'Diğer Kurumlardan Sevk'];
  const etyolojiOptions = ['Diyabetik Ayak', 'Basınç Yarası', 'Venöz Ülser', 'Arteriyel Ülser', 'Cerrahi Yara', 'Kronik Yara'];
  const klinikOptions = ['Enfekte Yara', 'İskemik Yara', 'Nekrotik Yara', 'Diğer Komplikasyonlar'];
  const yonlendirmeOptions = ['Konsültasyon istenildi', 'Hastaneye Yatışı yapıldı', 'Başka Hastaneye Sevk Edildi', 'Evde Sağlık Hizmetlerine Yönlendirildi'];
  const islemOptions = ['Pansuman', 'Debridman', 'Apse Drenajı', 'VAC', 'Hiperbarik Oksijen Tedavisi'];

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullDate = new Date(`${date}T${time}`);
    if (isNaN(fullDate.getTime())) {
      alert('Lütfen geçerli bir tarih ve saat seçin.');
      return;
    }

    const notes: { area: string; text: string }[] = [];
    if (laboratuvar.trim()) notes.push({ area: 'laboratuvar', text: laboratuvar.trim() });
    if (wagner.trim()) notes.push({ area: 'siniflama', text: wagner.trim() });
    if (yaraOzellikleri.trim()) notes.push({ area: 'yaraOzellikleri', text: yaraOzellikleri.trim() });
    if (tedaviOzgecmisi.trim()) notes.push({ area: 'tedaviOzgecmisi', text: tedaviOzgecmisi.trim() });
    if (aki.trim()) notes.push({ area: 'aki', text: aki.trim() });
    if (kultur.trim()) notes.push({ area: 'kultur', text: kultur.trim() });
    if (goruntuleme.trim()) notes.push({ area: 'goruntuleme', text: goruntuleme.trim() });
    if (plan.trim()) notes.push({ area: 'plan', text: plan.trim() });

    const categories: { area: string; value: string }[] = [];
    selectedKaynagi.forEach(val => categories.push({ area: 'hastaKaynagi', value: val }));
    if (selectedEtyoloji) categories.push({ area: 'yaraEtyolojisi', value: selectedEtyoloji });
    selectedKlinik.forEach(val => categories.push({ area: 'klinikDurum', value: val }));
    selectedYonlendirme.forEach(val => categories.push({ area: 'hastaYonlendirme', value: val }));
    selectedIslemler.forEach(val => categories.push({ area: 'yapilanIslemler', value: val }));

    if (notes.length === 0 && categories.length === 0) {
      alert('Lütfen en az bir değerlendirme alanı doldurun veya kategori seçin.');
      return;
    }

    setSubmitting(true);
    try {
      await onSaveBatch({
        notes,
        categories,
        dateTime: fullDate
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Değerlendirme kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Hasta Değerlendirme Başlat — {toTurkishUpper(patient.adSoyad)}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Common Date & Time */}
          <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-teal-900 mb-1">Değerlendirme Tarihi</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-900 mb-1">Saat</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Hasta Kaynağı */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Hasta Kaynağı</label>
            <div className="flex flex-wrap gap-1.5">
              {kaynakOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem(setSelectedKaynagi, opt)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    selectedKaynagi.includes(opt)
                      ? 'bg-teal-600 text-white font-bold border-teal-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Yara Etyolojisi */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Yara Etyolojisi (Tek Tanı)</label>
            <div className="flex flex-wrap gap-1.5">
              {etyolojiOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedEtyoloji(opt)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    selectedEtyoloji === opt
                      ? 'bg-indigo-600 text-white font-bold border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Yaranın Klinik Durumu */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Yaranın Klinik Durumu</label>
            <div className="flex flex-wrap gap-1.5">
              {klinikOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem(setSelectedKlinik, opt)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    selectedKlinik.includes(opt)
                      ? 'bg-amber-600 text-white font-bold border-amber-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Yapılan İşlemler */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Yapılan İşlemler</label>
            <div className="flex flex-wrap gap-1.5">
              {islemOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem(setSelectedIslemler, opt)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    selectedIslemler.includes(opt)
                      ? 'bg-blue-600 text-white font-bold border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Hasta Yönlendirme Durumu */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Hasta Yönlendirme Durumu</label>
            <div className="flex flex-wrap gap-1.5">
              {yonlendirmeOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleArrayItem(setSelectedYonlendirme, opt)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    selectedYonlendirme.includes(opt)
                      ? 'bg-purple-600 text-white font-bold border-purple-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Sınıflama (Wagner) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-1.5">Sınıflama (Wagner Sınıflandırması)</label>
            <div className="space-y-1.5">
              {wagnerOptions.map(opt => (
                <button
                  key={opt.evre}
                  type="button"
                  onClick={() => setWagner(wagner === opt.val ? '' : opt.val)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                    wagner === opt.val
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-bold text-teal-700 mr-2">{opt.evre}</span>
                    <span className="text-[11px] text-slate-600">{opt.desc}</span>
                  </div>
                  {wagner === opt.val && <Check className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Free-Text Note Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Laboratuvar</label>
              <textarea
                rows={2}
                value={laboratuvar}
                onChange={e => setLaboratuvar(e.target.value)}
                placeholder="Örn. CRP, Sedimantasyon, HbA1c, WBC bulguları..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Yara Özellikleri</label>
              <textarea
                rows={2}
                value={yaraOzellikleri}
                onChange={e => setYaraOzellikleri(e.target.value)}
                placeholder="Örn. Boyut, eksüda miktarı, maserasyon, koku..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tedavi Özgeçmişi</label>
              <textarea
                rows={2}
                value={tedaviOzgecmisi}
                onChange={e => setTedaviOzgecmisi(e.target.value)}
                placeholder="Örn. Önceki debridmanlar, revaskülarizasyon öyküsü..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ayak Bileği Kol İndeksi (AKİ)</label>
              <textarea
                rows={1}
                value={aki}
                onChange={e => setAki(e.target.value)}
                placeholder="Örn. Sağ: 0.9, Sol: 0.7 (periferik arter hastalığı)"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kültür / Antibiyotik Notu</label>
              <textarea
                rows={1}
                value={kultur}
                onChange={e => setKultur(e.target.value)}
                placeholder="Örn. Doku biyopsisi kültürü alındı..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Görüntüleme Bulguları</label>
              <textarea
                rows={1}
                value={goruntuleme}
                onChange={e => setGoruntuleme(e.target.value)}
                placeholder="Örn. Direkt grafi: osteomiyelit bulgusu yok; Doppler USG..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tedavi Planı</label>
              <textarea
                rows={2}
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="Örn. Günlük gümüşlü köpük pansuman, bası azaltıcı tabanlık..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Tüm Değerlendirmeyi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
