# Visual Identity — Deep Reference

This document provides detailed rules for applying visual identity elements across deliverables.
Read this when you need specifics beyond what the main SKILL.md covers.

---

## Table of Contents

1. Color Application Rules
2. Typography Application Rules
3. Logo Usage Rules
4. Layout and Grid Systems
5. Imagery and Photography
6. Do's and Don'ts

---

## 1. Color Application Rules

### Color Hierarchy

Every material should have a clear visual hierarchy driven by color:

**Background layer** (60% of visual area):
- Use primary neutral or primary brand color
- Light backgrounds: white or light gray from the neutral palette
- Dark backgrounds: dark neutral or primary dark color
- Gradient backgrounds: use only approved gradients

**Content layer** (30% of visual area):
- Headers and section backgrounds use secondary colors
- Cards and containers use light variants or white
- Dividers and borders use mid-neutral colors

**Accent layer** (10% of visual area):
- CTA buttons use accent color
- Highlights, badges, and icons use accent color
- Only accent colors should "pop" — if everything pops, nothing does

### Color Pairing Rules

| Background | Text Color | Accent |
|------------|-----------|--------|
| White / Light | Primary dark or neutral dark | Primary accent |
| Primary dark | White or light neutral | Accent (ensure contrast) |
| Primary color | White (if contrast > 4.5:1) | Lighter accent or white |
| Image backgrounds | White text with text shadow or semi-transparent overlay | White accent |

### Contrast Requirements (WCAG AA)

- **Body text**: minimum 4.5:1 contrast ratio against background
- **Large text** (18pt+ or 14pt bold+): minimum 3:1 contrast ratio
- **UI components and graphical objects**: minimum 3:1 against adjacent colors
- **Decorative elements**: no minimum, but consider accessibility

Check contrast with: https://webaim.org/resources/contrastchecker/

### Color in Code

When applying colors programmatically:

**CSS**:
```css
:root {
  --brand-primary: #1A73E8;
  --brand-accent: #FF6B6B;
  --text-primary: #212121;
  --bg-light: #FFFFFF;
}
```

**python-pptx**:
```python
from pptx.util import Pt
from pptx.dml.color import RGBColor
brand_primary = RGBColor(0x1A, 0x73, 0xE8)
brand_accent = RGBColor(0xFF, 0x6B, 0x6B)
```

**openpyxl**:
```python
from openpyxl.styles import PatternFill
brand_fill = PatternFill(start_color="1A73E8", end_color="1A73E8", fill_type="solid")
```

---

## 2. Typography Application Rules

### Font Selection Priority

1. **Exact brand font** — always first choice
2. **Fallback font** — if brand font is unavailable in the environment
3. **Generic family** — last resort (sans-serif, serif, monospace)

Check availability before using:
```python
import subprocess
result = subprocess.run(['fc-list', ':family'], capture_output=True, text=True)
available_fonts = result.stdout
# Check if brand font is in the list
```

If the brand font isn't installed, check if it's from Google Fonts and install:
```bash
# Example: install Poppins
pip install fontools --break-system-packages 2>/dev/null
# Or download directly from Google Fonts API
```

### Size Application by Context

| Context | Heading | Subheading | Body | Caption |
|---------|---------|------------|------|---------|
| **Web / Digital** | 32-48px | 20-28px | 16px | 12-14px |
| **Presentation** | 36-44pt | 24-32pt | 18-24pt | 14-16pt |
| **Print (A4/Letter)** | 24-36pt | 16-22pt | 10-12pt | 8-9pt |
| **Poster (A2+)** | 72-120pt | 36-54pt | 18-24pt | 12-16pt |
| **Social Media** | 24-36px | 18-24px | 14-18px | 10-14px |
| **Business Card** | 10-14pt | 8-10pt | 7-9pt | 6-7pt |

### Text Hierarchy Patterns

For any piece of content, establish a clear visual hierarchy:

```
LEVEL 1 — Main Title
Large, bold, heading font, primary or dark color
↓
LEVEL 2 — Section Header
Medium, semibold, heading font
↓
LEVEL 3 — Subsection / Subheader
Smaller, semibold, heading or body font
↓
LEVEL 4 — Body Text
Regular weight, body font, comfortable line height
↓
LEVEL 5 — Caption / Metadata
Small, medium weight, secondary color
```

The size ratio between adjacent levels should be approximately 1.2-1.5x.

### Alignment and Spacing

- **Headings**: Left-aligned (LTR) or center-aligned on hero sections
- **Body text**: Left-aligned. Never justify unless the brand specifically requires it
- **Line height**: 1.4-1.6x font size for body text, 1.1-1.3x for headings
- **Paragraph spacing**: 0.5-1.0x the body font size between paragraphs
- **Letter spacing**: Slight negative for large headings (-0.02em), normal for body

