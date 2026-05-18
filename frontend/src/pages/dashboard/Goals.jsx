import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { goalService } from '../../services/goals.js';
import { Plus, Target, Trash2, Calendar, Eye, Edit } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { GoalForm } from '../../components/goals/GoalForm.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

function ProgressBar({ current, target }) {
    const safeCurrent = Math.max(0, current);
    const safeTarget = Math.max(1, target); // Avoid divide by zero
    const percentage = Math.min(100, (safeCurrent / safeTarget) * 100);
    
    return (
        <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-linear-to-r from-violet-500 to-indigo-500 transition-all duration-500" 
                style={{ width: `${percentage}%` }} 
            />
        </div>
    );
}

function formatGoalCurrency(value) {
    const amount = Number(value);
    const safe = Number.isFinite(amount) ? amount : 0;
    return `$${safe.toFixed(0)}`;
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const toast = useToast();

  useEffect(() => {
	  const fetchGoals = async () => {
		  setIsLoading(true);
		  try {
			  const data = await goalService.getAll();
			  setGoals(data);
		  } catch (err) {
			  console.error(err);
		  } finally {
			  setIsLoading(false);
		  }
	  };
	  fetchGoals();
  }, [refreshTrigger]);

  const handleDeleteGoal = async (goal) => {
    if (!goal?.id) {
      return;
    }

    setDeletingGoalId(goal.id);
	  setGoals((prev) => prev.filter((g) => g.id !== goal.id));
	  try {
		  await goalService.delete(goal.id);
		  toast.success('Goal deleted');
	  } catch (err) {
		  console.error('Failed to delete goal', err);
		  toast.error('Failed to delete goal');
		  setRefreshTrigger(p => p+1);
    } finally {
      setDeletingGoalId(null);
	  }
  };

  const [addingFundsTo, setAddingFundsTo] = useState(null);

  const handleAddFunds = async (id, amount) => {
      try {
          await goalService.contribute(id, amount);
          setAddingFundsTo(null);
          setRefreshTrigger(p => p+1);
          toast.success(`$${amount.toFixed(2)} added to goal`);
          
          if (viewingGoal && viewingGoal.id === id) {
              // Refresh logs if viewing details
              fetchLogs(id);
              // Update local goal state for progress bar
               const updatedGoal = { ...viewingGoal, current_amount: parseFloat(viewingGoal.current_amount) + amount };
               setViewingGoal(updatedGoal);
          }
      } catch (err) {
          console.error("Failed to add funds", err);
          toast.error('Failed to contribute to goal');
      }
  };

  const [viewingGoal, setViewingGoal] = useState(null);
  const [goalLogs, setGoalLogs] = useState([]);

  const fetchLogs = async (id) => {
      try {
          const logs = await goalService.getLogs(id);
          setGoalLogs(logs);
      } catch (e) {
          console.error("Failed to fetch logs", e);
          setGoalLogs([]);
      }
  };

  useEffect(() => {
      if (viewingGoal) {
          fetchLogs(viewingGoal.id);
      }
  }, [viewingGoal]);

  const handleCreate = async (data) => {
	  try {
		  await goalService.create(data);
		  setIsModalOpen(false);
		  setEditingGoal(null);
		  setRefreshTrigger(p => p+1);
		  toast.success('Goal created successfully');
	  } catch {
		  toast.error('Failed to create goal');
	  }
  };

  const handleUpdate = async (data) => {
    if (!editingGoal?.id) return;

    try {
      const updated = await goalService.update(editingGoal.id, data);
      setGoals((prev) => prev.map((goal) => (goal.id === updated.id ? updated : goal)));
      if (viewingGoal?.id === updated.id) {
        setViewingGoal(updated);
      }
      setIsModalOpen(false);
      setEditingGoal(null);
      toast.success('Goal updated successfully');
    } catch (err) {
      console.error('Failed to update goal', err);
      toast.error('Failed to update goal');
    }
  };

  return (
	<div className="space-y-8 animate-slide-up">
	   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
		  <h1 className="text-3xl font-bold text-white tracking-tight">Savings Goals</h1>
		  <p className="text-zinc-400 mt-1">Visualize and track your financial targets.</p>
		</div>
		<Button
			onClick={() => {
        setEditingGoal(null);
        setIsModalOpen(true);
      }}
			variant="gradient"
			icon={<Plus size={18} />}
		>
		  Add Goal
		</Button>
	  </div>

	  {/* Goals Grid */}
	  {isLoading ? (
		 <div className="flex items-center justify-center p-12">
			 <span className="text-zinc-500">Loading goals...</span>
		 </div>
	  ) : goals.length === 0 ? (
		  <Card className="bg-zinc-900/40 border-dashed border-zinc-800 p-8 flex flex-col items-center justify-center text-center">
			  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
				  <Target size={24} />
			  </div>
			  <h3 className="text-white font-medium mb-1">No Goals Yet</h3>
			  <p className="text-zinc-500 text-sm max-w-md mx-auto">
				  Set a savings target to stay motivated.
			  </p>
		  </Card>
	  ) : (
		  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			  {goals.map(goal => {
                const committedMonthly = Number(goal.monthly_contribution ?? goal.monthlyContribution ?? 0);
                const safeCommittedMonthly = Number.isFinite(committedMonthly) ? committedMonthly : 0;

                return (
				  <Card 
                    key={goal.id} 
                    className="group bg-zinc-900/40 border-white/5 hover:border-violet-500/20 transition-all cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditingGoal(goal);
                      setIsModalOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setEditingGoal(goal);
                        setIsModalOpen(true);
                      }
                    }}
                  >
					  <CardHeader className="flex flex-row items-center justify-between pb-2">
						 <CardTitle className="text-lg">{goal.name}</CardTitle>
                             <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingGoal(goal);
                                }}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                             onClick={(e) => {
                                 e.stopPropagation(); // Prevent opening details
                                 setPendingDeleteGoal(goal);
                             }}
                          >
							 <Trash2 size={16} />
						 </Button>
                             </div>
					  </CardHeader>
					  <CardContent className="space-y-4">
						  <div className="flex items-end justify-between">
							  <div>
								  <p className="text-2xl font-bold text-white">${parseFloat(goal.current_amount).toFixed(0)}</p>
								  <p className="text-xs text-zinc-500">of ${parseFloat(goal.target_amount).toFixed(0)}</p>
                                  <p className="text-[11px] text-indigo-300 mt-1">
                                      Committed: {formatGoalCurrency(safeCommittedMonthly)} / month
                                  </p>
							  </div>
							  <div className="text-right"> 
								  <span className="text-sm font-bold text-violet-400">
									  {Math.round((goal.current_amount / goal.target_amount) * 100)}%
								  </span>
							  </div>
						  </div>
						  
						  <ProgressBar current={parseFloat(goal.current_amount)} target={parseFloat(goal.target_amount)} />
						  
                          <div className="flex justify-between items-center pt-2">
                             {goal.target_date ? (
							  <div className="flex items-center gap-2 text-xs text-zinc-500">
								  <Calendar size={12} />
								  <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
							  </div>
                             ) : <div />}
                             
                             <div className="flex items-center gap-2">
                               <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-8 text-xs text-zinc-300 hover:bg-zinc-800/80 font-bold"
                                  icon={<Eye size={12} />}
                                  iconPosition="left"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingGoal(goal);
                                  }}
                               >
                                  Details
                               </Button>
                               <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-xs border-zinc-700 hover:bg-zinc-800 font-bold"
                                  icon={<Plus size={12} />}
                                  iconPosition="left"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setAddingFundsTo(goal);
                                  }}
                               >
                                   Add Funds
                               </Button>
                             </div>
                          </div>
					  </CardContent>
				  </Card>
			  );
            })}
		  </div>
	  )}

      <Modal 
		 isOpen={isModalOpen} 
		 onClose={() => {
        setIsModalOpen(false);
        setEditingGoal(null);
      }}
		 title={editingGoal ? "Edit Goal" : "Create New Goal"}
	   >
		   <GoalForm 
        initialData={editingGoal}
			 onSubmit={editingGoal ? handleUpdate : handleCreate}
        submitText={editingGoal ? 'Update Goal' : 'Create Goal'}
			 onCancel={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
		   />
	   </Modal>

       {/* Add Funds Modal */}
       <Modal
         isOpen={!!addingFundsTo}
         onClose={() => setAddingFundsTo(null)}
         title={`Add Funds to ${addingFundsTo?.name}`}
       >
         <form 
            onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(e.target.amount.value);
                if (amount > 0) handleAddFunds(addingFundsTo.id, amount);
            }} 
            className="space-y-4"
         >
             <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Amount to Add</label>
                <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                />
             </div>
             <div className="flex gap-3 pt-2">
                 <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddingFundsTo(null)}>Cancel</Button>
                 <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">Contribute</Button>
             </div>
         </form>
       </Modal>

       {/* Goal Details Modal */}
       <Modal
          isOpen={!!viewingGoal}
          onClose={() => setViewingGoal(null)}
          title={viewingGoal?.name || "Goal Details"}
       >
           {viewingGoal && (
               <div className="space-y-6">
                   <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-1">
                            ${parseFloat(viewingGoal.current_amount).toFixed(0)}
                        </div>
                        <div className="text-zinc-500 text-sm">
                            of ${parseFloat(viewingGoal.target_amount).toFixed(0)} Goal
                        </div>
                   </div>

                   <ProgressBar 
                        current={parseFloat(viewingGoal.current_amount)} 
                        target={parseFloat(viewingGoal.target_amount)} 
                   />

                   <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 flex items-center justify-between">
                       <span className="text-sm text-zinc-400">Committed per month</span>
                       <span className="text-base font-semibold text-indigo-300 tabular-nums">
                           {formatGoalCurrency(Number(viewingGoal.monthly_contribution ?? viewingGoal.monthlyContribution ?? 0))}
                       </span>
                   </div>

                   <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                       <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                           <Calendar size={14} /> History
                       </h4>
                       <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                           {goalLogs.length === 0 ? (
                               <p className="text-xs text-zinc-600 text-center py-4">No contributions yet.</p>
                           ) : (
                               goalLogs.map(log => {
                                   // Parse naive UTC string as UTC
                                   const dateStr = log.created_at.endsWith('Z') ? log.created_at : log.created_at + 'Z';
                                   const date = new Date(dateStr);
                                   return (
                                   <div key={log.id} className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                       <span className="text-zinc-300">
                                           {date.toLocaleDateString()} 
                                           <span className="text-zinc-600 ml-2 text-xs">
                                               {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                           </span>
                                       </span>
                                       <span className="font-semibold text-emerald-400">
                                           +${parseFloat(log.amount).toFixed(2)}
                                       </span>
                                   </div>
                                   );
                               })
                           )}
                       </div>
                   </div>

                   <div className="flex gap-3">
                        <Button 
                            variant="outline"
                            className="w-full border-zinc-700 hover:bg-zinc-800"
                            onClick={() => {
                                setEditingGoal(viewingGoal);
                                setIsModalOpen(true);
                            }}
                        >
                            <Edit size={16} className="mr-2" />
                            Edit Goal
                        </Button>
                        <Button 
                            variant="gradient"
                            icon={<Plus size={16} />}
                            className="w-full"
                            onClick={() => {
                                setAddingFundsTo(viewingGoal);
                                // Don't close details, stack modals? or switch?
                                // For simplicity, keep Details open. The Add Funds modal is separate.
                            }}
                        >
                            Add Funds
                        </Button>
                   </div>
               </div>
           )}
       </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteGoal)}
        title="Delete Goal"
        description={
          pendingDeleteGoal
            ? `Delete "${pendingDeleteGoal.name}"? This will remove the goal and its history from your dashboard.`
            : ''
        }
        confirmText="Delete Goal"
        cancelText="Cancel"
        variant="destructive"
        isConfirming={Boolean(pendingDeleteGoal && deletingGoalId === pendingDeleteGoal.id)}
        onCancel={() => {
          if (pendingDeleteGoal && deletingGoalId === pendingDeleteGoal.id) {
            return;
          }
          setPendingDeleteGoal(null);
        }}
        onConfirm={async () => {
          const goal = pendingDeleteGoal;
          if (!goal) return;
          await handleDeleteGoal(goal);
          setPendingDeleteGoal(null);
        }}
      />
	</div>
  );
}
