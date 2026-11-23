"""Builds the storyboard review page from storyboard_v2.json.

    python3 storyboard/build_page.py <out_dir>     # writes <out_dir>/index.html (images in <out_dir>/img)
"""
import html, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, 'storyboard_v2.json'), encoding='utf-8'))
out = sys.argv[1] if len(sys.argv) > 1 else HERE
e = html.escape

CSS = r"""
:root {
  /* layout: one reading column; the 6-step grammar as a grid of HUD cards, then each fairy as a strip of quadrant rows (thumbnail + beat timeline) */
  --bg: #FBF8FC; --surface: #FFFFFF; --ink: #2E2350; --muted: #6C6488; --line: #E7E1EF;
  --bravi: #E9563F; --bravi-soft: #FFE9E1; --lumi: #5B47C9; --lumi-soft: #ECE8FF; --gold: #C98A12; --gold-soft: #FFF3D1;
  --display: 'Fredoka', 'Nunito Sans', system-ui, sans-serif;
  --body: 'Nunito Sans', system-ui, -apple-system, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #17132A; --surface: #211C3A; --ink: #F1EDFB; --muted: #B1A8CF; --line: #352E57;
  --bravi: #FF8A70; --bravi-soft: #3A2230; --lumi: #A898FF; --lumi-soft: #2B2552; --gold: #F2C14E; --gold-soft: #3A3120; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #17132A; --surface: #211C3A; --ink: #F1EDFB; --muted: #B1A8CF; --line: #352E57;
  --bravi: #FF8A70; --bravi-soft: #3A2230; --lumi: #A898FF; --lumi-soft: #2B2552; --gold: #F2C14E; --gold-soft: #3A3120; color-scheme: dark }
* { box-sizing: border-box }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.55;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 64px }
.wrap { max-width: 1080px; margin: 0 auto }
h1, h2, h3 { font-family: var(--display); font-weight: 600; line-height: 1.15; text-wrap: balance; margin: 0 }
h1 { font-size: clamp(2rem, 5vw, 3.1rem) }
h2 { font-size: clamp(1.5rem, 3.4vw, 2.1rem) }
h3 { font-size: 1.25rem }
p { margin: 0 }
.eyebrow { font-family: var(--display); font-weight: 500; letter-spacing: .12em; text-transform: uppercase; font-size: .8rem; color: var(--muted) }
header.top { padding-block: 40px 24px; display: grid; gap: 14px }
.lede { max-width: 64ch; font-size: 1.08rem }
.pill { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 6px 14px; background: var(--gold-soft); color: var(--gold); font-weight: 700; font-size: .85rem; width: fit-content }
.pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor }
nav.jump { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px }
nav.jump a { color: var(--ink); text-decoration: none; border: 1.5px solid var(--line); border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: .9rem }
nav.jump a:hover, nav.jump a:focus-visible { border-color: var(--ink); outline: none }
.changes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 8px }
.changes div { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 14px 16px; min-width: 0 }
.changes b { font-family: var(--display); font-weight: 600; display: block; margin-bottom: 2px }
section { padding-block: 36px 8px; display: grid; gap: 18px }
.steps { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px }
.step { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; display: grid; min-width: 0 }
.step img { display: block; width: 100%; height: auto; aspect-ratio: 810 / 300; object-fit: cover; background: #E9E3F3 }
.step .txt { padding: 12px 16px 16px; display: grid; gap: 4px }
.step .time { font-family: var(--display); font-weight: 600; font-size: 1.05rem }
.step .k { color: var(--muted); font-size: .9rem }
.cue { font-family: var(--display); font-weight: 500; color: var(--ink); background: var(--bg); border-radius: 10px; padding: 6px 10px; margin-top: 6px; font-size: .95rem }
.fairy-head { border-radius: 24px; padding: 22px 22px; display: grid; gap: 6px }
.bravi .fairy-head { background: var(--bravi-soft) } .lumi .fairy-head { background: var(--lumi-soft) }
.bravi .accent { color: var(--bravi) } .lumi .accent { color: var(--lumi) }
.quad { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 18px }
.quad figure { margin: 0; display: grid; gap: 6px; align-content: start }
.quad figure img { width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 14px; display: block; object-fit: cover }
.quad figcaption { font-size: .78rem; color: var(--muted) }
.qhead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; margin-bottom: 8px }
.qhead .where { font-family: var(--display); font-weight: 600; letter-spacing: .06em; font-size: .85rem; padding: 3px 10px; border-radius: 8px; color: #fff }
.bravi .where { background: var(--bravi) } .lumi .where { background: var(--lumi) }
.qhead .clock { color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 700 }
.beats { list-style: none; margin: 0; padding: 0; display: grid }
.beats li { display: grid; grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr); gap: 14px; padding: 10px 0; border-top: 1px solid var(--line) }
.beats .at { font-family: var(--display); font-weight: 600; font-variant-numeric: tabular-nums }
.beats .vo { font-family: var(--display); font-weight: 500 }
.beats .vo::before { content: "VO  "; font-family: var(--body); font-weight: 800; font-size: .7rem; letter-spacing: .1em; color: var(--muted) }
.payoff { margin-top: 10px; border-radius: 12px; padding: 10px 14px; background: var(--gold-soft); color: var(--ink); font-weight: 700 }
.payoff::before { content: "★ "; color: var(--gold) }
.colhead { display: grid; grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr); gap: 14px; font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 800; padding-bottom: 6px }
.reward { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 20px; align-items: center; border-radius: 22px; padding: 18px; border: 2px dashed var(--line) }
.reward img { width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 14px; display: block }
.decisions { display: grid; gap: 10px; counter-reset: d }
.decisions div { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; counter-increment: d }
.decisions div::before { content: counter(d); font-family: var(--display); font-weight: 600; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--gold-soft); color: var(--gold) }
.decisions b { font-family: var(--display); font-weight: 600 }
.note { color: var(--muted); font-size: .9rem; max-width: 70ch }
@media (max-width: 720px) {
  .quad, .reward { grid-template-columns: 1fr }
  .quad figure { max-width: 220px }
  .reward img { max-width: 220px }
  .beats li { grid-template-columns: 46px minmax(0, 1fr) }
  .beats li .vo { grid-column: 2 }
  .colhead { display: none }
}
@media (prefers-reduced-motion: no-preference) { nav.jump a { transition: border-color .15s } }
"""

