"""Generate the six shareable task guides and their Markdown sources.

Run with Python + reportlab + pypdfium2 + pypdf (Codex bundles these).
Intermediate renders are in ignored tmp/pdfs. No network is used.
"""
import json
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
font_dir = Path('C:/Windows/Fonts')
if (font_dir / 'arial.ttf').exists():
    pdfmetrics.registerFont(TTFont('TaskSans', str(font_dir / 'arial.ttf')))
    pdfmetrics.registerFont(TTFont('TaskSans-Bold', str(font_dir / 'arialbd.ttf')))
    FONT, BOLD = 'TaskSans', 'TaskSans-Bold'
else:
    FONT, BOLD = 'Helvetica', 'Helvetica-Bold'
GREEN = colors.HexColor('#176b53')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TaskTitle', fontName=BOLD, fontSize=25, leading=30, textColor=GREEN, spaceAfter=12))
styles.add(ParagraphStyle(name='TaskH2', fontName=BOLD, fontSize=13, leading=17, textColor=GREEN, spaceBefore=12, spaceAfter=7))
styles.add(ParagraphStyle(name='TaskBody', fontName=FONT, fontSize=9.7, leading=14.4, spaceAfter=7, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='TaskSmall', fontName=FONT, fontSize=8.4, leading=12, textColor=colors.HexColor('#536b61'), spaceAfter=6))
styles.add(ParagraphStyle(name='TaskDay', fontName=BOLD, fontSize=10, leading=14, textColor=GREEN, spaceBefore=8, spaceAfter=3))

def paragraph(text, style='TaskBody'):
    # Unicode punctuation normalized for predictable PDF extraction and rendering.
    text = text.replace('\u2014', '-').replace('\u2013', '-').replace('\u2011', '-').replace('\u2192', '->')
    return Paragraph(escape(text), styles[style])

def footer(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#d7e5dd'))
    canvas.line(44, height - 42, width - 44, height - 42)
    canvas.setFont(BOLD, 8)
    canvas.setFillColor(GREEN)
    canvas.drawString(44, height - 30, 'SMARTSHELF  /  TEAM 2')
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor('#536b61'))
    canvas.drawString(44, 28, 'Two-week task guide | Relative Day 1-14 | Local demo only')
    canvas.drawRightString(width - 44, 28, str(doc.page))
    canvas.restoreState()

plans = json.loads((ROOT / 'docs/tasks/assignments.json').read_text(encoding='utf-8'))
for plan in plans:
    story = []
    md = []
    def add(text, style='TaskBody'):
        story.append(paragraph(text, style))
        md.append(('## ' if style == 'TaskH2' else '# ' if style == 'TaskTitle' else '### ' if style == 'TaskDay' else '') + text + '\n')
    add(plan['name'], 'TaskTitle')
    add(plan['role'], 'TaskH2')
    add('Branch: ' + plan['branch'] + ' | Plan begins when the team receives the starter.', 'TaskSmall')
    add(plan['goal'])
    add('Your code ownership', 'TaskH2')
    for path in plan['folders']:
        add('- ' + path, 'TaskSmall')
    add('Your agreed interfaces', 'TaskH2')
    for interface in plan['interfaces']:
        add('- ' + interface)
    add('Start without waiting', 'TaskH2')
    add('Pull the foundation from main into your branch. Run npm ci, copy both apps/api/.env.example and apps/web/.env.example to .env on first setup, then npm run dev. The frontend shows only a plain startup message. No database models/migrations/seed or product features are implemented. Mustafa authors the database setup; follow his instructions after that PR merges.')
    add('Read the final specification, proposed API contract, acceptance checklist and your task folders. You build the assigned pages/services yourself. There are no prebuilt guards, calculations, forms, components, adapters or fixtures. Agree interfaces early and create your own small local test data to work independently.')
    add('Scope boundary', 'TaskH2')
    add(plan['avoid'])
    story.append(PageBreak()); md.append('\n---\n')
    add('Week 1 - build your area', 'TaskTitle')
    add('Days are relative, not the instructor deadline. Day 7 is a review/buffer day; adjust to your availability. Deliver small reviewed PRs throughout the week.', 'TaskSmall')
    for day, task in plan['week1']:
        add(day, 'TaskDay'); add(task)
    story.append(PageBreak()); md.append('\n---\n')
    add('Week 2 - integrate and prove', 'TaskTitle')
    add('Day 8: API integration. Day 12: core acceptance. Days 13-14: English rehearsal and fixes. No new optional features while CORE is failing.', 'TaskSmall')
    for day, task in plan['week2']:
        add(day, 'TaskDay'); add(task)
    story.append(PageBreak()); md.append('\n---\n')
    add('Ready-to-merge checklist', 'TaskTitle')
    for check in plan['checks']:
        add('[ ] ' + check)
    add('Handoffs and dependencies', 'TaskH2')
    for handoff in plan['handoffs']:
        add('- ' + handoff)
    add('Every pull request', 'TaskH2')
    add('Commit only your intended files; push your branch; open a PR into main. Include the task/rule IDs, a short explanation, and tests or screenshots. Run npm run typecheck, npm test and npm run build. Backend contributors also document their endpoints in Swagger. Alaa reviews/merges; keep .env, node_modules, dist and temporary files untracked.')
    add('Your English presentation segment', 'TaskH2')
    add(plan['presentation'])
    add('Everyone should understand the whole flow: owner onboarding -> pharmacist stock -> dashboard -> public search. Be ready to explain a rule outside your own feature. Final acceptance uses real API requests and persisted PostgreSQL data; locally authored test fixtures are only for development.', 'TaskSmall')
    path = OUT / f'SmartShelf-{plan["slug"]}-Two-Week-Tasks.pdf'
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=58, bottomMargin=48,
                            title=f'SmartShelf - {plan["name"]} - Two-week tasks', author='SmartShelf - Team 2')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    (ROOT / f'docs/tasks/{plan["slug"]}.md').write_text('\n'.join(md), encoding='utf-8')
    print(path.name)

if __name__ == '__main__':
    import pypdfium2 as pdfium
    from pypdf import PdfReader
    from PIL import Image, ImageDraw
    render_dir = ROOT / 'tmp/pdfs'
    render_dir.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for path in sorted(OUT.glob('SmartShelf-*-Two-Week-Tasks.pdf')):
        reader = PdfReader(str(path))
        if len(reader.pages) != 4:
            raise RuntimeError(f'{path.name}: expected 4 pages; got {len(reader.pages)}')
        pdf = pdfium.PdfDocument(str(path))
        for i in range(len(pdf)):
            page = pdf[i]
            im = page.render(scale=1.35).to_pil().convert('RGB')
            im.save(render_dir / f'{path.stem}-{i+1}.png')
            im.thumbnail((298, 421))
            tile = Image.new('RGB', (318, 452), '#dce5df')
            tile.paste(im, ((318 - im.width)//2, 22))
            ImageDraw.Draw(tile).text((10, 5), f'{path.stem.split("-")[1]} / {i+1}', fill='black')
            thumbs.append(tile)
            if len((reader.pages[i].extract_text() or '').strip()) < 100:
                raise RuntimeError(f'Empty page: {path} page {i+1}')
    # One row per person; all pages visible for visual QA.
    montage = Image.new('RGB', (318 * 4, 452 * 6), 'white')
    for n, thumb in enumerate(thumbs):
        montage.paste(thumb, ((n % 4)*318, (n // 4)*452))
    montage.save(render_dir / 'all-task-guides.png')
    print('Verified: 6 PDFs, 24 nonempty pages; rendered tmp/pdfs/all-task-guides.png')
