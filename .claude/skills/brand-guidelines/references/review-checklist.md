# Brand Compliance Review Checklist

Use this checklist to audit any marketing material for brand compliance. Score each
category and generate a compliance report with specific findings and recommendations.

---

## How to Use This Checklist

For each material being reviewed:

1. Load the `brand-config.json` for the brand in question
2. Walk through each section below
3. Score each item: PASS / FAIL / N/A
4. Calculate the overall compliance score
5. Generate a report with specific issues and recommended fixes

---

## 1. Logo Usage (20 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 1.1 | Logo uses an approved variant (full color, reversed, mono, icon) | 4 | |
| 1.2 | Logo meets minimum size requirements | 3 | |
| 1.3 | Clear space around logo is maintained | 3 | |
| 1.4 | Logo is not distorted, stretched, rotated, or modified | 4 | |
| 1.5 | Logo variant is appropriate for the background | 3 | |
| 1.6 | Logo placement follows brand position guidelines | 3 | |

**Common violations**: Logo too small, placed on busy background without container,
stretched to fit, wrong variant for background color, insufficient clear space.

---

## 2. Color Palette (20 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 2.1 | All colors are from the approved brand palette | 5 | |
| 2.2 | Color proportions follow 60-30-10 rule | 3 | |
| 2.3 | Primary colors used for primary elements | 3 | |
| 2.4 | Accent colors reserved for highlights and CTAs | 3 | |
| 2.5 | Text-background contrast meets WCAG AA (4.5:1 body, 3:1 large) | 4 | |
| 2.6 | Color mode is correct for medium (RGB digital, CMYK print) | 2 | |

**Common violations**: Off-brand colors used (#1A74E8 instead of #1A73E8), accent color
used as primary background (destroying hierarchy), low contrast text.

---

## 3. Typography (15 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 3.1 | Correct brand fonts used (or approved fallbacks) | 4 | |
| 3.2 | Font sizes follow the brand's type scale | 3 | |
| 3.3 | Text hierarchy is clear (H1 > H2 > Body > Caption) | 3 | |
| 3.4 | Line height and letter spacing are within brand specs | 2 | |
| 3.5 | Maximum of 3 font families used in the material | 2 | |
| 3.6 | Body text meets minimum readable size for the medium | 1 | |

**Common violations**: System fonts instead of brand fonts, too many font sizes creating
visual noise, heading font used for body text, text too small for the medium.

---

## 4. Imagery & Photography (10 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 4.1 | Image style matches brand photography guidelines | 3 | |
| 4.2 | Images are high resolution for the intended medium | 2 | |
| 4.3 | Images are properly cropped and composed | 2 | |
| 4.4 | Image color treatment is consistent with brand style | 2 | |
| 4.5 | Images are diverse and inclusive | 1 | |

**Common violations**: Low-res images, overly stock/generic imagery, inconsistent
color filters across images in the same piece, images that clash with brand mood.

---

## 5. Layout & Spacing (10 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 5.1 | Layout follows the brand grid system | 3 | |
| 5.2 | Consistent margins and padding throughout | 2 | |
| 5.3 | Adequate white space (not cramped or sparse) | 2 | |
| 5.4 | Visual hierarchy guides the eye naturally | 2 | |
| 5.5 | Alignment is consistent (left, center, or grid-based) | 1 | |

**Common violations**: Inconsistent margins, elements not aligned to grid, too much
content crammed into too little space, no clear visual flow.

---

## 6. Copy & Messaging (15 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 6.1 | Tone matches brand personality traits | 4 | |
| 6.2 | Preferred terminology used (no deprecated terms) | 3 | |
| 6.3 | Writing style follows brand guidelines (active voice, capitalization, etc.) | 3 | |
| 6.4 | Key messages align with brand messaging hierarchy | 2 | |
| 6.5 | CTA language is from the approved CTA library | 2 | |
| 6.6 | Grammar, spelling, and punctuation are correct | 1 | |

**Common violations**: Corporate jargon when brand voice is casual, wrong capitalization
style, CTAs that don't match brand vocabulary, misaligned messaging priorities.

---

## 7. Format & Technical (10 points)

| # | Check | Points | Score |
|---|-------|--------|-------|
| 7.1 | Dimensions match the intended platform/medium spec | 3 | |
| 7.2 | File format is appropriate for the use case | 2 | |
| 7.3 | Resolution meets requirements (72+ DPI digital, 300+ DPI print) | 2 | |
| 7.4 | Bleed and safe zone respected (for print materials) | 2 | |
| 7.5 | Legal elements present (copyright, disclaimers if required) | 1 | |

**Common violations**: Wrong dimensions for platform, low DPI for print, missing bleed,
RGB file sent to print production, missing copyright notice.

---

## Scoring Guide

| Score Range | Compliance Level | Action |
|-------------|-----------------|--------|
| 90-100 | Excellent | Approved — ready for production |
| 80-89 | Good | Minor fixes recommended before production |
| 70-79 | Acceptable | Several issues need addressing |
| 60-69 | Needs Work | Significant revisions required |
| Below 60 | Non-Compliant | Major rework needed — do not publish |

---

## Report Template

Generate the compliance report in this format:

```markdown
# Brand Compliance Report

**Material**: [Name/description of material]
**Brand**: [Brand name from config]
**Reviewer**: Claude (AI Brand Review)
**Date**: [Current date]

## Overall Score: XX/100 — [Compliance Level]

## Summary
[2-3 sentence overview of the material's brand compliance]

## Category Scores
| Category | Score | Max | Status |
|----------|-------|-----|--------|
| Logo Usage | X | 20 | PASS/FAIL |
| Color Palette | X | 20 | PASS/FAIL |
| Typography | X | 15 | PASS/FAIL |
| Imagery | X | 10 | PASS/FAIL |
| Layout & Spacing | X | 10 | PASS/FAIL |
| Copy & Messaging | X | 15 | PASS/FAIL |
| Format & Technical | X | 10 | PASS/FAIL |

## Issues Found

### Critical Issues (must fix before publication)
1. **[Issue]**: [Description] — **Rule violated**: [Reference] — **Fix**: [Specific correction]

### Recommended Improvements (nice to fix)
1. **[Issue]**: [Description] — **Suggestion**: [How to improve]

## What's Working Well
- [Positive observations about brand compliance]

## Next Steps
[Prioritized action items]
```

---

## Quick-Check Mode

For rapid reviews (social media posts, quick assets), use this abbreviated checklist:

- [ ] Colors from approved palette?
- [ ] Correct font(s)?
- [ ] Logo correct variant and size?
- [ ] Copy matches brand voice?
- [ ] Correct dimensions for platform?
- [ ] Contrast passes accessibility check?
- [ ] CTA is clear and on-brand?

If all pass: approved. If any fail: flag for detailed review.
