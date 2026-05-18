# Chapter 18: Styling, UX & Accessibility

> **Visual Layer**: Understanding Tailwind CSS, animations, and accessibility patterns.

---

## Styling Architecture

```
frontend/src/
├── index.css               # Global styles + Tailwind
└── components/
    └── ui/                 # Styled components
```

---

## 1. Tailwind CSS Configuration

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        violet: {
          50: "#faf5ff",
          // ... (Tailwind defaults)
          600: "#7c3aed", // Primary brand color
        },
        // Custom semantic colors
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
```

---

## 2. Global Styles (index.css)

```css
/* Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles */
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-[#09090b] text-white antialiased;
    /* ↑ Dark background, white text, smooth fonts */
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-zinc-900;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-zinc-700 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-600;
  }
}

/* Custom components */
@layer components {
  .card {
    @apply rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md;
    /* ↑ Glassmorphism effect */
  }

  .btn-primary {
    @apply bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-violet-500/20;
  }

  .input-field {
    @apply w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all;
  }
}

/* Utility classes */
@layer utilities {
  .bg-linear-to-r {
    background-image: linear-gradient(to right, var(--tw-gradient-stops));
  }

  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .text-gradient {
    @apply bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent;
  }
}
```

---

## 3. Design Tokens

### Colors

**Brand Colors**:

- Primary: Violet (#7c3aed)
- Secondary: Indigo (#6366f1)
- Accent: Emerald (#10b981)

**Semantic Colors**:

- Success: Green
- Warning: Yellow
- Error: Red
- Info: Blue

**Dark Theme Palette**:

- Background: `#09090b` (almost black)
- Surface: `#18181b` (zinc-900)
- Border: `rgba(255, 255, 255, 0.1)` (white/10)
- Text: `#ffffff` (white)
- Muted: `#a1a1aa` (zinc-400)

### Spacing Scale

Tailwind's default scale:

- `p-2` = 0.5rem (8px)
- `p-4` = 1rem (16px)
- `p-6` = 1.5rem (24px)
- `p-8` = 2rem (32px)

### Typography

```css
.title-lg {
  @apply text-4xl sm:text-6xl font-bold leading-tight;
}

.title-md {
  @apply text-2xl sm:text-3xl font-bold;
}

.body {
  @apply text-base text-zinc-300 leading-relaxed;
}

.label {
  @apply text-sm font-medium text-zinc-400;
}
```

---

## 4. Glassmorphism Effects

**Card Component**:

```jsx
<div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md">
  {/* Content */}
</div>
```

**Breakdown**:

- `border-white/10`: Semi-transparent border
- `bg-zinc-900/40`: 40% opacity background
- `backdrop-blur-md`: Blurs background behind card

### Gradient Overlays

```jsx
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-2xl" />
  <div className="relative z-10">{/* Content */}</div>
</div>
```

---

## 5. Animation System

### Fade In (Page Load)

```jsx
<div className="animate-fade-in">{/* Content fades in on mount */}</div>
```

### Slide Up (Modal)

```jsx
<Modal>
  <div className="animate-slide-up">{/* Modal content slides up */}</div>
</Modal>
```

### Pulse (Loading)

```jsx
<div className="animate-pulse-slow bg-zinc-800 rounded h-4 w-full" />
```

### Spin (Spinner)

```jsx
<div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
```

### Hover Effects

```jsx
<button className="group">
  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
</button>
```

---

## 6. Responsive Design Patterns

### Mobile-First Approach

```jsx
<div
  className="
  w-full           /* Mobile: full width */
  sm:w-1/2         /* Small screens: 50% */
  md:w-1/3         /* Medium: 33% */
  lg:w-1/4         /* Large: 25% */
"
>
  {/* Content */}
</div>
```

### Responsive Grid

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

### Responsive Typography

```jsx
<h1 className="text-4xl sm:text-6xl lg:text-7xl">
  {/* Scales from 4xl → 6xl → 7xl */}
</h1>
```

---

## 7. Accessibility (a11y)

### Keyboard Navigation

**Tab Order**:

- All interactive elements focusable
- Logical tab order (top → bottom, left → right)

**Focus States**:

```jsx
<button
  className="
  focus:outline-none
  focus:ring-2
  focus:ring-violet-500
  focus:ring-offset-2
  focus:ring-offset-zinc-900
"
>
  Click Me
</button>
```

**Keyboard Shortcuts**:

- `Tab`: Navigate forward
- `Shift + Tab`: Navigate backward
- `Enter`/`Space`: Activate button
- `Esc`: Close modal

### Screen Reader Support

**Semantic HTML**:

```jsx
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

<main>
  {/* Main content */}
</main>
```

**ARIA Labels**:

```jsx
<button aria-label="Delete transaction">
  <TrashIcon />  {/* Icon-only button */}
</button>

<div role="status" aria-live="polite">
  {loading ? 'Loading...' : 'Loaded'}
</div>
```

### Color Contrast

**WCAG AA Compliance**:

- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum

**Examples**:

- ✅ White text on `#09090b` (black) = 19:1
- ✅ `#a1a1aa` (zinc-400) on black = 8:1
- ❌ Light gray on white = 2:1 (fail)

### Skip Links

```jsx
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to content
</a>

<main id="main">
  {/* Content */}
</main>
```

---

## 8. UX Patterns

### Loading States

**Skeleton**:

```jsx
{
  isLoading ? (
    <div className="space-y-3">
      <div className="h-4 bg-zinc-800 rounded animate-pulse" />
      <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
    </div>
  ) : (
    <p>{content}</p>
  );
}
```

**Spinner**:

```jsx
{
  isLoading && (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-zinc-700 border-t-violet-600 rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  );
}
```

### Empty States

```jsx
{
  items.length === 0 && (
    <div className="text-center py-12">
      <InboxIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
      <p className="text-zinc-400">No transactions yet</p>
      <Button onClick={handleAdd}>Add Your First</Button>
    </div>
  );
}
```

### Error States

```jsx
{
  error && (
    <Alert type="error">
      <p>{error.message}</p>
      <Button onClick={handleRetry}>Retry</Button>
    </Alert>
  );
}
```

### Toast Notifications

```jsx
const { toast } = useToast();

const handleSave = async () => {
  try {
    await save();
    toast.success("Saved successfully!");
  } catch (error) {
    toast.error("Save failed");
  }
};
```

---

## 9. Haptic Feedback (Optional)

### Audio Feedback

```jsx
const playSound = (type) => {
  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.volume = 0.3;
  audio.play();
};

<button
  onClick={() => {
    handleClick();
    playSound("tap");
  }}
>
  Click
</button>;
```

---

## Key Takeaways

1. **Tailwind CSS**: Utility-first, custom configuration
2. **Dark theme**: `#09090b` background, glassmorphism
3. **Animations**: fade-in, slide-up, pulse, spin
4. **Responsive**: Mobile-first, breakpoints (sm, md, lg)
5. **Accessibility**: Keyboard navigation, ARIA labels, contrast
6. **UX patterns**: Loading skeletons, empty states, toasts
7. **Glassmorphism**: `backdrop-blur-md` + semi-transparent backgrounds

---

## Navigation

**Previous Chapter**: [← Chapter 17: Pages](./Chapter_17_Pages.md)

**Next Chapter**: [→ Chapter 19: Deployment](./Chapter_19_Deployment.md)

**Back to Index**: [📚 Tutorial Home](./README.md)
