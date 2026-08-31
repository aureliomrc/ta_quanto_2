'use client';

import { useState, useEffect } from 'react';

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeNovaLista, setNomeNovaLista] = useState('');
  const [novoItem, setNovoItem] = useState('');
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string | null>(null);

  // 1. Recarrega as listas do banco Neon sempre que a tela é aberta
  const carregarListas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setListas(data.listas || []);
        // Seleciona a primeira lista por padrão caso não haja nenhuma selecionada
        if (data.listas.length > 0 && !listaSelecionadaId) {
          setListaSelecionadaId(data.listas[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar listas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarListas();
  }, []);

  // 2. Criar Nova Lista e atualizar estado local + banco
  const criarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeNovaLista.trim()) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/listas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ nomeNovaLista }),
    });

    const data = await res.json();
    if (data.success && data.lista) {
      setNomeNovaLista('');
      await carregarListas(); // Recarrega todas do banco
      setListaSelecionadaId(data.lista.id);
    }
  };

  // 3. Adicionar Item na Lista selecionada
  const adicionarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.trim() || !listaSelecionadaId) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/listas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        listaId: listaSelecionadaId,
        nomeItem: novoItem,
        quantidade: 1,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setNovoItem('');
      await carregarListas(); // Sincroniza com o Neon
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando listas...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Minhas Listas</h1>

      {/* Formulário Criar Lista */}
      <form onSubmit={criarLista} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nome da nova lista..."
          value={nomeNovaLista}
          onChange={(e) => setNomeNovaLista(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Criar Lista
        </button>
      </form>

      {/* Exibição das Listas */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="border p-4 rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Suas Listas</h2>
          {listas.map((l) => (
            <button
              key={l.id}
              onClick={() => setListaSelecionadaId(l.id)}
              className={`block w-full text-left p-2 rounded mb-1 ${
                listaSelecionadaId === l.id ? 'bg-blue-100 font-bold' : 'hover:bg-gray-200'
              }`}
            >
              {l.nome} ({l.itens?.length || 0})
            </button>
          ))}
        </div>

        {/* Itens da Lista Selecionada */}
        <div className="md:col-span-2 border p-4 rounded">
          {listaSelecionadaId ? (
            <>
              <form onSubmit={adicionarItem} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Adicionar produto..."
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  className="border p-2 rounded w-full"
                />
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                  Adicionar
                </button>
              </form>

              <ul>
                {listas
                  .find((l) => l.id === listaSelecionadaId)
                  ?.itens?.map((item: any) => (
                    <li key={item.id} className="p-2 border-b flex justify-between">
                      <span>{item.nome}</span>
                      <span className="text-sm text-gray-500">Qtd: {item.quantidade}</span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-500">Selecione ou crie uma lista para ver os itens.</p>
          )}
        </div>
      </div>
    </div>
  );
}