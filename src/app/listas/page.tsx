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

  const carregarListas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListas(data);
        if (data.length > 0 && !listaAtivaId) {
          setListaAtivaId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar listas:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  const listaAtual = listas.find((l) => l.id === listaAtivaId) || listas[0];

  const handleCriarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ nome: novaListaNome }),
      });

      if (res.ok) {
        const nova = await res.json();
        setNovaListaNome('');
        setCriandoLista(false);
        await carregarListas();
        setListaAtivaId(nova.id);
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  const handleAcaoItem = async (acao: 'ADD_ITEM' | 'UPDATE_QTD' | 'DELETE_ITEM', payload: any = {}) => {
    if (!listaAtual) return;
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
          ...payload,
        }),
      });

      if (res.ok) {
        if (acao === 'ADD_ITEM') setNovoItemNome('');
        await carregarListas();
      }
    } catch (err) {
      console.error('Erro na ação do item:', err);
    }
  };

  const handleExcluirLista = async () => {
    if (!listaAtual) return;
    if (listaAtual.usuarioId === null) {
      alert('A Lista Dieese global padrão não pode ser excluída.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a lista "${listaAtual.nome}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/listas?listaId=${listaAtual.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      if (res.ok) {
        setListaAtivaId('');
        await carregarListas();
      }
    } catch (err) {
      console.error('Erro ao excluir lista:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
              LISTAS DE COMPRAS
            </h1>
          </div>
          <button
            onClick={() => setCriandoLista(!criandoLista)}
            className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-500 transition-all"
          >
            {criandoLista ? 'Fechar' : '+ Nova Lista'}
          </button>
        </header>

        {/* Modal/Input para Criar Nova Lista */}
        {criandoLista && (
          <form onSubmit={handleCriarLista} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
            <input
              type="text"
              value={novaListaNome}
              onChange={(e) => setNovaListaNome(e.target.value)}
              placeholder="Nome da nova lista..."
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              Criar
            </button>
          </form>
        )}

        {/* Seletor de Listas */}
        {listas.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {listas.map((l) => (
              <button
                key={l.id}
                onClick={() => setListaAtivaId(l.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border ${
                  (listaAtivaId === l.id || (!listaAtivaId && l === listas[0]))
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {l.nome}
              </button>
            ))}
          </div>
        )}

        {/* Adicionar Produto na Lista Ativa */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (novoItemNome.trim()) handleAcaoItem('ADD_ITEM', { nomeItem: novoItemNome });
          }}
          className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-2"
        >
          <input
            type="text"
            value={novoItemNome}
            onChange={(e) => setNovoItemNome(e.target.value)}
            placeholder="Adicionar item nesta lista..."
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-500 transition-all"
          >
            Adicionar
          </button>
        </form>

        {/* Exibição dos Itens da Lista */}
        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Carregando lista...
          </div>
        ) : !listaAtual ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Nenhuma lista encontrada.
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {listaAtual.nome}
                </h2>
                {listaAtual.usuarioId === null && (
                  <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Padrão Global (Edições criam sua cópia)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  {listaAtual.itens?.length || 0} itens
                </span>
                {listaAtual.usuarioId !== null && (
                  <button
                    onClick={handleExcluirLista}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                    title="Excluir Lista"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {!listaAtual.itens || listaAtual.itens.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Nenhum item adicionado à lista.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-1">
                {listaAtual.itens.map((item, index) => {
                  const nome = item.nome || item.produto || 'Item sem nome';
                  return (
                    <div
                      key={item.id || index}
                      className="pt-2 flex justify-between items-center text-xs text-slate-700"
                    >
                      <span className="font-semibold text-slate-800 flex-1">
                        {index + 1}. {nome}
                      </span>

                      {/* Controle de Quantidade (+ / -) e Excluir Item */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            handleAcaoItem('UPDATE_QTD', {
                              itemId: item.id,
                              quantidade: (item.quantidade || 1) - 1,
                            })
                          }
                          className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg font-black hover:bg-slate-200 flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold min-w-[20px] text-center">
                          {item.quantidade || 1}
                        </span>
                        <button
                          onClick={() =>
                            handleAcaoItem('UPDATE_QTD', {
                              itemId: item.id,
                              quantidade: (item.quantidade || 1) + 1,
                            })
                          }
                          className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg font-black hover:bg-slate-200 flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleAcaoItem('DELETE_ITEM', { itemId: item.id })}
                          className="text-slate-400 hover:text-red-600 font-bold ml-1 text-xs"
                          title="Remover Item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>🏷️</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📊</span> Comparação/Histórico
        </Link>
      </nav>
    </div>
  );
}