---
name: patrocinio
description: Configura o patrocinador do boletim e orienta a venda de espaços para comerciantes de Joinville. Use quando a pessoa falar em anunciante, patrocínio ou vender espaço.
---

# Patrocínio

Configurar: copie `patrocinio.exemplo.json` para `patrocinio.json` (nome, frase curta e, opcional, `imagem`: arquivo
do logo colocado em `projetos/<data>/`). O `nova_edicao.py` põe o bloco logo depois da abertura.
O logo do patrocinador só entra com autorização dele.

Espaços para vender (cada bloco combina com um tipo de negócio):
- Boletim inteiro ("oferecido por"): supermercado, farmácia, imobiliária.
- Tempo e maré: material de construção, seguradora.
- Farmácia de plantão: rede de farmácias.
- Combustível: posto, oficina.
- Empregos: escola técnica, cursinho, agência de RH.
- Agenda: bar, restaurante, casa de shows.
- Esporte: loja de esportes, academia.

Regras: o patrocinador fica no bloco dele, separado das informações. Notícia sobre ele = #publi.
