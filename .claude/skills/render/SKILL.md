---
name: render
description: Renderiza o MP4 final e confere volume e piscadas. Use depois dos quadros de revisão aprovados.
---

# Render e checagem

```bash
GL=angle node scripts/render.mjs <Nome> "edicoes/<NNN. slug>/<slug>.mp4"
python3 tools/checar.py "edicoes/<NNN. slug>/<slug>.mp4"
```

- O render usa 1 aba (o padrão): com várias abas os quadros 3D saem fora de fase e a imagem treme.
- Com `GL=angle` (placa de vídeo) o render usa 1 navegador: um vídeo de 70 s sai em ~3–6 min num Mac com chip M e o computador continua usável. Sem placa de vídeo ele divide em partes sozinho (bem mais lento). Rode em segundo plano e avise a pessoa.
- Não rode a checagem e o render ao mesmo tempo: um comando pesado por vez.
- Se `src/estilo.ts` ainda tiver `SERIE = 'SUA SÉRIE'`, o render para e pede a skill `estilo` (o texto de fábrica nunca vai para um vídeo).
- `GL=angle` liga a placa de vídeo no navegador do render. No Windows PowerShell: `$env:ABAS=1; $env:GL="angle"; node scripts/render.mjs …`.
- Para testar só um trecho: acrescente `inicio-fim` em quadros (`… <slug>.mp4 900-1200`).

`checar.py` precisa dar tudo OK:
- **volume médio** entre -20 e -15 dB (se não, ajuste os volumes de `trilha` e `SONS`);
- **pico** abaixo de -1 dB;
- **0 piscadas** (se houver, vá ao quadro indicado e suavize a luz ou o corte);
- **0 quadros escuros** (câmera dentro de um objeto) e duração **até 1:20**.

Entregue o caminho do MP4 e ofereça a capa e a legenda do post.
