import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { Patient, WoundEtiology } from '../types';
import { toTurkishUpper, formatDateTimeTR } from '../services/firebase';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patientData: Omit<Patient, 'id'>) => Promise<void>;
  editingPatient?: Patient | null;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPatient
}) => {
  const [adSoyad, setAdSoyad] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [basvuru, setBasvuru] = useState('');
  const [dogumTarihi, setDogumTarihi] = useState('');
  const [cinsiyet, setCinsiyet] = useState<'Kadın' | 'Erkek' | ''>('');
  const [sikayet, setSikayet] = useState<string[]>([]);
  const [oyku, setOyku] = useState<string[]>([]);
  const [oykuEk, setOykuEk] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const etiologies = [
    { value: 'Diyabetik Ayak', label: 'Diyabetik Ayak' },
    { value: 'Basınç Yarası', label: 'Basınç Yarası' },
    { value: 'Venöz Ülser', label: 'Venöz Ülser' },
    { value: 'Arteriyel Ülser', label: 'Arteriyel Ülser' },
    { value: 'Cerrahi Yara', label: 'Cerrahi Yara' },
    { value: 'Kronik Yara', label: 'Kronik Yara (Eski Kayıtlar)' }
  ];

  const comorbidities = [
    'DM',
    'HT',
    'KOAH',
    'KKY',
    'KBY',
    'KAH',
    'Hiperlipidemi',
    'Tiroid'
  ];

  useEffect(() => {
    if (editingPatient) {
      setAdSoyad(toTurkishUpper(editingPatient.adSoyad || ''));
      setTcNo(editingPatient.tcNo || '');
      setBasvuru(editingPatient.basvuru || formatDateTimeTR(new Date()));
      setDogumTarihi(editingPatient.dogumTarihi || '');
      setCinsiyet(editingPatient.cinsiyet || '');
      setSikayet(editingPatient.sikayet || []);
      setOyku(editingPatient.oyku || []);
      setOykuEk(editingPatient.oykuEk || '');
    } else {
      setAdSoyad('');
      setTcNo('');
      setBasvuru(formatDateTimeTR(new Date()));
      setDogumTarihi('');
      setCinsiyet('');
      setSikayet(['Diyabetik Ayak']);
      setOyku([]);
      setOykuEk('');
    }
    setErrorMsg('');
  }, [editingPatient, isOpen]);

  if (!isOpen) return null;

  const handleEtiologyToggle = (val: string) => {
    // Single etiology primary selection with toggle
    setSikayet([val]);
  };

  const handleComorbidityToggle = (val: string) => {
    setOyku(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const upperName = toTurkishUpper(adSoyad);
    if (!upperName) {
      setErrorMsg('Hasta adı ve soyadı zorunludur.');
      return;
    }

    if (tcNo && tcNo.length !== 11) {
      setErrorMsg('T.C. Kimlik Numarası 11 haneli olmalıdır (veya boş bırakılabilir).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSave({
        adSoyad: upperName, // Hepsi BÜYÜK HARF
        tcNo: tcNo.trim(),
        basvuru,
        dogumTarihi,
        cinsiyet,
        sikayet,
        oyku,
        oykuEk: oykuEk.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg('Kayıt kaydedilirken bir hata oluştu: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingPatient ? 'Hasta Kaydını Düzenle' : 'Yeni Hasta Kaydı'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Adı Soyadı (Hepsi BÜYÜK HARF) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hasta Adı Soyadı <span className="text-rose-500">* (BÜYÜK HARF)</span>
            </label>
            <input
              type="text"
              required
              value={adSoyad}
              onChange={e => setAdSoyad(toTurkishUpper(e.target.value))}
              placeholder="ÖRN. AHMET YILMAZ"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 tracking-wide"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                T.C. Kimlik Numarası
              </label>
              <input
                type="text"
                maxLength={11}
                value={tcNo}
                onChange={e => setTcNo(e.target.value.replace(/\D/g, ''))}
                placeholder="11 haneli T.C."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Başvuru Tarihi
              </label>
              <input
                type="text"
                readOnly
                value={basvuru}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doğum Tarihi
              </label>
              <input
                type="date"
                value={dogumTarihi}
                onChange={e => setDogumTarihi(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cinsiyet
              </label>
              <select
                value={cinsiyet}
                onChange={e => setCinsiyet(e.target.value as any)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600 bg-white"
              >
                <option value="">Seçiniz</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
            </div>
          </div>

          {/* Yara Etyolojisi (Şikayet) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Yara Etyolojisi / Tanı
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {etiologies.map(et => {
                const isSelected = sikayet.includes(et.value) || (et.value === 'Diyabetik Ayak' && sikayet.includes('DM Ayak'));
                return (
                  <button
                    key={et.value}
                    type="button"
                    onClick={() => handleEtiologyToggle(et.value)}
                    className={`py-1.5 px-2 rounded-md border text-left text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {et.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Öykü Özgeçmiş */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Öykü ve Eşlik Eden Hastalıklar
            </label>
            <div className="flex flex-wrap gap-1.5">
              {comorbidities.map(c => {
                const isSelected = oyku.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleComorbidityToggle(c)}
                    className={`px-2.5 py-1 rounded text-xs transition-all ${
                      isSelected
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <textarea
              value={oykuEk}
              onChange={e => setOykuEk(e.target.value)}
              placeholder="Ek anamnez veya özgeçmiş notu..."
              rows={2}
              className="w-full mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : editingPatient ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
