import React, { useState } from 'react';
import { Settings, X, Plus, Trash2, GripVertical } from 'lucide-react';
import { PresetNote, PresetAntibiotic } from '../types';

interface PresetNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetData: Record<string, PresetNote[]>;
  antibioticPresets: PresetAntibiotic[];
  onSavePresets: (newPresets: Record<string, PresetNote[]>, newAntibiotics: PresetAntibiotic[]) => Promise<void>;
}

export const PresetNotesModal: React.FC<PresetNotesModalProps> = ({
  isOpen,
  onClose,
  presetData,
  antibioticPresets,
  onSavePresets
}) => {
  const sections = [
    { key: 'laboratuvar', label: 'Laboratuvar' },
    { key: 'yaraOzellikleri', label: 'Yara Özellikleri' },
    { key: 'tedaviOzgecmisi', label: 'Tedavi Özgeçmişi' },
    { key: 'aki', label: 'AKİ' },
    { key: 'kultur', label: 'Kültür / Antibiyotik' },
    { key: 'goruntuleme', label: 'Görüntüleme Bulguları' },
    { key: 'plan', label: 'Tedavi Planı' },
    { key: 'antibiyotikler', label: 'Antibiyotik Listesi' }
  ];

  const [activeTab, setActiveTab] = useState('laboratuvar');
  const [localPresets, setLocalPresets] = useState<Record<string, PresetNote[]>>(presetData);
  const [localAntibiotics, setLocalAntibiotics] = useState<PresetAntibiotic[]>(antibioticPresets);
  const [newText, setNewText] = useState('');

  // Antibiotic form fields
  const [abName, setAbName] = useState('');
  const [abDose, setAbDose] = useState('');
  const [abFreq, setAbFreq] = useState('');

  if (!isOpen) return null;

  const handleAddNotePreset = () => {
    if (!newText.trim()) return;
    const item: PresetNote = {
      id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6),
      metin: newText.trim()
    };
    const currentList = localPresets[activeTab] || [];
    const updated = {
      ...localPresets,
      [activeTab]: [...currentList, item]
    };
    setLocalPresets(updated);
    setNewText('');
    onSavePresets(updated, localAntibiotics);
  };

  const handleDeleteNotePreset = (id: string) => {
    const currentList = localPresets[activeTab] || [];
    const updated = {
      ...localPresets,
      [activeTab]: currentList.filter(x => x.id !== id)
    };
    setLocalPresets(updated);
    onSavePresets(updated, localAntibiotics);
  };

  const handleAddAntibiotic = () => {
    if (!abName.trim()) return;
    const item: PresetAntibiotic = {
      id: 'ab_' + Date.now(),
      ad: abName.trim(),
      doz: abDose.trim() || '500 mg',
      siklik: abFreq.trim() || '2x1'
    };
    const updated = [...localAntibiotics, item];
    setLocalAntibiotics(updated);
    setAbName('');
    setAbDose('');
    setAbFreq('');
    onSavePresets(localPresets, updated);
  };

  const handleDeleteAntibiotic = (id: string) => {
    const updated = localAntibiotics.filter(x => x.id !== id);
    setLocalAntibiotics(updated);
    onSavePresets(localPresets, updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Hazır Not & Antibiyotik Butonları Ayarları</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-1 p-3 border-b border-slate-200 bg-slate-100/60 shrink-0">
          {sections.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveTab(s.key)}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === s.key
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab !== 'antibiyotikler' ? (
            <>
              {/* Add new button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNotePreset()}
                  placeholder="Yeni hazır not metni yazın ve Enter'a basın..."
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                />
                <button
                  type="button"
                  onClick={handleAddNotePreset}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-colors shrink-0"
                >
                  Ekle
                </button>
              </div>

              {/* List */}
              <div className="space-y-1.5">
                {(localPresets[activeTab] || []).length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Bu başlık için henüz hazır not butonu tanımlanmamış.
                  </div>
                ) : (
                  (localPresets[activeTab] || []).map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg group"
                    >
                      <span className="text-slate-800 font-medium">{item.metin}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotePreset(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Add new antibiotic */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Yeni Hazır Antibiyotik Ekle:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={abName}
                    onChange={e => setAbName(e.target.value)}
                    placeholder="İlaç Adı"
                    className="px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                  />
                  <input
                    type="text"
                    value={abDose}
                    onChange={e => setAbDose(e.target.value)}
                    placeholder="Doz (Örn. 1 g)"
                    className="px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                  />
                  <input
                    type="text"
                    value={abFreq}
                    onChange={e => setAbFreq(e.target.value)}
                    placeholder="Sıklık (Örn. 2x1)"
                    className="px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAntibiotic}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs"
                  >
                    Antibiyotiği Kaydet
                  </button>
                </div>
              </div>

              {/* Antibiotics List */}
              <div className="space-y-1.5">
                {localAntibiotics.map(ab => (
                  <div
                    key={ab.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{ab.ad}</span>
                      <span className="text-[11px] text-slate-500 ml-2 font-mono">
                        {ab.doz} · {ab.siklik}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAntibiotic(ab.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 text-xs">
          <span className="text-[10px] text-slate-400">
            Değişiklikler anında Firestore veritabanına ve yerel belleğe senkronize edilir.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
