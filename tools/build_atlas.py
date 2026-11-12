"""Decoupe les planches de sprites (art/*.png) et fabrique l'atlas pixel art
embarque dans aquarium-inject.js.

Usage : python tools/build_atlas.py
Sorties : tools/atlas.png (apercu) et le bloc ATLAS reecrit dans aquarium-inject.js.
"""
import base64
import io
import json
import os
import re

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art")

FISH = ["clown", "tang", "ytang", "idol", "butterfly", "neon", "gramma", "snapper",
        "koi", "puffer", "grouper", "angel", "discus", "wrasse", "mandarin", "lion"]
CREATURES = ["seahorse", "turtle", "jelly", "octopus", "crab", "hermit", "shrimp", "star",
             "clam", "ray", "snail", "shark"]
DECOR = ["kelp", "redweed", "blade", "grass", "branch", "pinkcoral", "flame", "fan",
         "tube", "brain", "anemone", "rock", "chest", "ship", "mushroom", "column"]
FISH2 = ["betta", "goldfish", "guppy", "scalare", "parrot", "trigger", "boxfish", "cardinal",
         "flameangel", "cory", "angler", "piranha", "swordtail", "mola", "seadragon", "sardine"]
CREATURES2 = ["whale", "narwhal", "dolphin", "squid", "cuttlefish", "lobster", "nudibranch", "urchin",
              "axolotl", "manta", "penguin", "diver"]
DECOR2 = ["sandcastle", "anchor", "amphora", "helmet", "bottle", "moai", "barrel", "conch",
          "staghorn", "tablecoral", "mushcoral", "crystal", "arch", "driftwood", "seawhip", "lighthouse"]

FISH3 = ["cowfish", "emperor", "clowntrigger", "powdertang", "foxface", "pajama", "longnose", "chromis",
         "tusk", "arowana", "tigerbarb", "molly", "ram", "damsel", "orca", "seal"]
PLANTS3 = ["goldkelp", "purpleweed", "tealfern", "cabomba", "redfern", "eelgrass", "grapealgae", "blossom",
           "elkhorn", "bubblecoral", "suncoral", "torch", "carnation", "pillar", "acropora", "zoa"]
DECOR3 = ["torii", "pagoda", "volcano", "submarine", "wheel", "cannon", "lantern", "skull",
          "tiki", "ufo", "bridge", "tower", "signpost", "boot", "shellhouse", "treasure"]

