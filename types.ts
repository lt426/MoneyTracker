
export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isRecurring?: boolean;
  recurringAmount?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  type: TransactionType;
  note: string;
  timestamp: string; // ISO String
}

export interface Budget {
  categoryId: string;
  amount: number;
}

export interface DateRange {
  from: string; // ISO Date
  to: string;   // ISO Date
}