parts = []
parts.append('<title>Fairy Passport Storyboard</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
parts.append('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
parts.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito+Sans:wght@400;700;800&display=swap">')
parts.append(f'<style>{CSS}</style>')
parts.append('<div class="wrap">')
parts.append('''<header class="top">
<span class="eyebrow">Fairy Passport · Bravi &amp; Lumi · storyboard v2</span>
<h1>Um passo a cada 5 segundos</h1>
<p class="lede">Na primeira versão, depois da fala de abertura, cada quadrante ficava 20 segundos quase parado. Nesta versão os 30 segundos viram seis passos de 5 s: a narradora diz onde escovar, o guia na tela mostra o movimento e a história avança um pedacinho a cada passo.</p>
<span class="pill">Aguardando aprovação antes de renderizar</span>
<div class="changes">
<div><b>Algo acontece a cada 5 s</b>Uma gema acende, uma nuvem se abre, a lua acorda. A cada passo há um som, um brilho e um avanço na história.</div>
<div><b>A narradora guia o movimento</b>“Agora os dentes de trás, por fora”, “agora a parte de dentro”, “agora em cima dos molares”.</div>
<div><b>O guia mostra onde e como</b>Os dentes do passo acendem na boca, um dente-treinador mostra a escova do lado da bochecha, da língua ou em cima, e o anel do timer tem 6 gemas.</div>
</div>
<nav class="jump" aria-label="Seções"><a href="#ritmo">O ritmo</a><a href="#bravi">Bravi</a><a href="#lumi">Lumi</a><a href="#decidir">Para decidir</a></nav>
</header>''')

# grammar
parts.append('<section id="ritmo"><span class="eyebrow">Igual nas sete fadas</span><h2>O ritmo de cada quadrante</h2>')
parts.append('<p class="note">Os seis passos se repetem nos quatro quadrantes. As imagens mostram o guia novo no quadrante de cima à direita: os dentes do passo acendem, o dente-treinador mostra a escova e o movimento, e cada gema do anel acende quando o passo termina.</p>')
parts.append('<div class="steps">')
for i, s in enumerate(data['steps']):
    parts.append(f'''<article class="step"><img src="img/step{i + 1}.jpg" alt="Guia na tela no passo {i + 1}: {e(s['teeth'])}, {e(s['face'])}" loading="lazy">
<div class="txt"><span class="time">Passo {i + 1} · {e(s['t'])}</span>
<span><b>{e(s['teeth'])}</b> — {e(s['face'])}</span><span class="k">Movimento: {e(s['move'])}</span>
<span class="cue">“{e(s['cue'])}”</span></div></article>''')
parts.append('</div></section>')

for n, f in enumerate(data['fairies'], 1):
    parts.append(f'<section id="{f["id"]}" class="{f["id"]}">')
    parts.append(f'''<div class="fairy-head"><span class="eyebrow">Aventura {n} · 2 min</span><h2><span class="accent">{e(f['name'])}</span> — {e(f['story'])}</h2><p>{e(f['device'])}</p></div>''')
    for q in f['quadrants']:
        parts.append(f'''<article class="quad"><figure><img src="img/{q['img']}" alt="{e(f['name'])}, {e(q['title'])}" loading="lazy"><figcaption>Cenário atual com o guia novo. Os eventos de 5 s ainda não estão desenhados.</figcaption></figure>
<div><div class="qhead"><span class="where">{e(q['q'])}</span><h3>{e(q['title'])}</h3><span class="clock">{e(q['time'])}</span></div>
<div class="colhead"><span>Tempo</span><span>Na tela</span><span>Locução (inglês)</span></div><ol class="beats">''')
        for b in q['beats']:
            parts.append(f'<li><span class="at">{e(b["at"])}</span><span>{e(b["see"])}</span><span class="vo">{e(b["vo"])}</span></li>')
        parts.append(f'</ol><p class="payoff">{e(q["payoff"])}</p></div></article>')
    r = f['reward']
    parts.append(f'''<article class="reward"><img src="img/{r['img']}" alt="Recompensa de {e(f['name'])}" loading="lazy"><div style="display:grid;gap:8px"><span class="eyebrow">2:00–2:05 · vídeo de recompensa separado</span><h3>Recompensa</h3><p>{e(r['see'])}</p><p class="cue">“{e(r['vo'])}”</p></div></article>''')
    parts.append('</section>')

parts.append('<section id="decidir"><span class="eyebrow">Antes de renderizar</span><h2>Para decidir</h2><div class="decisions">')
for d in data['decisions']:
    parts.append(f'<div><span><b>{e(d["q"])}.</b> {e(d["a"])}</span></div>')
parts.append('</div><p class="note">O timer continua exato: 120 s de escovação, quatro quadrantes de 30 s, recompensa separada de 5 s. Depois da aprovação, os eventos de cada passo são desenhados e os dois vídeos são renderizados de novo.</p></section>')
parts.append('</div>')

os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write('\n'.join(parts))
print('wrote', os.path.join(out, 'index.html'))
