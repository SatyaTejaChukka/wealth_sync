# Chapter 15: Frontend Libraries & Utilities

> **Support Layer**: Understanding custom hooks, API services, and utility functions.

---

## Library Structure

```
frontend/src/lib/
├── api.js                # Axios instance ⭐
├── auth.jsx              # AuthProvider ⭐
├── format.js             # Formatting utilities
├── utils.js              # Helper functions
├── safeBudgetSignal.js   # ⭐ Safe Budget Calculations & Weather Signals
└── financeFeedback.js    # Haptic feedback

frontend/src/services/
├── dashboard.js          # Dashboard API
├── transactions.js       # Transactions API
├── bills.js              # Bills API
├── income.js             # ⭐ Expected Income API
└── ... (other API modules)

frontend/src/hooks/
├── useFinanceFeedback.js # Custom hook
└── useTimelineEvents.js  # Timeline hook
```

---

## 1. lib/api.js - Axios Configuration

Already covered in Chapter 14, but key points:

```jsx
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// Auto-add JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  },
);
```

---

## 2. lib/format.js - Formatting Utilities

### formatCurrency

```jsx
export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

// Usage
formatCurrency(1234.56); // "$1,234.56"
formatCurrency(-50.5); // "-$50.50"
```

### formatDate (Relative)

```jsx
export function formatRelativeDate(date) {
  const now = new Date();
  const target = new Date(date);
  const diffInMs = now - target;
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // Fallback to date
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: target.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// Usage
formatRelativeDate(new Date(Date.now() - 5 * 60000)); // "5m ago"
formatRelativeDate(new Date("2024-01-01")); // "Jan 1, 2024"
```

### formatNumber (Compact)

```jsx
export function formatCompactNumber(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toString();
}

// Usage
formatCompactNumber(5000); // "5.0K"
formatCompactNumber(2500000); // "2.5M"
```

---

## 3. lib/utils.js - Helper Functions

### cn() - Conditional Classnames

```jsx
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Usage
cn("px-2 py-1", "bg-blue-500"); // "px-2 py-1 bg-blue-500"

cn("px-2 py-1", someCondition && "border-2");
// If true: "px-2 py-1 border-2"
// If false: "px-2 py-1"

cn("px-2", "px-4"); // "px-4" (twMerge deduplicates Tailwind classes)
```

**Why twMerge?**

```jsx
//❌ Without twMerge
cn("px-2", "px-4"); // "px-2 px-4" (both applied, conflict!)

// ✅ With twMerge
cn("px-2", "px-4"); // "px-4" (latest wins)
```

---

## 3b. lib/safeBudgetSignal.js - Safe Budget Calculations & Weather Signals

This utility computes financial ratios, pacing scores, and the "Money Weather" state for the dashboard from live safe-to-spend metrics.

### calculateSafeBudgetSignal

```jsx
export function calculateSafeBudgetSignal(payload = {}) {
  // Extracts metrics like remaining budget, daily limit, monthly income, commitments, etc.
  // Computes runway, pacing, daily spend, burn, and commitments ratios.
  // Calculates an overall composite score:
  // score = 0.44 * runwayScore + 0.24 * pacingScore + 0.14 * burnScore + 0.1 * dailyScore + 0.08 * commitmentsScore;
  
  // Derives Weather State:
  // - score >= 0.67 -> "calm"
  // - score >= 0.38 -> "balanced"
  // - otherwise    -> "cautious"
  
  // Derives Orb State:
  // - score >= 0.67 -> "carefree"
  // - score >= 0.38 -> "mindful"
  // - otherwise    -> "careful"
}
```

### calculateOrbSize

```jsx
export function calculateOrbSize(score, { min = 120, max = 200 } = {}) {
  // Uses a quadratic easing function to map the score to a pixel dimension for the 3D Safe-To-Spend Orb.
}
```

---

## 4. services/dashboard.js - API Service Module

### Pattern: Wrap API calls in service functions

```jsx
import api from "../lib/api.js";

export const dashboardService = {
  async getSummary(range = "week") {
    const response = await api.get("/dashboard/summary", {
      params: { range },
    });
    return response.data;
  },

  async getTriage() {
    const response = await api.get("/dashboard/triage");
    return response.data;
  },

  async getRecentActivity(limit = 10) {
    const response = await api.get("/dashboard/recent-activity", {
      params: { limit },
    });
    return response.data;
  },
};

// Usage in component
import { dashboardService } from "../services/dashboard.js";

const [data, setData] = useState(null);

useEffect(() => {
  dashboardService.getSummary("week").then(setData).catch(console.error);
}, []);
```

**Benefits**:

- ✅ Centralized API calls
- ✅ Easy mocking for tests
- ✅ Type hints (if using TypeScript)
- ✅ Consistent error handling

---

## 5. hooks/useFinanceFeedback.js - Custom Hook

### Haptic Feedback System

```jsx
const SOUNDS = {
  tap: "/sounds/tap.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  scrub: "/sounds/scrub.mp3",
  refresh: "/sounds/refresh.mp3",
};

export function useFinanceFeedback() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem("finance-feedback-enabled");
    return stored === "true";
  });

  const play = useCallback(
    (type) => {
      if (!enabled || !SOUNDS[type]) return;

      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore autoplay errors
    },
    [enabled],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("finance-feedback-enabled", next);
      return next;
    });
  }, []);

  return {
    enabled,
    toggle,
    feedback: play,
  };
}

// Usage in component
const { enabled, toggle, feedback } = useFinanceFeedback();

<button
  onClick={() => {
    handleSave();
    feedback("success");
  }}
>
  Save
</button>;
```

