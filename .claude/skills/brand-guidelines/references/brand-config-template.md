# Brand Config Template — Full Schema Reference

This document describes every field in `brand-config.json`. When building a config from
a client's brand guide, walk through this schema section by section and fill what you can.
Fields marked **(required)** must be present for the skill to function; everything else
improves output quality but isn't blocking.

---

## Top-Level Structure

```json
{
  "brand_name": "",
  "brand_identity": { ... },
  "colors": { ... },
  "typography": { ... },
  "logo": { ... },
  "imagery": { ... },
  "verbal_identity": { ... },
  "deliverable_defaults": { ... }
}
```

---

## 1. brand_name (required)

```json
"brand_name": "Acme Corporation"
```

The official company or brand name. Used in auto-generated headers, footers, and metadata.

---

## 2. brand_identity

Captures the strategic foundation of the brand. Useful for guiding tone and messaging
decisions, but not strictly required for visual production.

```json
"brand_identity": {
  "mission": "To make professional design accessible to everyone.",
  "vision": "A world where every business looks its best.",
  "values": ["Innovation", "Simplicity", "Inclusivity"],
  "positioning": "The most intuitive brand management platform for growing teams.",
  "personality_traits": ["Confident", "Approachable", "Modern", "Trustworthy"],
  "tagline": "Design that works.",
  "boilerplate": "Acme Corporation is a design technology company founded in 2020..."
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `mission` | string | Why the company exists — guides messaging hierarchy |
| `vision` | string | Aspirational future state — for long-form content |
| `values` | string[] | Core principles — infuse into copy tone and imagery choices |
| `positioning` | string | Market differentiation — drives competitive messaging |
| `personality_traits` | string[] | 3-5 adjectives — the primary input for tone of voice |
| `tagline` | string | Official tagline — use as-is, never modify |
| `boilerplate` | string | Standard company description for press releases and About sections |

---

## 3. colors (required — at least primary)

The color system is the backbone of visual identity. Colors are grouped by role.

```json
"colors": {
  "primary": [
    {
      "name": "Brand Blue",
      "hex": "#1A73E8",
      "rgb": "26, 115, 232",
      "cmyk": "89, 50, 0, 9",
      "pantone": "2727 C",
      "usage": "Primary backgrounds, headers, CTA buttons"
    }
  ],
  "secondary": [
    {
      "name": "Deep Navy",
      "hex": "#0D1B2A",
      "rgb": "13, 27, 42",
      "cmyk": "69, 36, 0, 84",
      "usage": "Text on light backgrounds, secondary headers"
    }
  ],
  "accent": [
    {
      "name": "Coral",
      "hex": "#FF6B6B",
      "rgb": "255, 107, 107",
      "usage": "Highlights, badges, attention-grabbing elements"
    }
  ],
  "neutral": [
    {"name": "White", "hex": "#FFFFFF", "usage": "Backgrounds, text on dark"},
    {"name": "Light Gray", "hex": "#F5F5F5", "usage": "Section backgrounds"},
    {"name": "Medium Gray", "hex": "#9E9E9E", "usage": "Secondary text, borders"},
    {"name": "Dark", "hex": "#212121", "usage": "Primary body text"}
  ],
  "semantic": [
    {"name": "Success", "hex": "#4CAF50", "usage": "Positive states"},
    {"name": "Warning", "hex": "#FF9800", "usage": "Caution states"},
    {"name": "Error", "hex": "#F44336", "usage": "Error states"},
    {"name": "Info", "hex": "#2196F3", "usage": "Informational states"}
  ],
  "gradient": [
    {
      "name": "Hero Gradient",
      "type": "linear",
      "angle": 135,
      "stops": ["#1A73E8", "#6C63FF"],
      "usage": "Hero banners, feature sections"
    }
  ]
}
```

### Color Field Reference

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Human-readable name for communication |
| `hex` | Yes | 6-digit hex with # prefix — the universal reference |
| `rgb` | Recommended | For digital production (CSS, PPT, etc.) |
| `cmyk` | For print | Critical for any print deliverable |
| `pantone` | For print | Required for professional printing (Pantone Matching System) |
| `usage` | Recommended | When/where to use this color — prevents misuse |

### The 60-30-10 Rule

When applying colors to any material, follow this proportion:
- **60%** — Primary/neutral colors (backgrounds, large areas)
- **30%** — Secondary colors (supporting elements, headers)
- **10%** — Accent colors (CTA buttons, highlights, icons)

This creates visual harmony. The brand config's color groupings map directly to this rule.

---

## 4. typography (required — at least heading and body font)

```json
"typography": {
  "heading_font": {
    "family": "Poppins",
    "fallback": "Arial, Helvetica, sans-serif",
    "weights": ["600", "700"],
    "letter_spacing": "-0.02em",
    "source": "Google Fonts"
  },
  "body_font": {
    "family": "Inter",
    "fallback": "Segoe UI, Roboto, sans-serif",
    "weights": ["400", "500", "600"],
    "line_height": "1.6",
    "source": "Google Fonts"
  },
  "accent_font": {
    "family": "Playfair Display",
    "fallback": "Georgia, serif",
    "weights": ["400", "700"],
    "usage": "Pull quotes, hero text, special callouts"
  },
  "monospace_font": {
    "family": "JetBrains Mono",
    "fallback": "Consolas, monospace",
    "usage": "Code blocks, data tables, technical content"
  },
  "scale": {
    "h1": {"size": "48px", "weight": "700", "line_height": "1.2"},
    "h2": {"size": "36px", "weight": "700", "line_height": "1.25"},
    "h3": {"size": "28px", "weight": "600", "line_height": "1.3"},
    "h4": {"size": "22px", "weight": "600", "line_height": "1.35"},
    "body_large": {"size": "18px", "weight": "400", "line_height": "1.6"},
    "body": {"size": "16px", "weight": "400", "line_height": "1.6"},
    "body_small": {"size": "14px", "weight": "400", "line_height": "1.5"},
    "caption": {"size": "12px", "weight": "500", "line_height": "1.4"}
  },
  "print_scale": {
    "h1": "36pt",
    "h2": "28pt",
    "h3": "22pt",
    "h4": "18pt",
    "body": "11pt",
    "caption": "9pt"
  }
}
```

### Typography Rules

- Never use more than 3 font families in a single deliverable (heading + body + accent max)
- Heading font is for headings, titles, and display text only
- Body font is for paragraphs, lists, and general reading
- Minimum body text size: 16px digital, 9pt print, 24pt presentation
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Line length should be 45-75 characters for comfortable reading

---

## 5. logo

```json
"logo": {
  "variants": {
    "full_color": {
      "description": "Primary full-color logo on light backgrounds",
      "background_constraint": "Use on white or light neutral backgrounds only"
    },
    "reversed": {
      "description": "White/light logo for dark backgrounds",
      "background_constraint": "Use on dark or colored backgrounds"
    },
    "monochrome_black": {
      "description": "Single-color black version",
      "background_constraint": "Light backgrounds, print in single-color scenarios"
    },
    "monochrome_white": {
      "description": "Single-color white version",
      "background_constraint": "Dark backgrounds, overlay on images"
    },
    "icon_only": {
      "description": "Logomark without wordmark",
      "usage": "Favicons, app icons, small-space applications"
    }
  },
  "clear_space": {
    "unit": "height of the logo 'x'",
    "minimum": "1x on all sides",
    "description": "No text, graphics, or other logos may enter the clear space zone"
  },
  "minimum_size": {
    "digital": "40px height",
    "print": "12mm height",
    "favicon": "16x16px"
  },
  "placement": {
    "preferred_positions": ["top-left", "bottom-right"],
    "presentation_position": "bottom-right on every slide except title slide",
    "document_position": "top-left of first page, bottom-center of subsequent pages"
  },
  "dont_rules": [
    "Never stretch, squeeze, or distort the logo proportions",
    "Never rotate the logo",
    "Never add shadows, outlines, glows, or 3D effects",
    "Never recolor the logo outside approved variants",
    "Never place the logo on visually busy backgrounds without a container",
    "Never use an outdated version of the logo",
    "Never rearrange logo elements (icon vs. wordmark)",
    "Never reduce below minimum size",
    "Never crop any part of the logo"
  ]
}
```

---

## 6. imagery

```json
"imagery": {
  "photography": {
    "style": "Natural, warm lighting with authentic moments. Not overly staged.",
    "subjects": ["People at work", "Products in context", "Urban environments"],
    "avoid": ["Stock photo cliches", "Overly filtered images", "Empty corporate settings"],
    "color_treatment": "Slight warm tone, desaturated 10-15%, high natural contrast",
    "cropping": "Rule of thirds, generous negative space for text overlay"
  },
  "illustration": {
    "style": "Flat, geometric with brand accent colors. Line weight: 2px consistent.",
    "palette": "Use brand accent colors only — no off-brand colors in illustrations",
    "usage": "Icons, diagrams, infographics, onboarding flows"
  },
  "iconography": {
    "style": "Outlined, 2px stroke, rounded caps, 24x24px base grid",
    "color": "Single-color, uses primary or neutral palette",
    "set": "Phosphor Icons / custom icon set"
  },
  "data_visualization": {
    "chart_colors": "Cycle through: primary → accent colors → secondary",
    "label_font": "body_font at caption size",
    "gridlines": "Light gray (#E0E0E0), 1px, dashed"
  }
}
```

---

## 7. verbal_identity

```json
"verbal_identity": {
  "tone_of_voice": {
    "personality": ["Confident but not arrogant", "Warm but professional",
                    "Clear but not oversimplified", "Innovative but grounded"],
    "we_are": ["Direct", "Helpful", "Optimistic", "Expert"],
    "we_are_not": ["Pushy", "Jargon-heavy", "Cold", "Condescending"],
    "examples": {
      "on_brand": "We built this so you can focus on what matters.",
      "off_brand": "Our cutting-edge synergistic solution leverages..."
    }
  },
  "writing_style": {
    "voice": "Active voice preferred. Subject-verb-object.",
    "sentence_length": "Average 15-20 words. Mix short punchy with longer explanatory.",
    "paragraph_length": "3-5 sentences for web/email, 2-3 for social.",
    "capitalization": "Sentence case for headlines. Title case for product names only.",
    "punctuation": {
      "oxford_comma": true,
      "exclamation_marks": "Sparingly — max 1 per piece of content",
      "ellipsis": "Avoid in professional materials"
    },
    "numbers": "Spell out one through nine; use digits for 10+.",
    "dates": "Month DD, YYYY (e.g., January 15, 2026)",
    "currency": "$X,XXX.XX format"
  },
  "terminology": {
    "preferred": {
      "customers": "Use instead of 'users' or 'clients'",
      "team members": "Use instead of 'employees' or 'staff'",
      "platform": "Use instead of 'tool' or 'software'"
    },
    "avoid": ["synergy", "leverage", "cutting-edge", "disrupt", "circle back"],
    "product_names": {
      "always_capitalize": true,
      "never_abbreviate": true,
      "trademark_symbol": "Only on first mention in legal documents"
    }
  },
  "key_messages": {
    "primary": "The one sentence that captures the brand promise.",
    "supporting": [
      "Supporting message 1 — elaborates on a key benefit",
      "Supporting message 2 — addresses a common objection",
      "Supporting message 3 — differentiates from competitors"
    ],
    "cta_library": [
      "Get started",
      "Learn more",
      "See how it works",
      "Try it free",
      "Talk to our team"
    ]
  }
}
```

---

## 8. deliverable_defaults

Per-deliverable-type defaults that override general settings when producing specific materials.

```json
"deliverable_defaults": {
  "social_media": {
    "hashtag_style": "lowercase, brand hashtag first",
    "brand_hashtag": "#AcmeCorp",
    "emoji_usage": "Moderate — 1-3 per post, contextual only",
    "cta_every_post": true
  },
  "presentation": {
    "aspect_ratio": "16:9",
    "min_font_size": "18pt",
    "max_slides": 20,
    "logo_position": "bottom-right",
    "title_slide_layout": "Centered title, subtitle below, logo bottom-center"
  },
  "print": {
    "bleed": "3mm",
    "safe_zone": "5mm from trim",
    "default_dpi": 300,
    "color_mode": "CMYK",
    "paper_stock": "250gsm coated for covers, 120gsm for interior"
  },
  "email": {
    "max_width": "600px",
    "header_height": "80px",
    "cta_button_color": "primary accent",
    "footer_text": "© 2026 Acme Corporation. All rights reserved."
  },
  "video": {
    "title_card_duration": "3-5 seconds",
    "lower_third_position": "Bottom-left, 10% from edge",
    "end_card_content": ["Logo centered", "Website URL", "CTA"],
    "brand_watermark": "Subtle logo in bottom-right corner, 20% opacity"
  }
}
```

---

## Example: Minimal Config (Startup)

```json
{
  "brand_name": "Lumos",
  "colors": {
    "primary": [{"name": "Electric Purple", "hex": "#7C3AED"}],
    "accent": [{"name": "Lime", "hex": "#84CC16"}],
    "neutral": [
      {"name": "White", "hex": "#FFFFFF"},
      {"name": "Charcoal", "hex": "#1F2937"}
    ]
  },
  "typography": {
    "heading_font": {"family": "Space Grotesk", "fallback": "Arial, sans-serif"},
    "body_font": {"family": "DM Sans", "fallback": "Helvetica, sans-serif"}
  },
  "verbal_identity": {
    "tone_of_voice": {
      "personality": ["Bold", "Friendly", "Clear"]
    }
  }
}
```

## Example: Enterprise Config

For a full enterprise config example with all fields populated,
see `assets/brand-config-example.json`.
