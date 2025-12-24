
import React from 'react';
import { 
  Home, 
  ShoppingBag, 
  Coffee, 
  Car, 
  Heart, 
  Smartphone, 
  Gamepad2, 
  Briefcase, 
  Zap, 
  Plane,
  TrendingUp,
  Wallet,
  Tags
} from 'lucide-react';

export const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Housing', type: 'expense', icon: 'Home', color: '#6366f1' },
  { id: '2', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { id: '3', name: 'Food & Dining', type: 'expense', icon: 'Coffee', color: '#f59e0b' },
  { id: '4', name: 'Transport', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { id: '5', name: 'Health', type: 'expense', icon: 'Heart', color: '#ef4444' },
  { id: '6', name: 'Entertainment', type: 'expense', icon: 'Gamepad2', color: '#8b5cf6' },
  { id: '7', name: 'Utilities', type: 'expense', icon: 'Zap', color: '#10b981' },
  { id: '8', name: 'Travel', type: 'expense', icon: 'Plane', color: '#06b6d4' },
  { id: '9', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#22c55e' },
  { id: '10', name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#14b8a6' },
  { id: '11', name: 'Bonus', type: 'income', icon: 'Wallet', color: '#f97316' },
] as const;

export const ICON_MAP: Record<string, React.ElementType> = {
  Home, ShoppingBag, Coffee, Car, Heart, Smartphone, Gamepad2, Briefcase, Zap, Plane, TrendingUp, Wallet, Tags
};
