'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Listas() {
  const [listas, setListas] = useState<any[]>([]);
  const [novaListaNome, setNovaListaNome] = useState('');

  // Exemplo de lista padrão genérica disponível para todos
  const listaPadrao = {
    id: 'padrao',
    nome: 'Lista Padrão (Essenciais)',
    itens: ['Arroz 5kg', 'Feijão 1kg', 'Óleo de Soja', 'Leite 1L', 'Açúcar 1kg'],
  };

  const criarNovaLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaListaNome.trim()) return;

    const nova = {
      id: Date.now().toString(),
      nome: novaListaNome,
      itens: [],
    };

    setListas([...listas, nova]);
    setNovaListaNome('');
  };

  return (
    <main className="min-h-screen p-4 bg-gray-50 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Minhas Listas</h1>
        <Link href="/scanner" className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">
          Escanear Folheto 📷
        </Link>
      </div>

      {/* Lista Padrão (Compartilhada) */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Disponível para todos</span>
        <h2 className="text-xl font-bold text-gray-800 mt-1">{listaPadrao.nome}</h2>
        <ul className="mt-2 list-disc list-inside text-gray-700 space-y-1">
          {listaPadrao.itens.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Formulário para Criar Nova Lista */}
      <form onSubmit={criarNovaLista} className="flex gap-2">
        <input
          type="text"
          placeholder="Nome da nova lista (ex: Churrasco, Compras do Mês)"
          value={novaListaNome}
          onChange={(e) => setNovaListaNome(e.target.value)}
          className="flex-1 border p-2 rounded-lg"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
          + Criar Lista
        </button>
      </form>

      {/* Listas do Usuário */}
      <div className="space-y-4">
        {listas.map((lista) => (
          <div key={lista.id} className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-bold text-lg text-gray-800">{lista.nome}</h3>
            <p className="text-sm text-gray-500">Nenhum item adicionado ainda.</p>
          </div>
        ))}
      </div>
    </main>
  );
}