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
  music-orange: "#ad3817"
  music-orange-hover: "#762610"
  music-link-hover: "#77260f"
  music-muted: "#525448"
  music-rule: "#b9b9ad"
  music-divider: "#d7d7cd"
  music-field: "#fffdf6"
  music-selected: "#f4dfd4"
  music-ticket: "#e9e5d8"
  music-art-ink: "#61333e"
  music-art-letter: "#824455"
  music-receipt-ink: "#334021"
  music-placeholder: "#626458"
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
  music-display:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(2.7rem,5vw,5rem)"
    lineHeight: "1.02"
    letterSpacing: "-.025em"
  music-result-rank:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "4.5rem"
    lineHeight: "1"
rounded:
  tag: "3px"
  interval: "4px"
  field: "5px"
  control: "6px"
  proof: "8px"
  circle: "50%"
  music-ticket: "10px"
  music-textarea: "7px"
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
  music-outcome:
    backgroundColor: "{colors.music-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "18px"
  music-outcome-selected:
    backgroundColor: "{colors.music-selected}"
  music-ticket:
    backgroundColor: "{colors.music-ticket}"
    rounded: "{rounded.music-ticket}"
    padding: "28px"
  music-text-action:
    backgroundColor: "transparent"
    textColor: "{colors.music-orange}"
    padding: "10px 0"
---

# Design System: Bullseye

## Overview

**Creative North Star: "The Film-Festival Programme"**

Bullseye feels like a warm printed programme made interactive: condensed film titles, quietly ruled schedules, aligned numerical intervals, and an orange mark that points to the next call. The paper surface supports reading and evidence; original typographic film art gives the programme its cinema character.

The system combines expressive headlines with restrained controls and plain language. Its bullseye geometry is limited to branding, the title band, original artwork, and small status icons. Honest empty states, practice labels, pending receipts, and disclosed evidence belong to this world as naturally as successful predictions.

Music extends this existing programme to album debuts and chart calls. It retains the same warm canvas, condensed titles, orange actions, original type artwork and ruled reading surfaces; chart ranks and named album pairings provide the new subject matter. The Film identity and its existing rules remain authoritative for Film.
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

### Music directory, outcomes and ticket

Music is a scoped extension of the existing programme. app/music.css uses Chart Orange for result ranks, selected-option strokes, text actions and caret/focus treatment; inherited primary buttons retain Programme Orange. Chart Muted Ink, Chart Rule and Chart Divider supply supporting text and ruled separation. Chart Light Paper fills outcomes and proposal fields, Chart Selection Wash marks selected outcomes and error surfaces, and Chart Ticket Paper separates the ticket and compiled record. Album Artwork Ink and Album Letter Ink sit on Film Pink; Chart Receipt Ink sits on Programme Lime. Frontmatter records the actual scoped variants without replacing Film tokens.

Music uses a centred 1200px container with 48px top, 32px side and 80px bottom padding. The directory has three unboxed ruled columns with 32px gaps, becoming two at 1000px and one at 760px. Outcome previews retain two columns. Its 72px square original album letter/title art sits beside album/artist identity, the exact question, practice/lifecycle labels, numerical prediction counts and an orange continuation. The art is aria-hidden because adjacent text supplies identity; it is not an official album cover. No shadows or decorative depth are added.

Detail pairs 230px original type art with market context across a 48px gap. The trade area pairs flexible outcomes with a 340px sticky ticket (24px top offset), becoming a 300px ticket with 28px gap at 1000px. At 760px, main padding becomes 32px 20px 56px, detail art remains visible at 85px, and trade content stacks with a full-width static ticket and 24px gap. Open choices lead into the ticket; the closed mobile layout places its ticket above inactive outcomes. Music navigation labels Film, Music and Season, moves to a second row at 760px, and retains the wallet control and StudioNet simulated-GEN context. Its footer becomes a two-column grid with the brand spanning both columns. These scoped breakpoints do not redefine Film layout.

Music directory/season headings use the music-display role, becoming 3rem at 760px; detail titles become 2.5rem. Compact album titles use 1.9rem Bebas Neue. Result ranks use 4.5rem Bebas Neue, becoming 3.5rem on mobile. Numeric rank choices use sans-serif at 1.5rem (1.35rem on mobile); head-to-head album choices use 1.75rem Bebas Neue. Paragraphs use 1.65 line height and at most 72ch. Market questions retain DM Sans; counts and table values use tabular numerals. Captures/digests wrap in supporting record copy.

Rank markets show #1, #2–5, #6–10, #11–50, #51–200 and Did not chart; head-to-head shows the two named albums. Choices are aria-pressed buttons with a 72px minimum height, a check mark, 6px corners and an orange one-pixel selected stroke/warm wash. Closed outcomes are disabled at .75 opacity. The ticket uses 10px corners, 28px padding (24px mobile), repeats the selected outcome, defaults to 0.01 simulated GEN and supplies 0.01/0.1/1/2 presets. It separates the stake action from optional free points and exact-rank input. Its stated range is 0.01–100 simulated GEN; Film retains its existing bounds.

