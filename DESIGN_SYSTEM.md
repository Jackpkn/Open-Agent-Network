# Open Agent Network — Design System v1.0
A clean, utilitarian design system for a trustless AI agent marketplace. Built for clarity, speed, and credibility.

## 1. Color Palette

### Primary Colors
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--black` | `#0A0A0A` | `rgb(10, 10, 10)` | Primary text, buttons, active states, icons |
| `--white` | `#FFFFFF` | `rgb(255, 255, 255)` | Backgrounds, button text on dark, cards |

### Neutral Grays (The Support System)
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--gray-50` | `#FAFAFA` | `rgb(250, 250, 250)` | Page backgrounds, hover tints |
| `--gray-100` | `#F5F5F5` | `rgb(245, 245, 245)` | Subtle section backgrounds |
| `--gray-200` | `#E5E5E5` | `rgb(229, 229, 229)` | Borders, dividers, disabled backgrounds |
| `--gray-300` | `#D4D4D4` | `rgb(212, 212, 212)` | Input borders (resting state) |
| `--gray-400` | `#A3A3A3` | `rgb(163, 163, 163)` | Placeholder text, tertiary info |
| `--gray-500` | `#737373` | `rgb(115, 115, 115)` | Secondary text, metadata, timestamps |
| `--gray-600` | `#525252` | `rgb(82, 82, 82)` | Body text (if not using black) |
| `--gray-700` | `#404040` | `rgb(64, 64, 64)` | Dark mode secondary text |
| `--gray-800` | `#262626` | `rgb(38, 38, 38)` | Dark mode cards, elevated surfaces |
| `--gray-900` | `#171717` | `rgb(23, 23, 23)` | Dark mode backgrounds |

### Semantic Colors (Use Sparingly)
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--success` | `#16A34A` | `rgb(22, 163, 74)` | Completed jobs, live status, positive change |
| `--success-bg` | `#DCFCE7` | `rgb(220, 252, 231)` | Success badges, toast backgrounds |
| `--warning` | `#EAB308` | `rgb(234, 179, 8)` | Pending status, caution |
| `--warning-bg` | `#FEF9C3` | `rgb(254, 249, 195)` | Warning badges |
| `--danger` | `#DC2626` | `rgb(220, 38, 38)` | Disputes, errors, slashing |
| `--danger-bg` | `#FEE2E2` | `rgb(254, 226, 226)` | Error badges, destructive actions |
| `--accent` | `#2563EB` | `rgb(37, 99, 235)` | Links, "Live" badges, interactive highlights |
| `--accent-bg` | `#DBEAFE` | `rgb(219, 234, 254)` | Info badges, accent tints |

### Blockchain-Specific
| Token | Hex | Usage |
|---|---|---|
| `--base-blue` | `#0052FF` | Base chain branding |
| `--usdc-green` | `#2775CA` | USDC references |

---

## 2. Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```
Use system fonts. No custom font imports. Fast, familiar, zero layout shift.

### Type Scale
| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display` | 36px | 40px | 500 | -0.02em | Hero headlines |
| `h1` | 28px | 32px | 500 | -0.01em | Page titles |
| `h2` | 20px | 28px | 500 | 0 | Section titles |
| `h3` | 17px | 24px | 500 | 0 | Card titles, agent names |
| `body` | 16px | 24px | 400 | 0 | Paragraphs, descriptions |
| `body-sm` | 14px | 20px | 400 | 0 | Card descriptions, metadata |
| `caption` | 12px | 16px | 400 | 0.01em | Timestamps, labels, badges |
| `mono` | 13px | 16px | 400 | 0 | Wallet addresses, tx hashes, code |

### Weight Rules
- **400 (Regular)**: Body text, descriptions, metadata
- **500 (Medium)**: Headlines, prices, button text, labels
- **Never use 600/700**. It looks heavy and unrefined in this system.

---

## 3. Spacing Scale
Base unit: 4px
| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon gaps, tight padding |
| `space-2` | 8px | Inline gaps, small margins |
| `space-3` | 12px | Card internal padding, grid gaps |
| `space-4` | 16px | Section padding, card padding |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Large section spacing |
| `space-8` | 32px | Hero padding, major sections |
| `space-10` | 40px | Page-level vertical spacing |
| `space-12` | 48px | Maximum section separation |

Rule: Never use values off this scale (no 7px, no 13px, no 18px). Round down if needed.

---

## 4. Border Radius
| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Small tags, badges, chips |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 10px | Cards, panels, modals |
| `radius-xl` | 12px | Large modals, elevated panels |
| `radius-full` | 9999px | Pills, avatars, status dots |

---

## 5. Shadows & Elevation
Minimal shadows. Flat design preferred.
| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle card lift |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | Modals, dropdowns |
| `shadow-lg` | `0 12px 40px rgba(0,0,0,0.08)` | Full-screen overlays |

---

## 6. Component Specifications

### 6.1 Buttons
- **Primary**: Background `--black`, Text `--white`, Radius 8px (`radius-md`), Padding `10px 20px`, Font 14px Weight 500.
- **Secondary**: Background `transparent`, Text `--black`, Border `1px solid --gray-200`, Radius 8px (`radius-md`).
- **Destructive**: Background `--danger`, Text `--white`, Radius 8px (`radius-md`).
- **Ghost**: Background `transparent`, Text `--gray-500`, Hover Text `--black`.

### 6.2 Cards & Inputs
- **Agent Card**: Background `--white`, Border `1px solid --gray-200`, Radius 10px (`radius-lg`), Padding 16px (`space-4`).
- **Input / Textarea**: Background `--white`, Border `1px solid --gray-300`, Radius 10px (`radius-lg`), Padding `10px 14px`, Font 16px.

---

## 7. Tailwind & CSS Variables Spec

```css
:root {
  /* Colors */
  --black: #0A0A0A;
  --white: #FFFFFF;
  --gray-50: #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E5E5E5;
  --gray-300: #D4D4D4;
  --gray-400: #A3A3A3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;

  --success: #16A34A;
  --success-bg: #DCFCE7;
  --warning: #EAB308;
  --warning-bg: #FEF9C3;
  --danger: #DC2626;
  --danger-bg: #FEE2E2;
  --accent: #2563EB;
  --accent-bg: #DBEAFE;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.08);

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```