# Taille cible en pixels logiques : ("w", largeur) ou ("h", hauteur), une ou plusieurs variantes.
SIZES = {
    "clown": [("w", 34)], "tang": [("w", 38)], "ytang": [("w", 34)], "idol": [("w", 36)],
    "butterfly": [("w", 36)], "neon": [("w", 22)], "gramma": [("w", 26)], "snapper": [("w", 40)],
    "koi": [("w", 44)], "puffer": [("w", 32)], "grouper": [("w", 46)], "angel": [("w", 36)],
    "discus": [("w", 34)], "wrasse": [("w", 40)], "mandarin": [("w", 34)], "lion": [("w", 40)],
    "seahorse": [("h", 34)], "turtle": [("w", 40)], "jelly": [("h", 34)], "octopus": [("w", 36)],
    "crab": [("w", 30)], "hermit": [("w", 28)], "shrimp": [("w", 26)], "star": [("w", 20)],
    "clam": [("w", 28)], "ray": [("w", 42)], "snail": [("w", 24)], "shark": [("w", 62)],
    "kelp": [("h", 96), ("h", 72), ("h", 52), ("h", 36)],
    "redweed": [("h", 92), ("h", 68), ("h", 48), ("h", 34)],
    "blade": [("h", 84), ("h", 62), ("h", 44), ("h", 30)],
    "grass": [("h", 22), ("h", 16), ("h", 11)],
    "branch": [("h", 36), ("h", 27), ("h", 19)],
    "pinkcoral": [("h", 36), ("h", 27), ("h", 19)],
    "flame": [("h", 34), ("h", 25), ("h", 18)],
    "fan": [("h", 36), ("h", 27), ("h", 19)],
    "tube": [("h", 32), ("h", 24), ("h", 17)],
    "brain": [("h", 24), ("h", 18), ("h", 13)],
    "anemone": [("h", 28), ("h", 21), ("h", 15)],
    "rock": [("h", 36), ("h", 26), ("h", 18)],
    "chest": [("h", 30), ("h", 22)],
    "ship": [("h", 60), ("h", 44)],
    "mushroom": [("h", 52), ("h", 38)],
    "column": [("h", 56), ("h", 40)],
    "betta": [("w", 38)], "goldfish": [("w", 38)], "guppy": [("w", 30)], "scalare": [("w", 32)],
    "parrot": [("w", 40)], "trigger": [("w", 38)], "boxfish": [("w", 30)], "cardinal": [("w", 32)],
    "flameangel": [("w", 32)], "cory": [("w", 32)], "angler": [("w", 36)], "piranha": [("w", 36)],
    "swordtail": [("w", 36)], "mola": [("w", 40)], "seadragon": [("w", 40)], "sardine": [("w", 26)],
    "whale": [("w", 66)], "narwhal": [("w", 60)], "dolphin": [("w", 56)], "squid": [("h", 40)],
    "cuttlefish": [("w", 40)], "lobster": [("w", 40)], "nudibranch": [("w", 30)], "urchin": [("w", 22)],
    "axolotl": [("w", 38)], "manta": [("w", 46)], "penguin": [("w", 36)], "diver": [("w", 46)],
    "sandcastle": [("h", 44), ("h", 32)],
    "anchor": [("h", 40), ("h", 30)],
    "amphora": [("h", 36), ("h", 27)],
    "helmet": [("h", 32), ("h", 24)],
    "bottle": [("h", 15), ("h", 11)],
    "moai": [("h", 48), ("h", 35)],
    "barrel": [("h", 28), ("h", 21)],
    "conch": [("h", 24), ("h", 18)],
    "staghorn": [("h", 36), ("h", 26)],
    "tablecoral": [("h", 26), ("h", 19)],
    "mushcoral": [("h", 34), ("h", 25)],
    "crystal": [("h", 32), ("h", 24)],
    "arch": [("h", 44), ("h", 32)],
    "driftwood": [("h", 58), ("h", 42)],
    "seawhip": [("h", 46), ("h", 34), ("h", 24)],
    "lighthouse": [("h", 64), ("h", 48)],
    "cowfish": [("w", 36)],
    "emperor": [("w", 38)],
    "clowntrigger": [("w", 38)],
    "powdertang": [("w", 38)],
    "foxface": [("w", 36)],
    "pajama": [("w", 32)],
    "longnose": [("w", 40)],
    "chromis": [("w", 28)],
    "tusk": [("w", 36)],
    "arowana": [("w", 46)],
    "tigerbarb": [("w", 30)],
    "molly": [("w", 32)],
    "ram": [("w", 34)],
    "damsel": [("w", 30)],
    "orca": [("w", 64)],
    "seal": [("w", 50)],
    "goldkelp": [("h", 70), ("h", 52), ("h", 36)],
    "purpleweed": [("h", 56), ("h", 42), ("h", 30)],
    "tealfern": [("h", 56), ("h", 42), ("h", 30)],
    "cabomba": [("h", 60), ("h", 44), ("h", 32)],
    "redfern": [("h", 52), ("h", 38), ("h", 28)],
    "eelgrass": [("h", 50), ("h", 36), ("h", 26)],
    "grapealgae": [("h", 44), ("h", 32), ("h", 24)],
    "blossom": [("h", 44), ("h", 32), ("h", 24)],
    "elkhorn": [("h", 34), ("h", 25)],
    "bubblecoral": [("h", 30), ("h", 22)],
    "suncoral": [("h", 30), ("h", 22)],
    "torch": [("h", 32), ("h", 24)],
    "carnation": [("h", 38), ("h", 28)],
    "pillar": [("h", 34), ("h", 25)],
    "acropora": [("h", 36), ("h", 26)],
    "zoa": [("h", 28), ("h", 21)],
    "torii": [("h", 56), ("h", 42)],
    "pagoda": [("h", 52), ("h", 38)],
    "volcano": [("h", 44), ("h", 32)],
    "submarine": [("h", 44), ("h", 32)],
    "wheel": [("h", 40), ("h", 30)],
    "cannon": [("h", 32), ("h", 24)],
    "lantern": [("h", 34), ("h", 26)],
    "skull": [("h", 40), ("h", 30)],
    "tiki": [("h", 44), ("h", 32)],
    "ufo": [("h", 34), ("h", 26)],
    "bridge": [("h", 36), ("h", 27)],
    "tower": [("h", 56), ("h", 42)],
    "signpost": [("h", 38), ("h", 28)],
    "boot": [("h", 30), ("h", 22)],
    "shellhouse": [("h", 40), ("h", 30)],
    "treasure": [("h", 30), ("h", 22)],
    "reef": [("h", 96), ("h", 68), ("h", 46)],
}
# Parties retirees du dessin : (u0, u1, v0, v1) en fraction de la largeur / hauteur du sprite.
ERASE = {
    "whale": [(0.45, 0.88, 0.0, 0.279)],                          # jet d'eau
    "diver": [(0.79, 1.0, 0.0, 0.185), (0.83, 1.0, 0.0, 0.21), (0.865, 1.0, 0.0, 0.33)],   # bulles au-dessus de la tete
}
COLORS = 28
INK = np.array([14, 18, 46], dtype=np.float32)
WATER_HAZE = np.array([77, 171, 247], dtype=np.float32)
BACKDROPS = {"reef"}


