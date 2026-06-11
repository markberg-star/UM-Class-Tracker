# University of Miami Herbert Business School — Design System

A reusable design system for creating branded interfaces, presentations, and prototypes that match the University of Miami Patti and Allan Herbert Business School ("Miami Herbert").

---

## Brand context

**Miami Herbert Business School** (officially the University of Miami Patti and Allan Herbert Business School) is the business school of the University of Miami, a private research university in Coral Gables, Florida. Founded in 1929, the school renamed in 2019 after a $100M+ gift from Patti and Allan Herbert. It's one of 12 schools and colleges at UM and one of only three U.S. business schools with "triple crown" accreditation (AACSB, EQUIS, AMBA).

Product surfaces represented here:
- **Miami Herbert marketing website** (`herbert.miami.edu`) — editorial, image-rich, recruits undergrads, MBAs, specialized masters, doctoral, and executive-ed students.
- **University of Miami master brand** — supplies the split-U logo and color system that the school inherits from.

### Sources used
- `herbert.miami.edu` — marketing site (homepage + navigation). Fetched live for structure, copy, imagery.
- `webcomm.miami.edu/resources/identity/color` — UM digital color spec, WCAG AA variants.
- `ucomm.miami.edu/.../umiami-visual-identity-guide.pdf` — UM Visual Identity Manual (2019), including logo rules, Century Schoolbook + Frutiger typography spec.
- `bus.miami.edu/faculty-and-staff-resources/logos-and-templates.html` — confirmation that Miami Herbert has its own Visual Identity Guide (download restricted, referenced here).
- Wikipedia: *University of Miami Patti and Allan Herbert Business School* — history, programs, rankings.

Assets saved locally in `assets/` — logos, photography, icons, accreditation seals, pillar icons.

---

## Content fundamentals

**Voice.** Aspirational but grounded. Written to the prospective student (**"you"**) not about them ("students will..."). Mixes short punchy sentences with longer connective ones — newsroom-editorial rhythm, not corporate.

**Casing.** Title Case for section headings (`Start Your Application Today`, `Made for Momentum`, `Canes Do.`). Sentence-case for body. ALL-CAPS tracked-out eyebrows used on buttons, navigation accents, and banner alerts ("GRADUATE BUSINESS OPEN HOUSE:", "REGISTER TODAY!"). Period-terminated sentence fragments are a tic ("Ranked. Accredited. Globally connected.").

**Pronouns.** First-plural "we/our" for the institution, second-person "you/your" for the reader. Faculty and alumni addressed by name with their program or title beneath ("Krystine Pereda — Professional MBA Student").

**Emoji.** None in marketing copy. Only on the `@miamiherbert` Instagram bio ("🙌 📷"). Do not use emoji on web, email, or print.

**Unicode.** Em-dash and en-dash used generously. Ampersand ("&") replaces "and" in unit names per the identity manual (e.g. "MBA & Specialized Masters").

**Tone samples, verbatim:**
- *"The Way Business School Should Be"*
- *"This is where ambition takes root, learning extends beyond the classroom, and tomorrow's leaders are forged."*
- *"Where boundless ambition takes root in a city that never stops. And going the extra mile doesn't just get you ahead. Sound like a business school to you? It should."*
- *"Canes Do."* (athletics-inflected identity phrase; self-aware, warm)
- *"Experts who move ideas forward."*

**Do.** Lead with the idea, follow with the proof. Pair every headline with a compact supporting sentence. Name-drop rankings and accreditations, but let the photography carry the "prestige" weight.

**Don't.** Adjective pile-up ("innovative, world-class, cutting-edge"). Corporate-speak. Emojis. Exclamation points outside banner CTAs.

---

## Visual foundations

**Colors.** Miami Orange `#F47321` (Pantone 158) and Miami Green `#005030` (Pantone 3435) are the entire identity. Orange is the attention-getter — used sparingly on CTAs, accent rules, hover states, eyebrows. Green is the institutional anchor — deep, nearly-black in small sizes, used for navigation bars, section dividers, body text on light editorial layouts. A small approved supplementary palette (red, gold, sky, sea, taupe, sand, olive) is available for charts and secondary surfaces but appears rarely on the main site. Neutrals are warm-leaning grays; backgrounds default to `#FFFFFF` with warm off-white `#F7F3EC` for editorial sections.

**Type.** The institutional system is **Century Schoolbook BT** (serif display, for headlines + unit names) paired with **Frutiger** (humanist sans, for UI + body). Both are licensed — this system substitutes **Source Serif 4** (close transitional serif, open-license on Google Fonts) and **Figtree** (near-Frutiger proportions). Headlines are serif, bold, tight tracking, sometimes italicized for pull-quotes. Body is sans-serif regular. **Eyebrows** — short, ALL-CAPS, heavily tracked, in orange — appear above section titles and inside buttons; they're one of the most recognizable UM motifs.

**Spacing.** 8-pt base, generous vertical rhythm. Editorial sections sit in 96–128px vertical breathing room.

**Backgrounds.** Photography-forward — large lifestyle shots of Coral Gables campus, portraits of students/faculty, full-bleed edge-to-edge. Images skew warm (Florida sun, terracotta rooftops, palm green, blue water). Very little illustration, no patterns, no gradients. When color blocks are used, they're flat Miami green or a single orange hairline. No textures or grain.

