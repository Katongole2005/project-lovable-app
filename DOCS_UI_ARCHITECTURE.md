# MovieBay UI Stacking & Layering Guidelines

To maintain a premium glassmorphism aesthetic while ensuring all content remains visible and interactive, follow these strict layering rules.

## Core Principle: Defensive Layering

Every "content" layer that is a sibling to an "absolute background" layer MUST be explicitly positioned and z-indexed.

### 1. The Z-Index Scale

Always use the semantic z-index scale defined in `tailwind.config.ts`. Never use raw values like `z-999`.

| Level | Tailwind Class | Usage |
| :--- | :--- | :--- |
| **behind** | `z-behind` | Background-only elements (-1) |
| **base** | `z-base` | Default page content (0) |
| **backdrop** | `z-backdrop` | Blurred backdrop images/layers (10) |
| **content** | `z-content` | Actionable content over backdrops (20) |
| **sticky** | `z-sticky` | Sticky headers or sidebars (30) |
| **header** | `z-header` | Main application header (40) |
| **overlay** | `z-overlay` | Non-blocking UI overlays (50) |
| **modal** | `z-modal` | Main centered dialog/modal content (60) |
| **critical** | `z-critical` | Toast messages and tooltips (100) |

## Implementation Patterns

### Standard Modal Pattern

When building a modal with a glassy backdrop:

```tsx
<DialogContent className="fixed z-modal ...">
  {/* Layer 1: Backdrop (The "Glass") */}
  <div className="absolute inset-0 z-backdrop backdrop-blur-xl bg-black/40" />

  {/* Layer 2: Content (The "Interaction") */}
  <div className="relative z-content h-full">
    {/* All buttons and text go here */}
  </div>
</DialogContent>
```

### Key Rule

> [!IMPORTANT]
> **Positioned elements with no z-index sit ABOVE non-positioned elements.**
> 
> If you have an `absolute` background and a standard DOM sibling following it (like a `ScrollArea` or `div`), the background will cover the content unless the content is marked as `relative` or `absolute` with a higher `z-index`.

## Common Pitfall: The "Invisible" Button

If a button is not clickable or text is blurry, check if:
1. It is a child of a non-positioned container sibling to a backdrop.
2. The backdrop has a higher `z-index` in the same stacking context.
3. The parent container has `overflow: hidden` clipping a child that uses `-mt-` or similar transforms.
