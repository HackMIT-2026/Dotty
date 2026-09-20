"""
Builds Dotty's animation pieces from the flat pose artwork in assets/pet/*.png.

For every pose it writes, into assets/pet/anim/<pose>/:
  tail-0..20.webp   the body (expression marks removed) with the tail bent a little further each frame
  mouth.webp       a small patch that draws the mouth open (faded in and out by the app)
  mark-N.webp      each expression mark (hearts, question mark, Zzz, bursts) as its own image
and it regenerates src/components/pet/pose-art.ts, which tells the app where each piece goes.

Run it again after changing the artwork or the numbers below:

    python3 -m venv .venv && .venv/bin/pip install numpy scipy pillow opencv-python-headless
    .venv/bin/python scripts/pet_frames.py

All coordinates below are in pixels of the source PNG in assets/pet/.
"""
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'pet'
OUT = SRC / 'anim'
TS_OUT = ROOT / 'src' / 'components' / 'pet' / 'pose-art.ts'

PAD = 0.10  # extra room around the tail frames, as a fraction of the picture width
FRAMES = 21  # tail bends from -amp to +amp in this many steps; the app plays them back and forth

PLUM = (58, 22, 78)  # the outline colour in the artwork
MOUTH_PINK = (233, 98, 146)
TONGUE = (250, 146, 176)

POSES = {
    'happy': dict(
        out_width=540,
        tail=dict(pivot=(390, 320), boxes=[(385, 300, 540, 493), (225, 432, 385, 493)], r0=40, r1=190, amp=14, feather=26),
        frames=29,  # a bit more in between, for a smoother swing
        mouth=dict(cover=(272, 209, 34, 20), open=(272, 211, 20, 13, 6)),
        gills=dict(k=0.5,
                   left=dict(pivot=(162, 145), box=(40, 45, 165, 215), r0=25, r1=100),
                   right=dict(pivot=(425, 150), box=(418, 85, 520, 262), r0=25, r1=100)),
        marks=[dict(kind='float', delay=0), dict(kind='float', delay=700)],
    ),
    'curious': dict(
        out_width=566,
        tail=dict(pivot=(395, 402), boxes=[(402, 250, 566, 484)], r0=40, r1=140, amp=14),
        mouth=dict(cover=(291, 204, 16, 16), open=(291, 206, 8, 11, 5)),
        gills=dict(k=0.5,
                   left=dict(pivot=(130, 165), box=(20, 70, 135, 250), r0=25, r1=105),
                   right=dict(pivot=(378, 140), box=(365, 30, 470, 200), r0=25, r1=105)),
        marks=[dict(kind='wobble', delay=0)],  # the "?" and its dot are one mark
    ),
    'cheering': dict(
        out_width=660,
        tail=dict(pivot=(760, 720), boxes=[(740, 560, 1174, 976)], r0=90, r1=300, amp=10),
        mouth=dict(stretch=(557, 392, 70, 62, 0.16)),  # already open: it opens wider instead
        gills=dict(k=0.5,
                   left=dict(pivot=(365, 250), box=(160, 25, 390, 370), r0=50, r1=210),
                   right=dict(pivot=(862, 330), box=(840, 150, 1040, 510), r0=50, r1=200)),
        marks=[dict(kind='burst', delay=0), dict(kind='burst', delay=250), dict(kind='burst', delay=500), dict(kind='burst', delay=750)],
    ),
    'sleepy': dict(
        out_width=724,
        tail=dict(pivot=(1050, 920), boxes=[(1190, 590, 1448, 1086), (985, 895, 1448, 1086)], r0=80, r1=450, amp=11),
        mouth=dict(cover=(542, 776, 68, 38), open=(542, 780, 30, 22, 14)),
        gills=dict(k=0.5,
                   left=dict(pivot=(285, 580), box=(55, 385, 300, 790), r0=60, r1=230),
                   right=dict(pivot=(978, 590), box=(955, 440, 1215, 870), r0=60, r1=240)),
        marks=[dict(kind='zzz', delay=0), dict(kind='zzz', delay=450), dict(kind='zzz', delay=900)],
    ),
}


def load(name):
    return Image.open(SRC / f'{name}.png').convert('RGBA')


