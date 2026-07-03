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
  DollarSign,
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

export default function Loans() {
  const toast = useToast();
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
      const newCat = await categoryService.create({ name: normalizedName, color: '#8b5cf6' });
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

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Loans & EMIs</h1>
          <p className="text-zinc-400 mt-1">Track repayments, schedules, and run what-if EMI projections</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowAddModal(true)}
            variant="gradient"
            icon={<Plus size={18} />}
            className="w-full sm:w-auto"
          >
            Add Loan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('my-loans')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'my-loans' ? "text-violet-400 border-b-2 border-violet-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <Landmark size={16} />
            <span>My Loan Portfolios</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative",
            activeTab === 'calculator' ? "text-violet-400 border-b-2 border-violet-500" : "text-zinc-400 hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <Calculator size={16} />
            <span>EMI Projection Calculator</span>
          </div>
        </button>
      </div>

      {/* TAB 1: MY LOANS */}
      {activeTab === 'my-loans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly EMI Outflow</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    INR {monthlyEMIs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                  <TrendingDown size={20} />
                </div>
              </Card>
              <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Debt Portfolio</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    INR {totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
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
                  return (
                    <Card
                      key={loan.id}
                      onClick={() => fetchLoanDetails(loan.id)}
                      className={cn(
                        "p-5 bg-zinc-900/30 border-white/5 hover:border-violet-500/30 transition-all duration-300 cursor-pointer backdrop-blur-md relative overflow-hidden",
                        selectedLoanDetails?.loan?.id === loan.id && "border-violet-500/40 bg-violet-500/5"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-bold text-white text-lg">{loan.name}</h3>
                            <span className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              isActive
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            )}>
                              {loan.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            {loan.category && (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: loan.category.color }} />
                                {loan.category.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Percent size={12} className="text-zinc-500" />
                              {parseFloat(loan.interest_rate)}% p.a.
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-zinc-500" />
                              {loan.tenure_months} months
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500 uppercase font-semibold">Monthly EMI</p>
                          <p className="text-xl font-extrabold text-white mt-0.5">
                            INR {parseFloat(loan.emi_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Repayment details summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/5 text-sm">
                        <div>
                          <p className="text-xs text-zinc-500">Original Principal</p>
                          <p className="font-semibold text-zinc-300 mt-0.5">INR {parseFloat(loan.principal_amount).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">EMI Due Day</p>
                          <p className="font-semibold text-zinc-300 mt-0.5">Day {loan.due_day} of month</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-right flex items-center justify-end gap-2">
                          {isActive && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayEMI(loan.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold text-violet-400 border-violet-500/20 hover:bg-violet-500/10"
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
                            className="h-8 w-8 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Details & Schedule Side Panel */}
          <div className="lg:col-span-1">
            {selectedLoanDetails ? (
              <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6 animate-fade-in">
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

                {/* Progress Circle & Metrics */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Principal Repaid</span>
                      <span className="font-bold text-violet-400">
                        {Math.round((parseFloat(selectedLoanDetails.total_principal_paid) / parseFloat(selectedLoanDetails.loan.principal_amount)) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(parseFloat(selectedLoanDetails.total_principal_paid) / parseFloat(selectedLoanDetails.loan.principal_amount)) * 100}
                      className="h-2 bg-zinc-800"
                      indicatorClassName="bg-linear-to-r from-violet-500 to-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-zinc-500 font-medium">Outstanding Balance</p>
                      <p className="text-sm font-bold text-white mt-1">
                        INR {parseFloat(selectedLoanDetails.outstanding_principal).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-zinc-500 font-medium">Total Interest Paid</p>
                      <p className="text-sm font-bold text-white mt-1">
                        INR {parseFloat(selectedLoanDetails.total_interest_paid).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-zinc-500 font-medium">Remaining Tenure</p>
                      <p className="text-sm font-bold text-white mt-1">
                        {selectedLoanDetails.remaining_tenure_months} months left
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-zinc-500 font-medium">Next Due Date</p>
                      <p className="text-sm font-bold text-white mt-1">
                        {selectedLoanDetails.next_due_date ? new Date(selectedLoanDetails.next_due_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amortization Chart */}
                <div className="h-40 relative">
                  <p className="text-xs text-zinc-500 font-medium mb-2">Amortization Curve (Remaining Principal)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={selectedLoanDetails.amortization_schedule}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontSize: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="remaining_principal"
                        stroke="#8b5cf6"
                        fill="url(#colorUv)"
                        name="Remaining Balance"
                      />
                      <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Amortization Table Preview */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Payment Schedule</span>
                    <span className="text-zinc-600 font-medium">Scrollable</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5 text-xs text-zinc-300">
                    <div className="grid grid-cols-4 p-2 bg-white/5 font-semibold text-zinc-400">
                      <span>Mo.</span>
                      <span>Principal</span>
                      <span>Interest</span>
                      <span className="text-right">Balance</span>
                    </div>
                    {selectedLoanDetails.amortization_schedule.map((row) => (
                      <div key={row.month} className={cn(
                        "grid grid-cols-4 p-2.5",
                        row.month <= selectedLoanDetails.loan.tenure_months - selectedLoanDetails.remaining_tenure_months && "bg-violet-500/5 text-violet-300"
                      )}>
                        <span>Month {row.month}</span>
                        <span>{parseFloat(row.principal_paid).toLocaleString('en-IN')}</span>
                        <span>{parseFloat(row.interest_paid).toLocaleString('en-IN')}</span>
                        <span className="text-right">{parseFloat(row.remaining_principal).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                  <span className="font-bold text-violet-400">
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
                  className="w-full mt-3 accent-violet-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>Interest Rate (% per annum)</span>
                  <span className="font-bold text-violet-400">{calcData.rate}%</span>
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
                  className="w-full mt-3 accent-violet-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>Tenure (Months)</span>
                  <span className="font-bold text-violet-400">{calcData.tenure} months</span>
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
                  className="w-full mt-3 accent-violet-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
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
                    
                    <div className="p-5 rounded-2xl bg-linear-to-tr from-violet-600 to-indigo-600 shadow-xl shadow-violet-500/10 text-white flex flex-col items-center justify-center text-center">
                      <p className="text-xs uppercase tracking-wider font-semibold text-white/70">Calculated Monthly EMI</p>
                      <h2 className="text-3xl font-extrabold mt-1">INR {calcResult.emi.toLocaleString('en-IN')}</h2>
                    </div>

                    <div className="divide-y divide-white/5 text-sm">
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Principal</span>
                        <span className="font-semibold text-white">INR {parseFloat(calcData.principal).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Interest Payable</span>
                        <span className="font-semibold text-violet-400">INR {calcResult.totalInterest.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-zinc-400">Total Sum Payable</span>
                        <span className="font-semibold text-white">INR {calcResult.totalAmount.toLocaleString('en-IN')}</span>
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
                    className="w-full border-violet-500/20 text-violet-400 hover:bg-violet-500/10 mt-4"
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
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#6366f1" />
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
                      <span className="w-3 h-3 rounded-full bg-violet-500" />
                      <span>Principal Amount</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500" />
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
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Principal Amount</label>
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
                <Button type="button" className="bg-linear-to-r from-violet-600 to-indigo-600 px-3" onClick={handleCreateCategory}>
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
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
            />
            <label htmlFor="autopay" className="text-sm text-zinc-300 cursor-pointer">
              Enable Auto-generation of upcoming EMI transactions (3 days before due day)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600">
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
