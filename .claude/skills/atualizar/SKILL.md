---
name: atualizar
description: Instala uma atualização do kit sem perder os vídeos, projetos e o estilo da pessoa. Use quando a pessoa disser "instala a atualização", "baixei a atualização do kit", "está na pasta Downloads", ou trouxer um zip/pasta atualizacao-*.
---

# Atualizar o kit

1. **Ache a atualização.** Se a pasta `atualizacao-*` já está na raiz do kit, use a mais nova. Se não está:
   - procure em `~/Downloads` (Windows: `%USERPROFILE%\Downloads`) um `kit-como-funciona-atualizacao-*.zip` ou uma pasta
     `atualizacao-*` (a mais recente);
   - descompacte numa pasta temporária, confira que tem `atualizacao-X.Y/INSTALAR.md` e mova a pasta `atualizacao-X.Y`
     para a raiz do kit (ao lado do `CLAUDE.md`). Diga à pessoa em uma frase o que achou.
   - Não achou? Peça para ela arrastar o arquivo baixado para a conversa ou dizer onde salvou.
2. **Leia o `INSTALAR.md` dela inteiro** e siga os passos de lá; eles valem mais que este resumo.
3. Regras de sempre:
   - Faça backup antes (`_backup-<versão antiga>/`) e diga onde ficou.
   - Nunca toque em `projetos/`, `edicoes/`, `src/estilo.ts` nem nos vídeos da pessoa (`src/videos/<slug>/`, exceto os de exemplo que a atualização trouxer).
   - Arquivo que a pessoa (ou você) personalizou: não sobrescreva às cegas. Junte as duas versões e mostre o que fez.
   - No final: `npm install`, `npm run typecheck`, a checagem do exemplo e um resumo simples do que mudou (`ATUALIZACAO.md`).
