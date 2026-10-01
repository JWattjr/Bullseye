---
name: Bullseye
description: A film-festival programme for free opening-weekend forecasting.
colors:
  paper: "#f5f2e9"
  ink: "#24261f"
  muted: "#616358"
  line: "#d3d0c5"
  orange: "#c64018"
  orange-hover: "#a43211"
  lime: "#daeab0"
  pink: "#eed5dc"
  white: "#fffdf7"
  button-text: "white"
  notice: "#ebe9df"
  selected-range: "#f5e5da"
  synthetic: "#e2dbef"
  synthetic-ink: "#4d3f6b"
  practice-ink: "#394629"
  pink-art-ink: "#72313f"
  lime-art-ink: "#37472b"
  confirmed-ink: "#364529"
  error: "#f3ded5"
  error-ink: "#762b15"
  histogram-track: "#eae7dd"
  status: "#4b652f"
typography:
  display:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "88px"
    fontWeight: 400
    lineHeight: ".97"
    letterSpacing: "-.025em"
  headline:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "35px"
    fontWeight: 400
    lineHeight: "1.05"
  title:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: "1.1"
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.55"
  action:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 700
  label:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: ".04em"
rounded:
  tag: "3px"
  interval: "4px"
  field: "5px"
  control: "6px"
  proof: "8px"
  circle: "50%"
spacing:
  icon-gap: "7px"
  compact: "12px"
  control-gap: "20px"
  row-gap: "30px"
  desktop-gutter: "48px"
  detail-gap: "65px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.button-text}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "13px 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "13px 22px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
    width: "100%"
  tag-practice:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.practice-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "5px 9px"
  tag-synthetic:
    backgroundColor: "{colors.synthetic}"
    textColor: "{colors.synthetic-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "5px 9px"
  range-option:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
    height: "58px"
  range-option-selected:
    backgroundColor: "{colors.selected-range}"
  proof-panel:
    backgroundColor: "{colors.notice}"
    rounded: "{rounded.proof}"
    padding: "25px"
---

# Design System: Bullseye

## Overview

**Creative North Star: "The Film-Festival Programme"**

Bullseye feels like a warm printed programme made interactive: condensed film titles, quietly ruled schedules, aligned numerical intervals, and an orange mark that points to the next call. The paper surface supports reading and evidence; original typographic film art gives the programme its cinema character.

The system combines expressive headlines with restrained controls and plain language. Its bullseye geometry is limited to branding, the title band, original artwork, and small status icons. Honest empty states, practice labels, pending receipts, and disclosed evidence belong to this world as naturally as successful predictions.

**Key Characteristics:**

- Warm paper and dark ink with a vivid orange action accent.
- Self-hosted condensed display type paired with readable sans-serif text.
- Flat ruled rows and outlined numerical selections.
- Original geometric film artwork and restrained target motifs.
- Mobile layouts that prioritize the current action and preserve honest state labels.

## Colors

The palette resembles printed paper, ink, and coloured programme inserts. Frontmatter records the implemented values; CSS custom properties in app/globals.css remain the implementation source.

### Primary

- **Programme Orange**: primary actions, headline emphasis, brand marks, selected radio accents, histogram fills, links, and focus outlines.
- **Deep Programme Orange**: enabled primary-button hover.

### Secondary

- **Programme Lime**: historical practice tags, confirmation surfaces, text selection, and one original artwork variant.
- **Film Pink**: the second original artwork variant.
- **Rehearsal Lavender**: synthetic labels; its paired dark lavender ink keeps mode identification readable.

### Neutral

- **Warm Paper**: page canvas and inverse text on dark controls.
- **Programme Ink**: titles, reading text, selected filters, and outlined secondary actions.
- **Muted Olive Ink**: supporting copy, event metadata, and captions.
- **Paper Rule**: row separators, field strokes, and interval outlines.
- **Light Paper**: fields, evidence passages, and hover surfaces.
- **Notice Paper**: proof panels and contextual notices.
- **Selected Range Wash**: the orange-tinted selected radio surface.
- **Histogram Paper**: track backgrounds.
- **Error Paper / Error Ink**: recovery messages.
- **Artwork, Practice, Confirmation, and Status Inks**: dedicated dark tones for their coloured surfaces; these do not replace the main reading ink.
- **Button White**: actual primary-action text colour, distinct from Light Paper.

**The Orange Action Rule.** Use orange to identify an action, selected range, result emphasis, or brand mark; retain ink for ordinary reading.

## Typography

**Display Font:** Bebas Neue, sans-serif fallback.
**Body Font:** DM Sans, sans-serif fallback.

Both fonts are self-hosted through @fontsource. Bebas Neue is loaded at regular weight; DM Sans uses regular, medium, and bold weights.

### Hierarchy

- **Display**: the frontmatter display role is the large feed title. It steps to 72px at the tablet breakpoint and 65px on mobile.
- **Headline**: section headings use the headline role, stepping to 30px on mobile. Round detail titles use 64px on desktop and 53px on mobile.
- **Title**: the base title role is 28px. Programme film titles use 44px on desktop and 35px on mobile; saved prediction titles use 33px and 29px.
- **Body**: regular DM Sans provides the base reading rhythm. Paragraphs have a maximum measure of 70ch. Introductory copy uses 17px on desktop and 14px on mobile; evidence passages use 16px and 14px.
- **Action**: bold DM Sans labels distinguish buttons and orange text actions from reading copy.
- **Label**: tags use compact bold uppercase labels. Supporting metadata generally ranges from 10px to 13px on desktop and 9px to 11px on mobile.
- **Record**: code uses the browser monospace family at 12px, stepping to 10px on mobile; long hashes and URLs wrap.

