# Receitas de cena (copie e adapte)

Tudo vem de `import {...} from '../../base/kit'`. Cada cena é uma função `({t, ini, fim, k}) => <>…</>` com
`<CanvasCinema cam={cam} t={t}>` + o 2D por cima. `k` é o progresso da cena (0 → 1). Tempos SEMPRE de `T.xxx`.

## A câmera (toda cena)
```tsx
const cam = camera(k, t, {alvos: cantos(MICRO.pos, MICRO.args), de: [35, 18], empurra: 0.2, sentido: -1});
```
- `de: [azimute, elevação]` em graus: `[0, 10]` de frente; `[90, 10]` da direita; `[0, 80]` quase de cima;
  `[30, -4]` de baixo (contra-plongée, dá grandeza); `[180, 15]` de trás.
- `empurra` 0,16 (padrão) · 0,25 revelação · 0,06 esquema · negativo = afasta (fecho).
- Alterne `sentido: 1 / -1` entre cenas seguidas. `mao: 0` em cena de número; `1.4` em tensão.
- Close de um detalhe = alvos pequenos (`cantos(peça)`); geral = alvos do mundo inteiro. A distância vem sozinha.
- Pessoa: `pessoa(pos)` (corpo inteiro) ou `busto(pos)` (do peito para cima). Nunca deixe o boneco fora dos alvos se ele aparece.
- Por cima do ombro: `sobreOmbro(k, t, {boneco: {pos, rotY}, alvos: busto(outro)})`.
- Mover a câmera ENTRE dois enquadramentos na mesma cena: `misturar(camA, camB, rampa(t, T.a, T.b))`.

## O foco
- Padrão (sem passar `foco`): no centro dos alvos, com desfoque LEVE. Não aumente o desfoque: forte demais deixa a
  imagem "sufocada" (tudo borrado). O fundo só fica um pouco suave.
- `focar(cam, ponto, faixa, bokeh)`: faixa 1,2 close · 2,2 objeto · 3–4 esquema.
- Foco puxado (2–3 por vídeo, na palavra que muda o assunto):
  `foco={focoPuxado(cam, pontoA, pontoB, rampa(t, T.x - 0.3, T.x + 0.3), 1.6)}`

## Entradas (nada surge do nada)
```tsx
<Entra t={t} em={T.prato} modo="cai" altura={1}>      <Prato … />  </Entra>  // cai, quica e assenta
<Entra t={t} em={T.barra} modo="cresce">              <Caixa … />  </Entra>  // cresce do apoio
<Entra t={t} em={T.carro} modo="desliza" de="esquerda" distancia={4}> … </Entra>  // vem de fora
<Entra t={t} em={T.luz} modo="aparece" sai={T.fim}>   … </Entra>  // fade (efeitos)
```
Pilha que se forma: um `<Entra modo="cai">` por item, `em={T.x + i * 0.05}`, cada um com `y = topo anterior`.

## Corte (mostrar o de dentro)
Desenhe só a metade do objeto e marque a face serrada com hachura:
```tsx
<Caixa args={[L, A, D / 2]} position={[0, A / 2, -D / 4]} cor={CORES.medio} />      // metade de trás
<Hachura larg={L} alt={A} pos={[0, A / 2, 0.001]} />                                 // a face do corte
```
A hachura vai SÓ na face serrada (a espessura da parede, o miolo cortado), nunca cobrindo a parede inteira: senão vira textura pesada e o corte deixa de se ler.
Para um corte vertical alto que não cabe no 9:16, gire o grupo 90° (`rotation={[0, 0, Math.PI / 2]}`).
Mostrar uma peça escondida atrás de outra: `<Fantasma k={rampa(t, T.x, T.x + 0.5)}>parede</Fantasma>` (raio-X).

