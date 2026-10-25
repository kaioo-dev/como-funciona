"""Prepara o roteiro aprovado para a narração (v1.2).
Uso: python3 tools/preparar_roteiro.py "projetos/<NNN. slug>/roteiro.txt"
Lê o roteiro (parágrafos separados por linha em branco, números em algarismo, como deve aparecer na legenda) e gera,
na pasta audio/ do projeto:
  roteiro-falado.txt  o texto da legenda, numa linha só (é o que o alinhar_roteiro.py usa)
  roteiro-tags.txt    o texto PARA A VOZ: tag de emoção no começo de cada bloco e números por extenso
  trocas.txt          as trocas "falado=>legenda" para passar ao alinhar_roteiro.py (cento e oitenta=>180)
E confere o tamanho: o canal mira 1.100–1.250 caracteres (≈ 65–80 s depois de acelerar 8%; o Reels tem no máx. 1:20).
"""
import re, sys, pathlib

UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

def ate_mil(n):
    if n < 20: return UN[n]
    if n < 100: return DEZ[n // 10] + ('' if n % 10 == 0 else ' e ' + UN[n % 10])
    if n == 100: return 'cem'
    return CEM[n // 100] + ('' if n % 100 == 0 else ' e ' + ate_mil(n % 100))

def extenso(n):
    if n < 1000: return ate_mil(n)
    for valor, sing, plur in ((10**9, 'um bilhão', 'bilhões'), (10**6, 'um milhão', 'milhões'), (1000, 'mil', 'mil')):
        if n >= valor:
            q, r = divmod(n, valor)
            cab = sing if q == 1 else f'{extenso(q)} {plur}'
            if r == 0: return cab
            liga = ' e ' if r < 100 or r % 100 == 0 else ' '
            return cab + liga + extenso(r)
    return str(n)

def falar(token):
    """'180' -> 'cento e oitenta'; '2,45' -> 'dois vírgula quarenta e cinco'; '30%' -> 'trinta por cento'; 'R$ 2 mil' tratado fora."""
    m = re.fullmatch(r'(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(%?)', token)
    if not m: return None
    inteiro = int(m.group(1).replace('.', ''))
    s = extenso(inteiro)
    if m.group(2): s += ' vírgula ' + extenso(int(m.group(2)))
    if m.group(3): s += ' por cento'
    return s

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    arq = pathlib.Path(sys.argv[1])
    texto = arq.read_text(encoding='utf-8').strip()
    brutos = [re.sub(r'\s+', ' ', b).strip() for b in re.split(r'\n\s*\n', texto) if b.strip()]
    # o roteiro pode já vir com tags de emoção ([excited]…): elas ficam na versão da voz e saem da legenda
    TAG = re.compile(r'\[[a-zA-Z ]+\]\s*')
    blocos = [TAG.sub('', b).strip() for b in brutos]
    falado = ' '.join(blocos)
    trocas = {}
    def troca_dinheiro(m):
        num, mil = m.group(1), m.group(2) or ''
        fala = (falar(num) or num) + (' mil' if mil else '') + ' reais'
        trocas[fala] = m.group(0)
        return fala
    tags = []
    for i, b in enumerate(blocos):
        v = re.sub(r'R\$\s?(\d+(?:,\d+)?)(\s?mil)?', troca_dinheiro, b)
        def num(m):
            f = falar(m.group(0))
            if not f: return m.group(0)
            trocas[f] = m.group(0)
            return f
        v = re.sub(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?%?|\d+(?:,\d+)?%?', num, v)
        # siglas lidas como palavra ficam em minúscula com inicial maiúscula (ANAC -> Anac); soletradas: deixe com pontos
        v = re.sub(r'\b([A-Z]{3,})\b', lambda m: m.group(1).capitalize(), v)
        if TAG.match(brutos[i]):
            v2 = re.sub(r'R\$\s?(\d+(?:,\d+)?)(\s?mil)?', troca_dinheiro, brutos[i])
            tags.append(re.sub(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?%?|\d+(?:,\d+)?%?', num, v2))
            continue
        if i == 0: tag = '[excited]'
        elif i == len(blocos) - 1: tag = '[warmly]'
        elif v.rstrip().endswith('?'): tag = '[curious]'
        elif re.search(r'\b(mas|só que|porém|na verdade)\b', v, re.I): tag = '[serious]'
        else: tag = '[curious]' if i % 2 else '[serious]'
        tags.append(f'{tag} {v}')
    pasta = arq.parent / 'audio' if arq.parent.name != 'audio' else arq.parent
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / 'roteiro-falado.txt').write_text(falado + '\n', encoding='utf-8')
    (pasta / 'roteiro-tags.txt').write_text('\n\n'.join(tags) + '\n', encoding='utf-8')
    (pasta / 'trocas.txt').write_text('\n'.join(f'{k}=>{v}' for k, v in trocas.items()) + '\n', encoding='utf-8')
    n = len(falado)
    seg = n / 15.5 / 1.08
    print(f'{n} caracteres · ≈ {seg:.0f} s de narração (já acelerada 8%) · {len(blocos)} blocos')
    if n < 1100: print('AVISO: curto (< 1.100). Falta fato de especialista: acrescente 1–2 detalhes surpreendentes.')
    if n > 1250: print('AVISO: longo (> 1.250). O Reels passa de 1:20; corte frases que não trazem fato novo.')
    longas = [f for f in re.split(r'(?<=[.!?])\s+', falado) if len(f.split()) > 22]
    for f in longas: print(f'AVISO: frase longa ({len(f.split())} palavras), divida em duas: "{f[:70]}…"')
    if re.search(r'neste vídeo|nesse vídeo|vamos ver', falado, re.I): print('AVISO: tire "neste vídeo / vamos ver" (o gancho é a afirmação, não a promessa).')
    print(f'gerados em {pasta}: roteiro-falado.txt, roteiro-tags.txt, trocas.txt')
    if trocas:
        print('trocas para o alinhar_roteiro.py: ' + ' '.join(f'"{k}=>{v}"' for k, v in trocas.items()))

if __name__ == '__main__':
    main()
