# System Design System & Guidelines (DESIGN.md)

## Context
Government-facing AI evaluation platform for the Directorate of Environment & Climate Change. 
Users are reviewers/auditors, not consumers. The feeling should be: **authoritative, precise, forensic — like a control room, not a SaaS marketing site.**

---

## Tokens (Strict Rules - No Substitutes)

| Token Name | Hex / Value | Purpose / Description |
| :--- | :--- | :--- |
| **Background** | `#0B0F14` | Near-black root background (not pure black) |
| **Surface / Panel** | `#131A21` | Panel surface |
| **Panel Border** | `1px solid #22303A` | Crisp 1px border framing surfaces |
| **Panel Border Radius** | `10px` | Subtle corner rounding (no heavy glassmorphism blur) |
| **Accent (Primary Action / Alert)** | `#3DDC84` | Verification green |
| **Accent (Risk / Warning)** | `#E0A93D` | Warning amber / orange |
| **Accent (Fraud / Critical)** | `#D9534F` | Critical alert red |
| **Text Primary** | `#E8EDF1` | High contrast primary readable text |
| **Text Secondary** | `#8B99A6` | Low contrast metadata and label text |
| **Display Typeface** | `"IBM Plex Mono"`, `"JetBrains Mono"`, monospace | Numbers, scores, timestamps, IDs — audit ledger identity |
| **Body Typeface** | `"Inter"`, `"IBM Plex Sans"`, sans-serif | General UI labels, descriptions, and inputs |
| **Spacing Grid** | `8px` increments (8, 16, 24, 32...) | Strict grid layout; no arbitrary pixel offsets |

---

## Hard Rules

1. **No unnecessary vertical scroll**: Each page's primary content must fit one viewport at 1440x900 unless it's a genuine data table/list. Use tabs, drawers, or accordions instead of stacking sections.
2. **No template layouts**: No centered "hero + 3 icon cards" layout anywhere.
3. **Flat, functional buttons & panels**: No default rounded gradient buttons or generic drop-shadow cards. Buttons: flat fill or 1px outline, sharp letterspacing, no gradients.
4. **Functional icons only**: No decorative icons without function — every icon must map to a real action or status.
5. **One structural idea per page**: Every page has ONE structural idea that matches its job (e.g., the review page is built around a document-vs-form comparison split-view, not a generic form layout). State the structural idea in a one-line comment at the top of each page's component file before coding it.
6. **Data density**: Data-dense pages (tables, evidence, audit trail) prioritize density and scanability over whitespace — this is a working tool, not a landing page.
7. **Intentional Motion**: Motion only on state changes that need it (score reveal, contradiction highlight). No idle floating/pulsing decoration.
8. **Self-Check Audit**: Before finalizing each page, self-check against rules 1-7 and list which ones were almost violated and how they were resolved.

---

## Mandatory Component Workflow

### STEP 1 — PLAN ONLY
Before writing any code, present:
- The one structural idea for this page (one line)
- A rough ASCII wireframe of the layout
- Which DESIGN.md tokens/components to reuse vs. anything new needed
- Any rule from DESIGN.md where application needs clarification or extra attention

*Stop and wait for explicit user approval.*

### STEP 2 — EXECUTE
Only after receiving user approval (or requested revisions to the plan), generate the component code following the approved plan exactly.