## Energia, sinal, onda, raio
```tsx
<Rastro caminho={[a, b, c]} k={rampa(t, T.liga, T.liga + 1)} cauda={1} r={0.02} />            // fio/cano acendendo
<Rastro caminho={pts} k={(t * 0.6) % 1} cauda={0.3} onda={{amp: 0.05, ondas: 8, vel: 9}} t={t} />  // onda correndo
<Rastro caminho={rebater(origem, dir, {min, max}, 7)} k={rampa(t, T.x, T.x + 1.5)} cauda={0.4} /> // raio batendo nas paredes
<Fio a={[0, 1, 0]} b={[1, 1, 0]} aceso={rampa(t, T.x, T.x + 0.3)} />                            // esquema elétrico
<Brilho pos={p} k={0.7 + 0.3 * Math.sin(t * 3)} />                                              // faísca/contato (lento!)
<Seta3D de={a} para={b} k={rampa(t, T.x, T.x + 0.4)} />                                         // força, direção, fluxo
<Onda pos={p} k={rampa(t, T.x, T.x + 1)} cor={tema.acento} raio={2} />                          // pulso no chão
```

## Número, gráfico, comparação (2D por cima)
```tsx
<Numero valor={conta(0, 2.45, rampa(t, T.x, T.x + 0.8), 2)} unidade="GHz" rotulo="A FREQUÊNCIA" k={rampa(t, T.x, T.x + 0.3)} />
<Placar a={{valor: '180', rotulo: 'ASSENTOS'}} b={{valor: '190', rotulo: 'PASSAGENS', destaque: true}} k={…} />
<Medidor rotulo="ESPAÇO NA BARRIGA" valor={rampa(t, T.a, T.b)} k={…} />
<Cartao titulo="SEUS DIREITOS" k={…} linhas={[{texto: 'Outro voo', k: …}, {texto: 'Reembolso', k: …, destaque: true}]} />
<Cota a={pj(A, cam)} b={pj(B, cam)} texto="3 cm" k={rampa(t, T.x, T.x + 0.5)} />
<Etiqueta x={560} y={600} alvo={pj(ponto, cam)} titulo="Sulco" sub="¼ DE ONDA" destaque aparece={rampa(t, T.x, T.x + 0.5)} />
```
Gráfico de barras 3D: uma `<Caixa>` por barra dentro de `<Entra modo="cresce" em={T.x + i * 0.1}>`.

## Pessoa fazendo algo
```tsx
<Boneco tema={tema} id="voce" pos={P} rotY={…} pose={{maoD: {alvo: puxador, k: rampa(t, T.abre - 0.4, T.abre)}}} />
```
A mão vai até o ponto do mundo sozinha (o braço calcula ombro e cotovelo). Se houver algo no caminho (quina da bancada,
porta), passe um ponto de desvio: `maoD: {alvo: puxador, via: [x, y + 0.25, z + 0.3], k}` (a mão passa pelo `via` antes).
Andar: `andar(t, {caminho, ini, fim, chao})`.
Segurar algo: o objeto como `children` do Boneco, na posição da mão.

## Modelar um objeto (o "herói" do vídeo)
- Em `src/videos/<slug>/pecas.tsx`, origem no chão/apoio, medidas reais em metros.
- Partes de verdade: um micro-ondas tem casca, porta com moldura e janela, puxador, painel com visor e botões, prato.
- `Caixa` com `raio` (cantos arredondados) em `CORES.medio/escuro`; 1 detalhe em acento (o que importa).
- Material pelo que é (`<Material tipo="metal|vidro|madeira|papel|borracha|ceramica">`), cor do tema.
- Interior iluminado: `pointLight` quente, intensidade ≤ 1,5 e **`distance` 0,3–0,5 m** (a luz não respeita parede: com
  alcance grande ela vaza e pinta um círculo na parede de trás). Fundo e prato em `CORES.medio/cinza`, nunca branco.
- **Casca de objeto (paredes encostadas):** encostar pode, mas duas faces no MESMO plano piscam (z-fighting). Faça cada
  parede 3 mm menor ou mais para dentro que a vizinha (ex.: laterais 3 mm mais baixas que o teto, fundo 3 mm mais estreito).
- **Algo que nasce de dentro de outra peça** (gota de solda, broto, bolha): deixe a peça montada o tempo todo, escondida
  dentro da outra, e mova/escale a partir daí; ou use `<Entra modo="aparece">`. Nunca `{cond ? <Peca/> : null}`.
- Junte as peças num `<group>` (ou `<Solido id="micro">`): peças do mesmo objeto podem se encostar.
- Uma constante `MICRO = {pos, args}` usada no modelo E nos alvos da câmera (os dois nunca discordam).
