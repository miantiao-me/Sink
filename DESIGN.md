---
version: alpha
name: Sink
description: Semantic design tokens and component guidance for the Sink interface.
colors:
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.141 0.005 285.823)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.141 0.005 285.823)"
  primary: "oklch(0.21 0.006 285.885)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-foreground: "oklch(0.552 0.016 285.938)"
  accent: "oklch(0.967 0.001 286.375)"
  accent-foreground: "oklch(0.21 0.006 285.885)"
  success: "oklch(0.55 0.16 145)"
  success-foreground: "oklch(0.985 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.92 0.004 286.32)"
  input: "oklch(0.92 0.004 286.32)"
  ring: "oklch(0.705 0.015 286.067)"
  chart-1: "oklch(0.871 0.15 154.449)"
  chart-2: "oklch(0.723 0.219 149.579)"
  chart-3: "oklch(0.627 0.194 149.214)"
  chart-4: "oklch(0.527 0.154 150.069)"
  chart-5: "oklch(0.448 0.119 151.328)"
  sidebar: "oklch(0.985 0 0)"
  sidebar-foreground: "oklch(0.141 0.005 285.823)"
  sidebar-primary: "oklch(0.21 0.006 285.885)"
  sidebar-primary-foreground: "oklch(0.985 0 0)"
  sidebar-accent: "oklch(0.967 0.001 286.375)"
  sidebar-accent-foreground: "oklch(0.21 0.006 285.885)"
  sidebar-border: "oklch(0.92 0.004 286.32)"
  sidebar-ring: "oklch(0.705 0.015 286.067)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.141 0.005 285.823)"
  dark-background: "oklch(0.141 0.005 285.823)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.21 0.006 285.885)"
  dark-card-foreground: "oklch(0.985 0 0)"
  dark-popover: "oklch(0.21 0.006 285.885)"
  dark-popover-foreground: "oklch(0.985 0 0)"
  dark-primary: "oklch(0.92 0.004 286.32)"
  dark-primary-foreground: "oklch(0.21 0.006 285.885)"
  dark-secondary: "oklch(0.274 0.006 286.033)"
  dark-secondary-foreground: "oklch(0.985 0 0)"
  dark-muted: "oklch(0.274 0.006 286.033)"
  dark-muted-foreground: "oklch(0.705 0.015 286.067)"
  dark-accent: "oklch(0.274 0.006 286.033)"
  dark-accent-foreground: "oklch(0.985 0 0)"
  dark-success: "oklch(0.72 0.17 145)"
  dark-success-foreground: "oklch(0.18 0.04 145)"
  dark-destructive: "oklch(0.704 0.191 22.216)"
  dark-border: "oklch(1 0 0 / 10%)"
  dark-input: "oklch(1 0 0 / 15%)"
  dark-ring: "oklch(0.552 0.016 285.938)"
  dark-chart-1: "oklch(0.871 0.15 154.449)"
  dark-chart-2: "oklch(0.723 0.219 149.579)"
  dark-chart-3: "oklch(0.627 0.194 149.214)"
  dark-chart-4: "oklch(0.527 0.154 150.069)"
  dark-chart-5: "oklch(0.448 0.119 151.328)"
  dark-sidebar: "oklch(0.21 0.006 285.885)"
  dark-sidebar-foreground: "oklch(0.985 0 0)"
  dark-sidebar-primary: "oklch(0.488 0.243 264.376)"
  dark-sidebar-primary-foreground: "oklch(0.985 0 0)"
  dark-sidebar-accent: "oklch(0.274 0.006 286.033)"
  dark-sidebar-accent-foreground: "oklch(0.985 0 0)"
  dark-sidebar-border: "oklch(1 0 0 / 10%)"
  dark-sidebar-ring: "oklch(0.552 0.016 285.938)"
typography:
  sans:
    fontFamily: "IBM Plex Sans, sans-serif"
  heading:
    fontFamily: "IBM Plex Sans, sans-serif"
rounded:
  base: 0.625rem
  lg: 0.625rem
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
---

## Overview

This file is a derived summary for design-aware agents. If it conflicts with `app/assets/css/tailwind.css` or a component under `app/components/ui/**`, the CSS and UI component implementation are authoritative.

## Colors

The unprefixed tokens reproduce the semantic roles in `:root`; `dark-*` tokens flatten the corresponding `.dark` values. Always use roles as intended and keep each background paired with its foreground. The green `chart-1` through `chart-5` sequence is for charts only. Use `success` for positive status and completion indicators, `ring` for focus emphasis, and `destructive` for destructive or invalid states, including their dark-mode counterparts.

## Typography

Use IBM Plex Sans for interface text. `heading` is an alias of the same family, not a separate display face. Components choose font size, weight, and line height with local utilities; this file does not define a global type scale.

## Layout

The repository does not define a global grid, container, breakpoint, or spacing scale. Follow adjacent implementations when composing screens. Sidebar widths and responsive behavior belong to the sidebar component and are not global layout tokens.

## Elevation & Depth

Base surfaces establish depth with semantic backgrounds, borders, and rings. Dialogs and floating content use overlays, rings, and shadows where their implementations specify them. Shadows are component implementation details, not global elevation tokens.

## Shapes

The base radius is `0.625rem`. Derived CSS radii are `sm = calc(var(--radius) - 4px)`, `md = calc(var(--radius) - 2px)`, `lg = var(--radius)`, and `xl = calc(var(--radius) + 4px)`. Utilities such as `rounded-2xl` and `rounded-4xl` are local component choices, not global design tokens.

Generous component radii coexist with compact density; a larger radius does not imply a larger control.

## Components

- Buttons provide default, outline, secondary, ghost, destructive, and link variants, multiple text and icon sizes, focus/invalid rings, active movement, and disabled treatment.
- Inputs and select triggers use input surfaces and borders with placeholder, hover where implemented, focus, invalid, and disabled states; select content uses popover colors and floating-content treatment.
- Cards pair card background and foreground colors, use a subtle ring, and provide default and small density variants. Use small density for repeated dashboard collections and default density for standalone sections, forms, and empty states.
- Standard dialogs use popover colors, an overlay, open/closed motion, and a subtle ring. The scrollable dialog variant instead uses the background role, a border, and a local shadow; other floating content follows its own implementation.
- Tabs provide default filled and line variants with active, hover, focus, disabled, horizontal, and vertical states. When a horizontal list does not fit, scrolling belongs to an outer wrapper, focus-ring clearance is preserved, and the active trigger remains visible.
- The sidebar uses its dedicated background, foreground, accent, border, and ring roles across responsive, collapsible, floating, and inset variants. Primary navigation uses the default shape while idle and a stronger pill treatment for both hover and active states. Secondary utilities are compact icon-only controls and rely on native collapsed behavior. Sidebar primary roles are defined but are not currently consumed by these components.

Components expose stable `data-slot` attributes for composition and styling. Reuse the existing UI components and their variants; do not hand-edit generated components under `app/components/ui/**`.

## Interaction

- Mobile keeps registry control sizes by default and uses larger official variants only when context needs a larger touch target.
- Use menus for compact contextual action lists and popovers for richer anchored content.
- When an overlay opens another, focus moves directly into the new surface and returns to the initiating control when the flow ends.

## Do's and Don'ts

**Do** use semantic colors, preserve background/foreground pairings in both themes, reuse existing components, and keep hover, focus, active, invalid, expanded, and disabled states consistent with nearby implementations.

**Don't** invent tokens, promote generated utility choices to global tokens, or hand-edit `app/components/ui/**`.
