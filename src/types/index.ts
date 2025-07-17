export interface WeightEntry {
  id: number;
  weight: number;
  date: string;
  dateStr: string;
}

export interface PhotoEntry {
  id: number;
  type: 'fur' | 'poop';
  dataUrl: string;
  date: string;
  dateStr: string;
  timeStr: string;
}

export interface Settings {
  rabbitName: string;
  rabbitBreed: string;
  rabbitBirthday: string;
  openaiApiKey: string;
}

export interface RecentEntry {
  id: number;
  entryType: 'weight' | 'photo';
  date: string;
  dateStr: string;
  weight?: number;
  type?: 'fur' | 'poop';
}

export type Tab = 'home' | 'weight' | 'photos' | 'settings';

export interface HealthCheckOptions {
  checkWeight: boolean;
  checkFur: boolean;
  checkPoop: boolean;
  question: string;
}

export interface DatabaseStores {
  weights: WeightEntry[];
  photos: PhotoEntry[];
  settings: Settings;
}