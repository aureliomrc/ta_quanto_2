'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [aba, setAba] = useState<'login' | 'cadastro'>('login');
  
  // Campos de formulário
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [regioes, setRegioes] = useState<string[]>([]);

  const handleRegiaoToggle = (reg: string) => {
    setRegioes(prev => prev.includes(reg) ? prev.filter(r => r !== reg) : [...prev, reg]);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = '/api/auth';
    const method = aba === 'login' ? 'PUT' : 'POST';
    const body = aba === 'login' 
      ? { usuario, senha }
      : { nome, usuario, senha, regioes };

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      if (aba === 'login') {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        router.push('/listas');
      } else {
        alert('Cadastro realizado! Faça login para continuar.');
        setAba('login');
      }
    } else {
      alert('Erro ao processar a requisição.');
    }
  };

  return (
    <main className="min-h-screen bg-[#0d5c91] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6">
        {/* Header com Logo */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-[#008744]">
            <span className="text-3xl">🛒</span> TÁ QUANTO?
          </div>
          <p className="text-gray-500 text-sm font-medium">
            {aba === 'login' ? 'Faça login para comparar suas listas' : 'Crie sua conta para começar'}
          </p>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setAba('login')}
            className={`flex-1 py-3 text-sm font-bold tracking-wider ${
              aba === 'login'
                ? 'text-[#008744] border-b-2 border-[#008744]'
                : 'text-gray-400'
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => setAba('cadastro')}
            className={`flex-1 py-3 text-sm font-bold tracking-wider ${
              aba === 'cadastro'
                ? 'text-[#008744] border-b-2 border-[#008744]'
                : 'text-gray-400'
            }`}
          >
            CADASTRAR-SE
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {aba === 'cadastro' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#008744]"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Usuário</label>
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#008744]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#008744]"
              required
            />
          </div>

          {aba === 'cadastro' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Regiões de Interesse</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['SUL', 'SUDESTE', 'NORTE', 'NORDESTE', 'CENTRO_OESTE'].map(reg => (
                  <label key={reg} className="flex items-center gap-2 border p-2 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regioes.includes(reg)}
                      onChange={() => handleRegiaoToggle(reg)}
                    />
                    {reg}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#008744] hover:bg-[#007038] text-white font-bold py-3.5 rounded-full shadow-lg transition"
          >
            {aba === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </main>
  );
}