**The Film Title Rule.** Reserve Bebas Neue for titles, brand lettering, artwork, and large results. Reading copy, range labels, and technical explanations use DM Sans or monospace.

## Layout

The desktop header is centred with a maximum width of 1344px. Main content and footer are centred at 1248px; standard desktop side padding is 48px. At widths of 1400px and above, the main side padding becomes 30px. At 950px and below, header and main gutters become 26px; at 650px and below they become 20px.

The title band uses a 1.35:1 grid with a 30px gap. Programme rows use a 153px art column and a flexible reading column separated by 30px. On mobile, programme rows retain their artwork in an 89px column with a 17px gap. Interval previews wrap at tablet sizes and retain four distinct ranges.

Desktop detail uses a 265px art column with a 65px gap; the tablet art column is 205px with a 32px gap. At the mobile breakpoint, detail intentionally hides its desktop artwork column so the picker and result use the full content width. This is a detail-page decision; the mobile feed retains original film artwork.

Header navigation becomes a full-width second row on mobile. Creator and explanatory two-column layouts collapse to one column. Proof panels, source attribution, result blocks, and definition lists stack; numerical histograms keep four columns. Main content has generous bottom padding, and footer content wraps.

## Elevation & Depth

There are no box shadows. Depth comes from paper tones, coloured status surfaces, fine rules, and generous spacing. Programme rows stay on the page canvas; the proof panel and evidence passages receive tonal surfaces. The artwork uses clipped oversized lettering and thin circular geometry, not simulated physical depth.

**The Flat Programme Rule.** Use rules and tonal changes to separate content; retain the implemented absence of shadows.

## Shapes

Artwork and programme rows are square edged. Tags, interval previews, fields, controls, and proof panels use the small radius scale in frontmatter. Circles are reserved for the target motif, artwork rings, and small status dots. Borders are normally one pixel; selected ranges gain an orange border and a pale wash.

## Components

### Buttons

Primary buttons are orange with white text; secondary buttons have an ink outline on the paper canvas and become ink-filled with paper text on hover. Both use compact rounded corners, bold labels, and a 20px content gap. The 48px desktop minimum height steps to 44–45px for specific mobile feed actions; the full-width confirmation action stays prominent.

Background and text transitions last 160ms. Disabled controls use 0.48 opacity and a not-allowed cursor. Keyboard focus uses a 3px orange outline offset by 5px.

### Chips

Historical practice uses lime; synthetic rehearsal uses lavender. Tags are small uppercase mode labels, not interactive controls. Filter buttons are separate: muted text on transparent paper, with an ink fill and paper text when selected. Filter state is exposed through aria-pressed.

### Cards / Containers

The main catalogue is made of ruled programme rows. Proof panels have a Notice Paper surface, an 8px corner radius, and 25px desktop padding, stepping to 18px on mobile. Contextual notices and confirmation panels use smaller rounded corners. Evidence passages are flat Light Paper blocks.

### Inputs / Fields

Creator inputs and textareas are full width, with Light Paper fill, a Paper Rule stroke, compact corners, and 13px by 14px padding. Textareas resize vertically and use a 1.65 line height. Orange caret and shared visible-focus styling keep interaction consistent.

### Navigation

Desktop navigation uses medium DM Sans, muted text, and an orange underline for the active or hovered route. The creator link stays in navigation. A visible orange Connect wallet control sits beside the brand on mobile and at the right of the desktop header; its connected state shows the authorized address. Mobile navigation wraps below the brand and wallet control with a top rule. Wallet errors explain MetaMask/plugin requirements or rejected permission without blocking guest practice. A keyboard-visible skip link leads directly to the main content.

### Range Picker

The picker is a semantic fieldset with native radio inputs inside entire clickable labels. Each row has an outlined surface, at least 58px desktop height, and an orange native radio accent. Selection adds an orange stroke, warm wash, and a check mark. Hover darkens the border. Mobile rows remain full width at a 55px minimum height.

### Original Film Art

Large condensed letters, a cropped outline ring, event title, and a small original-art label form the pink and lime artwork variants. The art is accessible as an image with an original-art description. It identifies a film event without implying official studio poster ownership.

### Results and Evidence

Large condensed numbers make observed revenue and awarded points legible. Histogram counts remain numerical; bars represent participant selections and are not labelled as probabilities. Rules, receipts, and technical records use native details and summary controls; a plus icon rotates when open. Source passages and their attribution remain visible before the deeper record.

### Motion and Accessibility

Motion is limited to 160ms button colour transitions, a 3-second loading-target rotation, and the disclosure icon's open state. Reduced-motion preference disables animation and transitions. Forced-colour mode adds a selected-range outline and button border and hides decorative hero geometry. Shared focus styling applies to links, buttons, summaries, inputs, and textareas.

## Do's and Don'ts

### Do:

- **Do** preserve warm paper, condensed film titles, ruled rows, and clearly aligned intervals.
- **Do** retain original artwork in mobile feed rows and omit the desktop art column on mobile detail pages.
- **Do** keep practice, synthetic, submitted, pending, void, and finalized states explicit in plain language.
- **Do** keep focus outlines, native radios and disclosures, wrapped hashes, and reduced-motion support.
- **Do** label free points and practice exclusions honestly; show empty competitive standings when no eligible finalized records exist.

### Don't:

- **Don't** replace the programme with a generic elevated card grid or add decorative shadows.
- **Don't** use studio posters in place of Bullseye's original typographic artwork.
- **Don't** use condensed display type for extended rules or evidence copy.
- **Don't** invent participants, scores, monetary rewards, production-chain settlement, permanent source archives, or prize eligibility.
- **Don't** style a submitted wallet receipt as a successful finalized prediction before execution and finality are verified.
