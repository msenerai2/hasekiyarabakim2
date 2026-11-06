import React, { useState, useEffect } from 'react';
import { Pill, X, Calendar, Plus, Trash2 } from 'lucide-react';
import { Patient, AntibioticRecord, PresetAntibiotic } from '../types';
import { toTurkishUpper } from '../services/firebase';

interface AntibioticModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: (record: Omit<AntibioticRecord, 'id'>) => Promise<void>;
  contextRecord?: AntibioticRecord | null; // For follow-up / sequential therapy
  presetList?: PresetAntibiotic[];
}

export const AntibioticModal: React.FC<AntibioticModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  contextRecord,
  presetList = []
}) => {
  const defaultPresets: PresetAntibiotic[] = presetList.length > 0 ? presetList : [
    { id: '1', ad: 'Amoksisilin-klavulanat', doz: '1000 mg', siklik: '2x1' },
    { id: '2', ad: 'Siprofloksasin', doz: '500 mg', siklik: '2x1' },
    { id: '3', ad: 'Klindamisin', doz: '600 mg', siklik: '3x1' },
    { id: '4', ad: 'Piperasilin-tazobaktam', doz: '4.5 g', siklik: '3x1' },
    { id: '5', ad: 'Vankomisin', doz: '1 g', siklik: '2x1' },
    { id: '6', ad: 'Meropenem', doz: '1 g', siklik: '3x1' }
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const [antibiyotikAdi, setAntibiyotikAdi] = useState('');
  const [doz, setDoz] = useState('');
  const [siklik, setSiklik] = useState('2x1');
  const [uygulamaYolu, setUygulamaYolu] = useState('Oral');
  const [baslamaTarihi, setBaslamaTarihi] = useState(todayStr);
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [baslamaNedeni, setBaslamaNedeni] = useState('Ampirik Tedavi');
  const [kulturDurumu, setKulturDurumu] = useState('Kültür Alındı (Sonuç Bekleniyor)');
  const [aciklama, setAciklama] = useState('');
  const [isKombinasyon, setIsKombinasyon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (contextRecord) {
      // Starting follow-up
      const prevEnd = new Date(contextRecord.bitisTarihi);
      const nextStart = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);
      setBaslamaTarihi(nextStart.toISOString().split('T')[0]);
      setBaslamaNedeni('Klinik Yanıtsızlık / Tedavi Değişikliği');
    } else {
      setBaslamaTarihi(todayStr);
      setBaslamaNedeni('Ampirik Tedavi');
    }
    // Default 10 days duration
    const s = new Date(baslamaTarihi || todayStr);
    const e = new Date(s.getTime() + 10 * 24 * 60 * 60 * 1000);
    setBitisTarihi(e.toISOString().split('T')[0]);
  }, [contextRecord, isOpen]);

  if (!isOpen || !patient) return null;

  const handleSelectPreset = (item: PresetAntibiotic) => {
    setAntibiyotikAdi(item.ad);
    setDoz(item.doz);
    setSiklik(item.siklik);
  };

  const handleAddDays = (days: number) => {
    const s = new Date(baslamaTarihi || todayStr);
    const e = new Date(s.getTime() + days * 24 * 60 * 60 * 1000);
    setBitisTarihi(e.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!antibiyotikAdi || !baslamaTarihi || !bitisTarihi) {
      alert('Lütfen antibiyotik adı ve tarihleri doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        hastaId: patient.id,
        adSoyad: toTurkishUpper(patient.adSoyad),
        hastaSikayetleri: patient.sikayet || [],
        antibiyotikAdi,
        doz,
        siklik,
        uygulamaYolu,
        baslamaTarihi,
        bitisTarihi,
        baslamaNedeni,
        kulturDurumu,
        aciklama,
        kombinasyonMu: isKombinasyon,
        tedaviDegisikligi: !!contextRecord,
        oncekiAntibiyotikAdi: contextRecord ? contextRecord.antibiyotikAdi : undefined,
        tedaviZinciriId: contextRecord?.tedaviZinciriId || undefined
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {contextRecord ? 'Tedavi Değişikliği / Yeni Antibiyotik' : 'Antibiyotik Başlat'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-100 text-xs">
            <span className="font-semibold text-teal-900">Hasta: </span>
            <span className="font-bold text-slate-900">{toTurkishUpper(patient.adSoyad)}</span>
            {contextRecord && (
              <div className="text-[11px] text-teal-700 mt-0.5">
                Önceki Tedavi: <strong>{contextRecord.antibiyotikAdi}</strong> bitişi ardından zincir tedavisi olarak eklenecek.
              </div>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hızlı Hazır Antibiyotik Seçimi:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {defaultPresets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border text-left transition-colors ${
                    antibiyotikAdi === p.ad
                      ? 'bg-teal-600 text-white font-bold border-teal-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {p.ad} <span className="opacity-75 text-[10px]">({p.doz})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Antibiyotik Adı *
              </label>
              <input
                type="text"
                required
                value={antibiyotikAdi}
                onChange={e => setAntibiyotikAdi(e.target.value)}
                placeholder="Örn. Siprofloksasin"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doz & Sıklık
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={doz}
                  onChange={e => setDoz(e.target.value)}
                  placeholder="500 mg"
                  className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                />
                <input
                  type="text"
                  value={siklik}
                  onChange={e => setSiklik(e.target.value)}
                  placeholder="2x1"
                  className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Uygulama Yolu</label>
              <select
                value={uygulamaYolu}
                onChange={e => setUygulamaYolu(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Oral">Oral (PO)</option>
                <option value="IV">İntravenöz (IV)</option>
                <option value="IM">İntramusküler (IM)</option>
                <option value="Topikal">Topikal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Başlama Tarihi</label>
              <input
                type="date"
                required
                value={baslamaTarihi}
                onChange={e => setBaslamaTarihi(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                required
                value={bitisTarihi}
                onChange={e => setBitisTarihi(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Quick duration presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Hızlı Süre:</span>
            {[5, 7, 10, 14, 21].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => handleAddDays(days)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                +{days} Gün
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Başlama Nedeni</label>
              <select
                value={baslamaNedeni}
                onChange={e => setBaslamaNedeni(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Ampirik Tedavi">Ampirik Tedavi</option>
                <option value="Kültür Sonucuna Göre">Kültür Sonucuna Göre</option>
                <option value="Profilaktik">Profilaktik</option>
                <option value="Klinik Yanıtsızlık / Değişim">Klinik Yanıtsızlık / Değişim</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kültür Durumu</label>
              <select
                value={kulturDurumu}
                onChange={e => setKulturDurumu(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Kültür Alındı (Sonuç Bekleniyor)">Kültür Alındı (Sonuç Bekleniyor)</option>
                <option value="Kültürde Üreme Var">Kültürde Üreme Var</option>
                <option value="Kültürde Üreme Yok">Kültürde Üreme Yok</option>
                <option value="Kültür Alınmadı">Kültür Alınmadı</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isKombinasyon}
                onChange={e => setIsKombinasyon(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold">Bu tedavi bir kombinasyon parçasıdır (aynı anda birden çok ilaç)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama / Klinik Not</label>
            <textarea
              rows={2}
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              placeholder="Ek antibiyogram veya takip notu..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Antibiyotiği Başlat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
