# WealthSync Product & Design Manifesto

Strict rules governing visual aesthetics, copywriting, brand integrity, and launch criteria. These rules must be preserved across all frontend pages, components, and documentation.

---

## 1. Visual Aesthetics & Styling Rules
- **NEVER use purple gradients**: Do not use violet, indigo, fuchsia, or neon purple gradients (e.g. `from-violet-600 to-indigo-600`, `bg-violet-500/20`, neon glows).
- **Color Palette**: Use obsidian, deep zinc/slate (`#09090b`, `#121215`, `#18181b`), crisp white text, and restrained functional accents (emerald `#10b981` for positive cashflow, amber `#f59e0b` for commitments/warning, cyan `#06b6d4` for reserve vaults, rose `#ef4444` for debt/overdue).
- **NEVER use pill-shaped buttons**: Do not use `rounded-full` on buttons or interactive CTA elements. Use structured, crisp rectangular geometry (`rounded-lg` or `rounded-md`) with precise borders (`border border-white/10`) and physical specular rim lighting.
- **No Over-The-Top Animations**: Keep transitions crisp, snappy, and functional (150ms-250ms). No excessive 3D parallax drift, laggy floaters, or custom cursor animations.
- **No Cursor Animations**: Retain the standard operating system cursor.

---

## 2. Copywriting & Content Integrity
- **No Vague Hero Texts / AI-Slop Copy**: No buzzword jargon ("Supercharge your wealth with next-gen AI synergy"). Copy must be direct, mathematical, institutional, and functional.
- **No Emojis as Icons**: Never use raw emojis (⚡, 🚀, 💰, etc.) in UI elements or headers. Always use crisp SVG icons from `lucide-react`.
- **No Em Dashes**: Never use the em dash (`—`) character in copy or headings. Use colons, periods, or standard hyphens where necessary.
- **NEVER use Fake Social Proof or Metrics**: No fake customer counters ("Loved by 10,000+ users"), no fake reviews, no fake testimonials, and no artificial star ratings. Highlight real architectural capabilities, arithmetic models, and deterministic engines.
- **Zero AI-Slop Photos**: No generic Midjourney/DALL-E illustrations, cartoon avatars, or stock photos. Use real interactive data cards, diagrams, financial tables, and SVG schematics.

---

## 3. Mandatory Pre-Launch Criteria
- **Custom Domain Ready**: Production deployment configured for apex/subdomain with proper SSL.
- **Bespoke Favicon**: Clean, institutional SVG favicon with no purple gradients.
- **Zero "Made with AI" Tags**: Ensure no AI attribution tags or generator watermarks exist anywhere.
- **Mandatory Legal Pages**:
  - `/privacy`: Comprehensive, binding Privacy Policy detailing local data encryption and zero third-party advertising tracking.
  - `/terms`: Comprehensive, binding Terms and Conditions covering personal finance software usage, calculation disclaimers, and account security.
