import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não encontrada no servidor.' }, { status: 500 });
    }

    const mimeTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Analise a imagem deste folheto/encarte de ofertas e extraia todos os produtos com seus respetivos preços. 
    Retorne EXCLUSIVAMENTE um array em formato JSON estrito, sem textos explicativos ou blocos adicionais, com o seguinte padrão:
    [{"produto": "Nome do Produto", "preco": 10.90}]`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ];

    // Lista de modelos ordenada por preferência (tenta o principal e depois os alternativos)
    const modelos = ['gemini-3.6-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
    let result = null;
    let ultimoErro = null;

    for (const nomeModelo of modelos) {
      try {
        const model = genAI.getGenerativeModel({ model: nomeModelo });
        result = await model.generateContent([prompt, ...imageParts]);
        if (result) break; // Sucesso, sai do loop
      } catch (err: any) {
        console.warn(`Modelo ${nomeModelo} indisponível (${err.status || 'Erro'}). Tentando próximo...`);
        ultimoErro = err;
      }
    }

    if (!result) {
      throw ultimoErro || new Error('Servidores da IA estão indisponíveis no momento.');
    }

    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const produtos = JSON.parse(cleanedText);

    return NextResponse.json({ result: produtos });
  } catch (error: any) {
    console.error('Erro detalhado no servidor:', error);
    
    // Trata erro 503 especificamente com uma mensagem amigável
    if (error?.status === 503 || error?.message?.includes('503')) {
      return NextResponse.json(
        { error: 'Os servidores da IA estão muito sobrecarregados agora. Por favor, aguarde alguns segundos e tente novamente.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Erro ao processar imagem com a IA.' },
      { status: 500 }
    );
  }
}