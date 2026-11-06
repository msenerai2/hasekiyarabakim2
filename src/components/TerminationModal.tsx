import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Patient } from '../types';
import { toTurkishUpper } from '../services/firebase';

interface TerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: (data: { tarih: string; saat: string; metin: string }) => Promise<void>;
}

export const TerminationModal: React.FC<TerminationModalProps> = ({
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
  const [metin, setMetin] = useState('Hastanın yarası kapandı, tedavisi tamamlandı');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({ tarih, saat, metin });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Sonlandırma kaydı kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">Hasta / Yara Sonlandırma</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs">
            <span className="font-semibold text-emerald-900">Hasta: </span>
            <span className="font-bold text-slate-900">{toTurkishUpper(patient.adSoyad)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={tarih}
                onChange={e => setTarih(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Saat</label>
              <input
                type="time"
                required
                value={saat}
                onChange={e => setSaat(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sonlandırma Açıklaması</label>
            <textarea
              rows={2}
              value={metin}
              onChange={e => setMetin(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Bu işlem, hastanın yara kapanışını ve tedavi sonlanmasını kayda geçirir. İstatistiklerde <span className="font-bold text-emerald-800">“Yarası Kapanan / Tedavisi Sonlanan”</span> hanesine eklenir.
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Sonlandırmayı Onayla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
