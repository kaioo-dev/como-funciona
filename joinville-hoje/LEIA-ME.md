# JOINVILLE HOJE — kit do boletim diário

Boletim em vídeo vertical (45–60 s) com o que muda no dia de quem mora em Joinville. Você abre esta pasta no
Claude Code e pede **"faz o boletim de hoje"**: ele coleta os dados, monta o texto, você aprova, grava a narração e
sai o MP4 pronto para postar.

## Primeira vez

1. Tenha instalados: Node 20+, Python 3.10+ e ffmpeg.
2. Na pasta do kit:
   ```bash
   npm install
   python3 -m pip install openpyxl faster-whisper "av<16"
   ```
3. Abra a pasta no Claude Code e diga: **"faz o boletim de hoje"**.

## O que é automático e o que precisa de você

| Parte | Quem faz |
|---|---|
| Tempo, maré (aproximada) e preço dos combustíveis | automático (`tools/coletar.py`) |
| Rascunho do texto | automático (`tools/nova_edicao.py`) |
| Alertas, falta de luz e água, farmácia de plantão, tema do dia | o Claude apura na web com fontes oficiais; sem confirmação, o bloco sai |
| Aprovar o texto | **você** |
| Narração | você gera no ElevenLabs (ou automático, se você configurar a chave como variável de ambiente) |
| Vídeo | automático, 2D: poucos minutos em qualquer computador |
| Postar | você (o Claude escreve a legenda) |

## Patrocínio

Copie `patrocinio.exemplo.json` para `patrocinio.json` e preencha. O patrocinador entra sozinho no começo de cada
boletim. A skill `patrocinio` lista os espaços que dá para vender.

## Exemplo

- `projetos/2026-10-26/` tem uma edição real (tempo, maré e combustível do dia 26/10/2026, com as fontes).
- `src/exemplo.json` (o que abre no `npm run studio`) tem um bloco **fictício** de alerta, só para mostrar os pins
  no mapa. Não publique esse bloco.

## Créditos dos dados

- Mapa: © colaboradores do OpenStreetMap (licença ODbL). O crédito aparece no canto do mapa.
- Tempo e maré: Open-Meteo (maré de modelo, aproximada; a referência oficial é a tábua da Marinha para o Porto de
  São Francisco do Sul).
- Combustíveis: ANP, Levantamento de Preços de Combustíveis.
