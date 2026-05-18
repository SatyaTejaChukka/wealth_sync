import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { budgetService } from '../../services/budgets.js';
import { Plus, Settings2, Trash2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { BudgetRuleForm } from '../../components/budget/BudgetRuleForm.jsx';
import { CategoryMaintenanceModal } from '../../components/budget/CategoryMaintenanceModal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatCurrency } from '../../lib/format.js';

function toAmount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getRuleProgress(rule, categoryBreakdown) {
  const breakdown = categoryBreakdown?.[rule.category_id] || {};
  const spent = toAmount(breakdown.spent);
  const allocated = toAmount(breakdown.allocated);
  const monthlyLimit = toAmount(rule.monthly_limit);
  const fixedAllocation = rule.allocation_type === 'FIXED' ? toAmount(rule.allocation_value) : 0;

  const totalBudget = monthlyLimit > 0 ? monthlyLimit : (allocated > 0 ? allocated : fixedAllocation);
  const percentRaw = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const percent = Math.min(100, Math.max(0, percentRaw));

  let toneClass = 'bg-emerald-500';
  if (percentRaw > 100) {
    toneClass = 'bg-rose-500';
  } else if (percentRaw > 80) {
    toneClass = 'bg-amber-500';
  }

  return {
    spent,
    totalBudget,
    percentRaw,
    percent,
    toneClass,
  };
}


export default function Budget() {
  const [rules, setRules] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [pendingDeleteRuleId, setPendingDeleteRuleId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const toast = useToast();

  useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          const [ruleResult, summaryResult] = await Promise.allSettled([
              budgetService.getRules(),
              budgetService.getSummary(),
          ]);

          if (ruleResult.status === 'fulfilled') {
              setRules(ruleResult.value);
          } else {
              console.error(ruleResult.reason);
              setRules([]);
          }

          if (summaryResult.status === 'fulfilled') {
              setCategoryBreakdown(summaryResult.value?.category_breakdown || {});
          } else {
              console.error(summaryResult.reason);
              setCategoryBreakdown({});
          }

          setIsLoading(false);
      };
      fetchData();
  }, [refreshTrigger]);

  const handleDeleteRule = async (id) => {
      setRules((prev) => prev.filter((r) => r.id !== id));
      try {
          await budgetService.deleteRule(id);
          toast.success('Budget rule deleted');
      } catch (err) {
          console.error('Failed to delete rule', err);
          toast.error('Failed to delete rule');
          setRefreshTrigger(p => p+1);
      }
  };

  const handleCreateRule = async (data) => {
      try {
          await budgetService.createRule(data);
          setIsModalOpen(false);
          setEditingRule(null);
          setRefreshTrigger(p => p+1);
          toast.success('Budget rule created');
      } catch {
        toast.error('Failed to create rule. Check category ID.');
      }
  };

  const handleUpdateRule = async (data) => {
      if (!editingRule?.id) {
        return;
      }

      try {
          await budgetService.updateRule(editingRule.id, data);
          setIsModalOpen(false);
          setEditingRule(null);
          setRefreshTrigger(p => p+1);
          toast.success('Budget rule updated');
      } catch (err) {
          console.error('Failed to update budget rule', err);
          toast.error('Failed to update budget rule');
      }
  };

  const handleCategoriesChanged = () => {
      setRefreshTrigger((prev) => prev + 1);
  };

  if (isLoading) {
       return (
        <div className="flex items-center justify-center h-[50vh]">
             <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
                <span className="text-sm font-medium">Loading Budget...</span>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Budget & Planning</h1>
          <p className="text-zinc-400 mt-1">Manage your spending limits and automations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              variant="surface"
              icon={<Settings2 size={18} />}
          >
            Manage Categories
          </Button>
          <Button 
              type="button"
              onClick={() => {
                setEditingRule(null);
                setIsModalOpen(true);
              }}
              variant="gradient"
              icon={<Plus size={18} />}
          >
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      <div className="grid gap-6">
          {rules.length === 0 ? (
              <Card className="bg-zinc-900/40 border-dashed border-zinc-800 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                      <AlertCircle size={24} />
                  </div>
                  <h3 className="text-white font-medium mb-1">No Budget Rules Set</h3>
                  <p className="text-zinc-500 text-sm max-w-md mx-auto">
                      Create rules to automatically allocate your income to different categories or savings goals.
                  </p>
              </Card>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rules.map(rule => {
                      const progress = getRuleProgress(rule, categoryBreakdown);
                      return (
                      <Card
                        key={rule.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setEditingRule(rule);
                          setIsModalOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setEditingRule(rule);
                            setIsModalOpen(true);
                          }
                        }}
                        className="relative group overflow-hidden bg-zinc-900/40 border-white/5 hover:border-violet-500/20 transition-all cursor-pointer"
                      >
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="text-base">
                                 {rule.category ? rule.category.name : 'Uncategorized'}
                             </CardTitle>
                             <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPendingDeleteRuleId(rule.id);
                                  }}
                                >
                                    <Trash2 size={16} />
                                </Button>
                             </div>
                          </CardHeader>
                          <CardContent>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-bold text-white">
                                      {rule.allocation_type === 'PERCENT' ? `${rule.allocation_value}%` : formatCurrency(rule.allocation_value)}
                                  </span>
                                  <span className="text-xs text-zinc-500 font-medium">ALLOCATED</span>
                              </div>
                              {rule.monthly_limit && (
                                  <p className="text-xs text-zinc-500 mt-2">
                                      Limit: <span className="text-zinc-300">{formatCurrency(rule.monthly_limit)}</span>
                                  </p>
                              )}

                              <div className="mt-4">
                                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                      <div
                                          className={`h-full rounded-full transition-all duration-500 ${progress.toneClass}`}
                                          style={{ width: `${progress.percent}%` }}
                                      />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[11px]">
                                      <span className="text-zinc-500">
                                          Spent {formatCurrency(progress.spent)}
                                          {progress.totalBudget > 0 ? ` / ${formatCurrency(progress.totalBudget)}` : ''}
                                      </span>
                                      <span className={progress.percentRaw > 100 ? 'text-rose-400' : 'text-zinc-400'}>
                                          {Math.round(progress.percentRaw)}%
                                      </span>
                                  </div>
                              </div>
                          </CardContent>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Card>
                  )})}
              </div>
          )}
      </div>

      <Modal 
         isOpen={isModalOpen} 
         onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
         }}
         title={editingRule ? 'Edit Budget Rule' : 'Create Budget Rule'}
       >
           <BudgetRuleForm 
             initialData={editingRule}
             onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
             submitText={editingRule ? 'Update Rule' : 'Save Rule'}
             onCancel={() => {
              setIsModalOpen(false);
              setEditingRule(null);
             }} 
           />
       </Modal>

      <CategoryMaintenanceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        rules={rules}
        onCategoriesChanged={handleCategoriesChanged}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteRuleId)}
        title="Delete Budget Rule"
        description="Delete this budget rule? This cannot be undone."
        confirmText="Delete Rule"
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => setPendingDeleteRuleId(null)}
        onConfirm={async () => {
          const id = pendingDeleteRuleId;
          if (!id) return;
          setPendingDeleteRuleId(null);
          await handleDeleteRule(id);
        }}
      />
    </div>
  );
}
