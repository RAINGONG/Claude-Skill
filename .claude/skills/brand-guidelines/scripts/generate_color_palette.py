#!/usr/bin/env python3
"""
Generate a visual color palette from a brand-config.json file.
Outputs an HTML file with color swatches, or a simple SVG.

Usage:
    python3 generate_color_palette.py --config brand-config.json --output palette.html
    python3 generate_color_palette.py --config brand-config.json --output palette.svg --format svg
"""

import argparse
import json
import os
import sys


def load_config(config_path: str) -> dict:
    """Load brand config JSON."""
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def is_light_color(hex_color: str) -> bool:
    """Determine if a color is light (for choosing text color)."""
    r, g, b = hex_to_rgb(hex_color)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5


def generate_html(config: dict) -> str:
    """Generate an HTML color palette visualization."""
    brand_name = config.get("brand_name", "Brand")
    colors = config.get("colors", {})

    html_parts = [f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{brand_name} — Color Palette</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fafafa;
    padding: 40px;
    color: #333;
  }}
  h1 {{
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }}
  .subtitle {{
    font-size: 14px;
    color: #888;
    margin-bottom: 40px;
  }}
  .color-group {{
    margin-bottom: 32px;
  }}
  .group-label {{
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #666;
    margin-bottom: 12px;
  }}
  .swatches {{
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }}
  .swatch {{
    width: 160px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    background: white;
  }}
  .swatch-color {{
    height: 100px;
    display: flex;
    align-items: flex-end;
    padding: 10px;
  }}
  .swatch-info {{
    padding: 12px;
  }}
  .swatch-name {{
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }}
  .swatch-hex {{
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #888;
    margin-bottom: 2px;
  }}
  .swatch-usage {{
    font-size: 11px;
    color: #aaa;
    line-height: 1.4;
  }}
