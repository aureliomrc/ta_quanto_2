'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Cadastro() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', usuario: '', senha: '', regioes: [] as string[] });

  const handleRegiaoChange = (regiao: string) => {
    setForm(prev => ({
      ...prev,
      regioes: prev.regioes.includes(regiao)
        ? prev.regioes.filter(r => r !== regiao)
        : [...prev.regioes, regiao]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      alert('Cadastro realizado com sucesso!');
      router.push('/login');
    } else {
      alert('Erro ao cadastrar.');
    }
  };

  return (
    <main className="min-h-screen p-4 flex justify-center items-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Cadastro</h1>
        <input type="text" placeholder="Nome Completo" className="w-full border p-2 rounded" required onChange={e => setForm({...form, nome: e.target.value})} />
        <input type="text" placeholder="Usuário" className="w-full border p-2 rounded" required onChange={e => setForm({...form, usuario: e.target.value})} />
        <input type="password" placeholder="Senha" className="w-full border p-2 rounded" required onChange={e => setForm({...form, senha: e.target.value})} />
        
        <div>
          <label className="font-semibold block mb-2">Regiões de Interesse:</label>
          {['NORTE', 'NORDESTE', 'CENTRO_OESTE', 'SUDESTE', 'SUL'].map(reg => (
            <label key={reg} className="inline-flex items-center mr-4 mb-2">
              <input type="checkbox" onChange={() => handleRegiaoChange(reg)} className="mr-1" />
              {reg}
            </label>
          ))}
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-semibold">Cadastrar</button>
      </form>
    </main>
  );
}