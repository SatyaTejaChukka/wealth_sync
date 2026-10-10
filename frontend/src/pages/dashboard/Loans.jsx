import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import {
  Plus,
  Trash2,
  CheckCircle,
  Check,
  Calendar,
  Landmark,
  Percent,
  Calculator,
  ChevronRight,
  TrendingDown,
  Info,
  ArrowRight,
  Clock
} from 'lucide-react';

import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Progress } from '../../components/ui/Progress.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

import { loanService } from '../../services/loans.js';
import { categoryService } from '../../services/categories.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { MobileDetailDrawer } from '../../components/mobile/MobileDetailDrawer.jsx';
import { PaymentTimelineFeed } from '../../components/mobile/PaymentTimelineFeed.jsx';
import { MoneyValue } from '../../lib/format.js';

export default function Loans() {
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [activeTab, setActiveTab] = useState('my-loans'); // 'my-loans' or 'calculator'
  const [loans, setLoans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  
  // Modals & Dialogs
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null); // stores loan id to delete
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add Loan Form State
  const [formData, setFormData] = useState({
    name: '',
    principal_amount: '',
    interest_rate: '',
    tenure_months: '',
    start_date: new Date().toISOString().split('T')[0],
    due_day: '5',
    category_id: '',
    autopay_enabled: false,
    custom_emi: '',
    interest_type: 'compound'
  });

  // Calculator State
  const [calcData, setCalcData] = useState({
    principal: 500000,
    rate: 8.5,
    tenure: 60,
    customEmi: '',
    interestType: 'compound'
  });
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    loadLoans();
    loadCategories();
  }, []);

  useEffect(() => {
    runCalculator();
  }, [calcData]);

  const loadLoans = async () => {
    try {
      const data = await loanService.getAll();
      setLoans(data);
    } catch (err) {
      console.error('Failed to load loans', err);
      toast.error('Failed to load loans list');
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

  const fetchLoanDetails = async (id) => {
    try {
      const data = await loanService.getById(id);
      setSelectedLoanDetails(data);
    } catch (err) {
      console.error('Failed to load loan details', err);
      toast.error('Failed to load loan details');
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate),
        tenure_months: parseInt(formData.tenure_months),
        start_date: formData.start_date,
        due_day: parseInt(formData.due_day),
        category_id: formData.category_id || null,
        autopay_enabled: formData.autopay_enabled,
        interest_type: formData.interest_type,
        emi_amount: formData.custom_emi ? parseFloat(formData.custom_emi) : null
      };

      await loanService.create(payload);
      toast.success('Loan account created successfully');
      setShowAddModal(false);
      resetForm();
      loadLoans();
    } catch (err) {
      console.error('Failed to create loan', err);
      toast.error('Failed to create loan account. Please verify input data.');
    }
  };

  const handleDeleteLoan = async () => {
    const id = showDeleteDialog;
    if (!id) return;
    
    // Optimistic Update
    setLoans((prev) => prev.filter((l) => l.id !== id));
    if (selectedLoanDetails?.loan?.id === id) {
      setSelectedLoanDetails(null);
    }
    setShowDeleteDialog(null);

    try {
      await loanService.delete(id);
      toast.success('Loan profile deleted successfully');
    } catch (err) {
      console.error('Failed to delete loan', err);
      toast.error('Failed to delete loan. Reverting...');
      loadLoans();
    }
  };

  const handlePayEMI = async (loanId) => {
    try {
      await loanService.payEMI(loanId);
      toast.success('EMI Payment transaction logged successfully');
      loadLoans();
      if (selectedLoanDetails?.loan?.id === loanId) {
        fetchLoanDetails(loanId);
      }
    } catch (err) {
      console.error('Failed to pay EMI', err);
      toast.error(err.response?.data?.detail || 'Failed to record EMI payment');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      principal_amount: '',
      interest_rate: '',
      tenure_months: '',
      start_date: new Date().toISOString().split('T')[0],
      due_day: '5',
      category_id: '',
      autopay_enabled: false,
      custom_emi: '',
      interest_type: 'compound'
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
      const newCat = await categoryService.create({ name: normalizedName, color: '#10b981' });
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

  // Pure client side calculator logic for fast slider performance
  const runCalculator = () => {
    const P = parseFloat(calcData.principal);
    const annualRate = parseFloat(calcData.rate);
    const n = parseInt(calcData.tenure);
    
    if (P <= 0 || n <= 0) return;

    let emi = 0;
    const isSimple = calcData.interestType === 'simple';
    
    if (calcData.customEmi) {
      emi = parseFloat(calcData.customEmi);
    } else if (annualRate === 0) {
      emi = P / n;
    } else {
      if (isSimple) {
        const totalInterest = P * (annualRate / 100) * (n / 12);
        emi = (P + totalInterest) / n;
      } else {
        const r = annualRate / 12 / 100;
        emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
    }

    const schedule = [];
    let remaining = P;
    const r = annualRate / 12 / 100;
    let totalInterest = 0;

    for (let month = 1; month <= n; month++) {
      if (remaining <= 0) break;
      
      let interestPaid = 0;
      let principalPaid = 0;
      
      if (annualRate === 0) {
        interestPaid = 0;
        principalPaid = Math.min(emi, remaining);
      } else {
        if (isSimple) {
          interestPaid = P * r;
        } else {
          interestPaid = remaining * r;
        }
        principalPaid = emi - interestPaid;
      }

      if (month === n || remaining - principalPaid <= 0) {
        principalPaid = remaining;
      }

      remaining -= principalPaid;
      totalInterest += interestPaid;

      schedule.push({
        month,
        emi: Math.round(principalPaid + interestPaid),
        principal: Math.round(principalPaid),
        interest: Math.round(interestPaid),
        balance: Math.round(Math.max(0, remaining))
      });
    }

    const totalAmount = P + totalInterest;

    setCalcResult({
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalAmount: Math.round(totalAmount),
      schedule
    });
  };

  // Calculations for stats headers
  const activeLoans = loans.filter(l => l.status === 'active');
  const monthlyEMIs = activeLoans.reduce((sum, l) => sum + parseFloat(l.emi_amount), 0);
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + parseFloat(l.principal_amount), 0);

  const renderLoanDetailsContent = (details, onClose) => (
    <div className="space-y-5">
      {/* Progress Bar & Header */}
      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
          <span>Principal Repaid</span>
          <span className="font-bold text-emerald-400">
            {Math.round((parseFloat(details.total_principal_paid) / parseFloat(details.loan.principal_amount)) * 100)}%
          </span>
        </div>
        <Progress
          value={(parseFloat(details.total_principal_paid) / parseFloat(details.loan.principal_amount)) * 100}
          className="h-2.5 bg-zinc-800"
          indicatorClassName="bg-linear-to-r from-emerald-500 to-teal-500"
        />
      </div>

      {/* 4 Metric Boxes */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 card-specular">
          <p className="text-zinc-500 font-medium text-[11px]">Outstanding Balance</p>
          <MoneyValue
            value={details.outstanding_principal}
            className="text-sm sm:text-base font-bold text-white mt-1 font-display tabular-nums block"
          />
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 card-specular">
          <p className="text-zinc-500 font-medium text-[11px]">Total Interest Paid</p>
          <MoneyValue
            value={details.total_interest_paid}
            className="text-sm sm:text-base font-bold text-white mt-1 font-display tabular-nums block"
          />
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-zinc-500 font-medium text-[11px]">Remaining Tenure</p>
          <p className="text-sm sm:text-base font-bold text-white mt-1">
            {details.remaining_tenure_months} months left
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-zinc-500 font-medium text-[11px]">Next Due Date</p>
          <p className="text-sm sm:text-base font-bold text-white mt-1">
            {details.next_due_date ? new Date(details.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </p>
        </div>
      </div>

      {/* Amortization Curve Chart */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <p className="text-xs text-zinc-400 font-semibold">Amortization Curve (Balance over Time)</p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={details.amortization_schedule}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#fff', fontSize: '12px' }}
                formatter={(val) => [`₹${Math.round(val).toLocaleString('en-IN')}`, 'Remaining Balance']}
              />
              <Area
                type="monotone"
                dataKey="remaining_principal"
                stroke="#f59e0b"
                fill="url(#colorLoanCurve)"
                strokeWidth={2}
                name="Remaining Balance"
              />
              <defs>
                <linearGradient id="colorLoanCurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Timeline Feed */}
      <PaymentTimelineFeed
        type="loan"
        items={details.amortization_schedule}
        paidMonthsCount={details.loan.tenure_months - details.remaining_tenure_months}
      />

      {/* Quick Pay Action inside Drawer */}
      {details.loan.status === 'active' && (
        <div className="pt-2">
          <Button
            onClick={() => {
              if (onClose) onClose();
              handlePayEMI(details.loan.id);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-sm font-bold py-3 h-11 rounded-xl text-white shadow-md active:scale-98 transition-all"
          >
            Pay Next EMI (₹{parseFloat(details.loan.emi_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">Loans & EMIs</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Track repayments, schedules, and run what-if EMI projections</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            variant="gradient"
            icon={<Plus size={14} />}
            className="w-full sm:w-auto h-11 sm:h-9 px-4 text-xs sm:text-sm font-bold touch-press"
          >
            Add Loan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('my-loans')}
          className={cn(
            "min-h-[48px] py-3 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap touch-press",
            activeTab === 'my-loans' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <Landmark size={16} />
          <span>My Loan Portfolios</span>
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={cn(
            "min-h-[48px] py-3 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap touch-press",
            activeTab === 'calculator' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <Calculator size={16} />
          <span>EMI Projection Calculator</span>
        </button>
      </div>

      {/* TAB 1: MY LOANS */}
      {activeTab === 'my-loans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md relative overflow-hidden flex items-center justify-between card-specular">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly EMI Outflow</p>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 font-display tabular-nums tracking-tight">
                    ₹{monthlyEMIs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                  <TrendingDown size={20} />
                </div>
              </Card>
              <Card className="p-4 sm:p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md relative overflow-hidden flex items-center justify-between card-specular">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Debt Portfolio</p>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 font-display tabular-nums tracking-tight">
                    ₹{totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
                  <Landmark size={20} />
                </div>
              </Card>
            </div>

            {/* List */}
            <div className="space-y-4">
              {loading ? (
                <div className="p-12 text-center text-zinc-500">Loading loan profiles...</div>
              ) : loans.length === 0 ? (
                <Card className="p-10 text-center border-white/5 bg-zinc-900/10 text-zinc-500 flex flex-col items-center justify-center gap-4">
                  <Info size={36} className="text-zinc-600" />
                  <div>
                    <h3 className="font-semibold text-white">No active loans</h3>
                    <p className="text-sm text-zinc-400 mt-1">Add a loan profile to start tracking repayments and amortization schedules.</p>
                  </div>
                  <Button onClick={() => setShowAddModal(true)} variant="outline" size="sm">
                    Add Loan Now
                  </Button>
                </Card>
              ) : (
                loans.map((loan) => {
                  const isActive = loan.status === 'active';
                  const isSelected = selectedLoanDetails?.loan?.id === loan.id;

                  return (
                    <Card
                      key={loan.id}
                      onClick={() => fetchLoanDetails(loan.id)}
                      className={cn(
                        "p-4 sm:p-5 bg-zinc-900/30 border-white/5 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer backdrop-blur-md relative overflow-hidden card-specular",
                        isSelected && "border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/5"
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Top Header */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                              <Landmark size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-white text-base sm:text-lg truncate">{loan.name}</h3>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                  isActive
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                )}>
                                  {loan.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                                {loan.category && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: loan.category.color }} />
                                    <span className="text-zinc-300">{loan.category.name}</span>
                                  </div>
                                )}
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1">
                                  <Percent size={12} className="text-zinc-500" />
                                  <span>{parseFloat(loan.interest_rate)}% p.a.</span>
                                </div>
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1">
                                  <Clock size={12} className="text-zinc-500" />
                                  <span>{loan.tenure_months}m</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-zinc-500 uppercase font-semibold">Monthly EMI</p>
                            <MoneyValue
                              value={loan.emi_amount}
                              className="text-base sm:text-xl font-extrabold text-white mt-0.5 font-display tabular-nums block"
                            />
                          </div>
                        </div>

                        {/* Quick Details Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-white/5 text-xs">
                          <div>
                            <span className="text-zinc-500 text-[11px] block">Principal</span>
                            <MoneyValue
                              value={loan.principal_amount}
                              className="font-semibold text-zinc-300 font-display tabular-nums block"
                            />
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[11px] block">EMI Due Day</span>
                            <span className="font-semibold text-zinc-300">Day {loan.due_day} of month</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1 flex items-center sm:justify-end text-zinc-400 text-[11px]">
                            <span className="capitalize">{loan.interest_type === 'simple' ? 'Simple Interest' : 'Reducing Balance'}</span>
                          </div>
                        </div>

                        {/* Thumb Action Tray */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchLoanDetails(loan.id);
                            }}
                            className="min-h-[40px] px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 rounded-lg hover:bg-emerald-500/10 transition-colors touch-press"
                          >
                            <span>View Amortization</span>
                            <ChevronRight size={14} />
                          </button>

                          <div className="flex items-center gap-2">
                            {isActive && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePayEMI(loan.id);
                                }}
                                variant="outline"
                                size="sm"
                                className="h-10 px-3.5 text-xs font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg touch-press"
                              >
                                Pay EMI
                              </Button>
                            )}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteDialog(loan.id);
                              }}
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-zinc-400 hover:text-red-400 rounded-lg border border-white/5 bg-zinc-900/60 touch-press"
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
            {selectedLoanDetails ? (
              <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6 animate-fade-in sticky top-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg">{selectedLoanDetails.loan.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedLoanDetails.loan.interest_type === 'simple' ? 'Simple (Flat Rate)' : 'Compound (Reducing)'} Interest • Repayment Status
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedLoanDetails(null)}
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500 hover:text-white text-xs h-6 px-2"
                  >
                    Close
                  </Button>
                </div>
                {renderLoanDetailsContent(selectedLoanDetails, () => setSelectedLoanDetails(null))}
              </Card>
            ) : (
              <Card className="p-8 text-center border-white/5 bg-zinc-900/10 text-zinc-500 flex flex-col items-center justify-center gap-2 h-full">
                <Landmark size={24} className="text-zinc-700" />
                <p className="text-sm font-semibold">Select a loan portfolio</p>
                <p className="text-xs text-zinc-500">Click on any loan item on the left to see repayment analytics, remaining balance curves, and full schedules.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Mobile-Only Bottom Sheet Detail Drawer */}
      {isMobile && selectedLoanDetails && (
        <MobileDetailDrawer
          isOpen={Boolean(selectedLoanDetails)}
          onClose={() => setSelectedLoanDetails(null)}
          title={selectedLoanDetails.loan.name}
          subtitle={`${selectedLoanDetails.loan.interest_type === 'simple' ? 'Simple (Flat)' : 'Reducing'} Interest • ₹${parseFloat(selectedLoanDetails.loan.emi_amount).toLocaleString('en-IN')}/mo`}
          badge={
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
              selectedLoanDetails.loan.status === 'active'
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {selectedLoanDetails.loan.status}
            </span>
          }
        >
          {renderLoanDetailsContent(selectedLoanDetails, () => setSelectedLoanDetails(null))}
        </MobileDetailDrawer>
      )}

      {/* TAB 2: EMI PROJECTION CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <Card className="p-6 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6">
            <h3 className="font-bold text-white text-lg border-b border-white/5 pb-3">Loan Specifications</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Interest Method</label>
                <Select
                  options={[
                    { value: 'compound', label: 'Compound (Reducing Balance)' },
                    { value: 'simple', label: 'Simple Interest (Flat Rate)' }
                  ]}
                  value={calcData.interestType}
                  onChange={(value) => setCalcData({ ...calcData, interestType: value })}
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>Principal Amount (INR)</span>
                  <span className="font-bold text-emerald-400">
                    {parseFloat(calcData.principal).toLocaleString('en-IN')}
                  </span>
                </label>
                <Input
                  type="number"
                  value={calcData.principal}
                  onChange={(e) => setCalcData({ ...calcData, principal: e.target.value })}
                  placeholder="Principal"
                  className="bg-zinc-850 border-white/5 text-white"
                />
                <input
                  type="range"
                  min="50000"
                  max="10000000"
                  step="50000"
                  value={calcData.principal}
                  onChange={(e) => setCalcData({ ...calcData, principal: e.target.value })}
                  className="w-full mt-3 accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>Interest Rate (% per annum)</span>
                  <span className="font-bold text-emerald-400">{calcData.rate}%</span>
                </label>
                <Input
                  type="number"
                  step="0.05"
                  value={calcData.rate}
                  onChange={(e) => setCalcData({ ...calcData, rate: e.target.value })}
                  placeholder="Interest Rate"
                  className="bg-zinc-850 border-white/5 text-white"
                />
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.1"
                  value={calcData.rate}
                  onChange={(e) => setCalcData({ ...calcData, rate: e.target.value })}
                  className="w-full mt-3 accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>Tenure (Months)</span>
                  <span className="font-bold text-emerald-400">{calcData.tenure} months</span>
                </label>
                <Input
                  type="number"
                  value={calcData.tenure}
                  onChange={(e) => setCalcData({ ...calcData, tenure: e.target.value })}
                  placeholder="Tenure in months"
                  className="bg-zinc-850 border-white/5 text-white"
                />
                <input
                  type="range"
                  min="6"
                  max="360"
                  step="6"
                  value={calcData.tenure}
                  onChange={(e) => setCalcData({ ...calcData, tenure: e.target.value })}
                  className="w-full mt-3 accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div className="border-t border-white/5 pt-4">
                <label className="block text-sm text-zinc-300 mb-2 font-medium">EMI Amount Override (Optional)</label>
                <Input
                  type="number"
                  value={calcData.customEmi}
                  onChange={(e) => setCalcData({ ...calcData, customEmi: e.target.value })}
                  placeholder="Standard calculated EMI is default"
                  className="bg-zinc-850 border-white/5 text-white placeholder-zinc-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">If your actual EMI is rounded up or contains supplementary charges, enter it here to build an accurate schedule.</p>
              </div>
            </div>
          </Card>

          {/* Results Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {calcResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Result Summary */}
                <Card className="p-6 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-white text-lg border-b border-white/5 pb-3">Projection Summary</h3>
                    
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 shadow-xl text-white flex flex-col items-center justify-center text-center">
                      <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Calculated Monthly EMI</p>
                      <h2 className="text-2xl sm:text-3xl font-black mt-1 font-display tabular-nums tracking-tight text-white">₹{calcResult.emi.toLocaleString('en-IN')}</h2>
                    </div>

                    <div className="divide-y divide-white/5 text-sm">
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Principal</span>
                        <span className="font-semibold text-white font-display tabular-nums">₹{parseFloat(calcData.principal).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Interest Payable</span>
                        <span className="font-semibold text-amber-400 font-display tabular-nums">₹{calcResult.totalInterest.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Sum Payable</span>
                        <span className="font-semibold text-white font-display tabular-nums">₹{calcResult.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="py-2.5 flex justify-between border-t border-white/5">
                        <span className="text-zinc-400">Interest Calculation Model</span>
                        <span className="font-semibold text-white capitalize">{calcData.interestType === 'simple' ? 'Simple (Flat Rate)' : 'Compound (Reducing Balance)'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setFormData({
                        name: 'New Loan Projection',
                        principal_amount: calcData.principal.toString(),
                        interest_rate: calcData.rate.toString(),
                        tenure_months: calcData.tenure.toString(),
                        start_date: new Date().toISOString().split('T')[0],
                        due_day: '5',
                        category_id: '',
                        autopay_enabled: false,
                        custom_emi: calcData.customEmi.toString()
                      });
                      setShowAddModal(true);
                    }}
                    variant="outline"
                    className="w-full h-11 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 mt-4 rounded-xl font-bold touch-press"
                  >
                    Save As My Loan Profile
                  </Button>
                </Card>

                {/* Pie Chart breakdown */}
                <Card className="p-6 bg-zinc-900/30 border-white/5 backdrop-blur-md flex flex-col justify-between items-center text-center">
                  <h3 className="font-bold text-white text-lg border-b border-white/5 pb-3 w-full text-left">Cost Structure</h3>
                  <div className="h-44 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Principal', value: parseFloat(calcData.principal) },
                            { name: 'Interest', value: calcResult.totalInterest }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Cost</p>
                      <p className="text-lg font-bold text-white mt-0.5">
                        {Math.round((calcResult.totalInterest / calcResult.totalAmount) * 100)}% Int.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 justify-center text-xs text-zinc-300 mt-4 w-full border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Principal Amount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>Interest Outflow</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Table Amortization schedule */}
            {calcResult && (
              <Card className="p-6 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-4">
                <h3 className="font-bold text-white text-lg border-b border-white/5 pb-3">Detailed Amortization Projection</h3>
                <div className="overflow-x-auto rounded-xl border border-white/5 max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/5 text-zinc-400 sticky top-0 z-10">
                      <tr>
                        <th className="p-4 font-medium">Month</th>
                        <th className="p-4 font-medium">EMI Amount</th>
                        <th className="p-4 font-medium">Principal Paid</th>
                        <th className="p-4 font-medium">Interest Paid</th>
                        <th className="p-4 font-medium text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {calcResult.schedule.map((row) => (
                        <tr key={row.month} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-medium text-white">Month {row.month}</td>
                          <td className="p-4">INR {row.emi.toLocaleString('en-IN')}</td>
                          <td className="p-4">INR {row.principal.toLocaleString('en-IN')}</td>
                          <td className="p-4">INR {row.interest.toLocaleString('en-IN')}</td>
                          <td className="p-4 text-right text-white">INR {row.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ADD LOAN MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Loan Profile"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Loan Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SBI Home Loan"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Interest Method</label>
              <Select
                options={[
                  { value: 'compound', label: 'Compound (Reducing Balance)' },
                  { value: 'simple', label: 'Simple (Flat Rate)' }
                ]}
                value={formData.interest_type}
                onChange={(value) => setFormData({ ...formData, interest_type: value })}
              />
            </div>
            <div className="flex items-end pb-2">
              <span className="text-[10px] text-zinc-500 font-medium">
                {formData.interest_type === 'compound'
                  ? 'EMI interest is calculated on reducing balance.'
                  : 'EMI interest is flat rate on principal.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Principal Amount (₹)</label>
              <Input
                type="number"
                value={formData.principal_amount}
                onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                placeholder="100000"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Annual Interest Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="8.50"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Tenure (Months)</label>
              <Input
                type="number"
                value={formData.tenure_months}
                onChange={(e) => setFormData({ ...formData, tenure_months: e.target.value })}
                placeholder="60"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">EMI Due Day (1-31)</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                placeholder="5"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">EMI Override (Optional)</label>
              <Input
                type="number"
                value={formData.custom_emi}
                onChange={(e) => setFormData({ ...formData, custom_emi: e.target.value })}
                placeholder="Auto-calculated if blank"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

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
                  className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-3"
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
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3" onClick={handleCreateCategory}>
                  <Check size={16} />
                </Button>
                <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white px-2" onClick={() => setIsCreatingCategory(false)}>
                  Cancel
                </Button>
              </div>
            )}
            <p className="text-[10px] text-zinc-500 mt-1">Select a category (e.g. Housing, Transportation) to associate the monthly EMI transactions in your ledger.</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autopay"
              checked={formData.autopay_enabled}
              onChange={(e) => setFormData({ ...formData, autopay_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="autopay" className="text-sm text-zinc-300 cursor-pointer">
              Enable Auto-generation of upcoming EMI transactions (3 days before due day)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              Create Loan Profile
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

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(showDeleteDialog)}
        title="Remove Loan Profile"
        description="Are you sure you want to delete this loan profile? This will not delete the historical transaction records linked to this loan, but payment tracking will cease. This action cannot be undone."
        confirmText="Remove Loan"
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => setShowDeleteDialog(null)}
        onConfirm={handleDeleteLoan}
      />
    </div>
  );
}
