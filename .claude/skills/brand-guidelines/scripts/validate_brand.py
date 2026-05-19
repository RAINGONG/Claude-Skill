#!/usr/bin/env python3
"""
Validate brand materials and configurations for compliance.

Usage:
    # Validate a brand config file for completeness
    python3 validate_brand.py --config brand-config.json --check config

    # Check color contrast compliance
    python3 validate_brand.py --config brand-config.json --check colors

    # Validate a material file against brand config
    python3 validate_brand.py --config brand-config.json --material poster.pptx

    # Generate a compliance summary
    python3 validate_brand.py --config brand-config.json --check all
"""

import argparse
import json
import math
import os
import sys
from typing import Any


def load_config(config_path: str) -> dict:
    """Load and parse brand config JSON."""
    if not os.path.exists(config_path):
        print(f"Error: Config file not found: {config_path}", file=sys.stderr)
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return None
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def relative_luminance(rgb: tuple) -> float:
    """Calculate relative luminance per WCAG 2.1."""
    r, g, b = [x / 255.0 for x in rgb]
    r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
    g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
    b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(color1_hex: str, color2_hex: str) -> float:
    """Calculate WCAG contrast ratio between two colors."""
    rgb1 = hex_to_rgb(color1_hex)
    rgb2 = hex_to_rgb(color2_hex)
    if rgb1 is None or rgb2 is None:
        return 0.0

    l1 = relative_luminance(rgb1)
    l2 = relative_luminance(rgb2)

    lighter = max(l1, l2)
    darker = min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05)


def check_config_completeness(config: dict) -> list:
    """Check brand config for completeness and common issues."""
    issues = []
    warnings = []

    # Required fields
    if not config.get("brand_name") or config["brand_name"] == "Your Brand Name":
        issues.append("CRITICAL: brand_name is missing or not set")

    # Colors
    colors = config.get("colors", {})
    if not colors.get("primary"):
        issues.append("CRITICAL: No primary colors defined")
    elif not any(c.get("hex") for c in colors["primary"]):
        issues.append("CRITICAL: Primary color(s) missing hex values")

    if not colors.get("accent"):
        warnings.append("WARNING: No accent colors defined — CTAs will lack visual punch")

    if not colors.get("neutral"):
        warnings.append("WARNING: No neutral colors — defaults will be used for backgrounds")

    # Check all color hex values are valid
    for group_name, group in colors.items():
        if isinstance(group, list):
            for i, color in enumerate(group):
                hex_val = color.get("hex", "")
                if hex_val and hex_to_rgb(hex_val) is None:
                    issues.append(f"ERROR: Invalid hex value '{hex_val}' in colors.{group_name}[{i}]")

    # Typography
    typography = config.get("typography", {})
    heading_font = typography.get("heading_font", {})
    body_font = typography.get("body_font", {})

    if not heading_font.get("family"):
        issues.append("CRITICAL: No heading font family defined")
    if not body_font.get("family"):
        issues.append("CRITICAL: No body font family defined")
    if not heading_font.get("fallback"):
        warnings.append("WARNING: No fallback for heading font — may render in system default")
    if not body_font.get("fallback"):
        warnings.append("WARNING: No fallback for body font — may render in system default")

    # Logo
    logo = config.get("logo", {})
    if not logo:
        warnings.append("WARNING: No logo configuration — logo usage rules will use defaults")

    # Verbal identity
    verbal = config.get("verbal_identity", {})
    tone = verbal.get("tone_of_voice", {})
    if not tone.get("personality"):
        warnings.append("WARNING: No personality traits defined — copy guidance will be generic")

    # Brand identity
    identity = config.get("brand_identity", {})
    if not identity.get("mission"):
        warnings.append("INFO: No mission statement — long-form content may lack direction")

    return issues + warnings


