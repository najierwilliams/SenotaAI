import { chatWithOllama, getOllamaConfig } from "../agent/ollama";
import type { OllamaMessage } from "../agent/contracts";

export type LunaModelResponse = {
  provider: string;
  model: string;
  content: string;
  estimatedTokens: number;
};

export interface LunaModel {
  readonly provider: string;
  isConfigured(): boolean;
  generate(input: { messages: OllamaMessage[]; model?: string }): Promise<LunaModelResponse>;
}

/** Existing server-only model integration, wrapped behind a stable Luna interface. */
export class OllamaLunaModel implements LunaModel {
  readonly provider = "ollama";

  isConfigured() {
    try { getOllamaConfig(); return true; } catch { return false; }
  }

  async generate(input: { messages: OllamaMessage[]; model?: string }): Promise<LunaModelResponse> {
    const config = getOllamaConfig();
    const response = await chatWithOllama({ model: input.model, messages: input.messages });
    return {
      provider: this.provider,
      model: input.model || config.defaultModel,
      content: response.content,
      // This is a conservative payload-character estimate only. It is explicitly not billed token telemetry.
      estimatedTokens: Math.ceil((input.messages.reduce((total, message) => total + message.content.length, 0) + response.content.length) / 4),
    };
  }
}

export function getLunaModel(): LunaModel {
  return new OllamaLunaModel();
}
