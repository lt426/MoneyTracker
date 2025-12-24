
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Category, TransactionType, Transaction } from '../types';
import { ICON_MAP } from '../constants';

interface AddTransactionModalProps {
  categories: Category[];
  isOpen: boolean;
  editingTransaction?: Transaction | null;
  onClose: () => void;
  onAdd: (amount: number, categoryId: string, type: TransactionType, note: string, dateOverride?: string) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ categories, isOpen, onClose, onAdd, editingTransaction }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.categoryId);
      setNote(editingTransaction.note);
      setDate(editingTransaction.timestamp.split('T')[0]);
    } else {
      setType('expense');
      setAmount('');
      setCategoryId('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingTransaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || !categoryId) return;
    
    let timestamp = new Date().toISOString();
    if (date) {
      timestamp = new Date(`${date}T12:00:00Z`).toISOString();
    }

    onAdd(numAmount, categoryId, type, note, timestamp);
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 pb-safe">
        <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{editingTransaction ? 'Edit Entry' : 'New Entry'}</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] sm:max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
                type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Minus size={16} />
              <span className="font-black text-xs uppercase tracking-wider">Expense</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
                type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Plus size={16} />
              <span className="font-black text-xs uppercase tracking-wider">Income</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Amount</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-5 py-5 bg-slate-50 border-none rounded-2xl text-2xl font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 appearance-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl text-base font-black text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredCategories.map(cat => {
                const Icon = ICON_MAP[cat.icon] || ICON_MAP.Tags;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${
                      categoryId === cat.id 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.color }}><Icon size={18} /></div>
                    <span className="text-[9px] font-black text-slate-600 truncate w-full text-center uppercase tracking-tighter">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details..."
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={!amount || !categoryId}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-base uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30 shadow-xl shadow-slate-100 mt-2 active:scale-95"
          >
            {editingTransaction ? 'Save Changes' : 'Post Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
