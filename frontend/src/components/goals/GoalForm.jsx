import React, { useState } from 'react';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildFormData(initialData) {
  if (!initialData) {
    return {
      name: '',
      target_amount: '',
      current_amount: '0',
      target_date: '',
      monthly_contribution: ''
    };
  }

  return {
    name: initialData.name || '',
    target_amount: initialData.target_amount != null ? String(initialData.target_amount) : '',
    current_amount: initialData.current_amount != null ? String(initialData.current_amount) : '0',
    target_date: toDateInput(initialData.target_date),
    monthly_contribution:
      initialData.monthly_contribution != null ? String(initialData.monthly_contribution) : ''
  };
}

export function GoalForm({ onSubmit, onCancel, initialData = null, submitText = 'Create Goal' }) {
  const [formData, setFormData] = useState(() => buildFormData(initialData));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        monthly_contribution: formData.monthly_contribution ? parseFloat(formData.monthly_contribution) : 0,
        target_date: formData.target_date ? new Date(formData.target_date).toISOString() : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Goal Name</label>
        <Input 
          required
          placeholder="e.g. New Car"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Target Amount</label>
             <Input 
                required
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={formData.target_amount}
                onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
            />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Current Saved</label>
             <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.current_amount}
                onChange={(e) => setFormData({...formData, current_amount: e.target.value})}
            />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Target Date (Optional)</label>
        <Input 
             type="date"
             value={formData.target_date}
             onChange={(e) => setFormData({...formData, target_date: e.target.value})}
        />
      </div>
      
       <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Planned Monthly Contribution (Optional)</label>
         <Input 
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.monthly_contribution}
            onChange={(e) => setFormData({...formData, monthly_contribution: e.target.value})}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient">
          {submitText}
        </Button>
      </div>
    </form>
  );
}