</style>
</head>
<body>
<h1>{brand_name}</h1>
<p class="subtitle">Brand Color Palette</p>
"""]

    group_order = ["primary", "secondary", "accent", "neutral", "semantic", "gradient"]

    for group_name in group_order:
        group = colors.get(group_name, [])
        if not group or not isinstance(group, list):
            continue

        html_parts.append(f'<div class="color-group">')
        html_parts.append(f'  <div class="group-label">{group_name.replace("_", " ")}</div>')
        html_parts.append(f'  <div class="swatches">')

        for color in group:
            hex_val = color.get("hex", "#000000")
            name = color.get("name", "Unnamed")
            usage = color.get("usage", "")
            rgb = color.get("rgb", "")
            text_color = "#333" if is_light_color(hex_val) else "#fff"

            html_parts.append(f"""    <div class="swatch">
      <div class="swatch-color" style="background-color: {hex_val};">
      </div>
      <div class="swatch-info">
        <div class="swatch-name">{name}</div>
        <div class="swatch-hex">{hex_val}</div>
        {"<div class='swatch-hex'>" + rgb + "</div>" if rgb else ""}
        {"<div class='swatch-usage'>" + usage + "</div>" if usage else ""}
      </div>
    </div>""")

        html_parts.append('  </div>')
        html_parts.append('</div>')

    # Typography section
    typography = config.get("typography", {})
    heading = typography.get("heading_font", {})
    body = typography.get("body_font", {})

    if heading or body:
        html_parts.append('<div class="color-group">')
        html_parts.append('  <div class="group-label">Typography</div>')
        html_parts.append('  <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">')
        if heading.get("family"):
            html_parts.append(f'    <p style="font-size: 32px; font-weight: 700; margin-bottom: 8px; font-family: {heading["family"]}, {heading.get("fallback", "sans-serif")};">{heading["family"]}</p>')
            html_parts.append(f'    <p style="font-size: 13px; color: #888; margin-bottom: 20px;">Heading Font — Weights: {", ".join(heading.get("weights", ["400"]))}</p>')
        if body.get("family"):
            html_parts.append(f'    <p style="font-size: 18px; margin-bottom: 8px; font-family: {body["family"]}, {body.get("fallback", "serif")};">The quick brown fox jumps over the lazy dog. {body["family"]} — Body Font</p>')
            html_parts.append(f'    <p style="font-size: 13px; color: #888;">Body Font — Weights: {", ".join(body.get("weights", ["400"]))}, Line Height: {body.get("line_height", "1.6")}</p>')
        html_parts.append('  </div>')
        html_parts.append('</div>')

    html_parts.append('</body></html>')
    return "\n".join(html_parts)


def generate_svg(config: dict) -> str:
    """Generate an SVG color palette visualization."""
    brand_name = config.get("brand_name", "Brand")
    colors = config.get("colors", {})

    swatch_w = 120
    swatch_h = 80
    gap = 10
    padding = 30
    cols_per_row = 6

    # Count total colors
    all_groups = []
    group_order = ["primary", "secondary", "accent", "neutral", "semantic"]
    for gn in group_order:
        g = colors.get(gn, [])
        if isinstance(g, list) and g:
            all_groups.append((gn, g))

    total_height = padding
    for group_name, group in all_groups:
        total_height += 30  # group label
        rows = (len(group) + cols_per_row - 1) // cols_per_row
        total_height += rows * (swatch_h + 25 + gap) + 10

    total_width = padding * 2 + cols_per_row * (swatch_w + gap) - gap

    svg_parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{total_height + 60}" viewBox="0 0 {total_width} {total_height + 60}">']
    svg_parts.append(f'<rect width="100%" height="100%" fill="#fafafa"/>')
    svg_parts.append(f'<text x="{padding}" y="{padding + 20}" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#333">{brand_name} — Color Palette</text>')

    y_offset = padding + 50

    for group_name, group in all_groups:
        svg_parts.append(f'<text x="{padding}" y="{y_offset}" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#888" text-transform="uppercase">{group_name.upper()}</text>')
        y_offset += 20

        for i, color in enumerate(group):
            col = i % cols_per_row
            row = i // cols_per_row
            x = padding + col * (swatch_w + gap)
            y = y_offset + row * (swatch_h + 25 + gap)

            hex_val = color.get("hex", "#000000")
            name = color.get("name", "")
            text_fill = "#333" if is_light_color(hex_val) else "#fff"

            svg_parts.append(f'<rect x="{x}" y="{y}" width="{swatch_w}" height="{swatch_h}" rx="8" fill="{hex_val}"/>')
            svg_parts.append(f'<text x="{x + 8}" y="{y + swatch_h - 10}" font-family="monospace" font-size="11" fill="{text_fill}">{hex_val}</text>')
            svg_parts.append(f'<text x="{x}" y="{y + swatch_h + 15}" font-family="Arial, sans-serif" font-size="11" fill="#555">{name}</text>')

        rows = (len(group) + cols_per_row - 1) // cols_per_row
        y_offset += rows * (swatch_h + 25 + gap) + 10

    svg_parts.append('</svg>')
    return "\n".join(svg_parts)


def main():
    parser = argparse.ArgumentParser(
        description="Generate visual color palette from brand config"
    )
    parser.add_argument("--config", "-c", required=True, help="Path to brand-config.json")
    parser.add_argument("--output", "-o", default="palette.html", help="Output file path")
    parser.add_argument("--format", "-f", choices=["html", "svg"], default=None,
                       help="Output format (auto-detected from extension)")

    args = parser.parse_args()
    config = load_config(args.config)

    fmt = args.format
    if fmt is None:
        if args.output.endswith(".svg"):
            fmt = "svg"
        else:
            fmt = "html"

    if fmt == "html":
        content = generate_html(config)
    else:
        content = generate_svg(config)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Color palette generated: {args.output} ({fmt})")


if __name__ == "__main__":
    main()
