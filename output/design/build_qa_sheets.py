from PIL import Image, ImageDraw
from pathlib import Path

root = Path(__file__).parent
p = root / 'final-screens'
out = root / 'qa'
out.mkdir(exist_ok=True)
fs = sorted(p.glob('*.png'))
print(f'{len(fs)} exported frames')
groups = [('forms', fs[10:22], 3), ('states', fs[22:42], 4), ('mobile', fs[42:50], 4)]
for name, items, batch in groups:
    for k in range(0, len(items), batch):
        subset = items[k:k+batch]
        cols = 2 if name == 'states' else len(subset)
        rows = (len(subset) + cols - 1) // cols
        cellw = 390 if name == 'mobile' else 760
        cellh = 1050 if name == 'forms' else 730 if name == 'states' else 874
        canvas = Image.new('RGB', (cols * cellw, rows * cellh), '#d8ddd9')
        draw = ImageDraw.Draw(canvas)
        for i, f in enumerate(subset):
            im = Image.open(f).convert('RGB')
            im.thumbnail((cellw, cellh-30))
            x, y = (i % cols)*cellw, (i // cols)*cellh
            canvas.paste(im, (x,y+30))
            draw.text((x+10,y+8), f.name, fill='black')
        canvas.save(out / f'{name}-{k//batch+1}.png')
