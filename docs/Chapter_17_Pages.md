# Chapter 17: Pages - Complete Breakdown

> **Page Components**: Understanding every page in WealthSync with composition patterns and data flow.

---

## Page Structure

```
frontend/src/pages/
├── Landing.jsx               # Public marketing page
├── Login.jsx                 # Authentication
├── Signup.jsx                # Registration
└── dashboard/                # Protected pages
    ├── Dashboard.jsx         # Main cockpit view ⭐
    ├── Transactions.jsx      # Transaction management
    ├── Budget.jsx            # Budget rules
    ├── Bills.jsx             # Bill tracking
    ├── Subscriptions.jsx     # Subscription management
    ├── Goals.jsx             # Savings goals
    ├── Analytics.jsx         # Charts & insights
    └── Settings.jsx          # User settings
```

---

## Public Pages

### Landing.jsx - Marketing Homepage

**Purpose**: Convert visitors to users

**Structure**:

1. **Header**: Logo + CTA buttons (Sign in, Create account)
2. **Hero**: Large heading + value prop
3. **Problem**: 3 pain points (cards)
4. **Solution**: 4 key features (cards)
5. **Outcomes**: What users can do (checklist)
6. **CTA**: Final signup prompt
7. **Footer**: Copyright

**Key Features**:

```jsx
const problemBlocks = [
  {
    icon: <AlertTriangle />,
    title: "Forgotten recurring payments",
    description: "Bills, subscriptions...",
  },
  // ...
];

const solutionBlocks = [
  {
    title: "Safe-to-Spend Calculation",
    description: "Separates committed money from free money...",
  },
  // ...
];

<button onClick={() => navigate("/signup")}>Start autopilot</button>;
```

**Design**: Dark theme, violet/indigo gradients, glassmorphism cards

---

### Login.jsx - Authentication

**Form Fields**:

- Email (required, validated)
- Password (required, min 8 chars)

**Submission Flow**:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await login(email, password); // From useAuth()

    // Redirect to return URL or dashboard
    const from = location.state?.from || "/dashboard";
    navigate(from, { replace: true });
  } catch (error) {
    setError("Invalid credentials");
  }
};
```

**Features**:

- Error messages
- "Forgot password" link (future)
- "Sign up" link

---

### Signup.jsx - Registration

**Form Fields**:

- Email
- Password
- Confirm password

**Validation**:

```jsx
const validate = () => {
  if (!email.includes("@")) {
    return "Invalid email";
  }
  if (password.length < 8) {
    return "Password too short";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
};
```

---

## Dashboard Pages

### Dashboard.jsx - Main Cockpit View

**Purpose**: Financial command center

**Layout Sections**:

#### 1. Header

Includes the "Money Weather" state calculated using `calculateSafeBudgetSignal` from `safe_to_spend_stats`.

```jsx
const weatherState = useMemo(() => {
  if (!summary.safe_to_spend_stats) return null;
  return calculateSafeBudgetSignal(summary.safe_to_spend_stats).weatherState;
}, [summary.safe_to_spend_stats]);

// Render Header:
<h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex flex-wrap items-center gap-3">
  <span>Welcome back, </span>
  <span className="bg-linear-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
    {user?.full_name || user?.email?.split('@')[0] || 'User'}
  </span>
  {weatherState && (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-zinc-900/60 px-2.5 py-1 text-xs font-semibold text-zinc-300">
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        weatherState === 'calm' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
        weatherState === 'balanced' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
        'bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
      )} />
      Weather: <span className="capitalize">{weatherState}</span>
    </span>
  )}
</h1>
<p>{autopilotStatusText}</p>
<NotificationBell />
<Button onClick={() => navigate('/dashboard/transactions')}>
  + Add Transaction
</Button>
```

#### 2. Key Metrics Grid

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatsCard
    title="Total Balance"
    value={formatCurrency(summary.total_balance)}
    trend={summary.balance_change >= 0 ? 'up' : 'down'}
    icon={Wallet}
  />
  <StatsCard title="Monthly Income" ... />
  <StatsCard title="Monthly Expenses" ... />
  <StatsCard title="Total Savings" ... />
</div>
```

#### 3. Autopilot Core

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <SafeToSpendOrb /> {/* 3D orb visualization */}
  <MoneyFlow stats={summary.safe_to_spend_stats} /> {/* Sankey diagram */}
</div>
```

#### 4. Cockpit Mode (Drag-and-Drop Decks)

**Features**:

- Toggle "Layout Mode"
- Drag to reorder decks
- Persist order to localStorage

```jsx
const [deckOrder, setDeckOrder] = useState(() => readDeckOrder());
const [cockpitMode, setCockpitMode] = useState(false);

