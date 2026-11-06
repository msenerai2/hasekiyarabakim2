import React, { useState } from 'react';
import { Scissors, X, Calendar, Clock } from 'lucide-react';
import { Patient, DebridementRecord } from '../types';
import { toTurkishUpper } from '../services/firebase';

interface DebridementModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: (record: Omit<DebridementRecord, 'id'>) => Promise<void>;
}

export const DebridementModal: React.FC<DebridementModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSave
}) => {
  const now = new Date();
  const dateDefault = now.toISOString().split('T')[0];
  const timeDefault = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [tarih, setTarih] = useState(dateDefault);
  const [saat, setSaat] = useState(timeDefault);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  // Determine debridement type automatically based on etiology
  const sikayet = patient.sikayet || [];
  const hasDM = sikayet.some(s => s.includes('DM') || s.includes('Diyabetik'));
  const hasChronic = sikayet.some(s => s.includes('Kronik'));
  let defaultType = 'Genel Yara Yeri Debridmanı';
  if (hasDM && hasChronic) defaultType = 'DM Ayak + Kronik Yara Debridmanı';
  else if (hasDM) defaultType = 'DM Ayak Debridmanı';
  else if (hasChronic) defaultType = 'Kronik Yara Debridmanı';

  const [debridmanTuru, setDebridmanTuru] = useState(defaultType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarih || !saat) return;

    const fullDate = new Date(`${tarih}T${saat}`);
    if (isNaN(fullDate.getTime())) {
      alert('Geçerli bir tarih ve saat seçin.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        hastaId: patient.id,
        adSoyad: toTurkishUpper(patient.adSoyad),
        zamanMs: fullDate.getTime(),
        debridmanTuru,
        islemAdi: 'Debridman',
        planNotu: 'Hastaya yara yeri debridmanı yapıldı.'
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Debridman kaydı oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-rose-700" />
            <h3 className="text-sm font-bold text-slate-900">Debridman Kaydı Oluştur</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-2.5 bg-rose-50/50 rounded-lg border border-rose-100 text-xs">
            <span className="font-semibold text-rose-900">Hasta: </span>
            <span className="font-bold text-slate-900">{toTurkishUpper(patient.adSoyad)}</span>
            <div className="text-[11px] text-rose-700 mt-0.5">Tür: <strong>{debridmanTuru}</strong></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={tarih}
                onChange={e => setTarih(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Saat</label>
              <input
                type="time"
                required
                value={saat}
                onChange={e => setSaat(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Debridman Türü</label>
            <select
              value={debridmanTuru}
              onChange={e => setDebridmanTuru(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-rose-600 font-medium"
            >
              <option value="DM Ayak Debridmanı">DM Ayak Debridmanı</option>
              <option value="Kronik Yara Debridmanı">Kronik Yara Debridmanı</option>
              <option value="DM Ayak + Kronik Yara Debridmanı">DM Ayak + Kronik Yara Debridmanı</option>
              <option value="Genel Yara Yeri Debridmanı">Genel Yara Yeri Debridmanı</option>
              <option value="Cerrahi / Keskin Debridman">Cerrahi / Keskin Debridman</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Kayıt onaylandığında, hastanın tedavi planı sekmesine otomatik olarak <span className="font-semibold text-slate-800">“Hastaya yara yeri debridmanı yapıldı.”</span> notu eklenecektir.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Debridmanı Onayla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
