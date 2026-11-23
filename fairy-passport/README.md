# Fairy Passport — vídeos de escovação interativa

Dois vídeos animados de 2 minutos exatos para escovar os dentes com uma fada:

| Fada | Aventura | Poder | Selo |
| --- | --- | --- | --- |
| **Bravi** | *The Castle of Courage* | Coragem | Courage Badge (escudo com coração) |
| **Lumi** | *The Four Lost Stars* | Luz | Starlight Badge (constelação de quatro estrelas) |

Tudo aqui é original e gerado por código: personagens, cenários, trilha, efeitos.
A narração sai de um modelo de voz aberto (Kokoro, Apache-2.0) e pode ser
trocada por uma voz de estúdio sem mexer no resto.

Versão atual: **v3, "abre enquanto escova"**, aprovada a partir do storyboard
em `storyboard/storyboard_v3.json`.

## Entregáveis (`out/`)

Para cada fada:

| Arquivo | O que é |
| --- | --- |
| `*_brushing_120s.mp4` | A escovação: 3.600 quadros, 120,000 s, 1080×1920, 30 fps, voz + música + efeitos embutidos |
| `*_reward_5s.mp4` | A recompensa (selo desbloqueado), separada — nunca rouba tempo de escovação |
| `*_full_125s.mp4` | As duas coisas emendadas, para tocar direto (fora do git por ser cópia das outras duas; `node src/build.js` gera, ou `ffmpeg -f concat` dos dois MP4) |
| `*.en.srt` | Legendas em inglês (também embutidas no MP4 como faixa desligada por padrão) |

E em `out/assets/`: personagem em PNG transparente, selo em PNG transparente e
a animação do selo com canal alfa (`*_badge_unlock.webm`) para o passaporte
digital ou impresso.

## O ritmo: um passo a cada 5 segundos

Cada quadrante de 30 s tem seis passos de 5 s, iguais nas sete fadas:

| Passo | Tempo | Onde | Movimento |
| --- | --- | --- | --- |
| 1 | 0–5 s | Dentes de trás, por fora (lado da bochecha) | Bolinhas |
| 2 | 5–10 s | Dentes da frente, por fora | Bolinhas |
| 3 | 10–15 s | Dentes de trás, por dentro (língua / céu da boca) | Bolinhas |
| 4 | 15–20 s | Dentes da frente, por dentro | Escova em pé, sobe e desce |
| 5 | 20–25 s | Em cima dos molares | Vai e vem |
| 6 | 25–30 s | Acabamento | Bolinhas leves + "three, two, one" |

Em cada passo acontecem quatro coisas ao mesmo tempo:

- **a narradora diz onde escovar** numa fala curta (até ~4,5 s), e nos
  últimos 3 s conta "Three! Two! One!" junto com os tiques;
- **o guia na tela mostra** os dentes do passo acesos na boca e um
  dente-treinador com a escova do lado certo e a seta do movimento;
- **o anel do timer** acende uma gema (coração para a Bravi, estrela para a
  Lumi) no fim de cada passo;
- **a missão se solta um pouco mais**, com um som próprio, e a fada comemora.

## As missões: abre ou quebra enquanto escova

Cada missão é algo preso que se solta em 5 etapas, uma por passo. Entre um
salto e outro, o próximo pedaço treme e a luz cresce. Aos 30 s, a coisa se
liberta de vez. As quatro missões ficam no mesmo lugar do quadrante
correspondente, para a cena reforçar o diagrama.

**Bravi**

| Quadrante | Missão | Como abre |
| --- | --- | --- |
| Em cima, direita | A porta escondida | 5 cadeados-coração saltam um a um; a porta abre uma fresta a cada salto, com luz vazando. 0:30 sai a chave dourada. |
| Em cima, esquerda | A chave dourada | Cipós encantados se soltam um a um e viram flor. 0:55 a chave entra; 1:00 a porta abre e aparece o escudo. |
| Embaixo, esquerda | O Escudo da Coragem | A crosta de pedra racha e cai em pedaços; o dourado aparece. 1:30 a pedra quebra toda e o raio abre o portão. |
| Embaixo, direita | A última porta | A grade sobe um degrau por passo e as janelas do castelo acendem. 2:00 o portão abre e o castelo se ilumina. |

**Lumi**

| Quadrante | Missão | Como abre |
| --- | --- | --- |
| Em cima, direita | As estrelas perdidas | A nuvenzinha perde um tufo por passo e a estrela aparece. 0:30 ela volta ao lugar. |
| Em cima, esquerda | O rastro brilhante | O rastro leva a um cristal de gelo que racha a cada passo. 1:00 o cristal estoura. |
| Embaixo, esquerda | O segredo da lua | A lua acorda, cochicha e aponta; a nuvem-flor abre uma pétala por passo. 1:30 a estrela sobe. |
| Embaixo, direita | A constelação mágica | Vaga-lumes trazem uma ponta da estrela por passo. 2:00 a constelação se completa. |

Sem medo, sem cárie, sem bactéria: só coragem, esforço e constância.

### Uma decisão que vale conferir: o diagrama é em *visão-espelho*