---

## 6. hooks/useTimelineEvents.js - Timeline Data Hook

### Fetch & Transform Timeline Data

```jsx
export function useTimelineEvents() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Parallel fetch
        const [transactions, bills, subscriptions] = await Promise.all([
          api.get("/transactions?limit=50"),
          api.get("/bills"),
          api.get("/subscriptions"),
        ]);

        // Transform to timeline events
        const timelineEvents = [
          ...transactions.data.map((t) => ({
            id: t.id,
            type: "transaction",
            date: t.occurred_at,
            title: t.description,
            amount: t.amount,
            category: t.category?.name,
          })),
          ...bills.data.map((b) => ({
            id: b.id,
            type: "bill",
            date: calculateNextDueDate(b),
            title: b.name,
            amount: b.amount_estimated,
            status: "upcoming",
          })),
        ];

        // Sort by date
        timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        setEvents(timelineEvents);
      } catch (error) {
        console.error("Failed to fetch timeline", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, isLoading };
}

// Usage
const { events, isLoading } = useTimelineEvents();

if (isLoading) return <Spinner />;

return events.map((event) => <TimelineItem key={event.id} {...event} />);
```

---

## Service Modules Pattern

### Consistent Structure Across All Services

```jsx
// transactions.js
export const transactionService = {
  async list(filters = {}) {
    const response = await api.get("/transactions", { params: filters });
    return response.data;
  },

  async create(data) {
    const response = await api.post("/transactions", data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
};

// bills.js
export const billService = {
  async list() {
    /* ... */
  },
  async create(data) {
    /* ... */
  },
  async pay(id, amount) {
    const response = await api.post(`/bills/${id}/pay`, { amount });
    return response.data;
  },
};

// income.js
export const incomeService = {
  async getIncomes() {
    const response = await api.get("/income/");
    return response.data;
  },

  async createIncome(data) {
    const response = await api.post("/income/", data);
    return response.data;
  },

  async updateIncome(id, data) {
    const response = await api.put(`/income/${id}`, data);
    return response.data;
  },

  async deleteIncome(id) {
    const response = await api.delete(`/income/${id}`);
    return response.data;
  }
};

// loans.js
export const loanService = {
  async list() {
    const response = await api.get('/loans/');
    return response.data;
  },
  async create(data) {
    const response = await api.post('/loans/', data);
    return response.data;
  },
  async repay(id, amount) {
    const response = await api.post(`/loans/${id}/repay`, { amount });
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/loans/${id}`);
    return response.data;
  }
};

// lent.js
export const lentService = {
  async list() {
    const response = await api.get('/lent/');
    return response.data;
  },
  async create(data) {
    const response = await api.post('/lent/', data);
    return response.data;
  },
  async getDetails(id) {
    const response = await api.get(`/lent/${id}`);
    return response.data;
  },
  async repay(id, amount) {
    const response = await api.post(`/lent/${id}/repay`, { amount });
    return response.data;
  },
  async settle(id) {
    const response = await api.post(`/lent/${id}/settle`);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/lent/${id}`);
    return response.data;
  }
};

// calendar.js
export const calendarService = {
  async getEvents(year, month) {
    const response = await api.get(`/calendar/events`, { params: { year, month } });
    return response.data;
  }
};
```

---

## Integration Example: Complete Flow

### Dashboard Component Using All Libraries

```jsx
import { useAuth } from "../lib/auth.jsx";
import { formatCurrency, formatRelativeDate } from "../lib/format.js";
import { cn } from "../lib/utils.js";
import { dashboardService } from "../services/dashboard.js";
import { useFinanceFeedback } from "../hooks/useFinanceFeedback.js";

export default function Dashboard() {
  const { user } = useAuth();
  const { feedback } = useFinanceFeedback();
  const [data, setData] = useState(null);

  useEffect(() => {
    dashboardService.getSummary("week").then(setData);
  }, []);

  const handleRefresh = async () => {
    feedback("refresh");
    const newData = await dashboardService.getSummary("week");
    setData(newData);
    feedback("success");
  };

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <p className={cn("text-2xl", data?.balance > 0 && "text-green-500")}>
        {formatCurrency(data?.balance)}
      </p>
      <p>{formatRelativeDate(data?.last_transaction)}</p>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
}
```

---

## Key Takeaways

1. **api.js**: Axios instance with interceptors
2. **auth.jsx**: Global auth state via Context
3. **format.js**: Currency, dates, numbers
4. **utils.js**: `cn()` for conditional classes
5. **Service modules**: Wrap API calls, easy mocking
6. **Custom hooks**: Encapsulate logic (`useFinanceFeedback`, `useTimelineEvents`)
7. **Integration**: Libraries work together seamlessly

---

## Navigation

**Previous Chapter**: [← Chapter 14: React Setup](./Chapter_14_React_Setup.md)

**Next Chapter**: [→ Chapter 16: UI Components](./Chapter_16_UI_Components.md)

**Back to Index**: [📚 Tutorial Home](./README.md)
