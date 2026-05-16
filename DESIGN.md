---
name: Stride OS
description: A self-hosted, agent-native personal execution system
colors:
  ice-signal: "#b4ccff"
  ice-signal-strong: "#d7e5ff"
  ice-signal-wash: "#b4ccff14"
  graphite-canvas: "#101010"
  graphite-shell: "#0b0d10"
  graphite-sidebar: "#14171ce6"
  graphite-surface-1: "#1c1f25e6"
  graphite-surface-2: "#262a31f0"
  graphite-surface-3: "#323842fa"
  graphite-panel: "#1f1f1f"
  graphite-panel-contrast: "#363636"
  frost-hairline: "#eef3ff1f"
  frost-glow: "#b9d0ff47"
  frost-fill: "#ffffff08"
  frost-fill-strong: "#ffffff0a"
  text-high: "#f2f2f2"
  text-mid: "#b8b8b8"
  text-low: "#8f8f8f"
  success-bg: "#1a231c"
  success-border: "#35543b"
  success-text: "#9bc9a7"
  warning-bg: "#2a2218"
  warning-border: "#6b5331"
  warning-text: "#d8bf8a"
  danger-bg: "#261819"
  danger-border: "#6b3c3f"
  danger-text: "#d7a3a7"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.429
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  shell: "0px"
  soft: "8px"
  compact: "10px"
  panel: "14px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "12px"
  panel: "14px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-surface-3}"
    textColor: "{colors.ice-signal-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "#454d5bfa"
    textColor: "{colors.ice-signal-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "10px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.graphite-surface-1}"
    textColor: "{colors.text-mid}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "10px 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-mid}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "10px 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.frost-fill}"
    textColor: "{colors.text-high}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "8px 12px"
    height: "40px"
  surface-panel:
    backgroundColor: "{colors.graphite-surface-1}"
    textColor: "{colors.text-high}"
    rounded: "{rounded.panel}"
    padding: "14px 14px"
  badge-neutral:
    backgroundColor: "{colors.frost-fill-strong}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  nav-item-active:
    backgroundColor: "{colors.ice-signal-wash}"
    textColor: "{colors.text-high}"
    typography: "{typography.body}"
    rounded: "{rounded.soft}"
    padding: "9px 10px"
---

# Design System: Stride OS

## Overview

**Creative North Star: "The Closed-Loop Command Deck"**

Stride OS should feel like a personal control deck for one disciplined operator, late at night, moving from intent to execution to review without leaving the shell. The visual system is cold, sharp, and restrained: dark graphite infrastructure, pale ice highlights, compact geometry, and surfaces that read like instruments instead of cards from a SaaS kit.

This system is not trying to feel friendly, lifestyle-oriented, or decorative. It should never drift toward a soft productivity app, a marketing-first SaaS page, or a fake-futurist dashboard that stacks blur, neon, and spectacle to signal "tech." The interface must stay operational. Every highlight should imply status, priority, or movement inside the execution loop.

**Key Characteristics:**
- Dark graphite shell with cold ice highlights.
- Dense but legible single-family typography.
- Tonal layering first, shadow second.
- Compact 8px, 10px, and 14px geometry with crisp edges.
- Semantic status colors reserved for execution meaning, never decoration.

## Colors

The palette is restrained and systemic: one cold accent, a deep graphite ladder, and semantic signals that only appear when the product is speaking about state.

### Primary
- **Ice Signal** (`#b4ccff`): the default highlight color for primary actions, active navigation, chart emphasis, and system-level cues that need immediate attention.
- **Ice Signal Strong** (`#d7e5ff`): the brighter companion used on emphasized primary controls and high-contrast accent text.
- **Ice Signal Wash** (`#b4ccff14`): the translucent accent field used behind selected nav items and promoted controls. It is never a page background.

