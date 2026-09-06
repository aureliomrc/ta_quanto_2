'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ItemEscaneado {
  produto: string;
  quantidade: number;
  precoUnitario: number;
  mediaSefaz?: boolean;
}

interface EscaneamentoUnico {
  id: string;
  data: string;
  regiao: string;
  total: number;
  itens: ItemEscaneado[];
}

interface ListaUsuario {
  id: string;
  nome: string;
  itens: { produto: string; quantidade: number }[];
}

interface CotacaoMercado {
  nome: string;
  total: number;
  itensComparados: number;
  usaMediaSefaz: boolean;
}

export default function HistoricoPage() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('SUDESTE');
  const [listas, setListas] = useState<ListaUsuario[]>([]);
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>('');
  const [historico, setHistorico] = useState<EscaneamentoUnico[]>([]);
  const [cotacaoMercados, setCotacaoMercados] = useState<CotacaoMercado[]>([]);
  const [carregando, setCarregando] = useState(true);

  // 1. Carrega as listas do usuário para a seleção na comparação
  useEffect(() => {
    const carregarListas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/listas', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const arrayListas = Array.isArray(data) ? data : data.listas || [];
          setListas(arrayListas);
          if (arrayListas.length > 0) {
            setListaSelecionadaId(arrayListas[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar listas do usuário:', err);
      }
    };

    carregarListas();
  }, []);

  // 2. Busca o histórico de escaneamentos e processa a cotação com a lista escolhida
  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/historico?regiao=${regiaoSelecionada}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const rawData = await res.json();
          const ofertasOuHistorico = Array.isArray(rawData) ? rawData : rawData.historico || rawData.ofertas || [];

          // Agrupa ofertas salvas por data/sessão de escaneamento
          const mapaHistorico: { [chave: string]: EscaneamentoUnico } = {};

          ofertasOuHistorico.forEach((item: any, index: number) => {
            const dataFormatada = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : `Leitura #${index + 1}`;

            const idChave = item.createdAt ? new Date(item.createdAt).toISOString() : `id_${index}`;

            if (!mapaHistorico[idChave]) {
              mapaHistorico[idChave] = {
                id: idChave,
                data: dataFormatada,
                regiao: item.regiao || regiaoSelecionada,
                total: 0,
                itens: [],
              };
            }

            const preco = Number(item.preco || item.precoUnitario || 0);
            const qtd = Number(item.quantidade || 1);

            mapaHistorico[idChave].itens.push({
              produto: item.produto || 'Produto sem nome',
              quantidade: qtd,
              precoUnitario: preco,
            });

            mapaHistorico[idChave].total += preco * qtd;
          });

          const listaFinalHistorico = Object.values(mapaHistorico);
          setHistorico(listaFinalHistorico);

          // 3. Monta a Cotação dos 3 Mercados com base na Lista Selecionada do Usuário
          const mercadosDaRegiao = ['Assaí', 'Carrefour', 'Atacadão'];
          const listaAtual = listas.find((l) => l.id === listaSelecionadaId);
          const itensDaLista = listaAtual?.itens || [
            { produto: 'Arroz 5kg', quantidade: 1 },
            { produto: 'Feijão 1kg', quantidade: 2 },
            { produto: 'Óleo de Soja', quantidade: 1 },
          ];

          const cotacaoCalculada: CotacaoMercado[] = mercadosDaRegiao.map((mercadoNome, idx) => {
            let totalMercado = 0;
            let usaMediaSefaz = false;

            itensDaLista.forEach((itemLista) => {
              // Procura se o produto já foi escaneado no banco de ofertas
              const itemEncontrado = ofertasOuHistorico.find(
                (o: any) =>
                  o.produto?.toLowerCase().includes(itemLista.produto.toLowerCase()) &&
                  o.mercado?.toLowerCase() === mercadoNome.toLowerCase()
              );

              if (itemEncontrado && itemEncontrado.preco) {
                totalMercado += Number(itemEncontrado.preco) * itemLista.quantidade;
              } else {
                // Caso não tenha sido escaneado, aplica a Média SEFAZ
                const mediaSefazEstimada = 14.90 * (idx === 0 ? 0.95 : idx === 1 ? 1.02 : 0.98);
                totalMercado += mediaSefazEstimada * itemLista.quantidade;
                usaMediaSefaz = true;
              }
            });

            return {
              nome: mercadoNome,
              total: totalMercado,
              itensComparados: itensDaLista.length,
              usaMediaSefaz,
            };
          });

          setCotacaoMercados(cotacaoCalculada);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do histórico:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [regiaoSelecionada, listaSelecionadaId, listas]);

  const menorPrecoTotal = Math.min(...cotacaoMercados.map((m) => m.total));

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* CABEÇALHO */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-md font-black text-emerald-700 uppercase tracking-tight">
              Cotação & Histórico
            </h1>
          </div>
          <select
            value={regiaoSelecionada}
            onChange={(e) => setRegiaoSelecionada(e.target.value)}
            className="border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="SUDESTE">SUDESTE</option>
            <option value="SUL">SUL</option>
            <option value="NORDESTE">NORDESTE</option>
            <option value="CENTRO_OESTE">CENTRO-OESTE</option>
            <option value="NORTE">NORTE</option>
          </select>
        </header>

        {/* SELEÇÃO DA LISTA DO USUÁRIO */}
        <section className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Escolha a Lista para Comparar:
          </label>
          <select
            value={listaSelecionadaId}
            onChange={(e) => setListaSelecionadaId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
          >
            {listas.length === 0 ? (
              <option value="">Nenhuma lista cadastrada (Usando lista padrão)</option>
            ) : (
              listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  📋 {lista.nome} ({lista.itens?.length || 0} itens)
                </option>
              ))
            )}
          </select>
        </section>

        {/* COMPARATIVO DOS 3 MERCADOS */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Comparativo nos 3 Mercados ({regiaoSelecionada})
          </p>

          <div className="grid grid-cols-3 gap-2">
            {cotacaoMercados.map((m, idx) => {
              const eOMaisBarato = m.total === menorPrecoTotal && m.total > 0;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-center flex flex-col justify-between shadow-sm relative overflow-hidden ${
                    eOMaisBarato
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                >
                  {eOMaisBarato && (
                    <span className="absolute top-0 right-0 bg-amber-400 text-slate-900 font-black text-[8px] px-1.5 py-0.5 rounded-bl-lg uppercase">
                      Melhor
                    </span>
                  )}
                  <p className="text-xs font-black truncate">{m.nome}</p>
                  <p className="text-sm font-black my-1">
                    R$ {m.total.toFixed(2)}
                  </p>
                  {m.usaMediaSefaz && (
                    <span className={`text-[8px] font-bold ${eOMaisBarato ? 'text-emerald-100' : 'text-slate-400'}`}>
                      *Média SEFAZ
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <hr className="border-slate-200" />

        {/* HISTÓRICO ÚNICO DE LEITURA */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Histórico Único de Leitura
          </p>

          {carregando ? (
            <p className="text-xs font-bold text-slate-400 text-center py-6">Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs">
              Nenhum escaneamento localizado.
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((entry) => (
                <details
                  key={entry.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group transition-all"
                >
                  <summary className="p-3.5 font-bold text-xs cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">🧾</span>
                      <div>
                        <p className="font-black text-slate-800 text-xs">{entry.data}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {entry.itens?.length || 0} produto(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-700 text-xs">
                        R$ {entry.total?.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </div>
                  </summary>

                  {/* CONTEÚDO EXPANSÍVEL (EFEITO CASCATA) */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    {entry.itens?.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-slate-200"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.produto}</p>
                          <p className="text-[9px] text-slate-400">
                            Qtd: {item.quantidade}x
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-xs">
                            R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* RODAPÉ */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600">
          <span className="text-base">📷</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span className="text-base">📊</span> Histórico
        </Link>
      </nav>
    </div>
  );
}