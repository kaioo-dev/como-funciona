// Vigia de memória (v1.2): render, checagem e folhas param SOZINHOS antes de travar o computador.
// Mede quanto a memória USADA DO COMPUTADOR cresceu desde que o comando começou (no Mac com chip M a memória da placa
// de vídeo é a mesma do sistema e não aparece nos processos: só a medida do sistema enxerga um vazamento de 3D) e quanta
// memória ainda está livre. Passou do limite: mostra o aviso, fecha o navegador e encerra (código 3).
// Limite de crescimento: MEMORIA_GB=6 (padrão: 6 GB ou 40% da memória do computador, o que for menor).
import os from 'node:os';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const GB = 1024 ** 3;
const descendentes = () => {
  if (process.platform === 'win32') return [];
  try {
    const linhas = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], {encoding: 'utf8'}).trim().split('\n');
    const filhos = new Map();
    const rss = new Map();
    for (const l of linhas) {
      const [pid, ppid, kb] = l.trim().split(/\s+/).map(Number);
      if (!filhos.has(ppid)) filhos.set(ppid, []);
      filhos.get(ppid).push(pid);
      rss.set(pid, kb * 1024);
    }
    const out = [];
    const fila = [process.pid];
    while (fila.length) {
      const p = fila.pop();
      for (const f of filhos.get(p) ?? []) {
        out.push({pid: f, rss: rss.get(f) ?? 0});
        fila.push(f);
      }
    }
    return out;
  } catch {
    return [];
  }
};
// fração da memória do computador ainda disponível (0..1)
const livre = () => {
  try {
    if (process.platform === 'darwin') return Number(execFileSync('sysctl', ['-n', 'kern.memorystatus_level'], {encoding: 'utf8'})) / 100;
    if (process.platform === 'linux') {
      const m = fs.readFileSync('/proc/meminfo', 'utf8');
      const v = (k) => Number((m.match(new RegExp(`${k}:\\s+(\\d+)`)) ?? [])[1] ?? 0);
      return v('MemAvailable') / Math.max(1, v('MemTotal'));
    }
  } catch {}
  return os.freemem() / os.totalmem();
};

// memória usada pelo sistema inteiro, em bytes (macOS: ativa + fixa + comprimida; Linux: total − disponível)
const usadaSistema = () => {
  try {
    if (process.platform === 'darwin') {
      const v = execFileSync('vm_stat', {encoding: 'utf8'});
      const pag = Number((v.match(/page size of (\d+)/) ?? [])[1] ?? 16384);
      const n = (k) => Number((v.match(new RegExp(`${k}:\\s+(\\d+)`)) ?? [])[1] ?? 0);
      return (n('Pages active') + n('Pages wired down') + n('Pages occupied by compressor')) * pag;
    }
    if (process.platform === 'linux') {
      const m = fs.readFileSync('/proc/meminfo', 'utf8');
      const v = (k) => Number((m.match(new RegExp(`${k}:\\s+(\\d+)`)) ?? [])[1] ?? 0) * 1024;
      return v('MemTotal') - v('MemAvailable');
    }
  } catch {}
  return os.totalmem() - os.freemem();
};

export const vigiarMemoria = (nome = 'render') => {
  const inicio = usadaSistema();
  const limite = Number(process.env.MEMORIA_GB ?? Math.min(6, (os.totalmem() / GB) * 0.4)) * GB;
  let pico = 0;
  const t = setInterval(() => {
    const ds = descendentes();
    const usado = Math.max(usadaSistema() - inicio, ds.reduce((s, d) => s + d.rss, 0) + process.memoryUsage().rss);
    pico = Math.max(pico, usado);
    const sobra = livre();
    if (usado > limite || sobra < 0.12) {
      console.error(`\nPAROU PARA PROTEGER O COMPUTADOR: o ${nome} fez a memória do computador crescer ${(usado / GB).toFixed(1)} GB (limite ${(limite / GB).toFixed(1)} GB; memória livre do computador: ${Math.round(sobra * 100)}%).`);
      console.error('Provável vazamento na cena (algo criado a cada quadro: geometria, textura ou material novo). Rode a checagem no trecho onde parou, ou feche outros programas e tente com MEMORIA_GB maior.');
      for (const d of ds) {
        try {
          process.kill(d.pid, 'SIGKILL');
        } catch {}
      }
      process.exit(3);
    }
  }, 1500);
  t.unref();
  return () => {
    clearInterval(t);
    return pico;
  };
};
