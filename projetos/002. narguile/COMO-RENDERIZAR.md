# Como gerar o vídeo do narguilé no seu computador

O servidor na nuvem não tem placa de vídeo, então o render final é feito no seu computador.
Num computador comum, leva cerca de **3 a 10 minutos**.

## Antes de começar

Você precisa ter instalado:

- **Node** (versão 20 ou mais nova)
- **ffmpeg**
- **Python 3**

Para conferir, abra o Terminal (Mac) ou o PowerShell (Windows) e rode:

```bash
node -v
ffmpeg -version
python3 --version
```

No Windows, use `python --version`.

Se algum faltar:

| Programa | Mac | Windows |
|---|---|---|
| Node | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| ffmpeg | `brew install ffmpeg` | `winget install Gyan.FFmpeg` |
| Python | `brew install python` | `winget install Python.Python.3.12` |

> No Mac, o comando `brew` vem do Homebrew (https://brew.sh), o "instalador de programas" do Mac.

## Passo 1: baixar o projeto

**Opção A (com Git):** entre na pasta onde quer guardar o projeto e cole:

```bash
git clone -b "claude/narguilé-explicação-vídeo-mzm5ib" https://github.com/kaioo-dev/como-funciona.git
cd como-funciona
npm install
```

**Opção B (sem Git):**

1. Abra https://github.com/kaioo-dev/como-funciona
2. No seletor de ramos (botão que mostra `main`), escolha `claude/narguilé-explicação-vídeo-mzm5ib`.
3. Clique em **Code → Download ZIP** e descompacte.
4. No Terminal, entre na pasta descompactada e rode:

```bash
npm install
```

## Passo 2: gerar o vídeo

**Mac:**

```bash
GL=angle node scripts/render.mjs Narguile "edicoes/002. narguile/narguile.mp4"
```

**Windows (PowerShell):**

```powershell
$env:GL="angle"; node scripts/render.mjs Narguile "edicoes/002. narguile/narguile.mp4"
```

Quando aparecer `pronto:`, o vídeo está em:

```
edicoes/002. narguile/narguile.mp4
```

> Deu erro "Timeout … delayRender" na primeira vez? Rode o mesmo comando de novo
> (é só a fonte e o áudio carregando).

## Passo 3: conferir o vídeo

```bash
python3 tools/checar.py "edicoes/002. narguile/narguile.mp4"
```

No Windows, troque `python3` por `python`.

O resultado precisa mostrar:

- volume médio entre **-20 e -15 dB**
- pico abaixo de **-1 dB**
- **0 piscadas**
- **0 quadros escuros**
- duração de **até 1:20**

## Atalho: com o Claude Code no seu computador

Se você usa o Claude Code no computador, é só abrir a pasta do projeto e pedir:

> renderiza o vídeo do narguilé

Ele roda os passos 2 e 3 sozinho.

## Depois

Mande o resultado do `checar.py`, ou o próprio vídeo, na conversa com o Claude.
Os próximos passos são a **capa** e a **legenda do post**.
