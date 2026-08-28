'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  ShoppingCart, 
  TrendingDown, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';

interface ItemEscaneado {
  id: string;
  nome: string;
  quantidade: number;
  categoria: string;
  precoCapturado?: number;
}

interface ItemComPrecos extends ItemEscaneado {
  precosMercados: { [key: string]: number };
  usouSefaz: { [key: string]: boolean };
  precoMedioSefaz: number;
}

interface RankingMercado {
  posicao: number;
  nome: string;
  totalLista: number;
  qtdFolheto: number;
  qtdSefaz: number;
  diferencaParaMelhor: number;
  percentualEconomia: number;
}

interface HistoricoEscaneamento {
  id: string;
  data: string;
  nomeLista: string;
  mercadoCapturado?: string;
  totalItens: number;
  itens: ItemEscaneado[];
}

const PRECOS_MOCK: { [produtoNome: string]: { [mercado: string]: number } } = {
  'Arroz Agulhinha 5kg': { 'Atacadão': 22.50, 'Carrefour': 25.90 },
  'Feijão Carioca 1kg': { 'Atacadão': 6.90, 'Carrefour': 8.50 },
  'Leite Integral 1L': { 'Carrefour': 4.59 },
};

const MEDIAS_SEFAZ: { [produtoNome: string]: number } = {
  'Arroz Agulhinha 5kg': 23.80,
  'Feijão Carioca 1kg': 7.40,
  'Leite Integral 1L': 4.60,
};

const MERCADOS_DISPONIVEIS = ['Assaí', 'Atacadão', 'Carrefour', 'Pão de Açúcar'];