def split_marks(im, cfg):
    """Returns (body image without marks, list of (mark image, bbox)) with marks ordered small to large by x/y."""
    a = np.array(im)
    alpha = a[:, :, 3] > 16
    lab, n = ndi.label(alpha)
    sizes = ndi.sum(alpha, lab, range(1, n + 1))
    body_id = int(np.argmax(sizes)) + 1
    objs = ndi.find_objects(lab)

    def grown(mask):
        return ndi.binary_dilation(mask, iterations=3)

    body_keep = grown(lab == body_id)
    body = a.copy()
    body[~body_keep, 3] = 0

    # every component big enough to be a mark, apart from the body
    comps = [(i + 1, objs[i], sizes[i]) for i in range(n) if i + 1 != body_id and sizes[i] > 200]
    return body, comps, lab, a


def group_marks(name, comps):
    """Marks that are one drawing in two pieces (the "?" and its dot) are merged."""
    if name == 'curious':
        comps = sorted(comps, key=lambda c: -c[2])
        return [[c[0] for c in comps]]
    # the rest: one mark per piece, in reading order (top to bottom, left to right)
    ordered = sorted(comps, key=lambda c: (c[1][0].start, c[1][1].start))
    if name == 'sleepy':
        ordered = sorted(comps, key=lambda c: -c[1][0].start)  # smallest Z (lowest) first
    if name == 'happy':
        ordered = sorted(comps, key=lambda c: c[1][0].start)
    return [[c[0]] for c in ordered]


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def bend_tail(body, tail, angle):
    h, w = body.shape[:2]
    px, py = tail['pivot']
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)

    region = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in tail['boxes']:
        region[y0:y1, x0:x1] = 1
    region = cv2.GaussianBlur(region, (0, 0), sigmaX=tail.get('feather', max(4, w * 0.012)))

    dist = np.hypot(xs - px, ys - py)
    weight = region * smoothstep((dist - tail['r0']) / (tail['r1'] - tail['r0']))

    phi = np.radians(angle) * weight
    dx, dy = xs - px, ys - py
    cos, sin = np.cos(-phi), np.sin(-phi)
    map_x = (px + dx * cos - dy * sin).astype(np.float32)
    map_y = (py + dx * sin + dy * cos).astype(np.float32)

    f = body.astype(np.float32)
    alpha = f[:, :, 3:4] / 255.0
    pre = np.concatenate([f[:, :, :3] * alpha, alpha], axis=2)
    warped = cv2.remap(pre, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    wa = warped[:, :, 3:4]
    rgb = np.where(wa > 1e-4, warped[:, :, :3] / np.maximum(wa, 1e-4), 0)
    out = np.concatenate([np.clip(rgb, 0, 255), np.clip(wa * 255, 0, 255)], axis=2)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def skin_colour(im, cx, cy, rx, ry):
    a = np.array(im).astype(int)
    h, w = a.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    ring = (((xs - cx) / (rx * 1.5)) ** 2 + ((ys - cy) / (ry * 1.5)) ** 2 < 1) & (((xs - cx) / (rx * 1.15)) ** 2 + ((ys - cy) / (ry * 1.15)) ** 2 > 1)
    light = a[:, :, :3].mean(axis=2) > 215
    sel = ring & light & (a[:, :, 3] > 250)
    return tuple(int(v) for v in np.median(a[sel][:, :3], axis=0))


def draw_open_mouth(im, cfg):
    """A patch (RGBA) that covers the closed mouth with a small open one."""
    cx, cy, cw, ch = cfg['cover']
    ox, oy, rx, ry, line = cfg['open']
    S = 4
    pad = 6
    x0, y0 = int(cx - cw - pad), int(cy - ch - pad)
    w, h = int(2 * (cw + pad)), int(2 * (ch + pad))
    big = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)

    def E(x, y, rx_, ry_, fill):
        d.ellipse([(x - x0 - rx_) * S, (y - y0 - ry_) * S, (x - x0 + rx_) * S, (y - y0 + ry_) * S], fill=fill)

    skin = skin_colour(im, cx, cy, cw, ch) + (255,)
    E(cx, cy, cw, ch, skin)
    E(ox, oy, rx + line / 2, ry + line / 2, PLUM + (255,))
    E(ox, oy, rx - line / 2, ry - line / 2, MOUTH_PINK + (255,))
    E(ox, oy + (ry - line / 2) * 0.45, (rx - line / 2) * 0.62, (ry - line / 2) * 0.5, TONGUE + (255,))
    patch = big.resize((w, h), Image.LANCZOS)

    # feather the edge so the patch melts into the skin
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).ellipse([pad * 0.5, pad * 0.5, w - pad * 0.5, h - pad * 0.5], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(pad * 0.45))
    alpha = np.minimum(np.array(patch.split()[3]), np.array(mask))
    patch.putalpha(Image.fromarray(alpha))
    return patch, (x0, y0)


