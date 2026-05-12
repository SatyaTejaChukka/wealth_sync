import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Select.jsx';
import { categoryService } from '../../services/categories.js';
import { Plus, Check } from 'lucide-react';
import { useToast } from '../ui/Toast.jsx';

export function BudgetRuleForm({
  onSubmit,
  onCancel,
  initialData = null,
  submitText = 'Save Rule'
}) {
  const [formData, setFormData] = useState({
    category_id: '',
    allocation_type: 'FIXED', 
    allocation_value: '',
    monthly_limit: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!initialData) {
      setFormData({
        category_id: '',
        allocation_type: 'FIXED',
        allocation_value: '',
        monthly_limit: ''
      });
      return;
    }

    setFormData({
      category_id: initialData.category_id || '',
      allocation_type: initialData.allocation_type || 'FIXED',
      allocation_value:
        initialData.allocation_value != null ? String(initialData.allocation_value) : '',
      monthly_limit: initialData.monthly_limit != null ? String(initialData.monthly_limit) : ''
    });
  }, [initialData]);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setIsLoading(false);
    }
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
          const newCat = await categoryService.create({ name: normalizedName, color: '#8b5cf6' }); // Default color
          setCategories((prev) => [...prev, newCat]);
          setFormData((prev) => ({ ...prev, category_id: newCat.id }));
          setNewCategoryName('');
          setIsCreatingCategory(false);
          toast.success('Category created');
      } catch (error) {
          const detail = error?.response?.data?.detail;
          const message =
            typeof detail === 'string' && detail.trim()
              ? detail
              : 'Failed to create category';
          toast.error(message);
      }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category_id) {
        toast.warning('Please select a category');
        return;
    }
    onSubmit({
        ...formData,
        allocation_value: parseFloat(formData.allocation_value),
        monthly_limit: formData.monthly_limit ? parseFloat(formData.monthly_limit) : null
    });
  };

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Category</label>
        
        {!isCreatingCategory ? (
            <div className="flex gap-2">
                 <div className="flex-1">
                    <Select 
                        options={categoryOptions}
                        value={formData.category_id}
                        onChange={(val) => setFormData({...formData, category_id: val})}
                        placeholder={isLoading ? "Loading categories..." : "Select a category"}
                    />
                 </div>
                 <Button 
                    type="button" 
                    variant="outline" 
                    className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
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
                />
                <Button type="button" variant="gradient" onClick={handleCreateCategory}>
                   <Check size={16} />
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                   Cancel
                </Button>
            </div>
        )}
        {categories.length === 0 && !isLoading && !isCreatingCategory && (
             <p className="text-xs text-yellow-500">You have no categories. Click + to create one.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Type</label>
            <Select 
                options={[
                    { value: 'FIXED', label: 'Fixed Amount' },
                    { value: 'PERCENT', label: 'Percentage' }
                ]}
                value={formData.allocation_type}
                onChange={(val) => setFormData({...formData, allocation_type: val})}
            />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Value</label>
             <Input 
                required
                type="number"
                step="0.01"
                placeholder={formData.allocation_type === 'PERCENT' ? "e.g. 10 (%)" : "e.g. 500 (INR)"}
                value={formData.allocation_value}
                onChange={(e) => setFormData({...formData, allocation_value: e.target.value})}
            />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Monthly Limit (Optional)</label>
        <Input 
             type="number"
             step="0.01"
             placeholder="Hard cap amount"
             value={formData.monthly_limit}
             onChange={(e) => setFormData({...formData, monthly_limit: e.target.value})}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
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
