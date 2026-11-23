# Fairy Passport — vídeos de escovação interativa

Dois vídeos animados de 2 minutos exatos para escovar os dentes com uma fada:

| Fada | Aventura | Poder | Selo |
| --- | --- | --- | --- |
| **Bravi** | *The Castle of Courage* | Coragem | Courage Badge (escudo com coração) |
| **Lumi** | *The Four Lost Stars* | Luz | Starlight Badge (constelação de quatro estrelas) |

Tudo aqui é original e gerado por código: personagens, cenários, trilha, efeitos.
A narração sai de um modelo de voz aberto (Kokoro, Apache-2.0) e pode ser
trocada por uma voz de estúdio sem mexer no resto.

## Entregáveis (`out/`)

Para cada fada:

| Arquivo | O que é |
| --- | --- |
| `*_brushing_120s.mp4` | A escovação: 3.600 quadros, 120,000 s, 1080×1920, 30 fps, voz + música + efeitos embutidos |
| `*_reward_5s.mp4` | A recompensa (selo desbloqueado), separada — nunca rouba tempo de escovação |
| `*_full_125s.mp4` | As duas coisas emendadas, para tocar direto (fora do git por ser cópia das outras duas; `node src/build.js` gera, ou `ffmpeg -f concat` dos dois MP4) |
| `*.en.srt` | Legendas em inglês (também embutidas no MP4 como faixa desligada por padrão) |

Conferido nos arquivos finais com `ffprobe`: escovação = 3.600 quadros e
120,000 s de áudio; recompensa = 150 quadros e 5,000 s; completo = 3.750
quadros e 125,000 s. O quadro 899 mostra "1" e o quadro 900 mostra "30" com
MISSION 2/4; o carrilhão de missão cumprida cai em 30,002 s no áudio.

E em `out/assets/`: personagem em PNG transparente, selo em PNG transparente e
a animação do selo com canal alfa (`*_badge_unlock.webm`) para o passaporte
digital ou impresso.

## As três camadas

Como recomendado, o vídeo é montado em camadas independentes — o que garante
que nenhuma animação consiga mexer na contagem:

1. **Timer** (`src/timeline.js`, `src/hud.js`) — calculado só a partir do
   número do quadro. Quadro *f* = *f*/30 s. O anel e o número nunca pausam,
   nunca reiniciam fora de hora, nunca aceleram. 30 aparece no primeiro
   segundo de cada quadrante, 1 no último.
2. **História** (`src/scenes/*.js`) — câmera, fada, objetos e recompensas
   progressivas. Também é função pura do tempo.
3. **Áudio** (`audio/`) — narração, trilha e efeitos, mixados e cortados em
   120,000 s + 5,000 s.

## O que a criança vê

No canto superior direito, o **cronômetro circular** (30 → 1) com o anel
esvaziando. Ao lado, **"MISSION 1/4 → 4/4"** com os ícones da missão (portas
para a Bravi, estrelas para a Lumi). À esquerda, **a boca** com o quadrante da
vez aceso e uma escovinha esfregando.

Dentro de cada quadrante há três pílulas — **OUTSIDE → INSIDE → TOPS**, 10 s
cada — para lembrar das faces vestibular, lingual/palatina e oclusal. Cada
troca de face toca um "tim" suave.

Nos últimos 3 s de cada quadrante: o anel pulsa, os dentes do próximo
quadrante piscam no diagrama e tocam três tiques suaves (3-2-1). Na virada,
toca o carrilhão de missão cumprida e a escovinha desliza para o novo
quadrante.

### Uma decisão que vale conferir: o diagrama é em *visão-espelho*

A ordem segue os quadrantes 1 → 2 → 3 → 4 (superior direito, superior
esquerdo, inferior esquerdo, inferior direito, do lado **da criança**). O
diagrama mostra a boca como a criança vê a própria boca no espelho: o lado
direito dela aparece no lado direito da tela. É o oposto da convenção do
odontograma (visão do examinador), e foi de propósito — quem olha a tela é
quem escova. Se preferir a visão do examinador, basta inverter o sinal em
`TEETH` em `src/hud.js` e as falas "on this side / on the other side"
continuam valendo.

## As histórias

As quatro missões ficam *no mesmo lugar* do quadrante correspondente, para a
cena reforçar o diagrama:

