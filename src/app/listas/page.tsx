'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  nome: string;
  quantidade: number;
}

interface Lista {
  id: string;
  nome: string;
  itens: Item[];
}

export default function ListasPage() {
  const router = useRouter();
  const [novaLista, setNovaLista] = useState('');
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaAberta, setListaAberta] = useState<string | null>(null);
  const [novoItemNome, setNovoItemNome] = useState('');

  // Carregar listas do banco de dados ao abrir a página
  const carregarListas = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/listas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListas(data);
      }
    } catch (err) {
      console.error('Erro ao buscar listas', err);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  // Criar nova lista e salvar no BD
  const handleCriarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaLista.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: novaLista }),
      });

      if (res.ok) {
        setNovaLista('');
        carregarListas();
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  // Adicionar item dentro de uma lista
  const handleAdicionarItem = async (listaId: string) => {
    if (!novoItemNome.trim()) return;

    try {
      const res = await fetch(`/api/listas/${listaId}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoItemNome, quantidade: 1 }),
      });

      if (res.ok) {
        setNovoItemNome('');
        carregarListas();
      }
    } catch (err) {
      console.error('Erro ao adicionar item', err);
    }
  };

  const handleSair = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-between font-sans">
      <div>
        {/* Topo / Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h1 className="text-lg font-black text-[#008744]">TÁ QUANTO?</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSair}
              className="text-xs font-bold text-red-500 hover:text-red-700 ml-1"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="p-4 max-w-lg mx-auto space-y-5">
          {/* Card Criar Nova Lista */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="text-base font-black">+</span>
              <span>Nova Lista de Compras</span>
            </div>

            <form onSubmit={handleCriarLista} className="flex gap-2">
              <input
                type="text"
                value={novaLista}
                onChange={(e) => setNovaLista(e.target.value)}
                placeholder="EX: MENSAL, CHURRASCO..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-300 uppercase text-slate-700"
              />
              <button
                type="submit"
                className="bg-[#1d70f5] hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
              >
                + Criar
              </button>
            </form>
          </div>

          {/* Subcabeçalho de Listas */}
          <div className="flex justify-between items-center text-xs px-1">
            <span className="font-bold text-slate-400 tracking-wider uppercase">
              SUAS LISTAS ({listas.length})
            </span>
            <button
              onClick={carregarListas}
              className="text-[#1d70f5] font-bold flex items-center gap-1 hover:underline"
            >
              <span>🔄</span> Sincronizar
            </button>
          </div>

          {/* Cartões de Listas */}
          <div className="space-y-3">
            {listas.map((lista) => {
              const aberta = listaAberta === lista.id;
              return (
                <div key={lista.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    onClick={() => setListaAberta(aberta ? null : lista.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📁</span>
                      <span className="font-extrabold text-xs text-slate-800 tracking-wide">
                        {lista.nome}
                      </span>
                      <span className="bg-blue-50 text-blue-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {lista.itens?.length || 0} itens
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs">{aberta ? '▲' : '▼'}</span>
                  </div>

                  {/* Área Interna para Adicionar e Listar Itens */}
                  {aberta && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={novoItemNome}
                          onChange={(e) => setNovoItemNome(e.target.value)}
                          placeholder="Nome do item (ex: Arroz 5kg)"
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
                        />
                        <button
                          onClick={() => handleAdicionarItem(lista.id)}
                          className="bg-[#008744] text-white text-xs px-3 py-1.5 rounded-xl font-bold"
                        >
                          + Item
                        </button>
                      </div>

                      {/* Lista dos Itens Adicionados */}
                      <ul className="space-y-1">
                        {lista.itens?.map((item) => (
                          <li key={item.id} className="bg-white p-2 rounded-lg text-xs text-slate-700 flex justify-between border border-slate-200">
                            <span>{item.nome}</span>
                            <span className="font-bold text-slate-400">x{item.quantidade}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Menu do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-8 py-2.5 flex justify-around items-center sticky bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-[#008744]">
          <span className="text-lg">📋</span>
          <span className="text-[11px] font-bold mt-0.5">Listas</span>
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📊</span>
          <span className="text-[11px] font-bold mt-0.5">Comparar</span>
        </Link>
        <Link href="/cupons" className="flex flex-col items-center text-slate-400 hover:text-[#008744]">
          <span className="text-lg">📜</span>
          <span className="text-[11px] font-bold mt-0.5">Cupons</span>
        </Link>
      </nav>
    </div>
  );
}