
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Bell, Trash2, LayoutDashboard, History, 
  PiggyBank, Tags, Database, Edit3, Calendar, 
  ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3, 
  ChevronLeft, ChevronRight, Wallet, ArrowRightLeft,
  Repeat, CheckCircle2, X, ScanLine, Camera, Upload, Loader2, Check, AlertCircle, ShoppingBag, ReceiptText, Sparkles, Receipt
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LabelList, Cell
} from 'recharts';

import { Transaction, Category, Budget, TransactionType, DateRange } from './types';
import { DEFAULT_CATEGORIES, ICON_MAP } from './constants';
import Navigation from './components/Navigation';
import AddTransactionModal from './components/AddTransactionModal';
import { processReceipt } from './services/geminiService';

interface OCRItem {
  amount: number;
  note: string;
  categoryId: string;
}

interface OCRResult {
  date: string;
  items: OCRItem[];
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
};

// Helper for DD-MM-YYYY formatting for display
const formatDateForUser = (isoString: string) => {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};

/**
 * SUB-COMPONENTS (Moved outside App to prevent remounting bugs)
 */

const DashboardPage = ({ totals, comparison, topExpenses, viewMonth, setViewMonth, viewYear, setViewYear, availableYears, setCustomRange, customRange }: any) => (
  <div className="space-y-6 pb-28 animate-in fade-in duration-500">
    <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-1">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Financial Hub</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
          {customRange ? "Filtering Custom Range" : `${new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
        </p>
      </div>
      
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200 shrink-0">
          <select 
            value={viewMonth} 
            onChange={(e) => setViewMonth(parseInt(e.target.value))}
            className="bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none appearance-none cursor-pointer"
          >
            {Array.from({length: 12}).map((_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('default', {month:'long'})}</option>
            ))}
          </select>
          <div className="w-[1px] bg-slate-100 mx-1"></div>
          <select 
            value={viewYear} 
            onChange={(e) => setViewYear(parseInt(e.target.value))}
            className="bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none appearance-none cursor-pointer"
          >
            {availableYears.map((y: number) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => {
            const from = prompt("From (YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
            const to = prompt("To (YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
            if (from && to) setCustomRange({ from, to });
          }}
          className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 shadow-sm shrink-0 transition-colors"
        >
          <Calendar size={18} />
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 group transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
           <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Wallet size={18} /></div>
           {comparison && (
             <div className={`flex items-center gap-1 text-[10px] font-black ${comparison.balance.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
               {comparison.balance.diff >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
               {Math.abs(comparison.balance.pct).toFixed(0)}%
             </div>
           )}
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Monthly Savings</p>
        <h2 className={`text-2xl sm:text-3xl font-black ${totals.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
          ${totals.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </h2>
      </div>

      <div className="bg-emerald-50/50 p-5 sm:p-6 rounded-[2rem] border border-emerald-100 transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><ArrowUpRight size={18} /></div>
          {comparison && (
             <div className={`flex items-center gap-1 text-[10px] font-black ${comparison.income.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
               {comparison.income.diff >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
               {Math.abs(comparison.income.pct).toFixed(0)}%
             </div>
           )}
        </div>
        <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-1">Income</p>
        <h2 className="text-2xl sm:text-3xl font-black text-emerald-900">+${totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
      </div>

      <div className="bg-rose-50/50 p-5 sm:p-6 rounded-[2rem] border border-rose-100 transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><ArrowDownRight size={18} /></div>
          {comparison && (
             <div className={`flex items-center gap-1 text-[10px] font-black ${comparison.expense.diff <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
               {comparison.expense.diff <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
               {Math.abs(comparison.expense.pct).toFixed(0)}%
             </div>
           )}
        </div>
        <p className="text-rose-600 text-[10px] font-bold uppercase tracking-widest mb-1">Expenses</p>
        <h2 className="text-2xl sm:text-3xl font-black text-rose-900">-${totals.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
      </div>
    </div>

    <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
        <TrendingUp size={20} className="text-indigo-500" />
        Top Spend Distribution
      </h3>
      <div className="h-[300px] sm:h-[400px] w-full">
        {topExpenses.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topExpenses} layout="vertical" margin={{ left: -20, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} 
                width={80} 
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                {topExpenses.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(val: number) => `$${val.toLocaleString()}`}
                  style={{ fill: '#334155', fontSize: 10, fontWeight: '800' }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <Database size={40} className="mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No records found</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ActivityPage = ({ filteredTransactions, categories, setEditingTransaction, setIsModalOpen, deleteTransaction }: any) => (
  <div className="space-y-4 pb-28 animate-in fade-in duration-500">
    <div className="flex justify-between items-center px-1">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Activity</h1>
      <div className="px-3 sm:px-4 py-1.5 bg-slate-200/50 rounded-full">
         <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">{filteredTransactions.length} items</p>
      </div>
    </div>
    <div className="space-y-3">
      {[...filteredTransactions].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(t => {
        const cat = categories.find((c: Category) => c.id === t.categoryId);
        const Icon = cat?.icon && ICON_MAP[cat.icon] ? ICON_MAP[cat.icon] : Tags;
        return (
          <div key={t.id} className="bg-white p-4 sm:p-5 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: cat?.color || '#cbd5e1' }}>
               <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">{cat?.name || 'Deleted Label'}</h4>
                  {t.note?.includes('Auto-post') && <Repeat size={12} className="text-indigo-500 shrink-0" />}
                </div>
                <span className={`text-base sm:text-xl font-black shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                <p className="italic truncate flex-1 mr-2 opacity-80">{t.note || 'Regular Transaction'}</p>
                <p className="shrink-0">{new Date(t.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingTransaction(t); setIsModalOpen(true); }} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
              <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-300 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
            </div>
          </div>
        );
      })}
      {filteredTransactions.length === 0 && (
        <div className="text-center py-20 sm:py-32 bg-white rounded-[2.5rem] sm:rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
             <History className="text-slate-200 w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-xs">No activity found for this month</p>
        </div>
      )}
    </div>
  </div>
);

const OCRPage = ({ ocrLoading, ocrResult, setOcrResult, setOcrLoading, categories, setActiveTab, addOrUpdateTransaction, setViewMonth, setViewYear, showNotification }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setOcrLoading(true);
      try {
        const result: OCRResult = await processReceipt(base64, file.type, categories.filter((c: Category) => c.type === 'expense'));
        if (result.date && result.date.length > 10) {
          result.date = result.date.split('T')[0];
        }
        if (!result.date) {
          result.date = new Date().toISOString().split('T')[0];
        }
        if (!result.items) {
           result.items = [];
        }
        setOcrResult(result);
      } catch (err: any) {
        showNotification(err.message, 'warn');
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmOcr = () => {
    if (!ocrResult?.items) return;
    
    const targetDate = ocrResult.date || new Date().toISOString().split('T')[0];
    
    ocrResult.items.forEach((item: OCRItem) => {
      addOrUpdateTransaction(
        item.amount || 0, 
        item.categoryId, 
        'expense', 
        item.note || 'Scanned Item', 
        targetDate
      );
    });

    setOcrResult(null);
    const addedDate = new Date(targetDate);
    if (!isNaN(addedDate.getTime())) {
      setViewMonth(addedDate.getMonth());
      setViewYear(addedDate.getFullYear());
    }
    setActiveTab('transactions');
    showNotification(`Successfully posted ${ocrResult.items.length} records!`, 'info');
  };

  const updateItem = (index: number, updates: Partial<OCRItem>) => {
    if (!ocrResult?.items) return;
    const newItems = [...ocrResult.items];
    if (newItems[index]) {
       newItems[index] = { ...newItems[index], ...updates };
       setOcrResult({ ...ocrResult, items: newItems });
    }
  };

  const removeItem = (index: number) => {
    if (!ocrResult?.items) return;
    const newItems = ocrResult.items.filter((_: any, i: number) => i !== index);
    setOcrResult({ ...ocrResult, items: newItems });
  };

  const addManualItem = () => {
    if (!ocrResult) return;
    const currentItems = ocrResult.items || [];
    setOcrResult({
      ...ocrResult, 
      items: [...currentItems, { amount: 0, note: 'New item', categoryId: categories.filter((c: Category) => c.type === 'expense')[0]?.id || '1' }]
    });
  };

  const totalDetected = ocrResult?.items?.reduce((sum: number, i: OCRItem) => sum + (i.amount || 0), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center space-y-2">
        <div className="inline-flex p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-2">
          <ScanLine size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Receipt Scanner</h1>
        <p className="text-slate-500 font-semibold text-sm">Instant itemization powered by Gemini AI</p>
      </header>

      {!ocrResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div 
            onClick={() => !ocrLoading && fileInputRef.current?.click()}
            className={`lg:col-span-3 group relative cursor-pointer bg-white border-4 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center gap-6 transition-all min-h-[450px] shadow-sm hover:shadow-xl hover:scale-[1.01] active:scale-95 ${ocrLoading ? 'border-indigo-200 pointer-events-none' : 'border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/10'}`}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            
            {ocrLoading ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                </div>
                <div className="text-center animate-pulse">
                  <h3 className="text-xl font-black text-slate-800">Reading Receipt...</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Extracting prices and dates</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-28 h-28 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-2xl shadow-indigo-100">
                  <Camera size={48} strokeWidth={2} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-800">Drop or Tap to Scan</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Supports JPG, PNG, and WebP</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-tighter">Auto-Split</div>
                  <div className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-tighter">Category Smart-Match</div>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white h-full flex flex-col justify-between overflow-hidden relative shadow-2xl">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600 rounded-full blur-3xl opacity-20"></div>
              <div className="space-y-6 relative z-10">
                 <div className="p-3 bg-white/10 rounded-2xl w-fit text-indigo-300"><Sparkles size={24} /></div>
                 <h3 className="text-2xl font-black leading-tight">Effortless Itemization</h3>
                 <p className="text-slate-400 text-sm font-semibold leading-relaxed">Scan any receipt and our AI will automatically detect individual items, prices, and categories for you.</p>
                 <ul className="space-y-4">
                   {['Bulk add with one tap', 'Editable line items', 'No manual typing'].map(t => (
                     <li key={t} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-indigo-100">
                       <div className="p-1 bg-indigo-500/30 rounded-lg"><Check size={12} /></div>
                       {t}
                     </li>
                   ))}
                 </ul>
            </div>
              <div className="pt-8 mt-auto border-t border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
                Powered by Gemini 3.0 Flash
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Receipt Info Panel */}
            <div className="md:w-1/3 space-y-4">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm sticky top-10 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Review Scan</h3>
                  <button onClick={() => setOcrResult(null)} className="text-slate-400 hover:text-rose-500"><X size={20}/></button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Detected Date</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                        <Calendar size={16} />
                      </div>
                      <div className="flex flex-col">
                         <input 
                           type="date" 
                           value={ocrResult.date} 
                           onChange={(e) => setOcrResult({...ocrResult, date: e.target.value})}
                           className="w-full pl-14 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                         />
                         <p className="mt-1 text-center text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">
                           Selected: {formatDateForUser(ocrResult.date)}
                         </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100 flex flex-col items-center">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Total Verified</p>
                    <h4 className="text-4xl font-black tracking-tight">${totalDetected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button 
                      onClick={handleConfirmOcr}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Add All
                    </button>
                    <button 
                      onClick={() => setOcrResult(null)}
                      className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-colors"
                    >
                      Discard Scan
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Breakdown List */}
            <div className="md:w-2/3 space-y-4">
              <div className="flex justify-between items-center px-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Line Items ({ocrResult.items.length})</h4>
                <button onClick={addManualItem} className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors">
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div className="space-y-3">
                {ocrResult.items.map((item: OCRItem, idx: number) => (
                  <div 
                    key={idx} 
                    className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-md hover:border-indigo-100 transition-all animate-in slide-in-from-right duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 sm:col-span-3">
                         <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1 px-1">Price</label>
                         <div className="relative">
                           <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">$</span>
                           <input 
                             type="number" 
                             step="0.01"
                             value={item.amount || ''} 
                             onChange={(e) => updateItem(idx, { amount: parseFloat(e.target.value) || 0 })}
                             className="w-full bg-slate-50 border-none rounded-xl pl-7 pr-2 py-3 text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                           />
                         </div>
                      </div>

                      <div className="col-span-7 sm:col-span-4">
                         <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1 px-1">Description</label>
                         <input 
                           type="text" 
                           value={item.note || ''} 
                           onChange={(e) => updateItem(idx, { note: e.target.value })}
                           className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                           placeholder="What was this?"
                         />
                      </div>

                      <div className="col-span-10 sm:col-span-4">
                         <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1 px-1">Category</label>
                         <div className="relative">
                           <select 
                             value={item.categoryId || ''} 
                             onChange={(e) => updateItem(idx, { categoryId: e.target.value })}
                             className="w-full bg-slate-50 border-none rounded-xl pl-4 pr-8 py-3 text-xs font-black text-slate-600 appearance-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                           >
                              {categories.filter((c: Category) => c.type === 'expense').map((c: Category) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                           </select>
                           <Tags className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={12} />
                         </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex items-end justify-end">
                         <button 
                           onClick={() => removeItem(idx)} 
                           className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}

                {ocrResult.items.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                    <ReceiptText className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No items found. Add one manually!</p>
                    <button onClick={addManualItem} className="mt-4 px-6 py-2 bg-white border border-slate-200 text-slate-600 font-black text-[10px] rounded-full uppercase hover:bg-slate-50 transition-colors">
                      Add Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BudgetsPage = ({ categories, filteredTransactions, budgets, setBudget }: any) => {
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const expenseCategories = categories.filter((c: Category) => c.type === 'expense');

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      <header className="px-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Budget Tracker</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">Manage your monthly spending caps.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {expenseCategories.map(cat => {
          const budget = budgets.find((b: Budget) => b.categoryId === cat.id);
          const spent = filteredTransactions.filter((t: Transaction) => t.categoryId === cat.id).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
          const percentage = budget ? Math.min((spent / budget.amount) * 100, 100) : 0;
          const isOver = budget && spent > budget.amount;

          return (
            <div key={cat.id} className={`bg-white p-6 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border transition-all hover:shadow-md ${isOver ? 'border-rose-200' : 'border-slate-100'}`}>
              <div className="flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{backgroundColor: cat.color}}>
                  <PiggyBank className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-base sm:text-lg truncate">{cat.name}</h4>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limit</p>
                </div>
                {editingBudgetId === cat.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-20 sm:w-24 px-1 py-1 border-b-2 border-indigo-600 text-right font-black text-base sm:text-lg bg-transparent" autoFocus />
                    <button onClick={() => { const val = parseFloat(editAmount); if (!isNaN(val)) setBudget(cat.id, val); setEditingBudgetId(null); }} className="bg-indigo-600 text-white p-1.5 rounded-lg"><Plus size={16}/></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingBudgetId(cat.id); setEditAmount(budget?.amount.toString() || '0'); }} className="text-indigo-600 font-black text-lg sm:text-2xl hover:scale-105 transition-transform">
                     ${budget?.amount.toLocaleString() || '0'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-slate-400">Spent: ${spent.toLocaleString()}</span>
                  <span className={`font-black text-xs sm:text-sm ${isOver ? 'text-rose-500' : 'text-slate-900'}`}>{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-3 sm:h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                  <div className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${percentage}%` }} />
                </div>
                {isOver && (
                  <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest flex items-center gap-1">
                    Over by ${(spent - (budget?.amount || 0)).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CategoriesPage = ({ categories, addOrUpdateCategory, deleteCategory }: any) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#6366f1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
    setIsRecurring(!!cat.isRecurring);
    setRecurringAmount(cat.recurringAmount?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingCategoryId(null);
    setName('');
    setType('expense');
    setColor('#6366f1');
    setIsRecurring(false);
    setRecurringAmount('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 animate-in fade-in duration-500">
      <header className="px-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Category Lab</h1>
        <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">Manage labels and fixed commitments.</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 relative">
        <div className="flex justify-between items-center">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {editingCategoryId ? 'Update Segment' : 'Create New'}
           </h3>
           {editingCategoryId && (
             <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[9px] font-black uppercase">
               <X size={12} /> Cancel
             </button>
           )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Fix-Commitment" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500">
             <option value="expense">Expense Label</option>
             <option value="income">Income Label</option>
          </select>
          
          <div className="flex gap-3">
            <div className="relative group flex-1">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-full bg-transparent border-none p-0 cursor-pointer rounded-xl overflow-hidden min-h-[48px]" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white text-[9px] font-black uppercase opacity-60">Color</div>
            </div>
            <button 
              onClick={() => { if (name) { addOrUpdateCategory(editingCategoryId, name, type, color, isRecurring, parseFloat(recurringAmount) || 0); resetForm(); } }} 
              className="px-6 sm:px-8 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              {editingCategoryId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
               <input 
                 type="checkbox" 
                 checked={isRecurring} 
                 onChange={(e) => setIsRecurring(e.target.checked)}
                 className="opacity-0 w-0 h-0" 
                 id="recurring-toggle"
               />
               <label 
                 htmlFor="recurring-toggle" 
                 className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${isRecurring ? 'bg-indigo-600' : 'bg-slate-200'}`}
               >
                 <span className={`absolute left-0.5 bottom-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${isRecurring ? 'translate-x-5' : ''}`}></span>
               </label>
             </div>
             <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Repeat size={12} className="text-indigo-500"/> Fixed Commitment</span>
          </div>

          {isRecurring && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
              <span className="text-slate-400 text-[10px] font-bold uppercase">$ Amount</span>
              <input 
                type="number" 
                value={recurringAmount} 
                onChange={(e) => setRecurringAmount(e.target.value)} 
                placeholder="150"
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-black w-24 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {categories.map((cat: Category) => {
          const Icon = ICON_MAP[cat.icon] || Tags;
          const isEditing = editingCategoryId === cat.id;
          return (
            <div key={cat.id} className="relative group">
              <button 
                onClick={() => handleEditCategory(cat)}
                className={`w-full bg-white p-4 sm:p-5 rounded-[1.8rem] sm:rounded-[2rem] border transition-all relative text-left ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-500 shadow-lg' : 'border-slate-100 shadow-sm hover:shadow-md'}`}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 mb-2 sm:mb-3 mx-auto" style={{ backgroundColor: cat.color }}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
                </div>
                {cat.isRecurring && (
                  <div className="absolute top-2 right-2 p-1 bg-indigo-50 text-indigo-600 rounded-full">
                    <CheckCircle2 size={12} />
                  </div>
                )}
                <div className="text-center">
                  <h4 className="font-black text-slate-800 text-[10px] sm:text-xs truncate w-full">{cat.name}</h4>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                    {cat.type} {cat.isRecurring ? `• $${cat.recurringAmount}` : ''}
                  </p>
                </div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                className="absolute -top-1 -right-1 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnnualReport = ({ transactions, selectedYear, setSelectedYear }: any) => {
  const monthsData = useMemo(() => {
    return Array.from({length: 12}).map((_, monthIndex) => {
      const monthTransactions = transactions.filter((t: Transaction) => {
        const d = new Date(t.timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
      });
      const income = monthTransactions.filter((t: Transaction) => t.type === 'income').reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const expense = monthTransactions.filter((t: Transaction) => t.type === 'expense').reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      return {
        month: new Date(0, monthIndex).toLocaleString('default', { month: 'short' }),
        income,
        expense,
        savings: income - expense
      };
    });
  }, [transactions, selectedYear]);

  const yearTotals = useMemo(() => {
    const inc = monthsData.reduce((sum, m) => sum + m.income, 0);
    const exp = monthsData.reduce((sum, m) => sum + m.expense, 0);
    return { income: inc, expense: exp, savings: inc - exp };
  }, [monthsData]);

  return (
    <div className="space-y-6 pb-28 animate-in slide-in-from-right-10 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Yearly Insight</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">Full financial performance for {selectedYear}</p>
        </div>
        <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200 self-end sm:self-auto">
          <button onClick={() => setSelectedYear((y: number) => y-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={18}/></button>
          <span className="px-4 sm:px-6 font-black text-slate-700 text-xs sm:text-sm">{selectedYear}</span>
          <button onClick={() => setSelectedYear((y: number) => y+1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={18}/></button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 sm:p-6 rounded-[2rem] text-white shadow-xl">
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Year Savings</p>
           <h2 className="text-2xl sm:text-3xl font-black">${yearTotals.savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
           <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-1">Total Income</p>
           <h2 className="text-2xl sm:text-3xl font-black text-slate-900">${yearTotals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
           <p className="text-rose-600 text-[10px] font-bold uppercase tracking-widest mb-1">Total Expenses</p>
           <h2 className="text-2xl sm:text-3xl font-black text-slate-900">${yearTotals.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
         <div className="overflow-x-auto no-scrollbar">
           <table className="w-full text-left text-sm min-w-[300px]">
             <thead className="bg-slate-50/50 border-b border-slate-100">
               <tr>
                 <th className="px-6 sm:px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Month</th>
                 <th className="px-6 sm:px-8 py-4 font-bold text-emerald-600 text-[10px] uppercase tracking-widest">Income</th>
                 <th className="px-6 sm:px-8 py-4 font-bold text-rose-600 text-[10px] uppercase tracking-widest text-right">Expenses</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {monthsData.map(m => (
                 <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 sm:px-8 py-4 font-black text-slate-700">{m.month}</td>
                   <td className="px-6 sm:px-8 py-4 text-emerald-600 font-bold">${m.income.toLocaleString()}</td>
                   <td className="px-6 sm:px-8 py-4 text-rose-500 font-bold text-right">-${m.expense.toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};

/**
 * MAIN APP
 */

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('zen_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('zen_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('zen_budgets');
    const defaults = DEFAULT_CATEGORIES.filter(c => c.type === 'expense').map(c => ({ categoryId: c.id, amount: 500 }));
    return saved ? JSON.parse(saved) : defaults;
  });
  const [processedMonths, setProcessedMonths] = useState<string[]>(() => {
    const saved = localStorage.getItem('zen_processed_months');
    return saved ? JSON.parse(saved) : [];
  });

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth()); 
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedAnnualYear, setSelectedAnnualYear] = useState(now.getFullYear());
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [notification, setNotification] = useState<{message: string; type: 'info' | 'warn'} | null>(null);

  // OCR Related States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  useEffect(() => { localStorage.setItem('zen_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('zen_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('zen_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('zen_processed_months', JSON.stringify(processedMonths)); }, [processedMonths]);

  useEffect(() => {
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    if (!processedMonths.includes(currentMonthKey)) {
      const recurringCategories = categories.filter(c => c.isRecurring && (c.recurringAmount || 0) > 0);
      
      if (recurringCategories.length > 0) {
        const newTransactions: Transaction[] = recurringCategories.map(cat => ({
          id: generateId(),
          amount: cat.recurringAmount || 0,
          categoryId: cat.id,
          type: cat.type,
          note: `Auto-post: ${cat.name} Commitment`,
          timestamp: new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0).toISOString()
        }));

        setTransactions(prev => [...newTransactions, ...prev]);
        setProcessedMonths(prev => [...prev, currentMonthKey]);
        showNotification(`Posted ${newTransactions.length} monthly recurring commitments`, 'info');
      } else {
        setProcessedMonths(prev => [...prev, currentMonthKey]);
      }
    }
  }, [categories, processedMonths]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.timestamp);
      if (customRange) {
        return d >= new Date(customRange.from) && d <= new Date(customRange.to);
      }
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
  }, [transactions, viewMonth, viewYear, customRange]);

  const totals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const comparison = useMemo(() => {
    if (customRange) return null;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    
    const prevT = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const prevIncome = prevT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevBalance = prevIncome - prevExpense;

    const calcDiff = (curr: number, prev: number) => {
      const diff = curr - prev;
      const pct = prev === 0 ? (curr > 0 ? 100 : 0) : (diff / Math.abs(prev)) * 100;
      return { diff, pct };
    };

    return {
      income: calcDiff(totals.income, prevIncome),
      expense: calcDiff(totals.expense, prevExpense),
      balance: calcDiff(totals.balance, prevBalance)
    };
  }, [transactions, totals, viewMonth, viewYear, customRange]);

  const topExpenses = useMemo(() => {
    const map: Record<string, { total: number; color: string }> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Deleted Label';
      const color = cat?.color || '#cbd5e1';
      if (!map[name]) map[name] = { total: 0, color };
      map[name].total += t.amount;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, value: parseFloat(data.total.toFixed(2)), color: data.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredTransactions, categories]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const transactionYears = transactions.map(t => new Date(t.timestamp).getFullYear());
    const minYear = Math.min(currentYear - 1, ...transactionYears);
    const maxYear = Math.max(currentYear + 2, ...transactionYears);
    const years = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [transactions]);

  const showNotification = (message: string, type: 'info' | 'warn') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const addOrUpdateTransaction = (amount: number, categoryId: string, type: TransactionType, note: string, dateOverride?: string) => {
    let timestamp = dateOverride || new Date().toISOString();
    
    if (dateOverride && !dateOverride.includes('T')) {
      const d = new Date(`${dateOverride}T12:00:00`);
      if (!isNaN(d.getTime())) {
        timestamp = d.toISOString();
      } else {
        timestamp = new Date().toISOString(); 
      }
    }

    if (type === 'expense') {
      const budget = budgets.find(b => b.categoryId === categoryId);
      if (budget) {
        const txDate = new Date(timestamp);
        const month = txDate.getMonth();
        const year = txDate.getFullYear();
        
        const spentThisMonth = transactions
          .filter(t => 
            t.type === 'expense' && 
            t.categoryId === categoryId && 
            new Date(t.timestamp).getMonth() === month &&
            new Date(t.timestamp).getFullYear() === year &&
            t.id !== (editingTransaction?.id || '')
          )
          .reduce((sum, t) => sum + t.amount, 0);

        if (spentThisMonth + amount > budget.amount) {
          setTimeout(() => showNotification(`Warning: Budget exceeded for ${categories.find(c => c.id === categoryId)?.name}!`, 'warn'), 500);
        }
      }
    }

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id 
        ? { ...t, amount, categoryId, type, note, timestamp } 
        : t
      ));
      setEditingTransaction(null);
      showNotification("Record updated", "info");
    } else {
      const newTransaction: Transaction = {
        id: generateId(),
        amount, categoryId, type, note, timestamp
      };
      setTransactions(prev => [newTransaction, ...prev]);
      showNotification("Record added", "info");
    }
    setIsModalOpen(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showNotification("Record deleted", "info");
  };

  const deleteCategory = (id: string) => {
    if (confirm("Are you sure? Existing transactions using this label will remain, but the label will be removed from your list.")) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setBudgets(prev => prev.filter(b => b.categoryId !== id));
      showNotification("Label removed", "info");
    }
  };

  const setBudget = (categoryId: string, amount: number) => {
    setBudgets(prev => {
      const existing = prev.find(b => b.categoryId === categoryId);
      if (existing) return prev.map(b => b.categoryId === categoryId ? { ...b, amount } : b);
      return [...prev, { categoryId, amount }];
    });
    showNotification("Budget updated", "info");
  };

  const addOrUpdateCategory = (id: string | null, name: string, type: TransactionType, color: string, isRecurring?: boolean, recurringAmount?: number) => {
    if (id) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name, type, color, isRecurring, recurringAmount } : c));
      showNotification("Label updated", "info");
    } else {
      const newId = Math.random().toString(36).substring(2, 9);
      const newCat: Category = { id: newId, name, type, color, icon: 'Tags', isRecurring, recurringAmount };
      setCategories(prev => [...prev, newCat]);
      showNotification("Label created", "info");
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 custom-scrollbar overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {notification && (
        <div className={`fixed top-4 left-4 right-4 z-[200] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 duration-300 border-2 max-w-md mx-auto ${notification.type === 'warn' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-slate-700 text-white'}`}>
          <div className="p-1.5 bg-white/10 rounded-lg shrink-0"><Bell size={18} className={notification.type === 'warn' ? 'animate-pulse' : ''} /></div>
          <span className="font-bold text-xs sm:text-sm tracking-tight">{notification.message}</span>
        </div>
      )}
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-4 md:pl-28 md:pr-12 md:py-10 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardPage 
              totals={totals} 
              comparison={comparison} 
              topExpenses={topExpenses} 
              viewMonth={viewMonth} 
              setViewMonth={setViewMonth} 
              viewYear={viewYear} 
              setViewYear={setViewYear} 
              availableYears={availableYears} 
              setCustomRange={setCustomRange} 
              customRange={customRange} 
            />
          )}
          {activeTab === 'transactions' && (
            <ActivityPage 
              filteredTransactions={filteredTransactions} 
              categories={categories} 
              setEditingTransaction={setEditingTransaction} 
              setIsModalOpen={setIsModalOpen} 
              deleteTransaction={deleteTransaction} 
            />
          )}
          {activeTab === 'ocr' && (
            <OCRPage 
              ocrLoading={ocrLoading} 
              setOcrLoading={setOcrLoading} 
              ocrResult={ocrResult} 
              setOcrResult={setOcrResult} 
              categories={categories} 
              setActiveTab={setActiveTab} 
              addOrUpdateTransaction={addOrUpdateTransaction} 
              setViewMonth={setViewMonth} 
              setViewYear={setViewYear} 
              showNotification={showNotification} 
            />
          )}
          {activeTab === 'budgets' && (
            <BudgetsPage 
              categories={categories} 
              filteredTransactions={filteredTransactions} 
              budgets={budgets} 
              setBudget={setBudget} 
            />
          )}
          {activeTab === 'annual' && (
            <AnnualReport 
              transactions={transactions} 
              selectedYear={selectedAnnualYear} 
              setSelectedYear={setSelectedAnnualYear} 
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesPage 
              categories={categories} 
              addOrUpdateCategory={addOrUpdateCategory} 
              deleteCategory={deleteCategory} 
            />
          )}
        </main>
      </div>
      
      <button 
        onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} 
        className="fixed bottom-24 right-5 md:bottom-12 md:right-12 bg-indigo-600 text-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-2xl hover:scale-110 active:scale-90 transition-all z-[60] border-4 border-white group"
        aria-label="Add transaction"
      >
        <Plus strokeWidth={3} className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-90 transition-transform" />
      </button>

      {isModalOpen && (
        <AddTransactionModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} 
          categories={categories} 
          editingTransaction={editingTransaction}
          onAdd={addOrUpdateTransaction} 
        />
      )}
    </div>
  );
};

export default App;