Mobile selection focuses the ticket heading and brings it into view with instant scrolling. Change outcome returns focus and view to the outcome heading. Free points, Change outcome and Retry use transparent orange underlined text controls with inherited type, 600 weight, 10px vertical padding, a 44px minimum target and dark-orange hover. Scoped keyboard focus is a 2px Chart Orange outline offset by 4px. Outcome background/border transitions last 160ms; the continuation arrow moves 4px over 200ms only when reduced motion is not requested.

### Music evidence, proposals and combined season

Result order is market context, observed chart rank and matched album quote, archive link, capture identifier and rows digest, then inactive choices/ticket and detailed rules. The orange rank communicates observed position. Pending evidence, accepted results awaiting finality and void outcomes retain separate plain-language headings. Rules and compiled specification use native disclosures; hashes wrap. Submitted, accepted, finalized-error and finalized-success receipt labels stay distinct. A finalized collection request is not described as native credit until child-transfer verification confirms credit; failed transfers keep retry available.

The proposal form names album, artist and exact chart week, then local entry/resolution deadlines and an explicit historical-practice checkbox. Its container is at most 850px, textarea has 7px corners and 18px padding, and date fields use 6px corners and 14px padding. Two deadline fields stack on mobile. Compilation precedes review/opening; rejected questions retain recovery.

Combined season keeps Competitive and Historical exhibition as separate aria-pressed controls with ink-filled selected state. Profile values form four columns, then two on mobile; standings retain a compact five-column table and ruled category timelines. Empty standings are honest; personal free-points records and GEN pool positions have separate locations. Charts and counts never imply forecast probabilities.

### Music documentation and reviewed boundary

This extension is extracted from app/music.css, components/music-app.tsx and the twelve final desktop/mobile directory, result, proposal, season, ticket and pairing captures in .impeccable/review/music/. The finish-review.md disposition is **ship for the four scored fixes only**: mobile continuation, result hierarchy, authored secondary controls and pairing question truth. It does not certify the complete milestone, replacement-contract proof, deployment or Portal readiness.

Directory/result/season captures record actual StudioNet reads from an unfunded candidate now superseded. Ticket/pairing captures and SDK transaction-flow checks use controlled transport. The rasters document visual hierarchy and labels, not wallet transfers, funded pool settlement, native collection credit or current replacement-contract behavior. Full-page screenshots cannot establish focus movement; that continuation rule is supported by sampled source and the parent's passing browser report. No additional browser, detector or review pass forms part of this merge.
## Do's and Don'ts

### Do:

- **Do** preserve warm paper, condensed film titles, ruled rows, and clearly aligned intervals.
- **Do** retain original artwork in mobile feed rows and omit the desktop art column on mobile detail pages.
- **Do** keep practice, synthetic, submitted, pending, void, and finalized states explicit in plain language.
- **Do** keep focus outlines, native radios and disclosures, wrapped hashes, and reduced-motion support.
- **Do** label free points and practice exclusions honestly; show empty competitive standings when no eligible finalized records exist.
- **Do** retain Music album type art on mobile, repeat the chosen outcome in the ticket and place chart evidence before inactive choices and rules.
- **Do** preserve historical exhibition as a separate combined-season view.

### Don't:

- **Don't** replace the programme with a generic elevated card grid or add decorative shadows.
- **Don't** use studio posters in place of Bullseye's original typographic artwork.
- **Don't** use condensed display type for extended rules or evidence copy.
- **Don't** invent participants, scores, monetary rewards, production-chain settlement, permanent source archives, or prize eligibility.
- **Don't** style a submitted wallet receipt as a successful finalized prediction before execution and finality are verified.
- **Don't** treat a controlled ticket or pairing capture as proof of native GEN staking or collection credit.

## Consumer prediction surfaces

Markets and My predictions form the main navigation. Market discovery uses compact film programmes with four range links, actual pool totals and search. Film titles retain Bebas Neue and original typographic art; consumer headings, numeric stakes, balances and transaction controls use DM Sans. A restrained StudioNet status band identifies simulated practice currency.

The movie detail pairs the outcome list with one prediction ticket on desktop, stacking them on mobile. A mobile range selection brings its ticket into view. The ticket contains the selected range, a default 2 GEN stake, presets, wallet balance and an explicitly conditional estimate. Open entries, resolving results, claimable GEN, transfer requests and verified native credit have distinct states. Technical records and free points live in secondary disclosures; creator, league and old pool access remain in the footer. Pool shares are labelled as stakes, never probabilities.
