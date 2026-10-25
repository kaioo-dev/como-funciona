# Kit Como Funciona · versão 1.2

## O que mudou

**Vídeo dinâmico de primeira**
- Ritmo de vídeo que viraliza já embutido: cerca de 1 cena a cada 3 segundos, com câmera diferente a cada corte e um detalhe explicado em cada cena.
- Skill nova `diretor`: o método completo (critérios, receitas de cena e régua de qualidade) para o Claude acertar na primeira tentativa.
- Modelo de vídeo pronto (`src/videos/_modelo/`): todo vídeo novo começa dele.
- Exemplo refeito do zero: o Overbooking agora tem 20 cenas e é a nova referência.

**Câmera de cinema que enquadra sozinha**
- O Claude diz o que precisa aparecer e de onde olhar, e a câmera calcula o resto: nada de boneco cortado, cabeça atrás da legenda ou câmera dentro de objeto.
- Plano por cima do ombro, push-in, arco, foco puxado e desfoque de cinema em toda cena.

**Nada surge do nada**
- As coisas entram caindo com gravidade, crescendo de onde estão apoiadas, deslizando de fora do quadro ou aparecendo em fade, sempre na palavra certa.
- Efeito raio-X (fantasma) para mostrar o que tem dentro, sem piscar.

**Peças novas para explicar**
- Ondas e energia correndo por um caminho, raio que rebate nas paredes, setas 3D, corte com hachura, fio que acende, brilho de faísca, cota de medida.
- Boneco novo, manequim de artista mais bonito, que alcança as coisas com a mão sozinho (maçaneta, botão, objeto).
- Partículas do tamanho certo (nada de "bolas cinza" na frente da câmera) e branco que não estoura.
- Toda a interface pronta: legenda, pílula, chips, carimbo, número que conta, placar, cartão, medidor, etiqueta.

**Checagem que enxerga de verdade**
- Antes de te mostrar qualquer quadro, o Claude roda uma checagem que aponta, com o segundo exato: peça atravessando outra (inclusive braço), coisa aparecendo do nada, boneco cortado, câmera dentro de objeto, assunto tapado, superfícies que piscam, quadro escuro e ritmo lento.
- Folha de revisão automática com um quadro por cena.

**Ferramentas**
- `preparar_roteiro.py`: prepara o texto para a voz (tags de emoção, números por extenso) e confere o tamanho ideal.
- Trilha com ritmo, acordes e clima à sua escolha.
- O topo do vídeo nunca mais mostra "SUA SÉRIE": o Claude pede para você escolher o nome (ou deixa só o assunto).
- Skill `variacoes`: ideias de estilos, tipos de vídeo, personagens e cenários para você criar o que é seu.

## O que NÃO mudou
- Seus vídeos, projetos, estilo e cores continuam iguais.
- As etapas para fazer um vídeo são as mesmas (roteiro, narração, cenas, revisão, render).
- Vídeos antigos continuam funcionando; os novos já saem no padrão 1.2.
