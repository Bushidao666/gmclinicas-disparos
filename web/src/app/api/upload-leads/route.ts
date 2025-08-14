import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Obter o body da requisição
    const body = await req.json();

    // Validar dados básicos
    if (!body.client_id) {
      return NextResponse.json(
        { error: "client_id é obrigatório" },
        { status: 400 },
      );
    }

    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      return NextResponse.json(
        { error: "leads deve ser um array não vazio" },
        { status: 400 },
      );
    }

    // Obter o Authorization header do usuário
    const authHeader = req.headers.get("Authorization");

    // Se não tiver Authorization, usar o ANON key
    const authorization =
      authHeader || `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;

    if (!authorization || authorization === "Bearer undefined") {
      console.error(
        "Authorization header missing and NEXT_PUBLIC_SUPABASE_ANON_KEY not set",
      );

      return NextResponse.json(
        { error: "Erro de autenticação. Por favor, faça login novamente." },
        { status: 401 },
      );
    }

    // URL da Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-leads`;

    console.log("Calling Edge Function:", edgeFunctionUrl);
    console.log("Payload size:", JSON.stringify(body).length, "bytes");
    console.log("Number of leads:", body.leads.length);

    // Chamar a Edge Function do Supabase
    const res = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    });

    // Obter resposta
    const responseText = await res.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response:", responseText);
      data = { error: "Resposta inválida do servidor" };
    }

    // Log de erro se não for sucesso
    if (!res.ok) {
      console.error("Edge Function error:", {
        status: res.status,
        statusText: res.statusText,
        data,
      });
    }

    // Retornar resposta com o mesmo status code
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("API Route error:", error);

    // Tratamento de erro mais específico
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Dados inválidos. Verifique o formato do arquivo CSV." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao processar upload",
      },
      { status: 500 },
    );
  }
}
