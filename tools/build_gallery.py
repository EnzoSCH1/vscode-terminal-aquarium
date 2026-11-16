"""Fabrique les planches de presentation du README (images/gallery-*.png)
a partir de l'atlas embarque dans aquarium-inject.js.

Usage : python tools/build_gallery.py
"""
import base64
import io
import json
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images")
SCALE = 3
PAD = 6
BG_TOP = (99, 247, 220)
BG_BOTTOM = (74, 152, 240)

FISH = ["clown", "tang", "ytang", "idol", "butterfly", "neon", "gramma", "snapper",
        "koi", "puffer", "grouper", "angel", "discus", "wrasse", "mandarin", "lion",
        "betta", "goldfish", "guppy", "scalare", "parrot", "trigger", "boxfish", "cardinal",
        "flameangel", "cory", "angler", "piranha", "swordtail", "mola", "seadragon", "sardine",
        "cowfish", "clowntrigger", "powdertang", "foxface", "pajama", "longnose", "chromis",
        "arowana", "tigerbarb", "molly", "ram", "damsel",
        "napoleon", "gourami", "redtail", "rainbow", "pike", "bluediscus"]
ANIMALS = ["seahorse", "turtle", "jelly", "octopus", "squid", "cuttlefish", "axolotl", "penguin",
           "ray", "manta", "diver", "seal", "dolphin", "narwhal", "orca", "whale", "shark",
           "crab", "hermit", "lobster", "shrimp", "snail", "nudibranch", "urchin"]
DECOR = ["ship", "lighthouse", "moai", "sandcastle", "mushroom", "column", "arch", "driftwood",
         "chest", "barrel", "anchor", "amphora", "helmet", "crystal", "rock", "clam", "conch", "bottle", "star",
         "kelp", "redweed", "blade", "seawhip", "anemone", "grass",
         "branch", "pinkcoral", "staghorn", "flame", "fan", "tube", "brain", "tablecoral", "mushcoral",
         "torii", "pagoda", "tower", "volcano", "submarine", "bridge", "tiki", "shellhouse", "skull",
         "wheel", "cannon", "lantern", "ufo", "signpost", "boot", "treasure",
         "goldkelp", "cabomba", "purpleweed", "tealfern", "redfern", "eelgrass", "grapealgae", "blossom",
         "elkhorn", "acropora", "carnation", "pillar", "torch", "bubblecoral", "suncoral", "zoa"]


def load_atlas():
    with open(os.path.join(ROOT, "aquarium-inject.js"), encoding="utf8") as fh:
        src = fh.read()
    m = re.search(r"const ATLAS = (\{.*?\});\n", src, flags=re.S)
    data = json.loads(m.group(1))
    img = Image.open(io.BytesIO(base64.b64decode(data["img"].split(",", 1)[1]))).convert("RGBA")
    return img, data["s"]


def sprite(img, rects, name):
    key = name if name in rects else None
    if key is None:
        # variante de taille intermediaire si elle existe, sinon la plus grande
        key = name + "_1" if name + "_1" in rects else name + "_0"
    x, y, w, h = rects[key]
    return img.crop((x, y, x + w, y + h))


def sheet(img, rects, names, width, fname):
    sprites = [sprite(img, rects, n) for n in names]
    rows, cur, x = [], [], PAD
    for s in sprites:
        if x + s.width + PAD > width and cur:
            rows.append(cur)
            cur, x = [], PAD
        cur.append(s)
        x += s.width + PAD
    rows.append(cur)
    height = PAD + sum(max(s.height for s in r) + PAD for r in rows)
    out = Image.new("RGBA", (width, height))
    for yy in range(height):
        t = yy / max(1, height - 1)
        band = round(t * 5) / 5  # degrade en bandes, comme l'eau de l'aquarium
        c = tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * band) for i in range(3)) + (255,)
        out.paste(c, (0, yy, width, yy + 1))
    y = PAD
    for r in rows:
        rh = max(s.height for s in r)
        total = sum(s.width for s in r) + PAD * (len(r) - 1)
        x = (width - total) // 2
        for s in r:
            out.alpha_composite(s, (x, y + rh - s.height))
            x += s.width + PAD
        y += rh + PAD
    out = out.resize((width * SCALE, height * SCALE), Image.NEAREST)
    os.makedirs(OUT, exist_ok=True)
    out.convert("RGB").save(os.path.join(OUT, fname), optimize=True)
    print(fname, out.size)


def icons(img, rects):
    """Icones du menu, agrandies x2, pour le tableau d'utilisation du README."""
    out_dir = os.path.join(OUT, "icons")
    os.makedirs(out_dir, exist_ok=True)
    for name in sorted(n for n in rects if n.startswith("ui_")):
        s = sprite(img, rects, name)
        s.resize((s.width * 2, s.height * 2), Image.NEAREST).save(os.path.join(out_dir, name[3:] + ".png"), optimize=True)
    print("icons", len([n for n in rects if n.startswith("ui_")]))


def main():
    img, rects = load_atlas()
    icons(img, rects)
    sheet(img, rects, FISH, 330, "gallery-fish.png")
    sheet(img, rects, ANIMALS, 330, "gallery-animals.png")
    sheet(img, rects, DECOR, 330, "gallery-decor.png")


if __name__ == "__main__":
    main()
