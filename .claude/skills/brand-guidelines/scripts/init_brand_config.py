#!/usr/bin/env python3
"""
Initialize a brand-config.json file with the full schema structure.
Generates a template that can be filled in with a specific brand's details.

Usage:
    python3 init_brand_config.py --output brand-config.json
    python3 init_brand_config.py --output brand-config.json --brand "Acme Corp"
"""

import argparse
import json
import os
import sys


def generate_brand_config(brand_name: str = "Your Brand Name") -> dict:
    """Generate a complete brand config template with all sections."""
    return {
        "brand_name": brand_name,
        "brand_identity": {
            "mission": "",
            "vision": "",
            "values": [],
            "positioning": "",
            "personality_traits": [],
            "tagline": "",
            "boilerplate": ""
        },
        "colors": {
            "primary": [
                {
                    "name": "Primary",
                    "hex": "#000000",
                    "rgb": "0, 0, 0",
                    "cmyk": "0, 0, 0, 100",
                    "pantone": "",
                    "usage": "Primary text, headers, and dark backgrounds"
                }
            ],
            "secondary": [
                {
                    "name": "Secondary",
                    "hex": "#333333",
                    "rgb": "51, 51, 51",
                    "usage": "Secondary text and supporting elements"
                }
            ],
            "accent": [
                {
                    "name": "Accent",
                    "hex": "#FF6600",
                    "rgb": "255, 102, 0",
                    "usage": "CTA buttons, highlights, and attention-drawing elements"
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
            "gradient": []
        },
        "typography": {
            "heading_font": {
                "family": "Arial",
                "fallback": "Helvetica, sans-serif",
                "weights": ["600", "700"],
                "source": "System font"
            },
            "body_font": {
                "family": "Georgia",
                "fallback": "Times New Roman, serif",
                "weights": ["400", "500", "600"],
                "line_height": "1.6",
                "source": "System font"
            },
            "accent_font": None,
            "monospace_font": None,
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
        },
        "logo": {
            "variants": {
                "full_color": {
                    "description": "Primary full-color logo",
                    "background_constraint": "Light backgrounds only"
                },
                "reversed": {
                    "description": "White logo for dark backgrounds",
                    "background_constraint": "Dark backgrounds"
                },
                "monochrome_black": {
                    "description": "Single-color black version",
                    "background_constraint": "Light backgrounds"
                },
                "monochrome_white": {
                    "description": "Single-color white version",
                    "background_constraint": "Dark backgrounds"
                },
                "icon_only": {
                    "description": "Logomark without wordmark",
                    "usage": "Small spaces, favicons, app icons"
                }
            },
            "clear_space": {
                "unit": "logo height",
                "minimum": "1x on all sides"
            },
            "minimum_size": {
                "digital": "40px height",
                "print": "12mm height"
            },
            "placement": {
                "preferred_positions": ["top-left", "bottom-right"],
                "presentation_position": "bottom-right",
                "document_position": "top-left header"
            },
            "dont_rules": [
                "Never stretch or distort the logo",
                "Never rotate the logo",
                "Never add shadows, outlines, or effects",
                "Never recolor outside approved variants",
                "Never place on busy backgrounds without a container",
                "Never reduce below minimum size",
                "Never crop any part of the logo"
            ]
        },
        "imagery": {
            "photography": {
                "style": "",
                "subjects": [],
                "avoid": [],
                "color_treatment": ""
            },
            "illustration": {
                "style": "",
                "palette": "",
                "usage": ""
            },
            "iconography": {
                "style": "",
                "color": "",
                "set": ""
            }
        },
        "verbal_identity": {
            "tone_of_voice": {
                "personality": [],
                "we_are": [],
                "we_are_not": [],
                "examples": {
                    "on_brand": "",
                    "off_brand": ""
                }
            },
            "writing_style": {
                "voice": "Active voice preferred",
                "sentence_length": "15-20 words average",
                "capitalization": "Sentence case for headlines",
                "punctuation": {
                    "oxford_comma": True,
                    "exclamation_marks": "Sparingly"
                }
            },
            "terminology": {
                "preferred": {},
                "avoid": [],
                "product_names": {
                    "always_capitalize": True,
                    "never_abbreviate": True
                }
            },
            "key_messages": {
                "primary": "",
                "supporting": [],
                "cta_library": ["Learn more", "Get started", "Contact us"]
            }
        },
        "deliverable_defaults": {
            "social_media": {
                "hashtag_style": "lowercase",
                "brand_hashtag": "",
                "emoji_usage": "Moderate",
                "cta_every_post": True
            },
            "presentation": {
                "aspect_ratio": "16:9",
                "min_font_size": "18pt",
                "logo_position": "bottom-right"
            },
            "print": {
                "bleed": "3mm",
                "safe_zone": "5mm",
                "default_dpi": 300,
                "color_mode": "CMYK"
            },
            "email": {
                "max_width": "600px",
                "cta_button_color": "accent",
                "footer_text": ""
            },
            "video": {
                "title_card_duration": "3-5 seconds",
                "end_card_content": ["Logo", "Website URL", "CTA"]
            }
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description="Initialize a brand-config.json template"
    )
    parser.add_argument(
        "--output", "-o",
        default="brand-config.json",
        help="Output file path (default: brand-config.json)"
    )
    parser.add_argument(
        "--brand", "-b",
        default="Your Brand Name",
        help="Brand name to pre-fill"
    )
    parser.add_argument(
        "--minimal",
        action="store_true",
        help="Generate minimal config (colors and typography only)"
    )

    args = parser.parse_args()

    if args.minimal:
        config = {
            "brand_name": args.brand,
            "colors": {
                "primary": [{"name": "Primary", "hex": "#000000"}],
                "accent": [{"name": "Accent", "hex": "#FF6600"}],
                "neutral": [
                    {"name": "White", "hex": "#FFFFFF"},
                    {"name": "Dark", "hex": "#212121"}
                ]
            },
            "typography": {
                "heading_font": {"family": "Arial", "fallback": "Helvetica, sans-serif"},
                "body_font": {"family": "Georgia", "fallback": "Times New Roman, serif"}
            }
        }
    else:
        config = generate_brand_config(args.brand)

    # Don't overwrite existing config without warning
    if os.path.exists(args.output):
        print(f"Warning: {args.output} already exists.", file=sys.stderr)
        print("Use a different output path or delete the existing file.", file=sys.stderr)
        sys.exit(1)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"Brand config template created: {args.output}")
    print(f"Brand name: {args.brand}")
    print(f"Type: {'minimal' if args.minimal else 'full'}")
    print(f"Next step: Edit the file to fill in your brand's specific details.")


if __name__ == "__main__":
    main()