**Animation.** Restrained — fades, slow parallax on hero images, the homepage hero uses a looping video ("hero-loops-home-compressed.webp/mp4"). Hover states are color-transitions, not transforms. No bounces or spring physics.

**Hover / press states.**
- Text links: underlined by default; color shifts from green → orange on hover.
- Buttons: fill-color darkens by ~10%; orange CTAs shift to `#C35009` (accessible variant).
- Press: no scale, no shadow change — just a quick color dwell.

**Borders.** 1px hairline in `#D8DCDA` is the default. The signature move is a **4px orange accent rule** (48px wide) sitting above section headings or between content blocks — editorial, like a magazine dek rule.

**Shadows.** Extremely subtle. Cards use `0 1px 2px rgba(...06)` at rest; hover bumps to `0 4px 12px rgba(...08)`. No dramatic drop-shadows, no inset glows.

**Transparency & blur.** Used only on the sticky site header (translucent white over scrolling imagery, optional `backdrop-filter: blur(8px)`). No frosted cards, no glassy overlays elsewhere.

**Corner radii.** UM is mostly squared-off. Cards and images: `0` or `2px`. The one exception is **pill CTAs** (`border-radius: 999px`) — orange or green, ALL-CAPS tracked-out text inside. Program feature cards on the homepage are hard-cornered.

**Cards.** Image-top / text-bottom. 4:7 aspect portrait for program cards. Title in serif bold, below it a single sentence, then a green "Program Name" link at the bottom. Shadow only on hover.

**Layout.** 12-column grid, max-width 1280px, 24px gutters. Full-bleed hero + full-bleed CTA sections break out of the container. Heavy alignment to the left; centered layouts used only on banner alerts and section intros.

**Imagery color vibe.** Warm, sunlit, high-saturation but not oversaturated. People-forward — always students/faculty in candid poses, Coral Gables campus in the background. No B&W, no grain, no duotone.

**Fixed elements.** Sticky top nav (white, thin bottom border) + a dismissible banner alert above it (deep green `#005030` with white text and an orange `REGISTER TODAY!` link).

---

## Iconography

**Approach.** Icons are **scarce**. The UM brand leans on photography for emotion and uses icons only as navigational or informational flags. No hand-drawn illustrations, no custom icon library, no emoji in UI.

**What exists on the site:**
- **Social icons** — solid-fill glyphs in white-on-green footer circles. Shipped as SVG (`assets/icons/instagram.svg`, `facebook.svg`, `linkedin.svg`, `twitter.svg`, `youtube.svg`, `tiktok.svg`).
- **Pillar icons** — ~100×100 PNGs with a flat orange silhouette on transparent background. Three exist: `pillar-personalized.png`, `pillar-propulsion.png`, `pillar-advantage.png`.
- **Accreditation badges** — `accred-aacsb.png`, `accred-amba.png`, `accred-equis.png` — ring-shaped seals in orange.
- **The split-U logo** — UM's athletic mark, used in the sticky footer and favicons (`assets/logos/split-u-logo.png`).

**Substitution.** When a generic UI icon is needed (chevrons, arrows, close X, check, search, menu), use **Lucide** from CDN at 1.75px stroke weight in `currentColor`. Miami Herbert's own chevrons on the site are hairline strokes in green — Lucide at stroke-width 1.75 matches.

**Do NOT:** draw custom SVG illustrations, use emoji, mix icon libraries, colorize icons outside green/orange/white/currentColor.

---

## Index

| File / folder | Contents |
| --- | --- |
| `README.md` | This file. |
| `SKILL.md` | Claude Code–compatible skill entry point. |
| `colors_and_type.css` | All design tokens + semantic element rules. |
| `fonts/` | Empty — Source Serif 4 + Figtree loaded from Google Fonts. Drop licensed Century Schoolbook BT + Frutiger files here when available. |
| `assets/logos/` | UM master brand + Miami Herbert wordmark. |
| `assets/icons/` | Social icons, pillar icons, accreditation seals. |
| `assets/images/` | Hero, program-card, CTA, and student-portrait photography from `herbert.miami.edu`. |
| `preview/` | Design-system card previews (colors, type, spacing, components) that render in the Design System tab. |
| `ui_kits/herbert_site/` | React/JSX recreation of the Miami Herbert marketing website with navigation, hero, programs grid, stories carousel, and footer. |
| `slides/` | Title, content, quote, and data slides for Miami Herbert–branded presentations. |

---

## Caveats & flags

- **Font substitution.** Century Schoolbook BT and Frutiger are licensed typefaces. This system substitutes Source Serif 4 (serif) and Figtree (sans) — close matches, but not exact. Replace with licensed `.woff2` files in `fonts/` for production.
- **Miami Herbert Visual Identity Guide.** The school has its own guide, but the PDF is only distributed through the faculty/staff portal (login-gated). Values here are derived from the public UM Visual Identity Manual + the live `herbert.miami.edu` website.
- **Photography.** Images in `assets/images/` are copied from the Miami Herbert website for design-reference purposes only. Replace with properly-licensed assets for any shipped work.