A ordem segue os quadrantes 1 → 2 → 3 → 4 (superior direito, superior
esquerdo, inferior esquerdo, inferior direito, do lado **da criança**). O
diagrama mostra a boca como a criança vê a própria boca no espelho: o lado
direito dela aparece no lado direito da tela. É o oposto da convenção do
odontograma (visão do examinador), e foi de propósito — quem olha a tela é
quem escova. Para a visão do examinador, inverta o sinal em `TEETH` em
`src/hud.js`.

## As três camadas

O vídeo é montado em camadas independentes, o que garante que nenhuma
animação consiga mexer na contagem:

1. **Timer** (`src/timeline.js`, `src/hud_v2.js`) — calculado só a partir do
   número do quadro. Quadro *f* = *f*/30 s. O anel e o número nunca pausam,
   nunca reiniciam fora de hora, nunca aceleram. 30 aparece no primeiro
   segundo de cada quadrante, 1 no último.
2. **História** (`src/scenes/*.js`, `src/progress.js`) — câmera, fada e as
   missões que abrem por etapas. Também é função pura do tempo.
3. **Áudio** (`audio/`) — narração, trilha e efeitos, mixados e cortados em
   120,000 s + 5,000 s.

## Storyboard → falas

`storyboard/storyboard_v3.json` é a fonte: o que aparece em cada passo e a
fala em inglês. `storyboard/build_page.py` gera a página de revisão e
`audio/make_script.py` gera `audio/script.json` com o horário e a duração
máxima de cada fala. Para mudar uma fala, edite o storyboard e rode de novo a
partir de `make_script.py`.

## Narração

Voz `af_heart` do Kokoro-82M, rodando local. Cada fala é sintetizada e, se
passar da janela do passo, acelerada um pouco (a abertura de cada vídeo ficou
em 1,11×; as outras, no ritmo normal). "Bravi" está pronunciado *BRAH-vee*
(ajuste em `NAMES`, `audio/tts.py`).

A conta ElevenLabs conectada estava com 63 créditos — uma fala custa ~206 —,
então nada foi gerado lá. Para trocar pela voz de estúdio (sugestão: *Clara —
Children's Storyteller*): gere cada fala com o mesmo texto, salve como
`build/audio/<fada>_line<n>.wav` e rode `python3 audio/tts.py --keep-existing`
seguido de `python3 audio/music.py` e `node src/build.js`. O tempo de cada fala
é medido de novo a partir do arquivo.

## Trilha e efeitos

Composição original, sintetizada nota a nota (`audio/music.py`). Cada compasso
tem exatamente 2,5 s — Bravi em 4/4 a 96 BPM, Lumi em 3/4 a 72 BPM —, então
cada passo tem 2 compassos, cada quadrante 12, e as frases musicais viram junto
com o quadrante. A cada missão entra uma camada nova, e a última frase sobe
para a recompensa.

Efeitos: um "tim" de gema a cada passo, o som da missão (cadeado, cipó, pedra,
grade, nuvem, gelo, pétala, vaga-lume), tiques no 3-2-1 e o carrilhão de missão
cumprida a cada 30 s.

Mixagem: voz a −16 LUFS, trilha bem abaixo e mais baixa ainda enquanto o
narrador fala, final em cerca de −17 LUFS integrados com pico abaixo de
−1 dBFS. Os stems (voz, música, efeitos) ficam em `build/audio/` para reedição.

## Rodando

```
npm install                       # @napi-rs/canvas
pip install kokoro-onnx soundfile scipy pyloudnorm
# modelo de voz (Apache-2.0), ~350 MB:
#   github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
#   github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 audio/make_script.py      # storyboard → falas
python3 audio/tts.py --models /pasta/do/kokoro
python3 audio/music.py
node src/build.js                 # renderiza e monta os MP4 em out/
node src/assets.js                # artes avulsas e animação do selo
node src/stills.js bravi 0 30.5 61 # quadros soltos para revisão em build/qa/
```

Precisa de `ffmpeg` com libx264. Os dois vídeos levam cerca de 6 minutos em 4
núcleos. `FP_HUD=v1` volta o guia da primeira versão.

## Criando a próxima fada

O sistema foi feito para as sete:

1. paleta, cabelo, asas e objeto em `SPECS` (`src/fairy.js`);
2. cores e ícone da missão em `THEMES` (`src/hud.js`) e o selo em `BADGES`
   (`src/badge.js`);
3. uma cena em `src/scenes/<fada>.js` com as quatro missões nos quatro
   quadrantes, cada uma se soltando em 5 etapas (`src/progress.js` tem as
   ferramentas: níveis por passo, antecipação, rachaduras, peças);
4. o roteiro no storyboard e uma composição em `audio/music.py`.

O guia, o relógio, a recompensa, a mixagem e a montagem são compartilhados.

## Fontes e licenças

Fredoka (SIL Open Font License, `fonts/Fredoka-OFL.txt`). Kokoro-82M
(Apache-2.0). Todo o resto deste diretório é original.

## Aviso clínico

30 s por quadrante e 5 s por região são uma divisão prática do tempo, não
garantia de higienização. Os passos existem para lembrar das três faces e dos
dentes de trás, e crianças pequenas precisam de um adulto escovando junto ou
revisando.
