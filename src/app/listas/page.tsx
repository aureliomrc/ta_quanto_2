'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ItemLista {
  id: string;
  nome: string;
  comprado: boolean;
}

interface ListaCompras {
  id: string;
  titulo: string;
  itens: ItemLista[];
}

export default function ListasPage() {
  const router = useRouter();
  const [listas, setListas] = useState<ListaCompras[]>([]);
  const [novaListaTitulo, setNovaListaTitulo] = useState('');
  const [novoItemTexto, setNovoItemTexto] = useState<{ [key: string]: string }>({});
  const [carregando, setCarregando] = useState(true);

  // Carrega listas simuladas / salvas
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const listasSalvas = localStorage.getItem('minhas_listas');
    if (listasSalvas) {
      try {
        setListas(JSON.parse(listasSalvas));
      } catch {
        setListas([]);
      }
    } else {
      // Exemplo padrão inicial
      setListas([
        {
          id: '1',
          titulo: 'Compras do Mês',
          itens: [
            { id: '101', nome: 'Arroz 5kg', comprado: false },
            { id: '102', nome: 'Feijão Carioca', comprado: true },
          ],
        },
      ]);
    }
    setCarregando(false);
  }, [router]);

  // Salva no LocalStorage sempre que alterar
  const salvarListas = (novasListas: ListaCompras[]) => {
    setListas(novasListas);
    localStorage.setItem('minhas_listas', JSON.stringify(novasListas));
  };

  const criarNovaLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaTitulo.trim()) return;

    const nova: ListaCompras = {
      id: Date.now().toString(),
      titulo: novaListaTitulo.trim(),
      itens: [],
    };

    salvarListas([...listas, nova]);
    setNovaListaTitulo('');
  };

  const adicionarItem = (listaId: string) => {
    const texto = novoItemTexto[listaId];
    if (!texto || !texto.trim()) return;

    const listasAtualizadas = listas.map((lista) => {
      if (lista.id === listaId) {
        return {
          ...lista,
          itens: [
            ...lista.itens,
            { id: Date.now().toString(), nome: texto.trim(), comprado: false },
          ],
        };
      }
      return lista;
    });

    salvarListas(listasAtualizadas);
    setNovoItemTexto({ ...novoItemTexto, [listaId]: '' });
  };

  const toggleItemComprado = (listaId: string, itemId: string) => {
    const listasAtualizadas = listas.map((lista) => {
      if (lista.id === listaId) {
        return {
          ...lista,
          itens: lista.itens.map((item) =>
            item.id === itemId ? { ...item, comprado: !item.comprado } : item
          ),
        };
      }
      return lista;
    });

    salvarListas(listasAtualizadas);
  };

  const excluirLista = (listaId: string) => {
    const listasAtualizadas = listas.filter((l) => l.id !== listaId);
    salvarListas(listasAtualizadas);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <p className="text-slate-500 font-bold text-sm">Carregando listas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        {/* Cabeçalho */}
        <header className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-lg font-black text-[#0d5c91] uppercase tracking-tight">
              MINHAS LISTAS
            </h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="text-xs font-bold text-red-500 hover:text-red-700"
          >
            Sair
          </button>
        </header>

        {/* Formulário Criar Nova Lista */}
        <form onSubmit={criarNovaLista} className="flex gap-2">
          <input
            type="text"
            value={novaListaTitulo}
            onChange={(e) => setNovaListaTitulo(e.target.value)}
            placeholder="Nome da nova lista..."
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c91] bg-white"
          />
          <button
            type="submit"
            className="bg-[#008744] hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md active:scale-95"
          >
            + Criar
          </button>
        </form>

        {/* Exibição das Listas */}
        {listas.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs font-medium">
            Você ainda não criou nenhuma lista.
          </div>
        ) : (
          listas.map((lista) => (
            <div
              key={lista.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="font-bold text-slate-800 text-sm">{lista.titulo}</h2>
                <button
                  onClick={() => excluirLista(lista.id)}
                  className="text-xs text-slate-400 hover:text-red-500 font-bold"
                >
                  Excluir
                </button>
              </div>

              {/* Itens da Lista */}
              <ul className="space-y-1.5">
                {lista.itens.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => toggleItemComprado(lista.id, item.id)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.comprado}
                      onChange={() => {}}
                      className="accent-[#008744] h-4 w-4 rounded"
                    />
                    <span
                      className={`text-xs ${
                        item.comprado
                          ? 'line-through text-slate-400'
                          : 'text-slate-700 font-medium'
                      }`}
                    >
                      {item.nome}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Adicionar Novo Item na Lista */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={novoItemTexto[lista.id] || ''}
                  onChange={(e) =>
                    setNovoItemTexto({ ...novoItemTexto, [lista.id]: e.target.value })
                  }
                  placeholder="Adicionar produto..."
                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0d5c91]"
                />
                <button
                  type="button"
                  onClick={() => adicionarItem(lista.id)}
                  className="bg-[#0d5c91] text-white px-3 py-1 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Menu de Navegação Inferior */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 max-w-md mx-auto">
        <Link href="/listas" className="flex flex-col items-center text-[#0d5c91] text-xs font-bold">
          <span className="text-lg">📋</span> Listas
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-[#0d5c91]">
          <span className="text-lg">📊</span> Comparar
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-[#0d5c91]">
          <span className="text-lg">📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}