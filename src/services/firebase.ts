import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { Patient, Visit, EvaluationItem, FootMarkerSet, AntibioticRecord, DebridementRecord, PhotoRecord } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyAtcMuKzxv-WLGTJBj4rI_fv53vnLQn2PE",
  authDomain: "girisimselcagrisistemi.firebaseapp.com",
  projectId: "girisimselcagrisistemi",
  storageBucket: "girisimselcagrisistemi.firebasestorage.app",
  messagingSenderId: "589356533242",
  appId: "1:589356533242:web:a94da63af554aa41d31043",
  measurementId: "G-FB6P16220M"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// Helper: Ensure uppercase with Turkish locale
export function toTurkishUpper(str: string): string {
  if (!str) return '';
  return str.trim().toLocaleUpperCase('tr-TR');
}

export function formatDateTR(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
  const gun = String(date.getDate()).padStart(2, '0');
  const ay = String(date.getMonth() + 1).padStart(2, '0');
  const yil = date.getFullYear();
  return `${gun}.${ay}.${yil}`;
}

export function formatDateTimeTR(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
  const gun = String(date.getDate()).padStart(2, '0');
  const ay = String(date.getMonth() + 1).padStart(2, '0');
  const yil = date.getFullYear();
  const saat = String(date.getHours()).padStart(2, '0');
  const dakika = String(date.getMinutes()).padStart(2, '0');
  return `${gun}.${ay}.${yil} ${saat}:${dakika}`;
}

export function parseDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const match = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (match) {
      const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), match[4] ? Number(match[4]) : 0, match[5] ? Number(match[5]) : 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
