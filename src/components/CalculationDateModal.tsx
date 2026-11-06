import React, { useState } from 'react';
import { Calendar, X, FileSpreadsheet } from 'lucide-react';

interface CalculationDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (startDate: string, endDate: string) => void;
}

export const CalculationDateModal: React.FC<CalculationDateModalProps> = ({
  isOpen,
  onClose,
  onCalculate
}) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDateInput = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(formatDateInput(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDateInput(today));

  if (!isOpen) return null;

  const handlePreset = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear') => {
    const now = new Date();
    if (type === 'thisMonth') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateInput(s));
      setEndDate(formatDateInput(now));
    } else if (type === 'lastMonth') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateInput(s));
      setEndDate(formatDateInput(e));
    } else if (type === 'last30') {
      const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDateInput(s));
      setEndDate(formatDateInput(now));
    } else if (type === 'thisYear') {
      const s = new Date(now.getFullYear(), 0, 1);
      setStartDate(formatDateInput(s));
      setEndDate(formatDateInput(now));
    }
  };

  const handleRun = () => {
    if (!startDate || !endDate) return;
    onCalculate(startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Hasta Hesapla & Raporla</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => handlePreset('thisMonth')}
              className="text-[11px] font-medium px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-md transition-colors"
            >
              Bu Ay
            </button>
            <button
              type="button"
              onClick={() => handlePreset('lastMonth')}
              className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Geçen Ay
            </button>
            <button
              type="button"
              onClick={() => handlePreset('last30')}
              className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Son 30 Gün
            </button>
            <button
              type="button"
              onClick={() => handlePreset('thisYear')}
              className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Bu Yıl
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            Seçilen aralıktaki tüm başvurular, yeni hasta sayıları, yara etyolojileri, yapılan işlemler ve en altta yer alan antibiyotik istatistikleri hesaplanacaktır.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleRun}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              Hesapla ve Raporla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