const handleDeckDrop = (targetId) => (event) => {
  const sourceId = event.dataTransfer.getData("text/plain");
  setDeckOrder((prev) => reorderDeck(prev, sourceId, targetId));
};

<section
  draggable={cockpitMode}
  onDragStart={handleDeckDragStart(sectionId)}
  onDrop={handleDeckDrop(sectionId)}
>
  {section.content}
</section>;
```

#### 5. Three Decks

**Operations Deck**:

- Action Center (priority tasks)
- Financial Triage Panel (stress radar)
- WhatIf Simulator (scenario planning)
- Health Score Gauge

**Analytics Deck**:

- Spending Chart (line/bar)
- Recent Activity (transaction list)

**Timeline Deck**:

- Past transactions
- Upcoming bills
- Projected balance changes

---

### Transactions.jsx - Transaction Management

**Features**:

1. **List View**: Table with columns (date, description, amount, category)
2. **Filters**: Type (income/expense), category, search
3. **Add Button**: Opens modal form
4. **Row Actions**: Edit, delete

**State Management**:

```jsx
const [transactions, setTransactions] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [filters, setFilters] = useState({
  type: null,
  search: "",
});
const [showModal, setShowModal] = useState(false);

useEffect(() => {
  transactionService
    .list(filters)
    .then(setTransactions)
    .finally(() => setIsLoading(false));
}, [filters]);
```

**Add/Edit Modal**:

```jsx
<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <TransactionForm onSubmit={handleSave} initialData={editingTransaction} />
</Modal>
```

**Delete Confirmation**:

```jsx
const handleDelete = async (id) => {
  if (!confirm("Delete this transaction?")) return;

  await transactionService.delete(id);
  setTransactions((prev) => prev.filter((t) => t.id !== id));

  // Trigger dashboard refresh
  window.dispatchEvent(new Event("transactions:changed"));
};
```

---

### Budget.jsx - Budget & Planning

**Sections**:

1. **Expected Income Sources**: Configure recurring deposits (salaries, freelance, etc.) that feed the autopilot system using `incomeService`. Display active/inactive tags, frequency, and credit day. Uses the `IncomeForm` inside a modal.
2. **Rules List**: A responsive grid showing budget rules for categories (e.g. Groceries) with progress bars (color-coded based on pacing threshold: green/emerald under 80%, yellow/amber between 80-100%, and red/rose over budget limit).
3. **Category Maintenance**: Opens a modal to manage raw spending categories.

**Income Form**:

```jsx
function IncomeForm({ initialData, onSubmit, onCancel, submitText }) {
  const [formData, setFormData] = useState({
    amount: initialData?.amount ? String(initialData.amount) : '',
    frequency: initialData?.frequency || 'monthly',
    payday: initialData?.payday ? String(initialData.payday) : '',
    active: initialData?.active !== undefined ? initialData.active : true,
  });
  
  // Submit maps form payload to API format
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      active: formData.active,
      payday: formData.frequency === 'monthly' ? formData.payday : null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Amount" type="number" value={formData.amount} ... />
      <Select label="Frequency" options={frequencies} value={formData.frequency} ... />
      {formData.frequency === 'monthly' && <Input label="Salary Credit Day (1-31)" ... />}
      <Switch label="Active" checked={formData.active} ... />
    </form>
  );
}
```

**Add/Edit Budget Rule Form**:

```jsx
// BudgetRuleForm
<Form>
  <Select
    label="Category"
    options={categories}
    value={form.category_id}
    onChange={setCategoryId}
  />

  <Select
    label="Allocation Type"
    options={[
      { value: "FIXED", label: "Fixed Amount" },
      { value: "PERCENT", label: "Percentage of Income" },
    ]}
    value={form.allocation_type}
  />

  <Input
    label={form.allocation_type === "FIXED" ? "Amount ($)" : "Percentage (%)"}
    type="number"
    value={form.allocation_value}
  />

  <Input
    label="Monthly Limit (optional)"
    type="number"
    value={form.monthly_limit}
  />
