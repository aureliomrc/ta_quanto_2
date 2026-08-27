import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não configurada no ambiente.' },
        { status: 500 }
      );
    }

    const { imagemBase64, mercado, regiao } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json(
        { error: 'A imagem é obrigatória.' },
        { status: 400 }
      );
    }

    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imagemBase64.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

    // Requisição HTTP direta usando a versão v1beta e o cabeçalho x-goog-api-key
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Você é um leitor especialista em folhetos de supermercado. 
                  Analise a imagem e extraia todas as ofertas e preços.
                  Retorne APENAS um array JSON puro e válido sem marcação Markdown ou bloco de código (\`\`\`json):
                  [{"produto": "Nome do produto completo", "preco": 0.00}]`,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro retornado pela API do Gemini:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Erro ao comunicar com a API do Gemini.' },
        { status: response.status }
      );
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonInicio = textResult.indexOf('[');
    const jsonFim = textResult.lastIndexOf(']') + 1;

    if (jsonInicio === -1 || jsonFim === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto foi identificado na imagem.' },
        { status: 422 }
      );
    }

    const jsonString = textResult.substring(jsonInicio, jsonFim);
    const ofertas = JSON.parse(jsonString);

    return NextResponse.json({
      success: true,
      mercado: mercado || 'Geral',
      regiao: regiao || 'SUDESTE',
      totalProcessados: ofertas.length,
      ofertas,
    });
  } catch (error: any) {
    console.error('Erro na rota scan-folheto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar a imagem.' },
      { status: 500 }
    );
  }
}