"""Draws the Selfcare bloom artwork and renders every app icon and splash image from it.

    python scripts/render-brand.py

Writes the SVG sources to assets/brand/ and the PNGs to assets/images/ and desktop/build/.
Needs Pillow (pip install pillow) and Chrome or Edge, which is used headless to rasterise the SVGs.

Two looks share one drawing (five petals hinged at 70,86 on a 140 grid; the same shape the
in-app loader animates in src/components/bloom-loader.tsx):
  client    Selfcare: champagne-gold bloom with a rose heart on plum-black
  business  Selfcare for Business: lavender bloom with a gold heart under a crescent moon
"""
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'assets', 'brand')
IMAGES = os.path.join(ROOT, 'assets', 'images')
DESKTOP = os.path.join(ROOT, 'desktop', 'build')

BASE = '#120E17'  # same as C.night in src/lib/theme.ts
PETAL = 'M70 86C53 66 57 41 70 26C83 41 87 66 70 86Z'
# (angle, opacity) in drawing order: outer pair behind, centre petal in front.
PETALS = [(-64, 0.92), (64, 0.92), (-32, 0.96), (32, 0.96), (0, 1)]

LOOKS = {
    'client': {
        'file': 'light',  # file names predate the dark theme: "light" is the Selfcare client app
        'glows': [('18%', '12%', '75%', '#6A2D52'), ('98%', '42%', '65%', '#3F2E73'), ('52%', '110%', '58%', '#5A4220')],
        'outer': ('#F0D9AC', '#BF9257'),
        'inner': ('#F7E7C6', '#D3AC6C'),
        'centre': ('#FFF9EC', '#E9C88F'),
        'heart': ('#FFF3F5', '#F2B4C4', '#C46F8A'),
        'halo': '#E3C28A',
        'extras': (
            '<circle cx="30" cy="34" r="1.1" fill="#F3DDB0" fill-opacity=".85"/>'
            '<circle cx="109" cy="40" r="1.3" fill="#F3DDB0" fill-opacity=".9"/>'
            '<circle cx="99" cy="22" r=".8" fill="#F3DDB0" fill-opacity=".7"/>'
            '<circle cx="24" cy="70" r=".8" fill="#F3DDB0" fill-opacity=".6"/>'
        ),
    },
    'business': {
        'file': 'dark',
        'glows': [('18%', '12%', '75%', '#3F2E73'), ('98%', '100%', '65%', '#1F4A45')],
        'outer': ('#D9C6FF', '#A88BD9'),
        'inner': ('#E2D2FF', '#B79BE6'),
        'centre': ('#F1E8FF', '#C9B0F4'),
        'heart': ('#FFF4DC', '#FFD28A', '#E9A95A'),
        'halo': '#CDB4FF',
        'extras': (
            '<circle cx="106" cy="32" r="9" fill="#F6F2F7" fill-opacity=".92"/>'
            '<circle cx="110.5" cy="29" r="8" fill="#1B1626"/>'
            '<circle cx="28" cy="30" r="1.5" fill="#fff"/><circle cx="46" cy="18" r="1" fill="#fff"/>'
            '<circle cx="86" cy="16" r="1.2" fill="#fff"/><circle cx="20" cy="56" r="1" fill="#fff" fill-opacity=".7"/>'
        ),
    },
}


def defs(look):
    out = ['<defs>']
    for i, (cx, cy, r, colour) in enumerate(look['glows']):
        out.append(f'<radialGradient id="g{i}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{colour}"/>'
                   f'<stop offset="1" stop-color="{colour}" stop-opacity="0"/></radialGradient>')
    for name in ('outer', 'inner', 'centre'):
        top, bottom = look[name]
        out.append(f'<linearGradient id="{name}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
                   f'<stop offset="1" stop-color="{bottom}"/></linearGradient>')
    a, b, c = look['heart']
    out.append(f'<radialGradient id="heart" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="{a}"/>'
               f'<stop offset=".5" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></radialGradient>')
    out.append(f'<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="{look["halo"]}" stop-opacity=".42"/>'
               f'<stop offset="1" stop-color="{look["halo"]}" stop-opacity="0"/></radialGradient>')
    out.append('<filter id="sh" x="-30%" y="-30%" width="160%" height="160%">'
               '<feDropShadow dx="0" dy="2.2" stdDeviation="2.6" flood-color="#000" flood-opacity=".45"/></filter>')
    out.append('</defs>')
    return ''.join(out)


