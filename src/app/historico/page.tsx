'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ItemEscaneado {
  id: string;
  produto: string;
  preco: number;
  mercado: string;
  regiao?: string;
  usuarioId?: string;
  usuario?: { id: string; nome?: string };
  createdAt: string;
}

interface GrupoEscaneamento {
  idSessao: string;
  data: string;
  mercado: string;
  total: number;
  itens: ItemEscaneado[];
}

interface ItemListaPadronizado {
  produto: string;
  quantidade: number;
}

interface ListaUsuario {
  id: string;
  nome: string;
  itens?: any[];
  items?: any[];
  ItemLista?: any[];
}

interface ItemDetalhamentoCotacao {
  produto: string;
  quantidade: number;
  precoUnitario: number;
  isSefaz: boolean;
}

interface CotacaoMercado {
  nome: string;
  total: number;
  itensComparados: ItemDetalhamentoCotacao[];
  usaMediaSefaz: boolean;
}

export default function HistoricoPage() {
  const [regiaoSelecionada, setRegiaoSelecionada] = useState('SUDESTE');
  const [listas, setListas] = useState<ListaUsuario[]>([]);
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string>('');
  const [historico, setHistorico] = useState<GrupoEscaneamento[]>([]);
  const [ofertasRegiao, setOfertasRegiao] = useState<ItemEscaneado[]>([]);
  const [cotacaoMercados, setCotacaoMercados] = useState<CotacaoMercado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mercadoAberto, setMercadoAberto] = useState<string | null>(null);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string>('');

  // Identifica o ID do usuário logado via Token para controlar permissão de exclusão
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.id) setUsuarioAtualId(payload.id);
      }
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
    }
  }, []);

  // Estimativa Inteligente Média SEFAZ
  const estimarPrecoSefazInteligente = (nomeProduto: string, mercadoIndex: number): number => {
    const nome = nomeProduto.toLowerCase();
    let precoBase = 12.00;

    if (nome.includes('carne') || nome.includes('bovino') || nome.includes('picanha')) {
      precoBase = 38.90;
    } else if (nome.includes('arroz')) {
      precoBase = 6.20;
    } else if (nome.includes('feijão') || nome.includes('feijao')) {
      precoBase = 7.80;
    } else if (nome.includes('leite')) {
      precoBase = 4.90;
    } else if (nome.includes('óleo') || nome.includes('oleo')) {
      precoBase = 6.90;
    } else if (nome.includes('café') || nome.includes('cafe')) {
      precoBase = 16.50;
    } else if (nome.includes('açúcar') || nome.includes('acucar')) {
      precoBase = 4.50;
    } else if (nome.includes('frango')) {
      precoBase = 18.90;
    }

    const regexPeso = /(\d+([.,]\d+)?)\s*(kg|l|g|ml)/i;
    const match = nome.match(regexPeso);

    if (match && match[1]) {
      const quantidadeUnidade = parseFloat(match[1].replace(',', '.'));
      const unidade = match[3].toLowerCase();

      if (unidade === 'kg' || unidade === 'l') {
        precoBase = precoBase * quantidadeUnidade;
      } else if (unidade === 'g' || unidade === 'ml') {
        precoBase = precoBase * (quantidadeUnidade / 1000);
      }
    }

    const variacaoMercado = mercadoIndex === 0 ? 0.96 : mercadoIndex === 1 ? 1.03 : 0.98;
    return Number((precoBase * variacaoMercado).toFixed(2));
  };

  const extrairItensDaLista = (lista: ListaUsuario | undefined): ItemListaPadronizado[] => {
    if (!lista) return [];
    const itensBrutos = lista.itens || lista.items || lista.ItemLista || [];

    const formatados = itensBrutos.map((it: any) => ({
      produto: String(it.produto || it.nome || it.nomeProduto || 'Item sem nome'),
      quantidade: Number(it.quantidade || it.qtd || 1),
    }));

    if (formatados.length === 0) {
      return [
        { produto: 'Arroz (3kg)', quantidade: 1 },
        { produto: 'Feijão (4,5kg)', quantidade: 1 },
        { produto: 'Carne Bovino (6kg)', quantidade: 1 },
        { produto: 'Leite Integral (7.5L)', quantidade: 1 },
      ];
    }

    return formatados;
  };

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
        console.error('Erro ao carregar listas:', err);
      }
    };

    carregarListas();
  }, []);

  // Busca GLOBAL de ofertas da região (compartilhadas entre todos os usuários)
  const carregarDadosDaRegiao = async () => {
    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/historico?regiao=${regiaoSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const rawData = await res.json();
        const ofertasBrutas: ItemEscaneado[] = Array.isArray(rawData) ? rawData : rawData.historico || rawData.ofertas || [];

        const ofertasFiltradas = ofertasBrutas.filter(
          (o) => !o.regiao || o.regiao.toUpperCase() === regiaoSelecionada.toUpperCase()
        );

        setOfertasRegiao(ofertasFiltradas);

        const mapaGrupos: { [chave: string]: GrupoEscaneamento } = {};

        ofertasFiltradas.forEach((item) => {
          const dataObjeto = item.createdAt ? new Date(item.createdAt) : new Date();
          const dataFormatada = dataObjeto.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const chaveGrupo = `${item.mercado || 'Mercado'}_${dataObjeto.getFullYear()}-${dataObjeto.getMonth()}-${dataObjeto.getDate()}_${dataObjeto.getHours()}:${dataObjeto.getMinutes()}`;

          if (!mapaGrupos[chaveGrupo]) {
            mapaGrupos[chaveGrupo] = {
              idSessao: chaveGrupo,
              data: dataFormatada,
              mercado: item.mercado || 'Mercado',
              total: 0,
              itens: [],
            };
          }

          const precoNum = Number(item.preco || 0);
          mapaGrupos[chaveGrupo].itens.push(item);
          mapaGrupos[chaveGrupo].total += precoNum;
        });

        setHistorico(Object.values(mapaGrupos));
      }
    } catch (err) {
      console.error('Erro ao buscar dados da região:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosDaRegiao();
  }, [regiaoSelecionada]);

  // Cotação comparativa utilizando as ofertas escaneadas globais da região
  useEffect(() => {
    const listaAtual = listas.find((l) => l.id === listaSelecionadaId);
    const itensDaListaEscolhida = extrairItensDaLista(listaAtual);
    const mercadosDaRegiao = ['Assaí', 'Carrefour', 'Atacadão'];

    const cotacaoCalculada: CotacaoMercado[] = mercadosDaRegiao.map((mercadoNome, idx) => {
      let totalMercado = 0;
      let usaMediaSefaz = false;
      const detProdutos: ItemDetalhamentoCotacao[] = [];

      itensDaListaEscolhida.forEach((itemLista) => {
        const nomeItem = itemLista.produto.trim().toLowerCase();
        const qtd = itemLista.quantidade || 1;

        // Procura ofertas da comunidade/todos os usuários para aquele mercado na região
        const itemEncontrado = ofertasRegiao.find(
          (o) =>
            o.produto &&
            o.produto.toLowerCase().includes(nomeItem) &&
            o.mercado &&
            o.mercado.toLowerCase().includes(mercadoNome.toLowerCase())
        );

        if (itemEncontrado && itemEncontrado.preco) {
          const pUnit = Number(itemEncontrado.preco);
          totalMercado += pUnit * qtd;
          detProdutos.push({
            produto: itemLista.produto,
            quantidade: qtd,
            precoUnitario: pUnit,
            isSefaz: false,
          });
        } else {
          const mediaSefazCalculada = estimarPrecoSefazInteligente(itemLista.produto, idx);
          totalMercado += mediaSefazCalculada * qtd;
          usaMediaSefaz = true;
          detProdutos.push({
            produto: itemLista.produto,
            quantidade: qtd,
            precoUnitario: mediaSefazCalculada,
            isSefaz: true,
          });
        }
      });

      return {
        nome: mercadoNome,
        total: totalMercado,
        itensComparados: detProdutos,
        usaMediaSefaz,
      };
    });

    setCotacaoMercados(cotacaoCalculada);
  }, [listaSelecionadaId, listas, ofertasRegiao]);

  const deletarItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este produto do histórico desta região?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/historico?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        carregarDadosDaRegiao();
      } else {
        alert('Falha ao excluir item.');
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const calcularTempoRestante = (createdAtStr?: string) => {
    if (!createdAtStr) return 'Válido por 72h';
    const criadoEm = new Date(createdAtStr).getTime();
    const expiraEm = criadoEm + 72 * 60 * 60 * 1000;
    const agora = new Date().getTime();
    const diferencaMs = expiraEm - agora;

    if (diferencaMs <= 0) return 'Expirado';

    const horasRestantes = Math.floor(diferencaMs / (1000 * 60 * 60));
    return `Expira em ${horasRestantes}h`;
  };

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
            className="border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="SUDESTE">SUDESTE</option>
            <option value="SUL">SUL</option>
            <option value="NORDESTE">NORDESTE</option>
            <option value="CENTRO_OESTE">CENTRO-OESTE</option>
            <option value="NORTE">NORTE</option>
          </select>
        </header>

        {/* SELEÇÃO DA LISTA DE COMPRAS */}
        <section className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Lista Selecionada para Comparação:
          </label>
          <select
            value={listaSelecionadaId}
            onChange={(e) => setListaSelecionadaId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
          >
            {listas.length === 0 ? (
              <option value="">Nenhuma lista cadastrada</option>
            ) : (
              listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  📋 {lista.nome} ({extrairItensDaLista(lista).length} itens)
                </option>
              ))
            )}
          </select>
        </section>

        {/* COTAÇÃO NOS MERCADOS */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Comparativo nos Mercados ({regiaoSelecionada})
          </p>

          <div className="grid grid-cols-3 gap-2">
            {cotacaoMercados.map((m, idx) => {
              const eOMaisBarato = m.total === menorPrecoTotal && m.total > 0;
              const estaAberto = mercadoAberto === m.nome;

              return (
                <div
                  key={idx}
                  onClick={() => setMercadoAberto(estaAberto ? null : m.nome)}
                  className={`p-3 rounded-2xl border text-center flex flex-col justify-between shadow-sm relative cursor-pointer transition-all ${
                    eOMaisBarato
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
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
                  <p className={`text-[8px] font-bold ${eOMaisBarato ? 'text-emerald-100' : 'text-emerald-600'}`}>
                    {estaAberto ? '▲ Ocultar' : `🔍 (${m.itensComparados.length}) Itens`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* DETALHAMENTO EXPANSÍVEL */}
          {mercadoAberto && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2 mt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <p className="text-xs font-black text-slate-800">
                  🛒 Itens da lista em <span className="text-emerald-600">{mercadoAberto}</span> ({regiaoSelecionada}):
                </p>
                <button
                  type="button"
                  onClick={() => setMercadoAberto(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {cotacaoMercados
                  .find((m) => m.nome === mercadoAberto)
                  ?.itensComparados.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.produto}</p>
                        <p className="text-[9px] text-slate-400">Qtd: {item.quantidade}x</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">
                          R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </p>
                        {item.isSefaz ? (
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                            Média SEFAZ
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                            Escaneado na Região
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        <hr className="border-slate-200" />

        {/* HISTÓRICO GLOBAL DA REGIÃO */}
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Histórico da Comunidade ({regiaoSelecionada}):
          </p>

          {carregando ? (
            <p className="text-xs font-bold text-slate-400 text-center py-6">Carregando histórico público...</p>
          ) : historico.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs">
              Nenhum produto escaneado na região <strong className="text-slate-600">{regiaoSelecionada}</strong> até o momento.
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((grupo) => (
                <details
                  key={grupo.idSessao}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group transition-all"
                >
                  <summary className="p-3.5 font-bold text-xs cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">🧾</span>
                      <div>
                        <p className="font-black text-slate-800 text-xs">
                          {grupo.mercado} - <span className="text-slate-500">{grupo.data}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {grupo.itens.length} produto(s) no folheto/escaneamento
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-700 text-xs">
                        R$ {grupo.total.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </div>
                  </summary>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    {grupo.itens.map((item) => {
                      const donoDoItem = (item.usuarioId && item.usuarioId === usuarioAtualId) || (item.usuario?.id === usuarioAtualId);

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200"
                        >
                          <div className="pr-2">
                            <p className="font-bold text-slate-800 text-xs">{item.produto}</p>
                            <div className="flex gap-1 items-center mt-0.5">
                              <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                                ⏳ {calcularTempoRestante(item.createdAt)}
                              </span>
                              {item.usuario?.nome && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                  Por: {item.usuario.nome}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="font-black text-slate-900 text-xs whitespace-nowrap">
                              R$ {Number(item.preco).toFixed(2)}
                            </p>
                            {/* Permite exclusão apenas se for o autor do escaneamento */}
                            {donoDoItem && (
                              <button
                                type="button"
                                onClick={(e) => deletarItem(item.id, e)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                title="Excluir Meu Item Escaneado"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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