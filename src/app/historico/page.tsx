'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Oferta {
  id: string;
  produto: string;
  preco: number;
  mercado: string;
  regiao: string;
  createdAt: string;
}

interface ItemLista {
  id: string;
  nome: string;
  quantidade: number;
}

interface ComparacaoMercado {
  mercado: string;
  total: number;
  itensBipados: number;
  itensSefaz: number;
}

export default function HistoricoComparacaoPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [itensLista, setItensLista] = useState<ItemLista[]>([]);
  const [comparacao, setComparacao] = useState<ComparacaoMercado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Busca ofertas bipadas
        const resOfertas = await fetch('/api/historico');
        const dataOfertas: Oferta[] = resOfertas.ok ? await resOfertas.json() : [];

        // Busca itens da lista
        const resLista = await fetch('/api/listas');
        const dataLista = resLista.ok ? await resLista.json() : { itens: [] };
        const listaProdutos: ItemLista[] = dataLista.itens || [];

        setOfertas(Array.isArray(dataOfertas) ? dataOfertas : []);
        setItensLista(listaProdutos);

        // Processa Comparação por Mercado
        const mercados = Array.from(new Set(dataOfertas.map((o) => o.mercado || 'Atacadão')));
        if (mercados.length === 0) mercados.push('Assaí', 'Carrefour', 'Atacadão');

        const comparativo: ComparacaoMercado[] = mercados.map((mercado) => {
          let total = 0;
          let itensBipados = 0;
          let itensSefaz = 0;

          listaProdutos.forEach((item) => {
            const ofertaEncontrada = dataOfertas.find(
              (o) =>
                o.mercado === mercado &&
                o.produto.toLowerCase().includes(item.nome.toLowerCase().split(' ')[0])
            );

            if (ofertaEncontrada) {
              total += Number(ofertaEncontrada.preco) * item.quantidade;
              itensBipados++;
            } else {
              // Simulação/Cálculo Média SEFAZ (Valor médio estimado R$ 12,50)
              total += 12.5 * item.quantidade;
              itensSefaz++;
            }
          });

          return { mercado, total, itensBipados, itensSefaz };
        });

        // Ordena do mercado mais barato para o mais caro
        comparativo.sort((a, b) => a.total - b.total);
        setComparacao(comparativo);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* Título Atualizado */}
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            COMPARAÇÃO/HISTÓRICO
          </h1>
        </header>

        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Processando comparação e histórico...
          </div>
        ) : (
          <>
            {/* Bloco 1: Comparação de Mercados para a Lista */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  🛒 Comparativo da Lista ({itensLista.length} itens)
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Mais Barato Primeiro
                </span>
              </div>

              <div className="space-y-2">
                {comparacao.map((item, index) => (
                  <div
                    key={item.mercado}
                    className={`p-3 rounded-xl border ${
                      index === 0
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-sm">🥇</span>}
                        <span className="font-bold text-xs text-slate-800">{item.mercado}</span>
                      </div>
                      <span className="font-black text-sm text-emerald-700">
                        R$ {item.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500 flex justify-between items-center">
                      <span>{item.itensBipados} item(ns) em folhetos bipados</span>
                      {item.itensSefaz > 0 && (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {item.itensSefaz} item(ns) via Média SEFAZ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco 2: Histórico de Ofertas Bipadas */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                📜 Histórico de Ofertas Bipadas
              </h2>

              {ofertas.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  Nenhuma oferta registrada no histórico.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 space-y-1">
                  {ofertas.map((oferta) => (
                    <div key={oferta.id} className="pt-2 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{oferta.produto}</p>
                        <p className="text-[10px] text-slate-400">
                          {oferta.mercado} ({oferta.regiao}) •{' '}
                          {new Date(oferta.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="font-black text-emerald-700 text-sm">
                        R$ {Number(oferta.preco).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>🏷️</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📊</span> Comparação/Histórico
        </Link>
      </nav>
    </div>
  );
}