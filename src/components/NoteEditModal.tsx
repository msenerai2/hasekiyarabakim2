import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { PresetNote } from '../types';

interface NoteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  areaKey: string;
  initialText?: string;
  initialDate?: Date;
  onSave: (text: string, date: Date) => Promise<void>;
  presets?: PresetNote[];
}

export const NoteEditModal: React.FC<NoteEditModalProps> = ({
  isOpen,
  onClose,
  title,
  areaKey,
  initialText = '',
  initialDate = new Date(),
  onSave,
  presets = []
}) => {
  const [text, setText] = useState(initialText);

  const formatDateInput = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTimeInput = (d: Date) => {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [date, setDate] = useState(formatDateInput(initialDate));
  const [time, setTime] = useState(formatTimeInput(initialDate));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setText(initialText);
    const d = initialDate instanceof Date && !isNaN(initialDate.getTime()) ? initialDate : new Date();
    setDate(formatDateInput(d));
    setTime(formatTimeInput(d));
  }, [initialText, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleAppendPreset = (presetText: string) => {
    setText(prev => (prev.trim() ? `${prev.trim()} ${presetText}` : presetText));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('Not alanı boş bırakılamaz.');
      return;
    }
    const fullDate = new Date(`${date}T${time}`);
    if (isNaN(fullDate.getTime())) {
      alert('Geçerli bir tarih ve saat seçin.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(text.trim(), fullDate);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Not kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">{title} — Not Kaydı</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Not Metni</label>
            <textarea
              rows={4}
              required
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Notunuzu buraya yazın..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 text-slate-800"
            />
          </div>

          {/* Quick preset buttons */}
          {presets.length > 0 && (
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Hazır Not Butonları:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {presets.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAppendPreset(p.metin)}
                    className="text-[11px] px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-full border border-teal-200/60 transition-colors"
                  >
                    + {p.metin}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Saat</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