def load(name, key_magenta):
    a = np.array(Image.open(os.path.join(ART, name)).convert("RGBA")).astype(np.float32)
    if a[..., 3].min() > 250:
        # Fond magenta uni. On retire :
        #  - le fond relie aux bords de l'image (tolerance large), par propagation ;
        #  - les trous enfermes (anse, arche...) seulement s'ils sont magenta presque pur.
        # Les couleurs violettes ou roses a l'interieur d'un sprite sont ainsi conservees.
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        dist = np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2)
        cand = dist < 100
        bg = np.zeros_like(cand)
        bg[0, :] = cand[0, :]
        bg[-1, :] = cand[-1, :]
        bg[:, 0] = cand[:, 0]
        bg[:, -1] = cand[:, -1]
        while True:
            grown = bg.copy()
            grown[1:, :] |= bg[:-1, :]
            grown[:-1, :] |= bg[1:, :]
            grown[:, 1:] |= bg[:, :-1]
            grown[:, :-1] |= bg[:, 1:]
            grown &= cand
            if (grown == bg).all():
                break
            bg = grown
        mask = ~(bg | (dist < 40))
    else:
        mask = a[..., 3] > 128
    # erosion d'1 px pour supprimer les franges
    m = mask.copy()
    m[1:, :] &= mask[:-1, :]
    m[:-1, :] &= mask[1:, :]
    m[:, 1:] &= mask[:, :-1]
    m[:, :-1] &= mask[:, 1:]
    a[..., 3] = np.where(m, 255, 0)
    return a


def runs(v, min_gap):
    """Intervalles [a, b) ou v est vrai, en fusionnant les trous plus petits que min_gap."""
    out, start, last = [], None, None
    for i, x in enumerate(v):
        if x:
            if start is None:
                start = i
            elif i - last > min_gap:
                out.append((start, last + 1))
                start = i
            last = i
    if start is not None:
        out.append((start, last + 1))
    return [r for r in out if r[1] - r[0] > 12]


def split(a, rows, cols):
    m = a[..., 3] > 0
    rr = runs(m.any(axis=1), 10)
    assert len(rr) == rows, ("rows", len(rr), rr)
    cells = []
    for (y0, y1) in rr:
        cc = []
        for gap in (14, 10, 7, 4, 2):
            cc = runs(m[y0:y1].any(axis=0), gap)
            if len(cc) == cols:
                break
        if len(cc) != cols:
            # sprites qui se touchent presque : on retombe sur une grille reguliere
            step = a.shape[1] / cols
            cc = []
            for c in range(cols):
                xs = np.where(m[y0:y1, int(c * step):int((c + 1) * step)].any(axis=0))[0]
                cc.append((int(c * step) + xs[0], int(c * step) + xs[-1] + 1))
            print("  grille reguliere utilisee pour une rangee")
        for (x0, x1) in cc:
            sub = m[y0:y1, x0:x1]
            ys = np.where(sub.any(axis=1))[0]
            cells.append(a[y0 + ys[0]:y0 + ys[-1] + 1, x0:x1])
    return cells


