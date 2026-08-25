'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  nome: string;
  quantidade: number;
  comprado: boolean;
}

interface Lista {
  id: string;
  nome: string;
  isPadrao?: boolean;
  itens: Item[];
}

export default function ListasPage() {
  const router = useRouter();

  // Lista Padrão Genérica pré-preenchida para todos os logins
  const [listas, setListas] = useState<Lista[]>([
    {
      id: 'padrao',
      nome: 'COMPRAS DO MÊS (PADRÃO)',
      isPadrao: true,
      itens: [
        { id: 'p1', nome: 'Arroz 5kg', quantidade: 1, comprado: false },
        { id: 'p2', nome: 'Feijão Carioca 1kg', quantidade: 2, comprado: false },
        { id: 'p3', nome: 'Óleo de Soja 900ml', quantidade: 2, comprado: false },
        { id: 'p4', nome: 'Leite Integral 1L', quantidade: 6, comprado: false },
        { id: 'p5', nome: 'Açúcar Refinado 1kg', quantidade: 1, comprado: false },
        { id: 'p6', nome: 'Café Torrado 500g', quantidade: 2, comprado: false },
        { id: 'p7', nome: 'Sabão em Pó 1kg', quantidade: 1, comprado: false },
      ],
    },
  ]);

  const [novaListaNome, setNovaListaNome] = useState('');
  const [listaAberta, setListaAberta] = useState<string | null>('padrao');
  const [novoItemNome, setNovoItemNome] = useState<{ [key: string]: string }>({});

  // Criar nova lista personalizada
  const handleCriarLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;
    const nova: Lista = {
      id: Date.now().toString(),
      nome: novaListaNome.toUpperCase(),
      itens: [],
    };
    setListas([...listas, nova]);
    setListaAberta(nova.id);
    setNovaListaNome('');
  };

  // Adicionar item em qualquer lista
  const handleAdicionarItem = (listaId: string) => {
    const nome = novoItemNome[listaId];
    if (!nome || !nome.trim()) return;

    setListas(prev =>
      prev.map(l => {
        if (l.id === listaId) {
          return {
            ...l,
            itens: [...l.itens, { id: Date.now().toString(), nome: nome.trim(), quantidade: 1, comprado: false }],
          };
        }
        return l;
      })
    );
    setNovoItemNome({ ...novoItemNome, [listaId]: '' });
  };

  // Alternar checkbox (colocado no carrinho)
  const toggleComprado = (listaId: string, itemId: string) => {
    setListas(prev =>
      prev.map(l => {
        if (l.id === listaId) {
          return {
            ...l,
            itens: l.itens.map(i => (i.id === itemId ? { ...i, comprado: !i.comprado } : i)),
          };
        }
        return l;
      })
    );
  };

  // Alterar Quantidade (+ / -)
  const alterarQuantidade = (listaId: string, itemId: string, delta: number) => {
    setListas(prev =>
      prev.map(l => {
        if (l.id === listaId) {
          return {
            ...l,
            itens: l.itens.map(i => {
              if (i.id === itemId) {
                const q = i.quantidade + delta;
                return { ...i, quantidade: q > 0 ? q : 1 };
              }
              return i;
            }),
          };
        }
        return l;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between pb-20">
      {/* Topo Header */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 text-lg font-black text-[#008744]">
          <span>🛒</span> TÁ QUANTO?
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="text-xs font-bold text-red-500 hover:underline"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6">
        {/* Card Criar Lista */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-gray-700">
            <span className="text-lg">+</span> Nova Lista de Compras
          </div>
          <form onSubmit={handleCriarLista} className="flex gap-2">
            <input
              type="text"
              placeholder="EX: MENSAL, CHURRASCO..."
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition"
            >
              + Criar
            </button>
          </form>
        </div>

        {/* Listas do Usuário */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-gray-400 tracking-wider">
            SUAS LISTAS ({listas.length})
          </span>

          {listas.map(lista => {
            const aberta = listaAberta === lista.id;
            return (
              <div key={lista.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabeçalho da Lista */}
                <div
                  onClick={() => setListaAberta(aberta ? null : lista.id)}
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📁</span>
                    <span className="font-extrabold text-sm text-gray-800">{lista.nome}</span>
                    <span className="bg-blue-50 text-[#1877f2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {lista.itens.length} itens
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{aberta ? '▲' : '▼'}</span>
                </div>

                {/* Conteúdo Expansível da Lista */}
                {aberta && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {/* Formulário para Adicionar Produto nesta Lista */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar novo produto..."
                        value={novoItemNome[lista.id] || ''}
                        onChange={e => setNovoItemNome({ ...novoItemNome, [lista.id]: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white"
                      />
                      <button
                        onClick={() => handleAdicionarItem(lista.id)}
                        className="bg-[#008744] text-white text-xs font-bold px-3 py-2 rounded-xl"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Itens da Lista */}
                    <ul className="space-y-2">
                      {lista.itens.map(item => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-100"
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.comprado}
                              onChange={() => toggleComprado(lista.id, item.id)}
                              className="w-4 h-4 accent-[#008744] rounded cursor-pointer"
                            />
                            <span
                              className={`text-xs font-bold ${
                                item.comprado ? 'line-through text-gray-400' : 'text-gray-700'
                              }`}
                            >
                              {item.nome}
                            </span>
                          </label>

                          {/* Seletor de Quantidade */}
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button
                              onClick={() => alterarQuantidade(lista.id, item.id, -1)}
                              className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-800">{item.quantidade}</span>
                            <button
                              onClick={() => alterarQuantidade(lista.id, item.id, 1)}
                              className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
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

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-[#008744]">
          <span className="text-xl">📋</span>
          <span className="text-xs font-bold mt-1">Listas</span>
        </Link>
        {/* Botão Comparar agora abre diretamente a câmera e o scanner */}
        <Link href="/scanner" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📷</span>
          <span className="text-xs font-bold mt-1">Comparar (Folheto)</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📜</span>
          <span className="text-xs font-bold mt-1">Histórico</span>
        </Link>
      </nav>
    </div>
  );
}