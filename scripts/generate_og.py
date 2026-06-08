
from PIL import Image, ImageDraw, ImageFont
import json
import pathlib
import os
import sys
import textwrap

# =============================================================================
# COLOR CONSTANTS
# =============================================================================
BG = "#0A0A0F"
RED = "#E63946"
GOLD = "#FFD700"
CYAN = "#00B4D8"
ORANGE = "#FF6B35"
WHITE = "#FFFFFF"
GRAY = "#CCCCCC"
DIM = "#888888"
DARK_GRAY = "#222222"
BAR_BG = "#1E1E2E"


# =============================================================================
# HELPERS
# =============================================================================
def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))


def load_font(size, bold=False):
    font_paths = [
        pathlib.Path(__file__).parent / "assets" / "fonts" / "BebasNeue-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in font_paths:
        if pathlib.Path(path).exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                continue
    return ImageFont.load_default()


def fit_text_size(draw, text, max_width, font_loader_func, max_size=90, min_size=18):
    for size in range(max_size, min_size - 1, -2):
        font = font_loader_func(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            return font
    return font_loader_func(min_size)


def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.ellipse([x1, y1, x1 + 2 * radius, y1 + 2 * radius], fill=fill)
    draw.ellipse([x2 - 2 * radius, y1, x2, y1 + 2 * radius], fill=fill)
    draw.ellipse([x1, y2 - 2 * radius, x1 + 2 * radius, y2], fill=fill)
    draw.ellipse([x2 - 2 * radius, y2 - 2 * radius, x2, y2], fill=fill)
    if outline:
        draw.arc([x1, y1, x1 + 2 * radius, y1 + 2 * radius], 180, 270, fill=outline, width=outline_width)
        draw.arc([x2 - 2 * radius, y1, x2, y1 + 2 * radius], 270, 360, fill=outline, width=outline_width)
        draw.arc([x1, y2 - 2 * radius, x1 + 2 * radius, y2], 90, 180, fill=outline, width=outline_width)
        draw.arc([x2 - 2 * radius, y2 - 2 * radius, x2, y2], 0, 90, fill=outline, width=outline_width)
        draw.line([x1 + radius, y1, x2 - radius, y1], fill=outline, width=outline_width)
        draw.line([x1 + radius, y2, x2 - radius, y2], fill=outline, width=outline_width)
        draw.line([x1, y1 + radius, x1, y2 - radius], fill=outline, width=outline_width)
        draw.line([x2, y1 + radius, x2, y2 - radius], fill=outline, width=outline_width)


def draw_progress_bar(draw, x, y, width, height, percentage, bar_color, bg_color):
    draw_rounded_rect(draw, (x, y, x + width, y + height), radius=height // 2, fill=hex_to_rgb(bg_color))
    filled = int(width * percentage / 100)
    if filled > height:
        draw_rounded_rect(draw, (x, y, x + filled, y + height), radius=height // 2, fill=hex_to_rgb(bar_color))


# =============================================================================
# IMAGE GENERATORS
# =============================================================================
def generate_cry_meter(data, output_path):
    img = Image.new("RGB", (1200, 630), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    draw.text((30, 25), "THE CRY-METER 😭", font=load_font(22), fill=hex_to_rgb(DIM))
    brand_text = "MUNDIAL DRAMA PULSE"
    brand_font = load_font(18)
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    draw.text((1170 - (brand_bbox[2] - brand_bbox[0]), 25), brand_text, font=brand_font, fill=hex_to_rgb(DIM))

    draw.text((680, 80), "OVERALL WHINE SCORE", font=load_font(20), fill=hex_to_rgb(DIM))

    score = str(data["cryMeter"]["overallWhineScore"])
    score_font = load_font(180)
    score_bbox = draw.textbbox((0, 0), score, font=score_font)
    score_x = 900 - (score_bbox[2] - score_bbox[0]) // 2
    draw.text((score_x, 100), score, font=score_font, fill=hex_to_rgb(CYAN))

    sub_text = "/100 DRAMA INDEX"
    sub_font = load_font(22)
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    sub_x = 900 - (sub_bbox[2] - sub_bbox[0]) // 2
    draw.text((sub_x, 100 + (score_bbox[3] - score_bbox[1]) + 10), sub_text, font=sub_font, fill=hex_to_rgb(DIM))

    draw.text((30, 80), "TOP COMPLAINERS", font=load_font(22), fill=hex_to_rgb(WHITE))

    for idx, cryer in enumerate(data["cryMeter"]["topCryers"][:3]):
        y_pos = 130 + (idx * 110)
        name_text = f"{cryer['flag']} {cryer['name']}"
        draw.text((30, y_pos), name_text, font=load_font(26), fill=hex_to_rgb(WHITE))

        complaint = cryer["complaint"]
        if len(complaint) > 35:
            complaint = complaint[:35].rsplit(" ", 1)[0] + "..."
        draw.text((30, y_pos + 32), complaint, font=load_font(18), fill=hex_to_rgb(GRAY))

        draw_progress_bar(draw, 30, y_pos + 70, 500, 16, cryer["score"], CYAN, BAR_BG)

        score_txt = f"{cryer['score']}%"
        score_txt_font = load_font(18)
        draw.text((540, y_pos + 68), score_txt, font=score_txt_font, fill=hex_to_rgb(CYAN))

    draw.line([(620, 70), (620, 560)], fill=hex_to_rgb(DIM), width=1)

    draw.text((30, 490), "TRENDING GRIPES:", font=load_font(18), fill=hex_to_rgb(DIM))
    pill_x = 30
    for phrase in data["cryMeter"]["trending"][:4]:
        pill_font = load_font(17)
        pill_bbox = draw.textbbox((0, 0), phrase, font=pill_font)
        pill_width = (pill_bbox[2] - pill_bbox[0]) + 24
        pill_height = 30
        draw_rounded_rect(draw, (pill_x, 490, pill_x + pill_width, 490 + pill_height), radius=10, fill=hex_to_rgb(BG), outline=hex_to_rgb(CYAN), outline_width=1)
        draw.text((pill_x + 12, 490 + 6), phrase, font=pill_font, fill=hex_to_rgb(CYAN))
        pill_x += pill_width + 10

    draw.rectangle([(0, 600), (1200, 630)], fill=hex_to_rgb("#111122"))
    updated_text = f"Updated: {data['meta']['lastUpdated'][:16].replace('T', ' ')} UTC"
    draw.text((20, 607), updated_text, font=load_font(16), fill=hex_to_rgb(DIM))
    domain_text = "mundialdraMApulse.com"
    domain_font = load_font(16)
    domain_bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    draw.text((1180 - (domain_bbox[2] - domain_bbox[0]), 607), domain_text, font=domain_font, fill=hex_to_rgb(DIM))

    img.save(output_path, "PNG", optimize=True)


def generate_villain(data, output_path):
    img = Image.new("RGB", (1200, 630), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (1200, 180)], fill=(80, 0, 10))

    draw.text((40, 30), "👿 VILLAIN OF THE DAY", font=load_font(28), fill=hex_to_rgb(RED))
    brand_text = "MUNDIAL DRAMA PULSE"
    brand_font = load_font(18)
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    draw.text((1170 - (brand_bbox[2] - brand_bbox[0]), 30), brand_text, font=brand_font, fill=hex_to_rgb(DIM))

    name = data["villain"]["name"]
    name_font = fit_text_size(draw, name, 900, load_font, max_size=90, min_size=36)
    name_bbox = draw.textbbox((0, 0), name, font=name_font)
    name_x = 600 - (name_bbox[2] - name_bbox[0]) // 2
    draw.text((name_x, 160), name, font=name_font, fill=hex_to_rgb(WHITE))

    role = data["villain"]["role"].upper()
    role_font = load_font(20)
    role_bbox = draw.textbbox((0, 0), role, font=role_font)
    role_width = (role_bbox[2] - role_bbox[0]) + 20
    role_height = 35
    role_x1 = 600 - role_width // 2
    role_y1 = 260
    draw_rounded_rect(draw, (role_x1, role_y1, role_x1 + role_width, role_y1 + role_height), radius=10, fill=hex_to_rgb(DARK_GRAY), outline=hex_to_rgb(RED), outline_width=2)
    draw.text((role_x1 + 10, role_y1 + 5), role, font=role_font, fill=hex_to_rgb(RED))

    reason_lines = textwrap.wrap(data["villain"]["reason"], width=55)
    y_offset = 320
    for line in reason_lines:
        draw.text((40, y_offset), line, font=load_font(26), fill=hex_to_rgb(GRAY))
        y_offset += 34

    draw.text((40, 470), "🔥 HEAT SCORE", font=load_font(22), fill=hex_to_rgb(RED))
    score_txt = f"{data['villain']['heatScore']}/100"
    draw.text((200, 470), score_txt, font=load_font(22), fill=hex_to_rgb(WHITE))
    draw_progress_bar(draw, 40, 500, 700, 20, data["villain"]["heatScore"], RED, BAR_BG)

    slander = data["villain"]["topSlander"]
    if len(slander) > 130:
        slander = slander[:130].rsplit(" ", 1)[0] + "..."
    draw.text((40, 555), f"\" {slander}", font=load_font(20), fill=hex_to_rgb(DIM))

    vertical_text = "UNDER FIRE"
    for idx, char in enumerate(vertical_text):
        draw.text((1140, 80 + idx * 40), char, font=load_font(28), fill=(80, 20, 20))

    draw.rectangle([(0, 600), (1200, 630)], fill=hex_to_rgb("#111122"))
    updated_text = f"Updated: {data['meta']['lastUpdated'][:16].replace('T', ' ')} UTC"
    draw.text((20, 607), updated_text, font=load_font(16), fill=hex_to_rgb(DIM))
    domain_text = "mundialdraMApulse.com"
    domain_font = load_font(16)
    domain_bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    draw.text((1180 - (domain_bbox[2] - domain_bbox[0]), 607), domain_text, font=domain_font, fill=hex_to_rgb(DIM))

    img.save(output_path, "PNG", optimize=True)


def generate_tragic_hero(data, output_path):
    img = Image.new("RGB", (1200, 630), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (1200, 8)], fill=hex_to_rgb(GOLD))
    draw.rectangle([(0, 622), (1200, 630)], fill=hex_to_rgb(GOLD))

    draw.text((40, 30), "💔 THE TRAGIC HERO", font=load_font(28), fill=hex_to_rgb(GOLD))
    brand_text = "MUNDIAL DRAMA PULSE"
    brand_font = load_font(18)
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    draw.text((1170 - (brand_bbox[2] - brand_bbox[0]), 30), brand_text, font=brand_font, fill=hex_to_rgb(DIM))

    name = data["tragicHero"]["name"]
    name_font = fit_text_size(draw, name, 900, load_font, max_size=90, min_size=36)
    name_bbox = draw.textbbox((0, 0), name, font=name_font)
    name_x = 600 - (name_bbox[2] - name_bbox[0]) // 2
    draw.text((name_x, 160), name, font=name_font, fill=hex_to_rgb(WHITE))

    team = data["tragicHero"]["team"]
    team_font = load_font(32)
    team_bbox = draw.textbbox((0, 0), team, font=team_font)
    team_x = 600 - (team_bbox[2] - team_bbox[0]) // 2
    draw.text((team_x, 260), team, font=team_font, fill=hex_to_rgb(GOLD))

    story_lines = textwrap.wrap(data["tragicHero"]["story"], width=60)
    y_offset = 310
    for line in story_lines:
        draw.text((40, y_offset), f"~ {line}", font=load_font(24), fill=hex_to_rgb(GRAY))
        y_offset += 32

    draw.text((40, 470), "SYMPATHY SCORE", font=load_font(20), fill=hex_to_rgb(DIM))
    filled_hearts = round(data["tragicHero"]["sympathyScore"] / 10)
    for i in range(10):
        color = GOLD if i < filled_hearts else "#333333"
        draw.text((40 + i * 38, 498), "♥", font=load_font(30), fill=hex_to_rgb(color))

    score_label = f"{data['tragicHero']['sympathyScore']}/100"
    draw.text((430, 503), score_label, font=load_font(20), fill=hex_to_rgb(GOLD))

    draw.line([(40, 548), (40, 588)], fill=hex_to_rgb(GOLD), width=4)
    quote = data["tragicHero"]["quote"][:110]
    draw.text((52, 553), quote, font=load_font(22), fill=hex_to_rgb(WHITE))

    draw.text((950, 80), "💔", font=load_font(200), fill=(60, 30, 30))

    draw.rectangle([(0, 600), (1200, 630)], fill=hex_to_rgb("#111122"))
    updated_text = f"Updated: {data['meta']['lastUpdated'][:16].replace('T', ' ')} UTC"
    draw.text((20, 607), updated_text, font=load_font(16), fill=hex_to_rgb(DIM))
    domain_text = "mundialdraMApulse.com"
    domain_font = load_font(16)
    domain_bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    draw.text((1180 - (domain_bbox[2] - domain_bbox[0]), 607), domain_text, font=domain_font, fill=hex_to_rgb(DIM))

    img.save(output_path, "PNG", optimize=True)


def generate_tribunal(data, output_path):
    img = Image.new("RGB", (1200, 630), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    draw.text((40, 30), "⚖️ THE DAILY TRIBUNAL", font=load_font(28), fill=hex_to_rgb(ORANGE))
    brand_text = "MUNDIAL DRAMA PULSE"
    brand_font = load_font(18)
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    draw.text((1170 - (brand_bbox[2] - brand_bbox[0]), 30), brand_text, font=brand_font, fill=hex_to_rgb(DIM))

    question = data["tribunal"]["question"]
    q_font = fit_text_size(draw, question, 1100, load_font, max_size=44, min_size=24)
    q_bbox = draw.textbbox((0, 0), question, font=q_font)
    q_x = 600 - (q_bbox[2] - q_bbox[0]) // 2
    draw.text((q_x, 100), question, font=q_font, fill=hex_to_rgb(WHITE))

    draw.line([(590, 150), (610, 580)], fill=hex_to_rgb(ORANGE), width=3)

    side_a = data["tribunal"]["sideA"]
    side_b = data["tribunal"]["sideB"]

    a_label_font = fit_text_size(draw, side_a["label"], 520, load_font, max_size=52, min_size=24)
    draw.text((40, 180), side_a["label"], font=a_label_font, fill=hex_to_rgb(ORANGE))

    a_desc_lines = textwrap.wrap(side_a["description"], width=35)
    y_offset = 250
    for line in a_desc_lines:
        draw.text((40, y_offset), line, font=load_font(22), fill=hex_to_rgb(GRAY))
        y_offset += 28

    a_pct = str(side_a["percentage"]) + "%"
    a_pct_font = load_font(100)
    draw.text((40, 460), a_pct, font=a_pct_font, fill=hex_to_rgb(WHITE))

    b_label_font = fit_text_size(draw, side_b["label"], 520, load_font, max_size=52, min_size=24)
    b_label_bbox = draw.textbbox((0, 0), side_b["label"], font=b_label_font)
    draw.text((1160 - (b_label_bbox[2] - b_label_bbox[0]), 180), side_b["label"], font=b_label_font, fill=hex_to_rgb(RED))

    b_desc_lines = textwrap.wrap(side_b["description"], width=35)
    y_offset = 250
    for line in b_desc_lines:
        line_bbox = draw.textbbox((0, 0), line, font=load_font(22))
        draw.text((1160 - (line_bbox[2] - line_bbox[0]), y_offset), line, font=load_font(22), fill=hex_to_rgb(GRAY))
        y_offset += 28

    b_pct = str(side_b["percentage"]) + "%"
    b_pct_font = load_font(100)
    b_pct_bbox = draw.textbbox((0, 0), b_pct, font=b_pct_font)
    draw.text((1160 - (b_pct_bbox[2] - b_pct_bbox[0]), 460), b_pct, font=b_pct_font, fill=hex_to_rgb(WHITE))

    total_formatted = f"{data['tribunal']['totalMockVotes']:,}"
    total_text = f"TOTAL VOTES: {total_formatted}"
    total_font = load_font(20)
    total_bbox = draw.textbbox((0, 0), total_text, font=total_font)
    draw.text((600 - (total_bbox[2] - total_bbox[0]) // 2, 585), total_text, font=total_font, fill=hex_to_rgb(DIM))

    tiny_text = "VOTE NOW AT MUNDIALDRAMPULSE.COM"
    tiny_font = load_font(14)
    tiny_bbox = draw.textbbox((0, 0), tiny_text, font=tiny_font)
    draw.text((600 - (tiny_bbox[2] - tiny_bbox[0]) // 2, 612), tiny_text, font=tiny_font, fill=(50, 50, 50))

    draw.rectangle([(0, 600), (1200, 630)], fill=hex_to_rgb("#111122"))
    updated_text = f"Updated: {data['meta']['lastUpdated'][:16].replace('T', ' ')} UTC"
    draw.text((20, 607), updated_text, font=load_font(16), fill=hex_to_rgb(DIM))
    domain_text = "mundialdraMApulse.com"
    domain_font = load_font(16)
    domain_bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    draw.text((1180 - (domain_bbox[2] - domain_bbox[0]), 607), domain_text, font=domain_font, fill=hex_to_rgb(DIM))

    img.save(output_path, "PNG", optimize=True)


# =============================================================================
# MAIN
# =============================================================================
def main():
    data_path = pathlib.Path(__file__).parent.parent / "public" / "data" / "data.json"
    output_dir = pathlib.Path(__file__).parent.parent / "public" / "og-images"
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks = [
        ("cry-meter", generate_cry_meter),
        ("villain", generate_villain),
        ("tragic-hero", generate_tragic_hero),
        ("tribunal", generate_tribunal),
    ]
    for slug, func in tasks:
        out = output_dir / f"{slug}.png"
        try:
            func(data, out)
            print(f"✅ Generated {slug}.png")
        except Exception as e:
            print(f"❌ Failed {slug}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
