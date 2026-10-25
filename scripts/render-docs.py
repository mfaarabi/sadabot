"""Render the project's two Markdown documents as dependency-free static pages."""
from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parents[1]

def inline(text):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + {'requirements.md': 'requirements.html', 'product-brief.md': 'brief.html'}.get(m[2], m[2]) + '">' + m[1] + '</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)

def render(source):
    lines = source.splitlines()
    out, paragraph = [], []
    list_type = None
    table = False
    def flush():
        if paragraph:
            out.append('<p>' + '<br>'.join(inline(x) for x in paragraph) + '</p>')
            paragraph.clear()
    def close_list():
        nonlocal list_type
        if list_type:
            out.append('</' + list_type + '>')
            list_type = None
    for line in lines + ['']:
        if line.startswith('|'):
            flush(); close_list()
            cells = [x.strip() for x in line.strip().strip('|').split('|')]
            if all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                continue
            if not table:
                table = True
                out.append('<div class="table-scroll"><table><thead><tr>' + ''.join('<th>'+inline(x)+'</th>' for x in cells) + '</tr></thead><tbody>')
            else:
                out.append('<tr>' + ''.join('<td>'+inline(x)+'</td>' for x in cells) + '</tr>')
            continue
        if table:
            out.append('</tbody></table></div>'); table = False
        if not line.strip():
            flush(); close_list(); continue
        heading = re.match(r'^(#{1,6}) (.+)', line)
        item = re.match(r'^(- |\d+\. )(.+)', line)
        if heading:
            flush(); close_list()
            level = len(heading[1])
            out.append(f'<h{level}>' + inline(heading[2]) + f'</h{level}>')
        elif item:
            flush()
            kind = 'ul' if item[1] == '- ' else 'ol'
            if kind != list_type:
                close_list(); out.append('<'+kind+'>'); list_type = kind
            out.append('<li>'+inline(item[2])+'</li>')
        else:
            close_list(); paragraph.append(line.strip())
    return '\n'.join(out)

for source, target, label, other, other_label in [
    ('product-brief.md','brief.html','Product brief','requirements.html','Read detailed requirements'),
    ('requirements.md','requirements.html','Detailed requirements','brief.html','Read the short brief'),
]:
    content = render((ROOT/'docs'/source).read_text())
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{label} — Kost Rapi</title><link rel="stylesheet" href="document.css"></head><body><header><a href="index.html">⌂ kostrapi <span>/ {label}</span></a><a href="app.html">Open prototype ↗</a></header><main><div class="document-nav"><a href="index.html">← Project overview</a><a href="{other}">{other_label} ↗</a></div><article>{content}</article><div class="document-nav"><a href="docs/{source}" download>↓ Download Markdown</a><a href="{other}">{other_label} ↗</a></div></main></body></html>'''
    (ROOT/'dist'/target).write_text(page)
    output = ROOT/'dist'/'docs'/source
    output.parent.mkdir(exist_ok=True)
    output.write_text((ROOT/'docs'/source).read_text())
