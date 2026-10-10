import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import {
  Plus,
  Trash2,
  CheckCircle,
  Check,
  Calendar,
  User,
  Coins,
  Percent,
  Calculator,
  ChevronRight,
  TrendingUp,
  Info,
  DollarSign,
  ArrowRight,
  Clock,
  HandCoins,
  Receipt,
  Building2,
  Banknote
} from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Progress } from '../../components/ui/Progress.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

import { lentService } from '../../services/lent.js';
import { categoryService } from '../../services/categories.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { MobileDetailDrawer } from '../../components/mobile/MobileDetailDrawer.jsx';
import { PaymentTimelineFeed } from '../../components/mobile/PaymentTimelineFeed.jsx';
import { MoneyValue } from '../../lib/format.js';

export default function Lent() {
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'settled'
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState(null);
  
  // Modals & Dialogs
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null); // stores lent record id to delete
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add Lent Record Form State
  const [formData, setFormData] = useState({
    borrower_name: '',
    principal_amount: '',
    interest_rate_type: 'percentage', // 'percentage' or 'rupees_per_amount'
    interest_rate_val: '',
    interest_rate_basis: '100', // default basis for rupees rate
    interest_frequency: 'monthly', // 'monthly' or 'yearly'
    interest_type: 'simple', // 'simple' or 'compound'
    lent_at: new Date().toISOString().split('T')[0],
    due_date: '',
    category_id: '',
    payment_source: 'bank', // 'bank' or 'cash'
    track_in_transactions: true,
    notes: ''
  });

  // Repayment Form State
  const [repayData, setRepayData] = useState({
    amount: '',
    notes: ''
  });

  useEffect(() => {
    loadRecords();
    loadCategories();
  }, [activeTab]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await lentService.getAll(activeTab);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load lent records', err);
      toast.error('Failed to load lent records list');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchRecordDetails = async (id) => {
    try {
      const data = await lentService.getById(id);
      setSelectedDetails(data);
    } catch (err) {
      console.error('Failed to load details', err);
      toast.error('Failed to load detailed lent status');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        borrower_name: formData.borrower_name,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate_type: formData.interest_rate_type,
        interest_rate_val: parseFloat(formData.interest_rate_val),
        interest_rate_basis: formData.interest_rate_type === 'rupees_per_amount' ? parseFloat(formData.interest_rate_basis) : 100.0,
        interest_frequency: formData.interest_frequency,
        interest_type: formData.interest_type,
        lent_at: formData.lent_at,
        due_date: formData.due_date || null,
        category_id: formData.category_id || null,
        payment_source: formData.payment_source || 'bank',
        track_in_transactions: formData.payment_source === 'cash' ? false : formData.track_in_transactions,
        notes: formData.notes || null
      };

      await lentService.create(payload);
      toast.success('Lending profile created successfully');
      setShowAddModal(false);
      resetForm();
      loadRecords();
    } catch (err) {
      console.error('Failed to create lending record', err);
      toast.error('Failed to create lending record. Please verify input data.');
    }
  };

  const handleDelete = async () => {
    const id = showDeleteDialog;
    if (!id) return;
    
    // Optimistic Update
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedDetails?.lent_record?.id === id) {
      setSelectedDetails(null);
    }
    setShowDeleteDialog(null);

    try {
      await lentService.delete(id);
      toast.success('Lending profile deleted successfully');
    } catch (err) {
      console.error('Failed to delete profile', err);
      toast.error('Failed to delete lending profile. Reverting...');
      loadRecords();
    }
  };

  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedDetails) return;
    try {
      const amountVal = parseFloat(repayData.amount);
      await lentService.repay(
        selectedDetails.lent_record.id,
        amountVal,
        repayData.notes
      );
      toast.success('Repayment recorded successfully');
      setShowRepayModal(false);
      setRepayData({ amount: '', notes: '' });
      loadRecords();
      fetchRecordDetails(selectedDetails.lent_record.id);
    } catch (err) {
      console.error('Failed to record repayment', err);
      toast.error(err.response?.data?.detail || 'Failed to record repayment');
    }
  };

  const resetForm = () => {
    setFormData({
      borrower_name: '',
      principal_amount: '',
      interest_rate_type: 'percentage',
      interest_rate_val: '',
      interest_rate_basis: '100',
      interest_frequency: 'monthly',
      interest_type: 'simple',
      lent_at: new Date().toISOString().split('T')[0],
      due_date: '',
      category_id: '',
      payment_source: 'bank',
      track_in_transactions: true,
      notes: ''
    });
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleCreateCategory = async () => {
    const normalizedName = newCategoryName.trim();
    if (!normalizedName) return;
    const duplicateExists = categories.some(
      (category) => category?.name?.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicateExists) {
      toast.warning(`Category "${normalizedName}" already exists.`);
      return;
    }
    try {
      const newCat = await categoryService.create({ name: normalizedName, color: '#ec4899' });
      setCategories((prev) => [...prev, newCat]);
      setFormData((prev) => ({ ...prev, category_id: newCat.id }));
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast.success('Category created successfully');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === 'string' && detail.trim() ? detail : 'Failed to create category');
    }
  };

  // Calculations for summary stats header
  const totalPrincipalLent = records.reduce((sum, r) => sum + parseFloat(r.principal_amount), 0);

  const renderLentDetailsContent = (details, onClose) => {
    const principal = parseFloat(details.lent_record.principal_amount) || 0;
    const accrued = parseFloat(details.accrued_interest) || 0;
    const totalExpected = principal + accrued;
    const totalRepayments = parseFloat(details.total_repayments) || 0;
    const repaidPct = totalExpected > 0 ? Math.min(100, Math.round((totalRepayments / totalExpected) * 100)) : 0;
    const outstanding = parseFloat(details.outstanding_balance) || 0;
    const isActive = details.lent_record.status === 'active';

    return (
      <div className="space-y-5">
        {/* Repayment Progress Meter */}
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
            <span>Repayment Progress</span>
            <span className="font-bold text-violet-400">{repaidPct}%</span>
          </div>
          <Progress
            value={repaidPct}
            className="h-2.5 bg-zinc-800"
            indicatorClassName="bg-linear-to-r from-violet-500 to-indigo-500"
          />
        </div>

        {/* Stats Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
            <p className="text-zinc-500 font-medium text-[11px]">Lending Duration</p>
            <p className="text-sm sm:text-base font-bold text-white mt-1">
              {details.elapsed_duration.years > 0 ? `${details.elapsed_duration.years}y ` : ''}
              {details.elapsed_duration.months > 0 ? `${details.elapsed_duration.months}m ` : ''}
              {details.elapsed_duration.days}d
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 card-specular">
            <p className="text-zinc-500 font-medium text-[11px]">Interest Accrued</p>
            <MoneyValue
              value={accrued}
              className="text-sm sm:text-base font-bold text-emerald-400 mt-1 font-display tabular-nums block"
              symbolClassName="text-[0.65em] font-medium text-emerald-400/60 mr-0.5 select-none"
            />
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 card-specular">
            <p className="text-zinc-500 font-medium text-[11px]">Total Repayments</p>
            <MoneyValue
              value={totalRepayments}
              className="text-sm sm:text-base font-bold text-white mt-1 font-display tabular-nums block"
            />
          </div>
          <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 card-specular">
            <p className="text-violet-400 font-semibold text-[11px]">Net Outstanding</p>
            <MoneyValue
              value={outstanding}
              className="text-sm sm:text-base font-extrabold text-white mt-1 font-display tabular-nums block"
            />
          </div>
        </div>

        {/* Quick Settle Action */}
        {isActive && outstanding > 0 && (
          <div className="pt-1">
            <Button
              onClick={() => {
                if (onClose) onClose();
                setRepayData({
                  amount: String(outstanding.toFixed(2)),
                  notes: 'Full settlement repayment'
                });
                setShowRepayModal(true);
              }}
              className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs sm:text-sm font-bold py-3 h-11 rounded-xl text-white border-0 shadow-lg shadow-emerald-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Settle Outstanding (</span>
              <MoneyValue value={outstanding} className="text-white font-bold" />
              <span>)</span>
            </Button>
          </div>
        )}

        {/* Transaction Logs Feed */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-zinc-500">
              <Receipt size={14} className="text-zinc-500" />
              Ledger Transactions ({details.transactions.length})
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto pr-1">
            {details.transactions.length === 0 ? (
              <div className="p-4 text-center text-zinc-600 text-xs rounded-xl bg-white/[0.02] border border-white/5">
                No ledger activity yet
              </div>
            ) : (
              <div className="segmented-deck divide-y divide-white/[0.04] overflow-hidden">
                {details.transactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 flex justify-between items-center text-xs hover:bg-white/[0.03] transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {tx.description || (isIncome ? 'Repayment Received' : 'Principal Disbursed')}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(tx.occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className={cn(
                          "font-bold text-xs select-none",
                          isIncome ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {isIncome ? '+' : '-'}
                        </span>
                        <MoneyValue
                          value={parseFloat(tx.amount)}
                          className={cn(
                            "font-bold text-sm font-display tabular-nums",
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          )}
                          symbolClassName={cn(
                            "text-[0.65em] font-medium mr-0.5 select-none",
                            isIncome ? "text-emerald-400/60" : "text-rose-400/60"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">Peer-to-Peer Lending</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Track money lent to others, interest accruals, and repayments</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          variant="gradient"
          icon={<Plus size={14} />}
          className="w-full sm:w-auto font-bold"
        >
          Lend Money
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'active' ? "text-violet-400 border-b-2 border-violet-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <Coins size={16} />
            <span>Active Lending</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settled')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'settled' ? "text-violet-400 border-b-2 border-violet-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>Settled / Closed</span>
          </div>
        </button>
      </div>

      {/* Stats Card & Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Stat */}
          <Card className="p-4 sm:p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md flex items-center justify-between rounded-2xl">
            <div>
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {activeTab === 'active' ? 'Total Outstanding Principal' : 'Total Settled Principal'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1 font-display tabular-nums tracking-tight">
                ₹{totalPrincipalLent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
              <HandCoins size={20} />
            </div>
          </Card>

          {/* List of Lending */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-zinc-500">Loading lending profiles...</div>
            ) : records.length === 0 ? (
              <Card className="p-10 text-center border-white/5 bg-zinc-900/10 text-zinc-500 flex flex-col items-center justify-center gap-4">
                <Info size={36} className="text-zinc-600" />
                <div>
                  <h3 className="font-semibold text-white">No entries found</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {activeTab === 'active' 
                      ? 'Lend money to someone and start tracking accumulated interest.'
                      : 'Lent transactions will appear here once they are fully paid back.'}
                  </p>
                </div>
              </Card>
            ) : (
              records.map((rec) => {
                const isActive = rec.status === 'active';
                const isSelected = selectedDetails?.lent_record?.id === rec.id;
                const initials = (rec.borrower_name || 'B')
                  .split(' ')
                  .map(p => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <Card
                    key={rec.id}
                    onClick={() => fetchRecordDetails(rec.id)}
                    className={cn(
                      "p-4 sm:p-5 bg-zinc-900/30 border-white/5 hover:border-violet-500/30 transition-all duration-300 cursor-pointer backdrop-blur-md relative overflow-hidden card-specular",
                      isSelected && "border-violet-500/40 bg-violet-500/5 shadow-lg shadow-violet-500/5"
                    )}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white text-base sm:text-lg truncate">{rec.borrower_name}</h3>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                isActive
                                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              )}>
                                {rec.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                              <div className="flex items-center gap-1 text-zinc-400">
                                <Calendar size={12} className="text-zinc-500" />
                                <span>{new Date(rec.lent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <span className="text-zinc-600">•</span>
                              <span className="text-violet-300 font-medium">
                                {rec.interest_rate_type === 'percentage' ? (
                                  `${parseFloat(rec.interest_rate_val)}% ${rec.interest_frequency}`
                                ) : (
                                  `₹${parseFloat(rec.interest_rate_val)} / ₹${parseFloat(rec.interest_rate_basis)} ${rec.interest_frequency}`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-zinc-500 uppercase font-semibold">Principal</p>
                          <MoneyValue
                            value={rec.principal_amount}
                            className="text-base sm:text-xl font-extrabold text-white mt-0.5 font-display tabular-nums block"
                          />
                        </div>
                      </div>

                      {/* Notes preview if any */}
                      {rec.notes && (
                        <p className="text-xs text-zinc-400 italic bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5 truncate">
                          "{rec.notes}"
                        </p>
                      )}

                      {/* Thumb Action Tray */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchRecordDetails(rec.id);
                          }}
                          className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 py-1 px-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                        >
                          <span>View Ledger & Math</span>
                          <ChevronRight size={14} />
                        </button>

                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDetails(null);
                                fetchRecordDetails(rec.id).then(() => setShowRepayModal(true));
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs font-bold text-violet-400 border-violet-500/30 hover:bg-violet-500/10 active:scale-95 transition-all"
                            >
                              Add Repayment
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteDialog(rec.id);
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-red-400 active:scale-95 transition-all"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop-Only Side Details Panel */}
        <div className="hidden lg:block lg:col-span-1">
          {selectedDetails ? (
            <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6 animate-fade-in sticky top-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedDetails.lent_record.borrower_name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedDetails.lent_record.interest_type === 'compound' ? 'Compounding' : 'Simple'} Interest • Repayment Analysis
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedDetails(null)}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-white text-xs h-6 px-2"
                >
                  Close
                </Button>
              </div>
              {renderLentDetailsContent(selectedDetails, () => setSelectedDetails(null))}
            </Card>
          ) : (
            <Card className="p-8 text-center border-white/5 bg-zinc-900/10 text-zinc-500 flex flex-col items-center justify-center gap-2 h-full">
              <HandCoins size={24} className="text-zinc-700" />
              <p className="text-sm font-semibold">Select a lending profile</p>
              <p className="text-xs text-zinc-500">
                Click on any borrower card on the left to analyze days elapsed, interest accumulations, payment history, and outstanding nets.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile-Only Bottom Sheet Detail Drawer */}
      {isMobile && selectedDetails && (
        <MobileDetailDrawer
          isOpen={Boolean(selectedDetails)}
          onClose={() => setSelectedDetails(null)}
          title={selectedDetails.lent_record.borrower_name}
          subtitle={`${selectedDetails.lent_record.interest_type === 'compound' ? 'Compounding' : 'Simple'} Interest • ₹${parseFloat(selectedDetails.lent_record.principal_amount).toLocaleString('en-IN')}`}
          badge={
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              selectedDetails.lent_record.status === 'active'
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {selectedDetails.lent_record.status}
            </span>
          }
        >
          {renderLentDetailsContent(selectedDetails, () => setSelectedDetails(null))}
        </MobileDetailDrawer>
      )}

      {/* LEND MONEY MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Lend Money Profile"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Borrower Name</label>
            <Input
              value={formData.borrower_name}
              onChange={(e) => setFormData({ ...formData, borrower_name: e.target.value })}
              placeholder="e.g., John Doe"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Principal Amount (INR)</label>
              <Input
                type="number"
                value={formData.principal_amount}
                onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                placeholder="10000"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Lent Date</label>
              <Input
                type="date"
                value={formData.lent_at}
                onChange={(e) => setFormData({ ...formData, lent_at: e.target.value })}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Interest Rate Model</label>
              <Select
                options={[
                  { value: 'percentage', label: 'Simple Percentage (%)' },
                  { value: 'rupees_per_amount', label: 'Rupees per Amount (Local)' }
                ]}
                value={formData.interest_rate_type}
                onChange={(value) => setFormData({ ...formData, interest_rate_type: value, interest_rate_val: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Interest Frequency</label>
              <Select
                options={[
                  { value: 'monthly', label: 'Per Month' },
                  { value: 'yearly', label: 'Per Year' }
                ]}
                value={formData.interest_frequency}
                onChange={(value) => setFormData({ ...formData, interest_frequency: value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Calculation Method</label>
              <Select
                options={[
                  { value: 'simple', label: 'Simple Interest (Flat)' },
                  { value: 'compound', label: 'Compound Interest' }
                ]}
                value={formData.interest_type}
                onChange={(value) => setFormData({ ...formData, interest_type: value })}
              />
            </div>
            <div className="flex items-end pb-2">
              <span className="text-[10px] text-zinc-500 font-medium">
                {formData.interest_type === 'compound'
                  ? 'Interest compounds per rate frequency.'
                  : 'Interest accrues linearly on the principal.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                {formData.interest_rate_type === 'percentage' ? 'Rate Percentage (%)' : 'Interest (Rupees)'}
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.interest_rate_val}
                onChange={(e) => setFormData({ ...formData, interest_rate_val: e.target.value })}
                placeholder={formData.interest_rate_type === 'percentage' ? '1.5' : '2'}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            {formData.interest_rate_type === 'rupees_per_amount' ? (
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">For Every (Rupees Principal)</label>
                <Input
                  type="number"
                  value={formData.interest_rate_basis}
                  onChange={(e) => setFormData({ ...formData, interest_rate_basis: e.target.value })}
                  placeholder="100"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Target Return Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {formData.interest_rate_type === 'rupees_per_amount' && (
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Target Return Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            )}
            {/* Funding Source & Accounting Link */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Funding Source</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_source: 'bank', track_in_transactions: true })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.payment_source === 'bank'
                      ? 'border-blue-500 bg-blue-500/15 text-white shadow-sm shadow-blue-500/10'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-400 shrink-0" />
                    <span>Bank / Netbanking</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Deducted from tracked bank balance</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_source: 'cash', track_in_transactions: false })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.payment_source === 'cash'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm shadow-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Banknote size={13} className="text-emerald-400 shrink-0" />
                    <span>Physical Cash</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">In-hand cash; leaves bank balance intact</p>
                </button>
              </div>
            </div>

            {formData.payment_source === 'bank' && (
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Ledger Category Mapping</label>
                {!isCreatingCategory ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        options={[
                          { value: '', label: 'Select category' },
                          ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                        ]}
                        value={formData.category_id}
                        onChange={(value) => setFormData({ ...formData, category_id: value })}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-3 cursor-pointer"
                      onClick={() => setIsCreatingCategory(true)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 animate-fade-in">
                    <Input 
                      value={newCategoryName} 
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      autoFocus
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    <Button type="button" className="bg-linear-to-r from-violet-600 to-indigo-600 px-3 cursor-pointer" onClick={handleCreateCategory}>
                      <Check size={16} />
                    </Button>
                    <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white px-2 cursor-pointer" onClick={() => setIsCreatingCategory(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 mt-1">Bank lending logs an activity transaction. Deleting this lending profile will automatically purge linked transactions to preserve true wealth.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Memo / Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Supplementary detail notes"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600">
              Lend Principal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADD REPAYMENT MODAL */}
      <Modal
        isOpen={showRepayModal}
        onClose={() => setShowRepayModal(false)}
        title="Record Repayment Received"
      >
        <form onSubmit={handleRepaySubmit} className="space-y-4">
          {selectedDetails && (
            <div className="p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-xs text-zinc-300 space-y-1">
              <p>Borrower: <strong className="text-white">{selectedDetails.lent_record.borrower_name}</strong></p>
              <p>Current Net Outstanding: <strong className="text-white">INR {parseFloat(selectedDetails.outstanding_balance).toLocaleString('en-IN')}</strong></p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Repayment Amount (INR)</label>
            <Input
              type="number"
              step="0.01"
              value={repayData.amount}
              onChange={(e) => setRepayData({ ...repayData, amount: e.target.value })}
              placeholder="0.00"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Memo / Transaction Description</label>
            <Input
              value={repayData.notes}
              onChange={(e) => setRepayData({ ...repayData, notes: e.target.value })}
              placeholder="e.g. Part payment received"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600">
              Record Income Repayment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRepayModal(false);
                setRepayData({ amount: '', notes: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(showDeleteDialog)}
        title="Remove Lending Profile"
        description="Are you sure you want to delete this lending tracker? This will remove the lending record and purge any auto-generated transactions tied to it, preserving your true wealth and bank ledger integrity. This cannot be undone."
        confirmText="Delete Profile"
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => setShowDeleteDialog(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
