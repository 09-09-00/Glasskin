// ============================================================
//  Proveedor de IA — ÚNICO ARCHIVO para cambiar de proveedor
//  Actualmente: NVIDIA API (formato OpenAI compatible)
//  Para cambiar a Claude: edita solo este archivo
// ============================================================

/** Respuesta estructurada del modelo */
export interface RespuestaIA<T> {
  ok: boolean;
  datos?: T;
  error?: string;
  usoTokens?: { prompt: number; completion: number };
}

/** Cliente genérico tipo OpenAI */
export interface ClienteIA {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: "json_object" };
      }) => Promise<{
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      }>;
    };
  };
}

/** Permite usar recomendaciones locales cuando todavía no hay proveedor externo. */
export function iaExternaConfigurada(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

/** Crea el cliente según variables de entorno */
export function crearClienteIA(): ClienteIA {
  const baseURL = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  const apiKey = process.env.NVIDIA_API_KEY ?? "";

  if (!apiKey) {
    throw new Error("Falta NVIDIA_API_KEY en .env");
  }

  // Fetch nativo con formato OpenAI
  return {
    chat: {
      completions: {
        async create({ model, messages, temperature = 0.3, max_tokens = 2000, response_format }) {
          const res = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model ?? process.env.NVIDIA_MODELO ?? "meta/llama-3.1-70b-instruct",
              messages,
              temperature,
              max_tokens,
              response_format,
            }),
            signal: AbortSignal.timeout(25_000),
          });

          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`IA error ${res.status}: ${txt}`);
          }
          return res.json();
        },
      },
    },
  };
}

/** Valida y parsea JSON del modelo */
export function parsearJSONSeguro<T>(texto: string): RespuestaIA<T> {
  try {
    const limpio = texto.trim().replace(/^```json\s*|```\s*$/g, "");
    const datos = JSON.parse(limpio) as T;
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, error: `JSON inválido: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Modelo a usar (centralizado) */
export const MODELO_IA = process.env.NVIDIA_MODELO ?? "meta/llama-3.1-70b-instruct";
