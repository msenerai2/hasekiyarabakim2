export type WoundEtiology =
  | 'Diyabetik Ayak'
  | 'Basınç Yarası'
  | 'Venöz Ülser'
  | 'Arteriyel Ülser'
  | 'Cerrahi Yara'
  | 'Kronik Yara';

export interface Patient {
  id: string;
  adSoyad: string; // Hepsi BÜYÜK HARF
  tcNo?: string;
  basvuru: string;
  dogumTarihi?: string;
  cinsiyet?: 'Kadın' | 'Erkek' | '';
  sikayet: string[]; // Wound etiology tags
  oyku: string[];
  oykuEk?: string;
  olusturulmaZamani?: any;
}

export interface Visit {
  id: string;
  olusturulmaZamani?: any;
  zamanMs: number;
}

export interface EvaluationItem {
  id: string;
  metin: string;
  deger?: string;
  kategori?: string;
  aciklama?: string;
  olusturulmaZamani?: any;
  zamanMs?: number;
  tarih?: Date | null;
}

export interface FootMarker {
  xPx: number;
  yPx: number;
  x: number;
  y: number;
  boyut: number;
  renk: string;
  tarih?: string;
}

export interface FootMarkerSet {
  id: string;
  markerlar: FootMarker[];
  olusturulmaZamani?: any;
  sonDuzenleme?: any;
}

export interface AntibioticRecord {
  id: string;
  antibiyotikId?: string;
  antibiyotikAdi: string;
  doz?: string;
  siklik?: string;
  uygulamaYolu?: string;
  baslamaTarihi: string;
  bitisTarihi: string;
  baslamaNedeni?: string;
  kulturDurumu?: string;
  aciklama?: string;
  olusturulmaZamani?: any;
  tedaviZinciriId?: string;
  tedaviGrubuId?: string;
  tedaviGrubuTipi?: 'tekli' | 'kombinasyon';
  kombinasyonMu?: boolean;
  kombinasyonSira?: number;
  tedaviDegisikligi?: boolean;
  tedaviBasamakNo?: number;
  oncekiAntibiyotikAdi?: string;
  oncekiAntibiyotikKayitId?: string;
  oncekiAntibiyotikKayitIds?: string[];
  kullanimGunu?: number | null;
  hastaId?: string;
  adSoyad?: string;
  hastaSikayetleri?: string[];
  metin?: string;
}

export interface DebridementRecord {
  id: string;
  hastaId: string;
  adSoyad: string;
  zamanMs: number;
  tarihSaat?: any;
  olusturulmaZamani?: any;
  debridmanTuru: string;
  islemAdi?: string;
  planNotu?: string;
}

export interface PhotoRecord {
  id: string;
  url: string;
  olusturulmaZamani?: any;
  tarih?: Date | null;
}

export interface PresetNote {
  id: string;
  metin: string;
}

export interface PresetAntibiotic {
  id: string;
  ad: string;
  doz: string;
  siklik: string;
}
