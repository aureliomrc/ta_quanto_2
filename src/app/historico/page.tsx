'use client';

import { useEffect, useState } from 'react';

export default function HistoricoPage() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarHistorico() {
      try {
        const res = await fetch('/api/historico');
        const data = await res.json();
        if (data.success) {
          setHistorico(data.historico || []);
        } else {
          setErro(data.error || 'Erro ao carregar ofertas');
        }
      } catch (err: any) {
        setErro('Falha na comunicação com o servidor.');
      } finally {
        setLoading(false);
      }
    }

    carregarHistorico();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando histórico...</div>;
  if (erro) return <div className="p-8 text-red-500 text-center">{erro}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Histórico de Ofertas</h1>
      {historico.length === 0 ? (
        <p>Nenhuma oferta cadastrada no histórico.</p>
      ) : (
        <div className="grid gap-3">
          {historico.map((item: any) => (
            <div key={item.id} className="p-4 border rounded shadow-sm flex justify-between">
              <div>
                <p className="font-semibold">{item.produto}</p>
                <p className="text-sm text-gray-500">{item.mercado} - {item.regiao}</p>
              </div>
              <p className="font-bold text-green-600">R$ {Number(item.preco).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}