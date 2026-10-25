---
name: roteiro
description: Escreve o roteiro narrado de um vídeo "como funciona" (~60–90 s), denso, de especialista, com gancho, viradas e CTA. Use quando a pessoa der um tema novo.
---

# Roteiro de especialista

O que segura a pessoa no vídeo não é a animação: é a **sensação de "caramba, eu não sabia disso"** a cada poucos segundos. Roteiro raso (só o mecanismo básico) não engaja.

## 1. Pesquise antes de escrever

Use a busca na web. Junte 8–12 fatos, priorizando os **não óbvios**:
- números e regras de engenharia (ex.: o airbag abre em ~30 ms);
- a lei/norma exata (número da resolução, artigo);
- história curta (quem inventou, por que mudou);
- um caso real surpreendente ou um "lado B" (o que a empresa não conta);
- uma **ação prática** que o espectador pode fazer hoje.

Anote a fonte de cada número. Se as fontes divergem, use "cerca de" ou "quase".

## 2. Estrutura

| Trecho | Tempo | O que faz |
|---|---|---|
| Gancho | 0–4 s | Uma afirmação que contraria o senso comum. Ex.: "A companhia vende mais passagens do que tem assento. E faz isso de propósito." |
| Promessa | 4–6 s | Uma pergunta curta que abre a curiosidade ("Sabe por quê?"). |
| Mecanismo | 6–40 s | Como funciona, passo a passo, com **um número concreto** como exemplo (180 lugares, vende 190). |
| Virada | 40–60 s | O que dá errado / o lado escondido / o direito que ninguém conhece. |
| Fecho + CTA | últimos 6 s | Uma frase que amarra o gancho + ação ("Salva aí e manda pra quem vive viajando"). |

- Um "aha" novo a cada **8–10 s**.
- **1.100 a 1.250 caracteres** (≈ 65–75 s de fala). O Reels tem no máximo **1:20**: passou disso, corte o que não traz fato novo.
- Frases curtas, faladas, segunda pessoa ("você"). Nada de "neste vídeo vamos ver".
- CTA de comentário funciona bem quando a resposta é fácil ("Comenta só o nono número").

## 3. Duas versões do texto

Salve o roteiro aprovado em `projetos/<NNN. slug>/roteiro.txt` (parágrafos separados por linha em branco, números em algarismo) e rode
`python3 tools/preparar_roteiro.py "projetos/<NNN. slug>/roteiro.txt"`: ele gera as duas versões abaixo (e as trocas para o alinhamento) e confere o tamanho. Revise o resultado:

Salve em `projetos/<NNN. slug>/audio/`:
- `roteiro-tags.txt`: o texto **para a voz**, com tags de emoção do ElevenLabs no começo de cada bloco (`[excited]`, `[curious]`, `[mysterious]`, `[serious]`, `[warmly]`) e **números escritos por extenso** ("cento e oitenta"; siglas que devem ser lidas como palavra em minúscula: "Anac").
- `roteiro-falado.txt`: o mesmo texto **sem tags**, numa linha só, como a legenda deve aparecer (números em algarismo: "180", "R$ 2 mil").

Mostre o roteiro à pessoa, com a lista de fontes, e **espere a aprovação** antes da narração. Veja o exemplo em `projetos/001. overbooking/audio/`.