</Form>
```

---

### Bills.jsx - Recurring Payments

**List View**:

```jsx
{
  bills.map((bill) => (
    <Card key={bill.id}>
      <h3>{bill.name}</h3>
      <p>{formatCurrency(bill.amount_estimated)}</p>
      <p>Due {getOrdinal(bill.due_day)} of every month</p>
      {bill.autopay_enabled && <Badge>Autopay</Badge>}

      <Button onClick={() => handlePay(bill)}>Mark as Paid</Button>
    </Card>
  ));
}
```

**Pay Bill Flow**:

```jsx
const handlePay = async (bill) => {
  const amount = prompt(`Amount paid for ${bill.name}?`, bill.amount_estimated);
  if (!amount) return;

  await billService.pay(bill.id, { amount, occurred_at: new Date() });

  // Creates transaction + updates bill.last_paid_at
  window.dispatchEvent(new Event("transactions:changed"));
  fetchBills(); // Refresh list
};
```

---

### Subscriptions.jsx - Subscription Tracking

**Features**:

- **Active subscriptions** with next billing date
- **Usage tracking**: Increment usage counter
- **Cost per use**: `amount / usage_count`
- **Cancel** (sets `is_active = false`)

**Usage Tracker**:

```jsx
<Button onClick={() => trackUsage(subscription.id)}>
  Used {subscription.name toUpperCase()} Today
</Button>

const trackUsage = async (id) => {
  await subscriptionService.trackUsage(id);
  // Backend increments usage_count
  fetchSubscriptions();
};
```

---

### Goals.jsx - Savings Goals

**List View**:

```jsx
{
  goals.map((goal) => (
    <Card key={goal.id}>
      <h3>{goal.name}</h3>
      <Progress
        value={(goal.current_amount / goal.target_amount) * 100}
        color="green"
        showLabel
      />
      <p>
        {formatCurrency(goal.current_amount)} /{" "}
        {formatCurrency(goal.target_amount)}
      </p>
      <p>Monthly contribution: {formatCurrency(goal.monthly_contribution)}</p>

      <Button onClick={() => openContributeModal(goal)}>+ Contribute</Button>
    </Card>
  ));
}
```

**Contribute Modal**:

```jsx
const handleContribute = async (goalId, amount, note) => {
  await savingsService.contribute(goalId, { amount, note });
  // Creates SavingsLog entry + increments goal.current_amount
  fetchGoals();
};
```

---

### Analytics.jsx - Charts & Insights

**Components**:

- **Spending Chart**: Line chart (daily spending over time)
- **Category Breakdown**: Pie chart (spending by category)
- **Income vs Expenses**: Bar chart (monthly comparison)
- **Insights Panel**: AI-generated insights

---

### Settings.jsx - User Settings

**Sections**:

#### 1. Profile Settings

```jsx
<Form>
  <Input label="Full Name" value={fullName} onChange={setFullName} />
  <Input label="Email" value={email} disabled />
  <Input label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} />
  <Button onClick={handleUpdateProfile}>Save</Button>
</Form>
```

#### 2. Change Password

```jsx
<Form>
  <Input label="Current Password" type="password" value={currentPassword} />
  <Input label="New Password" type="password" value={newPassword} />
  <Input label="Confirm New Password" type="password" value={confirmPassword} />
  <Button onClick={handleChangePassword}>Update Password</Button>
</Form>
```

---

## Common Patterns Across Pages

### 1. Data Fetching

```jsx
useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await service.list(filters);
      setData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [filters]); // Re-fetch when filters change
```

### 2. Form Handling

```jsx
const [form, setForm] = useState({ name: "", amount: "" });

const handleChange = (field, value) => {
  setForm((prev) => ({ ...prev, [field]: value }));
};

const handleSubmit = async () => {
  const errors = validate(form);
  if (errors) {
    setErrors(errors);
    return;
  }

  await service.create(form);
  setShowModal(false);
  fetchData();
};
```

### 3. Optimistic Updates

```jsx
const handleDelete = async (id) => {
  // Optimistically remove from UI
  setItems((prev) => prev.filter((item) => item.id !== id));

  try {
    await service.delete(id);
  } catch (error) {
    // Rollback on error
    fetchItems();
    toast.error("Delete failed");
  }
};
```

---

## Key Takeaways

1. **9 pages**: 3 public + 6 dashboard pages
2. **Dashboard.jsx**: Most complex (cockpit mode, drag-and-drop, 3 decks)
3. **CRUD patterns**: List → Create → Edit → Delete
4. **Modal forms**: Reusable for add/edit
5. **Optimistic updates**: Better UX
6. **Event-driven refresh**: `transactions:changed` event
7. **Loading states**: Skeleton UX while fetching

---

## Navigation

**Previous Chapter**: [← Chapter 16: UI Components](./Chapter_16_UI_Components.md)

**Next Chapter**: [→ Chapter 18: Styling & UX](./Chapter_18_Styling.md)

**Back to Index**: [📚 Tutorial Home](./README.md)
