'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ItemHistorico {
  id: string;
  data: string;
  mercado: string;
  total: number;
  itens: {
    produto: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

interface ComparacaoMercado {
  nome: string;
  total: number;
  isMaisBarato?: boolean;
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [comparacaoMercados, setComparacaoMercados] = useState<ComparacaoMercado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/historico', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const listaHistorico: ItemHistorico[] = Array.isArray(data) ? data : data.historico || [];
          setHistorico(listaHistorico);

          // Agrupa e calcula totais por mercado
          const agregados: { [key: string]: number } = {};
          listaHistorico.forEach((item) => {
            const m = item.mercado || 'Outros';
            agregados[m] = (agregados[m] || 0) + (item.total || 0);
          });

          // Tipagem explícita adicionada aqui para evitar erro no TypeScript
          const listaComparacao: ComparacaoMercado[] = Object.keys(agregados).map((m) => ({
            nome: m,
            total: agregados[m],
            isMaisBarato: false,
          }));

          // Define o menor valor como destaque
          if (listaComparacao.length > 0) {
            const menorValor = Math.min(...listaComparacao.map((c) => c.total));
            listaComparacao.forEach((c) => {
              if (c.total === menorValor) c.isMaisBarato = true;
            });
          }

          setComparacaoMercados(listaComparacao);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do histórico:', err);
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-5">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📜</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            Comparação e Histórico
          </h1>
        </header>

        {/* BLOCO SUPERIOR: COMPARAÇÃO DOS MERCADOS */}
        <section className="space-y-2">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            📊 Comparativo Geral de Mercados
          </h2>

          {carregando ? (
            <p className="text-xs text-slate-400 font-bold text-center py-4">Carregando comparativo...</p>
          ) : comparacaoMercados.length === 0 ? (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Sem dados suficientes para comparação.
            </div>
          ) : (
            <div className="space-y-2">
              {comparacaoMercados.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex justify-between items-center shadow-sm ${
                    item.isMaisBarato
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">{item.nome}</span>
                    {item.isMaisBarato && (
                      <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                        Mais Barato
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-black text-sm ${
                      item.isMaisBarato ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    R$ {item.total?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-slate-200 my-4" />

        {/* BLOCO INFERIOR: HISTÓRICO DE ESCANEAMENTOS */}
        <section className="space-y-2">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            🕒 Histórico de Escaneamentos
          </h2>

          {carregando ? (
            <p className="text-xs text-slate-400 font-bold text-center py-4">Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
              Nenhum escaneamento registrado até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((entry) => (
                <details
                  key={entry.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group"
                >
                  <summary className="p-4 font-bold text-xs text-slate-800 cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                    <div>
                      <p className="font-black text-sm text-slate-900">{entry.mercado}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{entry.data}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-700 text-sm">
                        R$ {entry.total?.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </div>
                  </summary>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                      Itens Processados
                    </p>
                    {entry.itens?.map((item, iIdx) => (
                      <div key={iIdx} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 font-medium">
                          {item.quantidade}x {item.produto}
                        </span>
                        <span className="font-bold text-slate-900">
                          R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MENU DE NAVEGAÇÃO FIXO NO RODAPÉ */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link
          href="/listas"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📋</span> Listas
        </Link>
        <Link
          href="/comparar"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📷</span> Cotação
        </Link>
        <Link
          href="/historico"
          className="flex flex-col items-center text-emerald-600 text-xs font-bold"
        >
          <span className="text-base">📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}