def background(look):
    rects = ''.join(f'<rect width="140" height="140" fill="url(#g{i})"/>' for i in range(len(look['glows'])))
    return f'<rect width="140" height="140" fill="{BASE}"/>{rects}'


def flower(openness):
    """openness 1 is the full bloom; 0 is the closed bud the loader starts from."""
    spread = 0.12 + 0.88 * openness
    scale = 0.72 + 0.28 * openness
    halo_r = 30 + 16 * openness
    parts = [f'<circle cx="70" cy="{86 - 20 * scale:.1f}" r="{halo_r:.0f}" fill="url(#halo)"/>', '<g filter="url(#sh)">']
    for angle, opacity in PETALS:
        fill = 'centre' if angle == 0 else 'inner' if abs(angle) == 32 else 'outer'
        parts.append(
            f'<path d="{PETAL}" fill="url(#{fill})" fill-opacity="{opacity}" stroke="#fff" stroke-opacity=".28" stroke-width=".4" '
            f'transform="rotate({angle * spread:.2f} 70 86) translate(70 86) scale({scale:.3f}) translate(-70 -86)"/>')
    parts.append('</g><circle cx="70" cy="86" r="7.5" fill="url(#heart)"/>'
                 '<circle cx="67.6" cy="83.6" r="1.9" fill="#fff" fill-opacity=".8"/>')
    return ''.join(parts)


def svg(body, look):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">{defs(look)}{body}</svg>\n'


def drawings(look):
    centred = '<g transform="translate(70 74) scale(0.66) translate(-70 -70)">'
    return {
        '': svg(f'{background(look)}{look["extras"]}<g transform="translate(0 4)">{flower(1)}</g>', look),
        '-foreground': svg(f'{centred}{flower(1)}</g>', look),
        '-background': svg(background(look), look),
        'bud': svg(flower(0), look),
    }


def find_browser():
    candidates = [
        os.environ.get('CHROME_PATH'),
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        shutil.which('google-chrome'), shutil.which('chromium'), shutil.which('chromium-browser'),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    sys.exit('Chrome or Edge not found. Set CHROME_PATH to the browser executable.')


def rasterise(browser, svg_path, tmp, size=1024):
    """Returns the SVG as a size x size RGBA image with a transparent page behind it."""
    out = os.path.join(tmp, os.path.basename(svg_path) + '.png')
    subprocess.run([
        browser, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--default-background-color=00000000', f'--window-size={size},{size}', f'--user-data-dir={os.path.join(tmp, "profile")}',
        f'--screenshot={out}', 'file:///' + svg_path.replace('\\', '/'),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    image = Image.open(out).convert('RGBA')
    if image.size != (size, size):
        sys.exit(f'{svg_path} rendered at {image.size}, expected {size}x{size}')
    return image


def save(image, folder, name, size=None, opaque=False):
    if size:
        image = image.resize((size, size), Image.LANCZOS)
    if opaque:
        image = image.convert('RGB')  # iOS rejects app icons that carry an alpha channel
    image.save(os.path.join(folder, name), optimize=True)
    print(f'  {name} {image.size[0]}px')


def rounded(image, radius_ratio=0.22):
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, image.size[0] - 1, image.size[1] - 1], radius=int(image.size[0] * radius_ratio), fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def main():
    browser = find_browser()
    with tempfile.TemporaryDirectory() as tmp:
        for key, look in LOOKS.items():
            print(key)
            suffix = '' if key == 'client' else '-business'
            rendered = {}
            for part, markup in drawings(look).items():
                name = f'bud-{look["file"]}.svg' if part == 'bud' else f'bloom-{look["file"]}{part}.svg'
                path = os.path.join(BRAND, name)
                with open(path, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(markup)
                rendered[part] = rasterise(browser, path, tmp)
            save(rendered[''], IMAGES, f'icon{suffix}.png', opaque=True)
            save(rendered[''], DESKTOP, f'icon{suffix}.png', size=512, opaque=True)
            save(rendered['-foreground'], IMAGES, f'android-icon{suffix}-foreground.png')
            save(rendered['-background'], IMAGES, f'android-icon{suffix}-background.png', opaque=True)
            save(rendered['bud'], IMAGES, f'splash-icon{suffix}.png', size=512)
            if key == 'client':
                save(rounded(rendered['']), IMAGES, 'favicon.png', size=48)


if __name__ == '__main__':
    main()
