
export interface RecurringItem {
  id: string;
  name: string;
  value: number;
  category: string;
  day: number;
  type: 'expense' | 'income';
}

export interface OnboardingData {
  // Step 1: Profile
  goal: string;
  income: string;
  startDay: number; // 1-28
  
  // Step 2: Categories & Budgets
  categories: string[];
  budgets: Record<string, string>; // Category -> Value
  reservePercent: number; // 0-30

  // Step 3: Recurring
  recurringItems: RecurringItem[];

  // Step 4: Preferences
  useExampleData: boolean;
  includeDebts: boolean;
  includeInvestments: boolean;
  theme: 'Green' | 'Blue' | 'Purple' | 'Neutral';
  
  fileName: string;
}

export enum ViewState {
  LANDING = 'LANDING',
  WIZARD = 'WIZARD',
  GENERATING = 'GENERATING',
  VIEWER = 'VIEWER',
  PRICING = 'PRICING',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  isLoggedIn: boolean;
}

export interface GeneratedAsset {
  excelBlob: Blob;
  validation: {
    isValid: boolean;
    message: string;
  };
}
