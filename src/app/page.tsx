'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [abaAtiva, setAbaAtiva] = useState<'listas' | 'scan' | 'historico'>('listas');

  // Estados das Listas
  const [listas, setListas] = useState<any[]>([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [nomeNovaLista, setNomeNovaLista] = useState('');
  const [novoItem, setNovoItem] = useState('');
  const [listaSelecionadaId, setListaSelecionadaId] = useState<string | null>(null);

  // Estados do Scan / Câmera
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [mercado, setMercado] = useState('');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [analisando, setAnalisando] = useState(false);
  const [resultadoScan, setResultadoScan] = useState<any[]>([]);
  const [erroScan, setErroScan] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Histórico
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Carregar dados iniciais ao mudar de aba
  useEffect(() => {
    if (abaAtiva === 'listas') carregarListas();
    if (abaAtiva === 'historico') carregarHistorico();
  }, [abaAtiva]);

  // --- FUNÇÕES DE LISTAS ---
  const carregarListas = async () => {
    setLoadingListas(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (data.success) {
        setListas(data.listas || []);
        if (data.listas.length > 0 && !listaSelecionadaId) {
          setListaSelecionadaId(data.listas[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar listas:', err);
    } finally {
      setLoadingListas(false);
    }
  };

  const criarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeNovaLista.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ nomeNovaLista }),
      });
      const data = await res.json();
      if (data.success && data.lista) {
        setNomeNovaLista('');
        await carregarListas();
        setListaSelecionadaId(data.lista.id);
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  const adicionarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.trim() || !listaSelecionadaId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/listas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
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
        await carregarListas();
      }
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  // --- FUNÇÕES DE SCAN / CÂMERA ---
  const handleSelecionarImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processarFolheto = async () => {
    if (!imagemPreview) return;
    setAnalisando(true);
    setErroScan('');
    setResultadoScan([]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          imagemBase64: imagemPreview,
          mercado: mercado || 'Mercado Geral',
          regiao: regiao,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResultadoScan(data.itens || []);
      } else {
        setErroScan(data.error || 'Erro ao processar imagem.');
      }
    } catch (err) {
      setErroScan('Falha na conexão com o servidor.');
    } finally {
      setAnalisando(false);
    }
  };

  // --- FUNÇÕES DE HISTÓRICO ---
  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const res = await fetch('/api/historico');
      const data = await res.json();
      if (data.success) {
        setHistorico(data.historico || []);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* BARRA DE NAVEGAÇÃO E ABAS */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-xl font-bold tracking-wide">EconomizaApp</h1>
          <nav className="flex gap-2 bg-blue-700 p-1 rounded-lg">
            <button
              onClick={() => setAbaAtiva('listas')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                abaAtiva === 'listas' ? 'bg-white text-blue-700 shadow' : 'text-white hover:bg-blue-600'
              }`}
            >
              📋 Minhas Listas
            </button>
            <button
              onClick={() => setAbaAtiva('scan')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                abaAtiva === 'scan' ? 'bg-white text-blue-700 shadow' : 'text-white hover:bg-blue-600'
              }`}
            >
              📷 Escanear Folheto
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                abaAtiva === 'historico' ? 'bg-white text-blue-700 shadow' : 'text-white hover:bg-blue-600'
              }`}
            >
              📊 Histórico / Ofertas
            </button>
          </nav>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {/* --- ABA 1: LISTAS --- */}
        {abaAtiva === 'listas' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Minhas Listas de Compras</h2>

            <form onSubmit={criarLista} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Nome da nova lista..."
                value={nomeNovaLista}
                onChange={(e) => setNomeNovaLista(e.target.value)}
                className="border border-gray-300 p-2.5 rounded-lg flex-1 outline-blue-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition">
                Criar Lista
              </button>
            </form>

            {loadingListas ? (
              <p className="text-gray-500 py-4 text-center">Carregando listas...</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Painel Esquerdo: Selecionar Lista */}
                <div className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-gray-700 mb-3">Listas Disponíveis</h3>
                  {listas.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma lista encontrada.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {listas.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setListaSelecionadaId(l.id)}
                          className={`w-full text-left p-2.5 rounded-md text-sm transition flex justify-between items-center ${
                            listaSelecionadaId === l.id
                              ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <span className="truncate">{l.nome}</span>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                            {l.itens?.length || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Painel Direito: Itens da Lista */}
                <div className="md:col-span-2 border border-gray-200 p-4 rounded-lg bg-white">
                  {listaSelecionadaId ? (
                    <>
                      <form onSubmit={adicionarItem} className="flex gap-2 mb-4">
                        <input
                          type="text"
                          placeholder="Adicionar produto..."
                          value={novoItem}
                          onChange={(e) => setNovoItem(e.target.value)}
                          className="border border-gray-300 p-2 rounded-lg flex-1 outline-blue-500"
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition">
                          Adicionar
                        </button>
                      </form>

                      <div className="divide-y divide-gray-100">
                        {listas
                          .find((l) => l.id === listaSelecionadaId)
                          ?.itens?.map((item: any) => (
                            <div key={item.id} className="py-2.5 flex justify-between items-center text-gray-700">
                              <span>{item.nome}</span>
                              <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-500">
                                Qtd: {item.quantidade}
                              </span>
                            </div>
                          ))}
                        {(listas.find((l) => l.id === listaSelecionadaId)?.itens?.length || 0) === 0 && (
                          <p className="text-sm text-gray-400 py-4 text-center">Esta lista ainda não tem itens.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 py-8 text-center">Selecione ou crie uma lista para visualizar seus itens.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ABA 2: SCAN DE FOLHETO --- */}
        {abaAtiva === 'scan' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Escanear Folheto de Promoções</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supermercado</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour, Guanabara..."
                  value={mercado}
                  onChange={(e) => setMercado(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
                <select
                  value={regiao}
                  onChange={(e) => setRegiao(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 rounded-lg outline-blue-500"
                >
                  <option value="SUDESTE">Sudeste</option>
                  <option value="SUL">Sul</option>
                  <option value="NORDESTE">Nordeste</option>
                  <option value="NORTE">Norte</option>
                  <option value="CENTRO_OESTE">Centro-Oeste</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Folheto</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleSelecionarImagem}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 p-6 rounded-lg text-center hover:bg-gray-50 transition text-gray-600 font-medium"
                >
                  📷 Abrir Câmera ou Selecionar Imagem
                </button>
              </div>

              {imagemPreview && (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 max-h-64 flex justify-center bg-black">
                  <img src={imagemPreview} alt="Preview" className="object-contain max-h-64" />
                </div>
              )}

              <button
                onClick={processarFolheto}
                disabled={!imagemPreview || analisando}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${
                  !imagemPreview || analisando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
              >
                {analisando ? 'Analisando Imagem com IA...' : 'Processar e Extrair Ofertas'}
              </button>
            </div>

            {erroScan && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">{erroScan}</div>}

            {resultadoScan.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-bold text-gray-800 mb-2">Ofertas Extraídas e Salvas:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {resultadoScan.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 border rounded-lg">
                      <span className="font-medium text-gray-700">{item.produto}</span>
                      <span className="font-bold text-emerald-600">R$ {Number(item.preco).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ABA 3: HISTÓRICO DE OFERTAS --- */}
        {abaAtiva === 'historico' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Histórico de Ofertas Cadastradas</h2>

            {loadingHistorico ? (
              <p className="text-gray-500 py-8 text-center">Carregando histórico...</p>
            ) : historico.length === 0 ? (
              <p className="text-gray-400 py-8 text-center">Nenhuma oferta registrada ainda no banco.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {historico.map((item: any) => (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:border-blue-300 transition">
                    <p className="font-bold text-gray-800 truncate">{item.produto}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.mercado} • <span className="uppercase">{item.regiao}</span>
                    </p>
                    <p className="text-lg font-extrabold text-emerald-600 mt-2">
                      R$ {Number(item.preco).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}