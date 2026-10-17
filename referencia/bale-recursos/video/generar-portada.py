"""Regenera los videos de portada de balé con zoom suave (Ken Burns sin temblor).

El original se hizo con zoompan de ffmpeg, que redondea el recorte a píxeles
enteros: la imagen avanza ~0,4 px y vuelve 1,3 px de golpe (vaivén visible).
Aquí cada fotograma se calcula con una transformación afín en coma flotante
(subpíxel) sobre la foto ya reducida a la escala de salida, así el movimiento
es continuo. 30 fps, fundidos de 0,5 s y bucle sin corte (la última foto se
funde con la primera).

Uso (desde la raíz del proyecto):
  python referencia/bale-recursos/video/generar-portada.py referencia/bale-recursos/img <ruta de ffmpeg> assets/video/bale horizontal|vertical
"""
import sys, subprocess, math
from PIL import Image

IMG, FF, OUT, KIND = sys.argv[1:5]
W, H = (1280, 720) if KIND == "horizontal" else (720, 1280)
FPS, SEG, XF = 30, 2.5, 0.5          # cada foto 2,5 s + 0,5 s de fundido
# foto, centro de interés (fracción x, y), sentido del zoom (+1 acerca, -1 aleja), paneo en x
SHOTS = [
    ("hot-barre-1",   (0.50, 0.56), +1, +0.03),
    ("mat-pilates-1", (0.50, 0.42), -1, -0.03),
    ("hot-barre-3",   (0.50, 0.60), +1, -0.03),
    ("mat-pilates-3", (0.50, 0.52), -1, +0.03),
    ("hot-barre-5",   (0.50, 0.55), +1, +0.03),
    ("mat-pilates-4", (0.50, 0.55), -1, -0.03),
]
Z0, Z1 = 1.0, 1.09                   # zoom suave
SPAN = SEG + XF                      # cada toma se mueve durante 3 s (-0,5 … 2,5)
TOTAL = SEG * len(SHOTS)             # 15 s
N = round(TOTAL * FPS)

def prep(name):
    im = Image.open(f"{IMG}/{name}.jpg").convert("RGB")
    # escala para que el recorte más abierto (zoom 1) quede 1:1 con la salida:
    # luego solo se amplía, sin el centelleo de reducir sin filtrar
    s = max(W / im.width, H / im.height)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)

SRC = [prep(n) for n, *_ in SHOTS]

def ease(x):                         # casi velocidad constante, con arranque y frenado muy leves
    x = min(max(x, 0.0), 1.0)
    return x * 0.85 + (0.5 - 0.5 * math.cos(math.pi * x)) * 0.15

def render(k, u):
    """Toma k en su tiempo local u (-XF … SEG)."""
    im = SRC[k]; _, (fx, fy), zdir, pan = SHOTS[k]
    p = ease((u + XF) / SPAN)
    # el zoom se interpola en escala logarítmica (velocidad aparente constante)
    z = math.exp(math.log(Z0) + (math.log(Z1) - math.log(Z0)) * (p if zdir > 0 else 1 - p))
    cw, ch = W / z, H / z                             # tamaño del recorte en la foto escalada
    # Posición = centro + o · margen libre. "o" es fijo por toma (más un paneo lineal),
    # así el recorte nunca choca con el borde: sin recortes bruscos ni cambios de sentido.
    def axis(dim, crop, crop_min, f, drift):
        o = (f * dim - dim / 2) / ((dim - crop_min) / 2)
        o = min(max(o, -0.85), 0.85) + drift
        return dim / 2 + o * (dim - crop) / 2
    drift = (pan / 0.03) * 0.12 * (2 * p - 1)          # ±0,12 del margen
    cx = axis(im.width, cw, W / Z1, fx, drift)
    cy = axis(im.height, ch, H / Z1, fy, 0.0)
    a = cw / W                                        # px de origen por px de salida
    return im.transform((W, H), Image.AFFINE, (a, 0, cx - cw / 2, 0, a, cy - ch / 2), resample=Image.BICUBIC)

def frame(i):
    t = i / FPS
    k = int(t // SEG); u = t - k * SEG                # toma principal
    base = render(k, u)
    if u >= SEG - XF:                                 # fundido hacia la siguiente (la última, hacia la primera)
        n = (k + 1) % len(SHOTS)
        x = (u - (SEG - XF)) / XF
        a = x * x * (3 - 2 * x)
        base = Image.blend(base, render(n, u - SEG), a)
    return base

cmd = [FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "high", "-pix_fmt", "yuv420p",
       "-g", str(FPS * 2), "-movflags", "+faststart", "-an", f"{OUT}/bale-hero-{KIND}.mp4"]
pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i in range(N):
    f = frame(i)
    if i == 0:
        f.save(f"{OUT}/bale-hero-{KIND}-poster.jpg", quality=84, optimize=True, progressive=True)
        f.save(f"{OUT}/bale-hero-{KIND}-poster.webp", "WEBP", quality=72, method=6)
    pr.stdin.write(f.tobytes())
pr.stdin.close(); pr.wait()
print(KIND, N, "fotogramas", "ffmpeg:", pr.returncode)