- **Bravi** — o castelo tem quatro portas: duas nas torres (em cima) e dois
  portões (embaixo). Quem destranca é a escovinha mágica — o avatar da
  escovação da criança — e um traço dourado vai contornando a porta ao longo
  dos 30 s. 0:30 abre a porta da torre direita e sai a chave dourada; 1:00 a
  chave gira na fechadura da torre esquerda e aparece o Escudo da Coragem,
  apagado; de 1:00 a 1:30 a escovinha esfrega o escudo até a cor voltar e às
  1:30 ele brilha e abre o portão esquerdo; na última missão as janelas vão
  acendendo uma a uma, e às 2:00 o portão direito abre e o castelo inteiro se
  ilumina.
- **Lumi** — a constelação tem forma de dente, com as quatro estrelas grandes
  nos quatro quadrantes. 0:30 a estrela escondida atrás da nuvenzinha volta;
  de 0:30 a 1:00 a escovinha vai pintando o rastro brilhante até a nebulosa;
  a lua acorda, cochicha e aponta com o luar para a nuvem que brilha cada vez
  mais; na última missão a poeira de estrelas se junta no espaço vazio e às
  2:00 a constelação se completa.

Sem medo, sem cárie, sem bactéria: só coragem, esforço e constância.

## Narração

Texto em `audio/script.json` (uma fala no começo de cada quadrante, o resto
fica livre para escovar). Voz `af_heart` do Kokoro-82M, rodando local. "Bravi"
está pronunciado *BRAH-vee* (ajuste em `NAMES`, `audio/tts.py`).

A conta ElevenLabs conectada estava com 63 créditos — uma fala custa ~206 —,
então nada foi gerado lá. Para trocar pela voz de estúdio (sugestão: *Clara —
Children's Storyteller*): gere cada fala com o mesmo texto, salve como
`build/audio/<fada>_line<n>.wav` e rode `python3 audio/tts.py --keep-existing`
seguido de `python3 audio/music.py` e `node src/build.js`. O tempo de cada fala
é medido de novo a partir do arquivo.

## Trilha e efeitos

Composição original, sintetizada nota a nota (`audio/music.py`). Cada compasso
tem exatamente 2,5 s — Bravi em 4/4 a 96 BPM, Lumi em 3/4 a 72 BPM —, então
cada quadrante tem 12 compassos e as frases musicais viram junto com o
quadrante. A cada missão entra uma camada nova (caixinha de música → celesta e
harpa → flauta e chocalho → tudo junto), e a última frase sobe para a
recompensa.

Mixagem: voz a −16 LUFS, trilha ~7 dB abaixo e mais ~8 dB abaixo enquanto o
narrador fala, final em −17 LUFS integrados com pico abaixo de −1 dBFS. Os
stems (voz, música, efeitos) ficam em `build/audio/` para reedição.

## Rodando

```
npm install                       # @napi-rs/canvas
pip install kokoro-onnx soundfile scipy pyloudnorm
# modelo de voz (Apache-2.0), ~350 MB:
#   github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
#   github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 audio/tts.py --models /pasta/do/kokoro
python3 audio/music.py
node src/build.js                 # renderiza e monta os MP4 em out/
node src/assets.js                # artes avulsas e animação do selo
node src/stills.js bravi 0 30.5 61 # quadros soltos para revisão em build/qa/
```

Precisa de `ffmpeg` com libx264. Um vídeo leva poucos minutos em 4 núcleos.

## Criando a próxima fada

O sistema foi feito para as sete:

1. paleta, cabelo, asas e objeto em `SPECS` (`src/fairy.js`);
2. cores e ícone da missão em `THEMES` (`src/hud.js`) e o selo em `BADGES`
   (`src/badge.js`);
3. uma cena em `src/scenes/<fada>.js` com as quatro missões nos quatro
   quadrantes;
4. as falas em `audio/script.json` e uma composição em `audio/music.py`.

O HUD, o relógio, a recompensa, a mixagem e a montagem são compartilhados.

## Fontes e licenças

Fredoka (SIL Open Font License, `fonts/Fredoka-OFL.txt`). Kokoro-82M
(Apache-2.0). Todo o resto deste diretório é original.

## Aviso clínico

30 s por quadrante é uma divisão prática do tempo, não garantia de
higienização. As pílulas OUTSIDE / INSIDE / TOPS existem para lembrar das três
faces, e crianças pequenas precisam de um adulto escovando junto ou revisando.