def stretch_mouth(im, cfg):
    """The cheering mouth is already open, so the patch is the same area with the mouth drawn a bit taller."""
    cx, cy, rx, ry, k = cfg['stretch']
    x0, y0, x1, y1 = int(cx - rx * 1.6), int(cy - ry * 1.9), int(cx + rx * 1.6), int(cy + ry * 2.1)
    base = np.array(im).astype(np.float32)
    h, w = base.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    top = cy - ry * 0.55  # the top lip stays, the lower lip drops
    g = np.exp(-(((xs - cx) / (rx * 1.3)) ** 2 + ((ys - (cy + ry * 0.3)) / (ry * 1.5)) ** 2))
    src_y = top + (ys - top) / (1 + k * g * (ys > top))
    alpha = base[:, :, 3:4] / 255.0
    pre = np.concatenate([base[:, :, :3] * alpha, alpha], axis=2)
    warped = cv2.remap(pre, xs, src_y.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wa = warped[:, :, 3:4]
    rgb = np.where(wa > 1e-4, warped[:, :, :3] / np.maximum(wa, 1e-4), 0)
    full = Image.fromarray(np.clip(np.concatenate([rgb, wa * 255], axis=2), 0, 255).astype(np.uint8), 'RGBA')
    patch = full.crop((x0, y0, x1, y1))
    mask = Image.new('L', patch.size, 0)
    pad = 10
    ImageDraw.Draw(mask).ellipse([pad, pad, patch.width - pad, patch.height - pad], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(pad * 0.5))
    patch.putalpha(Image.fromarray(np.minimum(np.array(patch.split()[3]), np.array(mask))))
    return patch, (x0, y0)


def save(im, path, scale):
    if scale != 1:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    im.save(path, 'WEBP', quality=90, method=6, alpha_quality=100)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    no_tail = '--no-tail' in args  # leave every tail frame as it is (they take minutes to rebuild)
    only = {a for a in args if not a.startswith('--')}  # optionally rebuild the tail frames of just these poses
    manifest = {}
    for name, cfg in POSES.items():
        frames_wanted = not no_tail and (not only or name in only)
        im = load(name)
        W, H = im.size
        scale = cfg['out_width'] / W
        pdir = OUT / name
        pdir.mkdir(exist_ok=True)
        if frames_wanted:
            for old in pdir.glob('*.webp'):
                old.unlink()

        body, comps, lab, raw = split_marks(im, cfg)
        groups = group_marks(name, comps)
        assert len(groups) == len(cfg['marks']), f'{name}: found {len(groups)} marks, expected {len(cfg["marks"])}'

        # tail frames, on a canvas with PAD extra room on every side
        pad = round(W * PAD)
        tail = dict(cfg['tail'])
        tail['pivot'] = (tail['pivot'][0] + pad, tail['pivot'][1] + pad)
        tail['boxes'] = [
            (x0 + pad, y0 + pad, x1 + pad + (pad if x1 >= W - 1 else 0), y1 + pad + (pad if y1 >= H - 1 else 0))
            for x0, y0, x1, y1 in cfg['tail']['boxes']
        ]
        amp = cfg['tail']['amp']
        n_frames = cfg.get('frames', FRAMES)
        angles = np.linspace(-amp, amp, n_frames)
        body_arr = np.pad(np.array(body), ((pad, pad), (pad, pad), (0, 0)))
        gills = cfg.get('gills')
        gill_specs = []
        if gills:
            for side in ('left', 'right'):
                g = gills[side]
                x0, y0, x1, y1 = g['box']
                gill_specs.append(dict(pivot=(g['pivot'][0] + pad, g['pivot'][1] + pad), boxes=[(x0 + pad, y0 + pad, x1 + pad, y1 + pad)], r0=g['r0'], r1=g['r1'], feather=10))
        if frames_wanted:
            for i, ang in enumerate(angles):
                arr = body_arr
                # the gills flap gently as the tail swings: mirror images of each other, at a fraction of the tail's angle
                for spec, sign in zip(gill_specs, (1, -1)):
                    arr = np.array(bend_tail(arr, spec, sign * gills['k'] * ang))
                save(bend_tail(arr, tail, ang), pdir / f'tail-{i}.webp', scale)

        # mouth patch
        if 'stretch' in cfg['mouth']:
            patch, (px, py) = stretch_mouth(body, cfg['mouth'])
        else:
            patch, (px, py) = draw_open_mouth(im, cfg['mouth'])
        save(patch, pdir / 'mouth.webp', scale)

        # marks
        marks = []
        for i, (ids, mcfg) in enumerate(zip(groups, cfg['marks'])):
            mask = np.zeros(lab.shape, bool)
            for cid in ids:
                mask |= lab == cid
            mask = ndi.binary_dilation(mask, iterations=3) & (raw[:, :, 3] > 0)
            piece = raw.copy()
            piece[~mask, 3] = 0
            # stray red flecks the artwork has next to the yellow bursts
            red = (piece[:, :, 0] > 140) & (piece[:, :, 1] < 90) & (piece[:, :, 2] < 90)
            piece[red, 3] = 0
            ys, xs = np.nonzero(piece[:, :, 3] > 0)
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            crop = Image.fromarray(piece[y0:y1, x0:x1], 'RGBA')
            save(crop, pdir / f'mark-{i}.webp', scale)
            # which way a burst mark drifts: away from the middle of the picture
            cx, cy = (x0 + x1) / 2 - W / 2, (y0 + y1) / 2 - H / 2
            norm = math.hypot(cx, cy) or 1
            marks.append(dict(index=i, box=[x0 / W, y0 / H, (x1 - x0) / W, (y1 - y0) / H], dir=[round(cx / norm, 2), round(cy / norm, 2)], **mcfg))

        manifest[name] = dict(
            aspect=W / H,
            frames=n_frames,
            mouth=dict(box=[px / W, py / H, patch.width / W, patch.height / H]),
            marks=marks,
            pad=[pad / W, pad / H],
        )
        print(name, 'ok', {'marks': len(marks)})

    write_ts(manifest)


def write_ts(manifest):
    lines = [
        '// Generated by scripts/pet_frames.py from assets/pet/*.png. Do not edit by hand.',
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        "export type MarkKind = 'float' | 'wobble' | 'burst' | 'zzz';",
        '',
        'export interface PoseArt {',
        '  /** width / height of every image in this pose */',
        '  aspect: number;',
        '  /** how much bigger each tail frame is than the picture, per side, as [x, y] fractions of the picture */',
        '  pad: [number, number];',
        '  /** the body with the tail bent a little further in each frame (middle frame is the neutral one) */',
        '  frames: ImageSourcePropType[];',
        '  /** patch that draws the mouth open, as [left, top, width, height] fractions of the picture */',
        '  mouth: { src: ImageSourcePropType; box: [number, number, number, number] };',
        '  marks: { src: ImageSourcePropType; box: [number, number, number, number]; kind: MarkKind; delay: number; dir: [number, number] }[];',
        '}',
        '',
        'export const POSE_ART = {',
    ]
    for name, m in manifest.items():
        lines.append(f'  {name}: {{')
        lines.append(f'    aspect: {m["aspect"]:.4f},')
        lines.append(f'    pad: {json.dumps([round(v, 4) for v in m["pad"]])},')
        lines.append('    frames: [')
        for i in range(m['frames']):
            lines.append(f"      require('@/assets/pet/anim/{name}/tail-{i}.webp'),")
        lines.append('    ],')
        lines.append(f"    mouth: {{ src: require('@/assets/pet/anim/{name}/mouth.webp'), box: {json.dumps([round(v, 4) for v in m['mouth']['box']])} }},")
        lines.append('    marks: [')
        for mk in m['marks']:
            lines.append(
                f"      {{ src: require('@/assets/pet/anim/{name}/mark-{mk['index']}.webp'), box: {json.dumps([round(v, 4) for v in mk['box']])}, "
                f"kind: '{mk['kind']}', delay: {mk['delay']}, dir: {json.dumps(mk['dir'])} }},"
            )
        lines.append('    ],')
        lines.append('  },')
    lines.append('} satisfies Record<string, PoseArt>;')
    lines.append('')
    TS_OUT.write_text('\n'.join(lines))


if __name__ == '__main__':
    main()