---

## 3. Logo Usage Rules

### Placement Decision Tree

```
Is this a title/cover slide or page?
├── YES → Logo centered or in hero area, at feature size
└── NO → Is this a recurring element (footer, header)?
    ├── YES → Logo in consistent corner position, small but clear
    └── NO → Logo only if brand context is needed (watermark, badge)
```

### Logo Sizing by Context

| Context | Recommended Size | Position |
|---------|-----------------|----------|
| Website header | 30-50px height | Top-left |
| Presentation slide | 40-60px height | Bottom-right |
| Title slide | 80-120px height | Center or center-bottom |
| Business card | 15-25mm height | Top-left or center |
| Poster | 30-60mm height | Bottom-right or top-left |
| Social post | 10-15% of image width | Bottom-right with padding |
| Email header | 30-50px height | Top-left or center |
| Favicon | 16x16px / 32x32px | Icon-only variant |

### Clear Space Enforcement

The clear space zone is sacred territory — nothing enters it:

```
   ┌──────────────────────────┐
   │      CLEAR SPACE         │
   │   ┌──────────────┐       │
   │   │    LOGO      │       │
   │   └──────────────┘       │
   │      CLEAR SPACE         │
   └──────────────────────────┘
   ← 1x →              ← 1x →
```

Where "1x" = the height of the logo mark (or another defined unit from the brand config).

### Background Compatibility

| Background Type | Logo Variant to Use |
|----------------|-------------------|
| White or light solid | Full color |
| Light photography (bright, low contrast) | Full color with check for readability |
| Dark solid | Reversed (white) |
| Dark photography | Reversed (white), consider semi-transparent container |
| Primary brand color | Reversed or monochrome white |
| Busy/complex photography | Place in solid-color container box, then use appropriate variant |

---

## 4. Layout and Grid Systems

### Grid Fundamentals

Consistent grids create professional, cohesive materials:

**Digital (web, social, email)**:
- 12-column grid with 24px gutters
- 16px base spacing unit (multiples: 8, 16, 24, 32, 48, 64, 96)
- Content max-width: 1200px

**Print**:
- 6 or 12-column grid
- Consistent margins: 15-25mm for A4, scale proportionally for other sizes
- Gutters: 5-8mm

**Presentations**:
- Content area: 90% of slide width, centered
- Consistent margins: 5% from each edge
- Align all elements to an invisible grid

### Spacing System

Use a consistent spacing scale based on a base unit:

```
4px  — micro (icon padding, subtle gaps)
8px  — small (inline element spacing)
16px — medium (default spacing between elements)
24px — large (section gaps, card padding)
32px — xlarge (major section breaks)
48px — xxlarge (hero sections, major divisions)
64px — xxxlarge (page-level spacing)
```

---

## 5. Imagery and Photography

### Image Selection Criteria

When selecting or recommending images for brand materials:

1. **Authenticity** — Does it feel real, not staged?
2. **Diversity** — Does it represent the brand's audience inclusively?
3. **Quality** — Is it high-resolution, well-lit, properly composed?
4. **Brand alignment** — Does the mood/style match the brand personality?
5. **Color harmony** — Do the image colors complement the brand palette?

### Image Treatment

- Apply the brand's defined color treatment consistently
- Maintain a uniform aspect ratio within the same material
- When overlaying text on images:
  - Use a semi-transparent color overlay (brand primary or neutral dark, 40-60% opacity)
  - Or use a gradient overlay from solid to transparent
  - Ensure text meets contrast requirements against all parts of the image

### Image Don'ts

- Never stretch or compress images disproportionately
- Never use low-resolution images (< 72 DPI for digital, < 300 DPI for print)
- Never use images that clash with brand color palette
- Never use watermarked stock photos
- Never crop faces awkwardly (preserve natural framing)

---

## 6. Do's and Don'ts Summary

### Visual Identity Do's

- Use exact hex/RGB values from the brand config
- Maintain consistent spacing and alignment
- Follow the typography hierarchy strictly
- Keep the logo in its approved form
- Test all materials for color contrast accessibility
- Use vector logos (SVG/EPS) for all production work
- Maintain visual breathing room — white space is a feature

### Visual Identity Don'ts

- Don't approximate brand colors — #1A73E8 is not "some blue"
- Don't mix more than 3 font families in one material
- Don't use decorative fonts for body text
- Don't reduce text below minimum readable sizes
- Don't stretch, rotate, or add effects to the logo
- Don't place the logo on low-contrast backgrounds without a container
- Don't ignore clear space around the logo
- Don't use drop shadows, bevels, or outlines on the logo
- Don't use colors that aren't in the approved palette
- Don't center-align large blocks of body text