export default function HistoricoComparativoPage() {
  const [historico, setHistorico] = useState<HistoricoEscaneamento[]>([]);
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregarHistoricoDoBanco = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch('/api/historico', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const dados: HistoricoEscaneamento[] = await res.json();
        setHistorico(dados);
        if (dados.length > 0) {
          setListaSelecionadaId(dados[0].id);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistoricoDoBanco();
  }, []);

  const listaAtual = useMemo(() => {
    return historico.find((h) => h.id === listaSelecionadaId) || historico[0];
  }, [historico, listaSelecionadaId]);

  const { itensProcessados, rankingMercados } = useMemo(() => {
    if (!listaAtual || !listaAtual.itens) {
      return { itensProcessados: [], rankingMercados: [] };
    }

    const processados: ItemComPrecos[] = listaAtual.itens.map((item) => {
      const precosMercados: { [key: string]: number } = {};
      const usouSefaz: { [key: string]: boolean } = {};
      const precoMedioSefaz = MEDIAS_SEFAZ[item.nome] || item.precoCapturado || 10.0;

      MERCADOS_DISPONIVEIS.forEach((mercado) => {
        if (listaAtual.mercadoCapturado?.toLowerCase() === mercado.toLowerCase() && (item.precoCapturado ?? 0) > 0) {
          precosMercados[mercado] = item.precoCapturado!;
          usouSefaz[mercado] = false;
        } else if (PRECOS_MOCK[item.nome]?.[mercado] !== undefined) {
          precosMercados[mercado] = PRECOS_MOCK[item.nome][mercado];
          usouSefaz[mercado] = false;
        } else {
          precosMercados[mercado] = precoMedioSefaz;
          usouSefaz[mercado] = true;
        }
      });

      return {
        ...item,
        precosMercados,
        usouSefaz,
        precoMedioSefaz,
      };
    });

    const totaisMercados = MERCADOS_DISPONIVEIS.map((mercado) => {
      let totalLista = 0;
      let qtdFolheto = 0;
      let qtdSefaz = 0;

      processados.forEach((item) => {
        const precoUnitario = item.precosMercados[mercado];
        totalLista += precoUnitario * item.quantidade;

        if (item.usouSefaz[mercado]) {
          qtdSefaz++;
        } else {
          qtdFolheto++;
        }
      });

      return { nome: mercado, totalLista, qtdFolheto, qtdSefaz };
    });

    totaisMercados.sort((a, b) => a.totalLista - b.totalLista);

    const menorValor = totaisMercados[0]?.totalLista || 0;
    const maiorValor = totaisMercados[totaisMercados.length - 1]?.totalLista || 0;

    const ranking: RankingMercado[] = totaisMercados.map((m, index) => {
      const diferencaParaMelhor = m.totalLista - menorValor;
      const percentualEconomia = maiorValor > 0 ? ((maiorValor - m.totalLista) / maiorValor) * 100 : 0;

      return {
        posicao: index + 1,
        nome: m.nome,
        totalLista: m.totalLista,
        qtdFolheto: m.qtdFolheto,
        qtdSefaz: m.qtdSefaz,
        diferencaParaMelhor,
        percentualEconomia,
      };
    });

    return { itensProcessados: processados, rankingMercados: ranking };
  }, [listaAtual]);

  const mercadoCampeao = rankingMercados[0] || { nome: '-', totalLista: 0, qtdFolheto: 0 };
  const mercadoMaisCaro = rankingMercados[rankingMercados.length - 1] || { totalLista: 0 };
  const economiaMaxima = mercadoMaisCaro.totalLista - mercadoCampeao.totalLista;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-indigo-600" />
              Histórico & Comparativo de Ofertas
            </h1>
            <p className="text-slate-500 mt-1">
              Preços sincronizados diretamente do seu banco Neon.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={carregarHistoricoDoBanco}
              title="Atualizar histórico"
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
            </button>

            {historico.length > 0 && (
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <Calendar className="w-5 h-5 text-indigo-500 ml-2" />
                <select
                  value={listaSelecionadaId}
                  onChange={(e) => setListaSelecionadaId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer pr-4"
                >
                  {historico.map((hist) => (
                    <option key={hist.id} value={hist.id}>
                      {hist.nomeLista} ({hist.data})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 font-bold text-slate-500">
            Carregando histórico do Neon...
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 font-bold text-slate-500 space-y-2">
            <p>Nenhum histórico encontrado para esta conta.</p>
            <p className="text-xs text-slate-400">Escaneie um folheto para visualizar a comparação.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                <Trophy className="w-64 h-64" />
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-2">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4" />
                    Melhor Opção Encontrada
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold">
                    {mercadoCampeao.nome} é o lugar mais barato!
                  </h2>
                  <p className="text-emerald-100 text-sm md:text-base max-w-xl">
                    Economia estimada de até{' '}
                    <strong className="text-white underline decoration-emerald-300">
                      R$ {economiaMaxima.toFixed(2)}
                    </strong>{' '}
                    em comparação aos concorrentes.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-emerald-200">Total Calculado</span>
                  <div className="text-3xl font-black text-white">
                    R$ {mercadoCampeao.totalLista.toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-200 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    {mercadoCampeao.qtdFolheto} item(ns) capturados
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking por Mercado
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {rankingMercados.map((m) => {
                  const isPrimeiro = m.posicao === 1;
                  return (
                    <div
                      key={m.nome}
                      className={`bg-white rounded-xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                        isPrimeiro
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                          : 'border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <span className="font-bold text-slate-800">{m.nome}</span>
                        <span className="text-xs text-slate-400 font-bold">#{m.posicao}</span>
                      </div>

                      <div className="space-y-1 mb-4">
                        <div className="text-xs text-slate-400 font-medium">Total Lista</div>
                        <div className="text-2xl font-black text-slate-900">
                          R$ {m.totalLista.toFixed(2)}
                        </div>
                        {m.diferencaParaMelhor > 0 ? (
                          <div className="text-xs text-rose-500 font-semibold">
                            + R$ {m.diferencaParaMelhor.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> Menor preço
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-indigo-600 font-medium">Preços de Oferta:</span>
                          <strong>{m.qtdFolheto}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-amber-600 font-medium">Média SEFAZ:</span>
                          <strong>{m.qtdSefaz}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Comparativo Detalhado de Itens
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4 text-center">Qtd</th>
                      <th className="py-3 px-4 text-center">Média SEFAZ</th>
                      {MERCADOS_DISPONIVEIS.map((mercado) => (
                        <th key={mercado} className="py-3 px-4 text-right">
                          {mercado}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {itensProcessados.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{item.nome}</td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                          {item.quantidade}x
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-500 text-xs font-mono">
                          R$ {item.precoMedioSefaz.toFixed(2)}
                        </td>

                        {MERCADOS_DISPONIVEIS.map((mercado) => {
                          const precoUnitario = item.precosMercados[mercado];
                          const foiSefaz = item.usouSefaz[mercado];
                          const totalItem = precoUnitario * item.quantidade;

                          return (
                            <td key={mercado} className="py-3.5 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold font-mono text-slate-800">
                                  R$ {totalItem.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({item.quantidade}x R$ {precoUnitario.toFixed(2)})
                                </span>

                                {foiSefaz ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-1">
                                    <Info className="w-2.5 h-2.5" /> SEFAZ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded mt-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Folheto
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}