def pixelize(crop, mode, size, backdrop=False):
    h, w = crop.shape[:2]
    if mode == "w":
        tw, th = size, max(1, round(h * size / w))
    else:
        th, tw = size, max(1, round(w * size / h))
    pre = crop.copy()
    al = pre[..., 3:4] / 255.0
    pre[..., :3] *= al
    im = Image.fromarray(pre.astype(np.uint8), "RGBA").resize((tw, th), Image.BOX)
    s = np.array(im).astype(np.float32)
    al = s[..., 3] / 255.0
    opaque = al >= 0.5
    # supprime les pixels isoles (poussieres de decoupe)
    p8 = np.pad(opaque, 1).astype(np.int32)
    neigh = sum(p8[1 + dy:p8.shape[0] - 1 + dy, 1 + dx:p8.shape[1] - 1 + dx]
                for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0))
    opaque &= neigh > 0
    # ... et les miettes de moins de 4 pixels detachees du sprite
    seen = np.zeros_like(opaque)
    for y0 in range(th):
        for x0 in range(tw):
            if not opaque[y0, x0] or seen[y0, x0]:
                continue
            comp, stack = [], [(y0, x0)]
            seen[y0, x0] = True
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < th and 0 <= nx < tw and opaque[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if len(comp) < 4:
                for cy, cx in comp:
                    opaque[cy, cx] = False
    rgb = np.where(al[..., None] > 0, s[..., :3] / np.maximum(al[..., None], 1e-3), 0)
    rgb = np.clip(rgb, 0, 255)
    # palette reduite, sans tramage : aplats nets facon pixel art
    q = Image.fromarray(rgb.astype(np.uint8), "RGB").quantize(48 if backdrop else COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    rgb = np.array(q).astype(np.float32)
    # contour : les pixels du bord sont tires vers l'encre
    pad = np.pad(opaque, 1)
    edge = opaque & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    lum = rgb.mean(axis=2)
    if backdrop:
        # decor lointain : pas de contour sombre, et une brume bleue qui le repousse au fond
        # retire la teinte mauve laissee par le fond magenta de la planche : tout reste bleu
        rgb[..., 0] = np.minimum(rgb[..., 0], rgb[..., 1] * 0.9)
        rgb = rgb * 0.72 + WATER_HAZE * 0.28
    else:
        k = np.where(edge, np.where(lum < 90, 0.85, 0.6), 0)[..., None]
        rgb = rgb * (1 - k) + INK * k
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    out[..., :3] = rgb.astype(np.uint8)
    out[..., 3] = np.where(opaque, 255, 0)
    return Image.fromarray(out, "RGBA")


def main():
    sprites = {}
    sheets = [("fish.png", None, 4, 4, FISH), ("creatures.png", None, 3, 4, CREATURES), ("decor.png", None, 4, 4, DECOR),
              ("fish2.png", None, 4, 4, FISH2), ("creatures2.png", None, 3, 4, CREATURES2), ("decor2.png", None, 4, 4, DECOR2),
              ("reef.png", None, 1, 1, ["reef"]),
              ("fish3.png", None, 4, 4, FISH3), ("plants3.png", None, 4, 4, PLANTS3), ("decor3.png", None, 4, 4, DECOR3)]
    for fname, key, rows, cols, names in sheets:
        cells = split(load(fname, key), rows, cols)
        for name, crop in zip(names, cells):
            # zones effacees du dessin d'origine (la taille du sprite ne change pas)
            for (u0, u1, v0, v1) in ERASE.get(name, []):
                ch, cw = crop.shape[:2]
                crop[int(v0 * ch):int(v1 * ch), int(u0 * cw):int(u1 * cw), 3] = 0
            for i, (mode, size) in enumerate(SIZES[name]):
                sprites[name if len(SIZES[name]) == 1 else "%s_%d" % (name, i)] = pixelize(crop, mode, size, name in BACKDROPS)

    # rangement en etageres
    aw = 512
    x = y = rowh = 0
    rects = {}
    for name, im in sorted(sprites.items(), key=lambda kv: -kv[1].height):
        if x + im.width + 1 > aw:
            x, y, rowh = 0, y + rowh + 1, 0
        rects[name] = [x, y, im.width, im.height]
        x += im.width + 1
        rowh = max(rowh, im.height)
    atlas = Image.new("RGBA", (aw, y + rowh), (0, 0, 0, 0))
    for name, (rx, ry, rw, rh) in rects.items():
        atlas.paste(sprites[name], (rx, ry))
    atlas.save(os.path.join(ROOT, "tools", "atlas.png"), optimize=True)
    buf = io.BytesIO()
    atlas.save(buf, "PNG", optimize=True)
    data = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    block = "/*ATLAS-START*/\n    const ATLAS = " + json.dumps({"img": data, "s": rects}, separators=(",", ":")) + ";\n    /*ATLAS-END*/"
    target = os.path.join(ROOT, "aquarium-inject.js")
    with open(target, encoding="utf8", newline="") as fh:
        src = fh.read()
    if "/*ATLAS-START*/" in src:
        src = re.sub(r"/\*ATLAS-START\*/.*?/\*ATLAS-END\*/", lambda m: block, src, flags=re.S)
        with open(target, "w", encoding="utf8", newline="") as fh:
            fh.write(src)
        print("aquarium-inject.js mis a jour")
    else:
        print("marqueur ATLAS absent : atlas.png seul a ete ecrit")
    print(len(rects), "sprites, atlas", atlas.size, len(data) // 1024, "Ko")


if __name__ == "__main__":
    main()
