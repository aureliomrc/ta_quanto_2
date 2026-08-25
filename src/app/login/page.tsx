'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ usuario: '', senha: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      router.push('/listas');
    } else {
      alert('Credenciais inválidas.');
    }
  };

  return (
    <main className="min-h-screen p-4 flex justify-center items-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>
        <input type="text" placeholder="Usuário" className="w-full border p-2 rounded" required onChange={e => setForm({...form, usuario: e.target.value})} />
        <input type="password" placeholder="Senha" className="w-full border p-2 rounded" required onChange={e => setForm({...form, senha: e.target.value})} />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-semibold">Entrar</button>
      </form>
    </main>
  );
}