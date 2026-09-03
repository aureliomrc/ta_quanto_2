'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Scan, Building2 } from 'lucide-react';

interface ComparacaoData {
  mercados: string[];
  itens: Array<{
    produto: string;
    quantidade: number;
    ofertas: Array<{
      mercado: string;
      preco: number;
      origem: 'SCANNER' | 'SEFAZ';
      mensagem: string;
    }>;
  }>;
  totais: Array<{ mercado: string; total: number }>;
}

export default function HistoricoPage() {
  const [listas, setListas] = useState<any[]>([]);
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [comparacao, setComparacao] = useState<ComparacaoData | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarListas();
    carregarHistorico();
  }, []);

  const carregarListas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setListas(data);
        if (data.length > 0) setListaSelecionada(data[0].id); // Seleciona a primeira lista por padrão
      }
    } catch (e) {
      console.error(e);
    }
  };

  const carregarHistorico = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/historico', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setHistorico(data);
    } catch (e) {
      console.error(e);
    }
  };

  const excluirItemHistorico = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/historico?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    carregarHistorico();
  };

  const executarComparacao = async () => {
    setErro('');

    if (!listaSelecionada) {
      setErro('Por favor, selecione uma lista no menu cascata.');
      return;
    }

    if (!regiao) {
      setErro('Por favor, selecione a sua região.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/comparar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listaId: listaSelecionada,
          regiao: regiao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar comparação.');
      }

      setComparacao(data);
    } catch (e: any) {
      setErro(e.message || 'Erro na requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-8">
      {/* SEÇÃO 1: COMPARADOR DE MERCADOS */}
      <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Cotação & Comparação entre Mercados</h2>

        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Selecione a Lista</label>
            <select
              value={listaSelecionada}
              onChange={(e) => setListaSelecionada(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800"
            >
              <option value="">-- Escolha uma lista --</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Sua Região</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800"
            >
              <option value="SUDESTE">Sudeste</option>
              <option value="SUL">Sul</option>
              <option value="NORDESTE">Nordeste</option>
              <option value="NORTE">Norte</option>
              <option value="CENTRO_OESTE">Centro-Oeste</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={executarComparacao}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium p-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Comparando...' : 'Comparar 3 Mercados'}
            </button>
          </div>
        </div>

        {comparacao && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparacao.totais.map((t, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-slate-50 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Mercado {idx + 1}</span>
                    <p className="font-semibold text-lg text-gray-800">{t.mercado}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Total Est.</span>
                    <p className="text-xl font-extrabold text-emerald-600">
                      R$ {Number(t.total).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="divide-y rounded-lg border overflow-hidden">
              {comparacao.itens.map((item, i) => (
                <div key={i} className="p-4 bg-white flex flex-col md:flex-row justify-between gap-4">
                  <div className="font-medium text-gray-800 md:w-1/4">
                    {item.produto} <span className="text-sm text-gray-500">({item.quantidade}x)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                    {item.ofertas.map((of, j) => (
                      <div
                        key={j}
                        className={`p-2.5 rounded-lg border text-sm flex flex-col justify-between ${
                          of.origem === 'SCANNER'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{of.mercado}</span>
                          <span>R$ {Number(of.preco).toFixed(2)}</span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs">
                          {of.origem === 'SCANNER' ? (
                            <>
                              <Scan className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold text-emerald-700">Folheto / Scan</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-amber-600" />
                              <span className="font-semibold text-amber-700">Média SEFAZ</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SEÇÃO 2: HISTÓRICO DE SCANS */}
      <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Histórico de Escaneamentos</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
            Expira em até 72h
          </span>
        </div>

        {historico.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Nenhum scan ativo nas últimas 72 horas.</p>
        ) : (
          <div className="divide-y">
            {historico.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{h.produto}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{h.mercado}</span>
                    <span>•</span>
                    <span>R$ {Number(h.preco).toFixed(2)}</span>
                    <span>•</span>
                    <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => excluirItemHistorico(h.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Excluir item do histórico"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}