### Neutral
- **Carbon Canvas** (`#101010`): the outermost page canvas. It keeps the product grounded and prevents surfaces from reading like floating cards.
- **Shell Graphite** (`#0b0d10`): the authenticated shell background behind the dashboard chrome.
- **Sidebar Alloy** (`#14171ce6`): the darker navigation stratum. It separates the app frame from the working surface without requiring a second accent.
- **Instrument Surface I** (`#1c1f25e6`): the standard panel fill for dashboards, cards, and structured containers.
- **Instrument Surface II** (`#262a31f0`): the raised surface for popups, tooltips, and modal bodies.
- **Instrument Surface III** (`#323842fa`): the strongest neutral fill, used for primary buttons and selected control states.
- **Graphite Panel** (`#1f1f1f`) and **Panel Contrast** (`#363636`): utility darks for feedback blocks, toggles, and checked states.
- **Frost Hairline** (`#eef3ff1f`): the default border language. It should read as a cold edge, not a visible frame.
- **Signal Halo** (`#b9d0ff47`): the promoted border for active or emphasized surfaces.
- **Frost Fill** (`#ffffff08`) and **Frost Fill Strong** (`#ffffff0a`): the translucent interior wash for fields, quiet cards, and neutral badges.
- **High Text** (`#f2f2f2`), **Mid Text** (`#b8b8b8`), and **Low Text** (`#8f8f8f`): the reading ladder. High text is reserved for active content, mid text for standard UI copy, low text for metadata and structural labels.

### Signal Colors
- **Resolved Moss** (`#9bc9a7`, with `#1a231c` background and `#35543b` border): success, closure, and healthy progress.
- **Aged Brass** (`#d8bf8a`, with `#2a2218` background and `#6b5331` border): load warnings, due-today emphasis, and cautionary states.
- **Muted Oxide** (`#d7a3a7`, with `#261819` background and `#6b3c3f` border): risk, error, destructive feedback, and stalled execution.

**The One Glow Rule.** `#b4ccff` and `#d7e5ff` are reserved for primary actions, current selection, chart emphasis, and promoted borders. If a screen reads mostly blue, the screen is wrong.

**The Signal-Only Rule.** Success, warning, and danger colors may describe execution state. They may not be used as decorative accents, section themes, or mood setters.

## Typography

**Display Font:** Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Body Font:** Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Label/Mono Font:** Reuse the same sans stack. Stride OS does not switch families to create hierarchy.

**Character:** The typography should feel operator-grade: compact, crisp, and familiar. It stays inside a single sans family and creates hierarchy through size, weight, and spacing instead of font pairing or display theatrics.

### Hierarchy
- **Display** (`24px`, `600`, `1.333`, `-0.02em`): used for the home title and the most prominent numeric or state-heavy headings.
- **Headline** (`20px`, `600`, `1.4`, `-0.02em`): used for page intros and primary working-surface titles.
- **Title** (`15px`, `600`, `-0.01em`): used for section headers, strong card titles, and short module labels.
- **Body** (`14px`, `400`, `1.429`): used for standard UI copy, action labels, descriptions, and the majority of readable content. Prose should stay concise; this is an instrument panel, not an editorial page.
- **Label** (`11px`, `500`, `0.18em`, uppercase): used for metadata, nav codes, category tags, and small status framing. It creates rhythm without adding a second typeface.

**The One-Family Rule.** Inter carries every layer of the interface. Hierarchy comes from weight, size, and tracking discipline, never from swapping into decorative or display faces.

**The Quiet-Meta Rule.** If text is framing content rather than carrying the message, demote it to the 11px to 12px uppercase label band and keep it in the low-text lane.

## Elevation

Stride OS uses a hybrid of tonal layering and selective shadow. Most surfaces sit flat inside the shell and derive depth from dark-step stacking, hairline borders, and the faint "metal frame" highlight stroke. Shadows appear only when a surface is promoted, detached, or modal. The system should feel machined, not floating.

### Shadow Vocabulary
- **Panel Lift** (`0 12px 36px rgba(0, 0, 0, 0.34)`): reserved for promoted panels such as `app-shell-panel-strong`.
- **Shell Lift** (`0 18px 60px rgba(0, 0, 0, 0.42)`): reserved for modal-scale surfaces that detach from the dashboard plane.
- **Inner Sheen** (`inset 0 1px 0 rgba(255, 255, 255, 0.03)` to `rgba(255, 255, 255, 0.06)`): used inside panels and controls to suggest a cold fabricated surface instead of a flat fill.

