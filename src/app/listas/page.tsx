'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  nome?: string;
  produto?: string;
  quantidade: number;
}

interface ListaData {
  id: string;
  nome: string;
  usuarioId: string | null;
  itens: Item[];
}

export default function ListasPage() {
  const [listas, setListas] = useState<ListaData[]>([]);
  const [listaAtivaId, setListaAtivaId] = useState<string>('');
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novaListaNome, setNovaListaNome] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [criandoLista, setCriandoLista] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState('');

  const [checados, setChecados] = useState<Record<string, boolean>>({});

  const carregarListas = async (selecionarId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      if (res.ok) {
        const data: ListaData[] = await res.json();
        setListas(data);

        if (selecionarId) {
          setListaAtivaId(selecionarId);
        } else if (data.length > 0 && (!listaAtivaId || !data.some((l) => l.id === listaAtivaId))) {
          setListaAtivaId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar listas:', err);
      setMensagemStatus('❌ Erro ao carregar as listas.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  useEffect(() => {
    if (listaAtivaId) {
      const checadosSalvos = localStorage.getItem(`checados_${listaAtivaId}`);
      if (checadosSalvos) {
        try {
          setChecados(JSON.parse(checadosSalvos));
        } catch {
          setChecados({});
        }
      } else {
        setChecados({});
      }
    }
  }, [listaAtivaId]);

  const toggleCheck = (itemId: string, nomeItem: string) => {
    setChecados((prev) => {
      const novoEstado = { ...prev, [itemId]: !prev[itemId] };
      if (listaAtivaId) {
        localStorage.setItem(`checados_${listaAtivaId}`, JSON.stringify(novoEstado));
      }
      setMensagemStatus(
        novoEstado[itemId]
          ? `Item "${nomeItem}" marcado como comprado.`
          : `Item "${nomeItem}" desmarcado.`
      );
      return novoEstado;
    });
  };

  const listaAtual = listas.find((l) => l.id === listaAtivaId) || listas[0];

  const handleCriarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    const nomeEmMaiusculo = novaListaNome.trim().toUpperCase();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ nome: nomeEmMaiusculo }),
      });

      if (res.ok) {
        const nova = await res.json();
        setNovaListaNome('');
        setCriandoLista(false);
        setMensagemStatus(`✅ Lista "${nomeEmMaiusculo}" criada com sucesso.`);
        await carregarListas(nova.id);
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  const handleAcaoItem = async (
    e?: React.FormEvent,
    acao: 'ADD_ITEM' | 'UPDATE_QTD' | 'DELETE_ITEM' = 'ADD_ITEM',
    payload: any = {}
  ) => {
    if (e) e.preventDefault();
    if (!listaAtual) return;

    const itemTexto = (payload.nomeItem || novoItemNome).trim().toUpperCase();
    if (acao === 'ADD_ITEM' && !itemTexto) return;

    const estadoAnterior = [...listas];

    if (listaAtual.usuarioId !== null || (acao !== 'ADD_ITEM' && listaAtual.nome !== 'Lista Dieese')) {
      setListas((prevListas) =>
        prevListas.map((l) => {
          if (l.id !== listaAtual.id) return l;

          let novosItens = [...(l.itens || [])];

          if (acao === 'ADD_ITEM') {
            novosItens.push({
              id: `temp-${Date.now()}`,
              nome: itemTexto,
              quantidade: 1,
            });
            setMensagemStatus(`✅ Item "${itemTexto}" adicionado.`);
          } else if (acao === 'UPDATE_QTD') {
            novosItens = novosItens.map((i) =>
              i.id === payload.itemId
                ? { ...i, quantidade: Math.max(1, payload.quantidade) }
                : i
            );
          } else if (acao === 'DELETE_ITEM') {
            novosItens = novosItens.filter((i) => i.id !== payload.itemId);
            setMensagemStatus('🗑️ Item removido.');
          }

          return { ...l, itens: novosItens };
        })
      );
    }

    if (acao === 'ADD_ITEM') setNovoItemNome('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          listaId: listaAtual.id,
          acao,
          nomeItem: itemTexto,
          ...payload,
        }),
      });

      if (res.ok) {
        const listaRetornada = await res.json();

        setListas((prevListas) => {
          const index = prevListas.findIndex((l) => l.id === listaAtual.id);
          if (index !== -1) {
            const copia = [...prevListas];
            copia[index] = listaRetornada;
            return copia;
          }
          return [...prevListas, listaRetornada];
        });

        if (listaAtual.usuarioId === null && listaAtual.nome === 'Lista Dieese') {
          setListaAtivaId(listaRetornada.id);
        }
      } else {
        setListas(estadoAnterior);
      }
    } catch (err) {
      console.error('Erro na sincronização em segundo plano:', err);
      setListas(estadoAnterior);
    }
  };

  const handleExcluirLista = async () => {
    if (!listaAtual) return;
    if (listaAtual.usuarioId === null) {
      alert('A Lista Dieese padrão global não pode ser excluída.');
      return;
    }

    if (!confirm(`Excluir a lista "${listaAtual.nome}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/listas?listaId=${listaAtual.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      if (res.ok) {
        setMensagemStatus(`🗑️ Lista "${listaAtual.nome}" excluída.`);
        setListaAtivaId('');
        await carregarListas();
      }
    } catch (err) {
      console.error('Erro ao deletar lista:', err);
    }
  };

  const totalItens = listaAtual?.itens?.length || 0;
  const concluidosCount = listaAtual?.itens?.filter((i) => checados[i.id]).length || 0;

  return (
    <main
      className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-28 font-sans text-slate-900"
      style={{ colorScheme: 'light' }}
    >
      <div className="space-y-4">
        {/* Anúncio de status para Leitores de Tela */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {mensagemStatus}
        </div>

        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-slate-300 pb-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">📋</span>
            <h1 className="text-lg font-black text-emerald-800 uppercase tracking-tight">
              LISTAS DE COMPRAS
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setCriandoLista(!criandoLista)}
            aria-expanded={criandoLista}
            aria-label={criandoLista ? 'Fechar formulário de nova lista' : 'Abrir formulário de nova lista'}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3.5 py-2.5 rounded-xl min-h-[44px] transition-all focus:ring-2 focus:ring-emerald-700 active:scale-95"
          >
            {criandoLista ? 'FECHAR' : '+ NOVA LISTA'}
          </button>
        </header>

        {/* Form Criar Lista */}
        {criandoLista && (
          <form
            onSubmit={handleCriarLista}
            aria-label="Criar nova lista de compras"
            className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col gap-2"
          >
            <label htmlFor="nova-lista-input" className="block text-xs font-black text-slate-900 uppercase">
              Nome da Nova Lista
            </label>
            <div className="flex gap-2">
              <input
                id="nova-lista-input"
                type="text"
                value={novaListaNome}
                onChange={(e) => setNovaListaNome(e.target.value)}
                placeholder="EX: LISTA DA SEMANA..."
                className="flex-1 border-2 border-slate-400 rounded-xl px-3 py-2.5 text-xs font-black text-slate-900 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-xs min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-emerald-700"
              >
                CRIAR
              </button>
            </div>
          </form>
        )}

        {/* Abas de Listas */}
        {listas.length > 0 && (
          <nav aria-label="Suas listas de compras" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {listas.map((l) => {
              const isSelected = listaAtivaId === l.id || (!listaAtivaId && l === listas[0]);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setListaAtivaId(l.id)}
                  className={`px-3.5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all border-2 uppercase min-h-[44px] ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                      : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {l.nome}
                </button>
              );
            })}
          </nav>
        )}

        {/* Input Adicionar Item */}
        <form
          onSubmit={(e) => handleAcaoItem(e, 'ADD_ITEM')}
          aria-label="Adicionar item à lista ativa"
          className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm space-y-2"
        >
          <label htmlFor="adicionar-item-input" className="block text-xs font-black text-slate-900 uppercase">
            Adicionar Produto na Lista
          </label>
          <div className="flex gap-2">
            <input
              id="adicionar-item-input"
              type="text"
              value={novoItemNome}
              onChange={(e) => setNovoItemNome(e.target.value)}
              placeholder="EX: ARROZ 5KG..."
              className="flex-1 border-2 border-slate-400 rounded-xl px-3 py-2.5 text-xs font-black text-slate-900 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <button
              type="submit"
              aria-label="Adicionar item digitado"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-xs min-h-[44px] min-w-[44px] transition-all active:scale-95 focus:ring-2 focus:ring-emerald-700"
            >
              +
            </button>
          </div>
        </form>

        {/* Conteúdo da Lista */}
        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 text-center text-xs font-black text-slate-900 shadow-sm">
            Carregando lista...
          </div>
        ) : !listaAtual ? (
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 text-center text-xs font-bold text-slate-600">
            Nenhuma lista encontrada.
          </div>
        ) : (
          <section aria-label={`Itens da lista ${listaAtual.nome}`} className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {listaAtual.nome}
                </h2>
                {listaAtual.usuarioId === null && (
                  <span className="text-[10px] text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300 block mt-1">
                    Padrão Global (Edições criarão sua versão)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-emerald-100 text-emerald-900 font-black px-2 py-1 rounded-full border border-emerald-200">
                  {concluidosCount} de {totalItens}
                </span>
                {listaAtual.usuarioId !== null && (
                  <button
                    type="button"
                    onClick={handleExcluirLista}
                    aria-label={`Excluir lista ${listaAtual.nome}`}
                    className="text-red-700 hover:text-red-900 text-sm font-black p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Excluir Lista"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {!listaAtual.itens || listaAtual.itens.length === 0 ? (
              <p className="text-xs text-slate-500 font-bold text-center py-4">
                Nenhum item adicionado à lista.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 space-y-1" role="list">
                {listaAtual.itens.map((item, index) => {
                  const nome = (item.nome || item.produto || 'Item sem nome').toUpperCase();
                  const isChecked = !!checados[item.id];

                  return (
                    <li
                      key={item.id || index}
                      className={`pt-2 pb-1 flex justify-between items-center text-xs transition-colors min-h-[48px] ${
                        isChecked ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Checkbox e Nome do Item */}
                      <div className="flex items-center gap-3 flex-1 mr-2">
                        <input
                          id={`check-${item.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.id, nome)}
                          aria-label={`Marcar ${nome} como ${isChecked ? 'não comprado' : 'comprado'}`}
                          className="w-6 h-6 rounded border-2 border-slate-400 text-emerald-700 focus:ring-emerald-700 cursor-pointer accent-emerald-700"
                        />
                        <label
                          htmlFor={`check-${item.id}`}
                          className={`font-black cursor-pointer select-none uppercase text-xs ${
                            isChecked
                              ? 'line-through text-slate-500'
                              : 'text-slate-900'
                          }`}
                        >
                          {index + 1}. {nome}
                        </label>
                      </div>

                      {/* Controle de Quantidades e Exclusão */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${nome}`}
                          onClick={() =>
                            handleAcaoItem(undefined, 'UPDATE_QTD', {
                              itemId: item.id,
                              quantidade: (item.quantidade || 1) - 1,
                            })
                          }
                          className="min-w-[44px] min-h-[44px] bg-slate-200 text-slate-900 rounded-xl font-black border border-slate-400 hover:bg-slate-300 flex items-center justify-center text-sm active:scale-95 transition-transform"
                        >
                          -
                        </button>
                        <span aria-label={`Quantidade: ${item.quantidade || 1}`} className="text-xs font-black min-w-[24px] text-center text-slate-900">
                          {item.quantidade || 1}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${nome}`}
                          onClick={() =>
                            handleAcaoItem(undefined, 'UPDATE_QTD', {
                              itemId: item.id,
                              quantidade: (item.quantidade || 1) + 1,
                            })
                          }
                          className="min-w-[44px] min-h-[44px] bg-slate-200 text-slate-900 rounded-xl font-black border border-slate-400 hover:bg-slate-300 flex items-center justify-center text-sm active:scale-95 transition-transform"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={`Remover ${nome} da lista`}
                          onClick={() =>
                            handleAcaoItem(undefined, 'DELETE_ITEM', {
                              itemId: item.id,
                            })
                          }
                          className="text-slate-600 hover:text-red-700 font-black ml-1 text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Remover Item"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Navegação Rodapé Acessível */}
      <nav aria-label="Navegação principal" className="bg-white border-t-2 border-slate-300 px-4 py-2 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link href="/listas" aria-current="page" className="flex flex-col items-center min-w-[48px] min-h-[48px] justify-center text-emerald-800 text-xs font-black">
          <span aria-hidden="true" className="text-lg">📋</span>
          <span>Listas</span>
        </Link>
        <Link href="/comparar" className="flex flex-col items-center min-w-[48px] min-h-[48px] justify-center text-slate-700 text-xs font-bold hover:text-emerald-800">
          <span aria-hidden="true" className="text-lg">📷</span>
          <span>Folheto/Gôndola</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center min-w-[48px] min-h-[48px] justify-center text-slate-700 text-xs font-bold hover:text-emerald-800">
          <span aria-hidden="true" className="text-lg">📊</span>
          <span>Histórico</span>
        </Link>
      </nav>
    </main>
  );
}