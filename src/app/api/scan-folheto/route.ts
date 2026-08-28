import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

// Inicialização da SDK do Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    // 1. Verificação / Autenticação de Token (Opcional)
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (err) {
          return NextResponse.json(
            { error: 'Não autorizado. Token inválido.' },
            { status: 401 }
          );
        }
      }
    }

    // 2. Extração dos dados da requisição (espera FormData para envio de imagens)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    // Converter o arquivo para Buffer/Base64 para o Gemini
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // 3. Instanciação do modelo configurado com gemini-3.6-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    // 4. Prompt para análise do folheto
    const prompt = 'Analise a imagem deste folheto e liste os produtos encontrados com seus respectivos preços e descrições.';

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: file.type || 'image/jpeg',
      },
    };

    // Chamada à API da Google Generative AI
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    // 5. Integração com banco de dados Neon (exemplo de persistência do scan)
    if (process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        INSERT INTO scans (filename, result, created_at)
        VALUES (${file.name}, ${responseText}, NOW())
      `;
    }

    // 6. Retorno de sucesso
    return NextResponse.json({
      success: true,
      data: responseText,
    });

  } catch (error: any) {
    console.error('Erro no processamento do folheto:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro interno ao processar folheto.',
      },
      { status: 500 }
    );
  }
}