**The Metal Frame Rule.** Start depth with tint, hairline, and one controlled highlight stroke. Reach for shadow only after the surface has earned separation. If it looks like glass, it is wrong.

## Components

### Buttons
- **Shape:** crisp compact controls with a `10px` radius. Default button heights sit at `36px` to `40px`.
- **Primary:** `#323842fa` fill, `#b9d0ff47` border, `#d7e5ff` text. It should feel like a powered control, not a promotional CTA.
- **Hover / Focus:** hover deepens the neutral fill instead of flooding the component with accent color. Focus uses a restrained `#d8d8d8` ring and border lift.
- **Secondary / Ghost:** secondary keeps the frosted neutral fill and hairline border; ghost removes the fill entirely and relies on text and subtle hover wash.

### Chips
- **Style:** full-pill badges with `4px 8px` padding, `11px` uppercase labels, and explicit semantic fills.
- **State:** neutral chips stay in the frosted lane; success, warning, and danger chips switch both border and fill so the meaning reads instantly in dense dashboards.

### Cards / Containers
- **Corner Style:** standard surfaces use `10px`; stronger panels and tooltips can expand to `14px`.
- **Background:** panels sit on the graphite ladder and often combine a translucent gradient wash with a dark base.
- **Shadow Strategy:** most containers stay flat at rest. Promoted panels use panel lift, modal surfaces use shell lift.
- **Border:** default borders are hairline-cold, not visible rectangles. Promoted states move to the signal halo border.
- **Internal Padding:** the common container bands are `12px`, `14px`, `16px`, and `20px`, depending on density and component type.

### Inputs / Fields
- **Style:** fields use a frosted translucent fill (`#ffffff08`), a cold hairline border, and a `10px` radius.
- **Focus:** focus changes the border first, then adds a restrained ring. The field should feel activated, not glowing.
- **Error / Disabled:** error messages move to the muted oxide lane. Disabled controls lose opacity and stop asking for attention.

### Navigation
- **Style:** the sidebar is a darker structural band with collapsible width. Items use `8px` rounded cells, inline icons, a quiet code marker, and no decorative separators.
- **Default / Hover / Active:** default items are nearly transparent, hover adds a frost wash, active items switch to the ice-signal wash with halo border and brighter icon tone.
- **Mobile Treatment:** the shell stays structural, not modal. On smaller screens the sidebar behavior compresses before it dramatizes.

### Modal
- **Style:** modals use `10px` corners, `#262a31f0` body fill, a signal halo border, and the strongest shell shadow.
- **Backdrop:** the backdrop is dark and blurred enough to isolate work without turning theatrical.
- **Close Control:** the close button stays circular and neutral, with the same material language as secondary controls.

### Signature Component
- **Dashboard Instrument Tiles:** status tiles, chart panels, and metric chips are the product's signature pattern. They combine uppercase meta labels, short numeric or state-heavy payloads, frosted fills, and just enough metal-frame treatment to feel like calibrated readouts.

## Do's and Don'ts

### Do:
- **Do** keep the shell inside the dark graphite ladder: `#101010`, `#0b0d10`, `#14171ce6`, `#1c1f25e6`, `#262a31f0`, `#323842fa`.
- **Do** reserve `#b4ccff` and `#d7e5ff` for primary action, current selection, chart emphasis, and promoted borders.
- **Do** keep the geometry disciplined: `8px` nav cells, `10px` controls, `14px` promoted panels, and `999px` pills.
- **Do** use semantic green, amber, and oxide only when the interface is describing execution state, risk, or closure.
- **Do** keep copy terse and operational. Labels frame action; they do not narrate the product.

### Don't:
- **Don't** make Stride OS look like a soft or lifestyle-oriented productivity app.
- **Don't** borrow from illustration-led, emotion-value task apps that trade on warmth instead of control.
- **Don't** stack decorative future-tech effects, neon flourishes, or glass-heavy treatments to fake technology.
- **Don't** let any screen read like a marketing page, a habit-building toy, or a conceptual SaaS template.
- **Don't** use accent blue as an inactive fill, a page wash, or a decorative border stripe.
