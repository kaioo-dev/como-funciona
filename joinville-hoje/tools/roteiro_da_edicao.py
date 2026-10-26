"""Gera o texto da narração a partir das falas da edição.
Uso: python3 tools/roteiro_da_edicao.py "projetos/<AAAA-MM-DD>/edicao.json"

Grava em projetos/<AAAA-MM-DD>/audio/:
  roteiro-falado.txt  as falas numa linha só, como a legenda mostra (números em algarismo: R$ 6,02, 13h43, 23)
  roteiro-tags.txt    o texto PARA A VOZ (ElevenLabs): números, horas e preços por extenso, uma tag de tom por bloco
  trocas.txt          trocas "falado=>legenda" para o alinhar_roteiro.py
"""
import json, pathlib, re, sys

UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']


def ate_mil(n):
    if n < 20:
        return UN[n]
    if n < 100:
        return DEZ[n // 10] + ('' if n % 10 == 0 else ' e ' + UN[n % 10])
    if n == 100:
        return 'cem'
    return CEM[n // 100] + ('' if n % 100 == 0 else ' e ' + ate_mil(n % 100))


def extenso(n, feminino=False):
    if n < 1000:
        s = ate_mil(n)
    else:
        q, r = divmod(n, 1000)
        cab = 'mil' if q == 1 else f'{ate_mil(q)} mil'
        s = cab if r == 0 else cab + (' e ' if r < 100 or r % 100 == 0 else ' ') + ate_mil(r)
    if feminino:
        s = re.sub(r'\bum$', 'uma', s)
        s = re.sub(r'\bdois$', 'duas', s)
    return s


def para_voz(texto, trocas):
    def dinheiro(m):
        r, c = int(m.group(1).replace('.', '')), int(m.group(2) or 0)
        fala = f'{extenso(r)} {"real" if r == 1 else "reais"}' + (f' e {extenso(c)} centavos' if c else '')
        trocas[fala] = m.group(0)
        return fala

    def horas(m):
        h, mi = int(m.group(1)), int(m.group(2))
        fala = extenso(h, feminino=True) + ('' if mi == 0 else f' e {extenso(mi)}')
        trocas[fala] = m.group(0)
        return fala

    def numero(m):
        tok = m.group(0)
        inteiro, _, dec = tok.rstrip('%').partition(',')
        fala = extenso(int(inteiro.replace('.', '')))
        if dec:
            fala += ' vírgula ' + extenso(int(dec))
        if tok.endswith('%'):
            fala += ' por cento'
        trocas[fala] = tok
        return fala

    v = re.sub(r'R\$\s?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?', dinheiro, texto)
    v = re.sub(r'\b(\d{1,2})h(\d{2})\b', horas, v)
    v = re.sub(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?%?|\d+(?:,\d+)?%?', numero, v)
    v = re.sub(r'\bUV\b', 'U V', v)  # a sigla é lida letra por letra
    if 'km/h' in v:
        v = v.replace('km/h', 'quilômetros por hora')
        trocas['quilômetros por hora'] = 'km/h'
    return v


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    arq = pathlib.Path(sys.argv[1])
    edicao = json.loads(arq.read_text(encoding='utf-8'))
    falas = [b['fala'].strip() for b in edicao['blocos']]
    if any('PREENCHER' in f for f in falas):
        print('PARE: ainda há falas com PREENCHER no edicao.json (complete pela apuração ou apague o bloco).')
        sys.exit(1)
    trocas = {}
    tom = {'abertura': '[excited]', 'resumo': '[warmly]', 'hora': '[warmly]', 'sol': '[serious]', 'postos': '[serious]', 'curiosidade': '[curious]', 'amanha': '[calm]', 'tempo': '[warmly]', 'mare': '[calm]', 'combustivel': '[serious]', 'lista': '[serious]', 'tema': '[curious]', 'patrocinio': '[warmly]', 'encerramento': '[warmly]'}
    tags = [f'{tom.get(b["tipo"], "[calm]")} {para_voz(b["fala"].strip(), trocas)}' for b in edicao['blocos']]
    pasta = arq.parent / 'audio'
    pasta.mkdir(exist_ok=True)
    falado = ' '.join(falas)
    (pasta / 'roteiro-falado.txt').write_text(falado + '\n', encoding='utf-8')
    (pasta / 'roteiro-tags.txt').write_text('\n\n'.join(tags) + '\n', encoding='utf-8')
    (pasta / 'trocas.txt').write_text('\n'.join(f'{k}=>{v}' for k, v in trocas.items()) + '\n', encoding='utf-8')
    seg = len(falado) / 15.5 / 1.08
    print(f'{len(falado)} caracteres · ≈ {seg:.0f} s de narração · {len(falas)} blocos')
    if seg > 75:
        print('AVISO: passa de ~75 s. Corte um bloco (o boletim bom tem 45–60 s).')
    print(f'gerados em {pasta}: roteiro-falado.txt, roteiro-tags.txt, trocas.txt')


if __name__ == '__main__':
    main()