def check_color_contrast(config: dict) -> list:
    """Check all foreground/background color combinations for WCAG AA compliance."""
    results = []
    colors = config.get("colors", {})

    # Collect all colors
    all_colors = []
    for group_name, group in colors.items():
        if isinstance(group, list):
            for color in group:
                if color.get("hex"):
                    all_colors.append({
                        "name": color.get("name", "unnamed"),
                        "hex": color["hex"],
                        "group": group_name
                    })

    if len(all_colors) < 2:
        results.append("INFO: Need at least 2 colors to check contrast")
        return results

    # Check text colors against background colors
    # Typically: dark colors as text on light backgrounds, light colors as text on dark
    light_bgs = [c for c in all_colors if relative_luminance(hex_to_rgb(c["hex"]) or (0,0,0)) > 0.4]
    dark_bgs = [c for c in all_colors if relative_luminance(hex_to_rgb(c["hex"]) or (0,0,0)) <= 0.4]
    dark_text = [c for c in all_colors if relative_luminance(hex_to_rgb(c["hex"]) or (0,0,0)) <= 0.4]
    light_text = [c for c in all_colors if relative_luminance(hex_to_rgb(c["hex"]) or (0,0,0)) > 0.4]

    results.append("=== Color Contrast Report ===\n")
    results.append("WCAG AA Requirements: 4.5:1 for body text, 3:1 for large text (18pt+)\n")

    # Dark text on light backgrounds
    results.append("--- Dark Text on Light Backgrounds ---")
    for text in dark_text:
        for bg in light_bgs:
            if text["hex"] == bg["hex"]:
                continue
            ratio = contrast_ratio(text["hex"], bg["hex"])
            status = "PASS" if ratio >= 4.5 else ("LARGE-ONLY" if ratio >= 3.0 else "FAIL")
            results.append(
                f"  {text['name']} ({text['hex']}) on {bg['name']} ({bg['hex']}): "
                f"{ratio:.2f}:1 [{status}]"
            )

    # Light text on dark backgrounds
    results.append("\n--- Light Text on Dark Backgrounds ---")
    for text in light_text:
        for bg in dark_bgs:
            if text["hex"] == bg["hex"]:
                continue
            ratio = contrast_ratio(text["hex"], bg["hex"])
            status = "PASS" if ratio >= 4.5 else ("LARGE-ONLY" if ratio >= 3.0 else "FAIL")
            results.append(
                f"  {text['name']} ({text['hex']}) on {bg['name']} ({bg['hex']}): "
                f"{ratio:.2f}:1 [{status}]"
            )

    return results


def generate_summary(config: dict) -> list:
    """Generate a human-readable brand config summary."""
    lines = []
    brand = config.get("brand_name", "Unknown Brand")
    lines.append(f"=== Brand Configuration Summary: {brand} ===\n")

    # Colors
    colors = config.get("colors", {})
    color_count = sum(len(g) for g in colors.values() if isinstance(g, list))
    lines.append(f"Colors: {color_count} colors defined across {len(colors)} groups")
    for group_name, group in colors.items():
        if isinstance(group, list) and group:
            color_names = [c.get("name", c.get("hex", "?")) for c in group]
            lines.append(f"  {group_name}: {', '.join(color_names)}")

    # Typography
    typo = config.get("typography", {})
    heading = typo.get("heading_font", {}).get("family", "Not set")
    body = typo.get("body_font", {}).get("family", "Not set")
    lines.append(f"\nTypography:")
    lines.append(f"  Heading font: {heading}")
    lines.append(f"  Body font: {body}")

    # Verbal identity
    verbal = config.get("verbal_identity", {})
    traits = verbal.get("tone_of_voice", {}).get("personality", [])
    if traits:
        lines.append(f"\nBrand Personality: {', '.join(traits)}")

    # Logo
    logo = config.get("logo", {})
    variants = logo.get("variants", {})
    if variants:
        lines.append(f"\nLogo Variants: {', '.join(variants.keys())}")

    # Completeness
    completeness_issues = check_config_completeness(config)
    critical = [i for i in completeness_issues if i.startswith("CRITICAL")]
    warnings = [i for i in completeness_issues if i.startswith("WARNING")]
    infos = [i for i in completeness_issues if i.startswith("INFO")]

    lines.append(f"\nCompleteness:")
    lines.append(f"  Critical issues: {len(critical)}")
    lines.append(f"  Warnings: {len(warnings)}")
    lines.append(f"  Info notes: {len(infos)}")

    if completeness_issues:
        lines.append("\nDetails:")
        for issue in completeness_issues:
            lines.append(f"  {issue}")

    return lines


def main():
    parser = argparse.ArgumentParser(
        description="Validate brand configuration and materials"
    )
    parser.add_argument(
        "--config", "-c",
        required=True,
        help="Path to brand-config.json"
    )
    parser.add_argument(
        "--check",
        choices=["config", "colors", "all"],
        default="all",
        help="What to check (default: all)"
    )
    parser.add_argument(
        "--material", "-m",
        help="Path to material file to validate (future feature)"
    )

    args = parser.parse_args()
    config = load_config(args.config)

    if args.check in ("config", "all"):
        print("=== Config Completeness Check ===\n")
        issues = check_config_completeness(config)
        if issues:
            for issue in issues:
                print(f"  {issue}")
        else:
            print("  All checks passed — config is complete!")
        print()

    if args.check in ("colors", "all"):
        contrast_results = check_color_contrast(config)
        for line in contrast_results:
            print(line)
        print()

    if args.check == "all":
        summary = generate_summary(config)
        for line in summary:
            print(line)

    if args.material:
        print(f"\nMaterial validation for '{args.material}' — ", end="")
        print("This is a placeholder. Manual review is recommended.")
        print("Use the review checklist in references/review-checklist.md")


if __name__ == "__main__":
    main()
