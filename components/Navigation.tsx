
import React from 'react';
import { LayoutDashboard, History, PiggyBank, Tags, BarChart3 } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'Activity', icon: History },
    { id: 'budgets', label: 'Budget', icon: PiggyBank },
    { id: 'annual', label: 'Yearly', icon: BarChart3 },
    { id: 'categories', label: 'Labels', icon: Tags },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 pt-3 pb-6 md:pb-3 z-50 md:top-0 md:bottom-auto md:h-screen md:w-24 md:flex-col md:border-t-0 md:border-r md:px-0 flex md:block safe-bottom shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex justify-between items-center w-full md:flex-col md:gap-10 md:mt-12 px-1 md:px-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 flex-1 md:flex-none relative group ${
                isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-transparent group-hover:bg-slate-50'}`}>
                {/* Fixed: Use className for responsive sizing instead of invalid sm:size prop */}
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {isActive && (
                <div className="hidden md:block absolute -right-[1px] top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
