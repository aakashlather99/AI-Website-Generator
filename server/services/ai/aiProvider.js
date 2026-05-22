import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const PROVIDERS = {
  OPENROUTER: 'openrouter',
  GEMINI: 'gemini',
  GPT4: 'gpt4',
};

const MODELS = {
  KWAIPILOT: 'openrouter/free',
  GEMINI: 'gemini-2.0-flash',
  GPT4: 'gpt-4-turbo',
};

class AIProviderAdapter {
  constructor() {
    this.primaryProvider = PROVIDERS.OPENROUTER;
    this.fallbackProvider = PROVIDERS.GEMINI;
    this.lastUsedProvider = this.primaryProvider;
  }

  /**
   * Generate API with automatic fallback
   */
  async generate(prompt, context = '') {
    let lastError = null;

    // Try primary provider
    try {
      console.log(`[AI] Attempting generation with ${this.lastUsedProvider.toUpperCase()}`);
      const result = await this.generateWithProvider(this.lastUsedProvider, prompt, context);
      this.lastUsedProvider = this.primaryProvider; 
      return {
        success: true,
        provider: this.lastUsedProvider,
        code: result,
        metadata: {
          model: MODELS[this.lastUsedProvider === PROVIDERS.OPENROUTER ? 'KWAIPILOT' : this.lastUsedProvider.toUpperCase()],
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      lastError = err;
      console.error(`[AI] ${this.lastUsedProvider.toUpperCase()} generation failed:`, lastError.message);
    }

    // Try fallback
    if (this.lastUsedProvider !== this.fallbackProvider) {
      try {
        console.log(`[AI] Falling back to ${this.fallbackProvider.toUpperCase()}`);
        const result = await this.generateWithProvider(this.fallbackProvider, prompt, context);
        this.lastUsedProvider = this.fallbackProvider;
        return {
          success: true,
          provider: this.fallbackProvider,
          code: result,
          metadata: {
            model: MODELS[this.fallbackProvider.toUpperCase()],
            timestamp: new Date().toISOString(),
            fallbackUsed: true,
          },
        };
      } catch (fallbackErr) {
        console.error(`[AI] ${this.fallbackProvider.toUpperCase()} fallback also failed:`, fallbackErr.message);
        throw new Error(`All providers failed. Primary Error: ${lastError?.message}`);
      }
    }

    throw lastError;
  }

  async generateWithProvider(provider, prompt, context) {
    switch (provider) {
      case PROVIDERS.OPENROUTER: return this.generateWithOpenRouter(prompt, context);
      case PROVIDERS.GEMINI: return this.generateWithGemini(prompt, context);
      case PROVIDERS.GPT4: return this.generateWithGPT4(prompt, context);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async generateWithOpenRouter(prompt, context, attempt = 0) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // List of highly reliable, active free models on OpenRouter
    const FREE_MODELS = [
      'openrouter/free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'qwen/qwen-2-7b-instruct:free',
      'google/gemma-2-9b-it:free'
    ];

    if (attempt >= FREE_MODELS.length) {
      throw new Error(`All OpenRouter free models exhausted. Last error was: ${this.lastOpenRouterError || 'Unknown error'}`);
    }

    const modelId = FREE_MODELS[attempt];
    const startTime = Date.now();
    
    try {
      console.log(`[AI] OpenRouter: Attempt ${attempt + 1} using model ${modelId}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://siteforge.ai',
          'X-Title': 'SiteForge AI Builder',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: 'You are an expert web developer. Return ONLY complete, high-quality HTML/CSS/JS code without markdown blocks.' },
            { role: 'user', content: `${context}\n\n${prompt}` }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`[AI] OpenRouter model ${modelId} failed with status ${response.status}:`, data.error?.message);
        this.lastOpenRouterError = data.error?.message || `Status ${response.status}`;
        
        // Handle rate limit delay
        if (response.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[AI] Rate limited. Retrying next model in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`[AI] Rotating to next free model...`);
        return this.generateWithOpenRouter(prompt, context, attempt + 1);
      }

      let content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.warn(`[AI] OpenRouter model ${modelId} returned empty content.`);
        this.lastOpenRouterError = 'Empty response content';
        return this.generateWithOpenRouter(prompt, context, attempt + 1);
      }

      // Clean markdown if present
      content = content.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

      console.log(`[AI] OpenRouter generation completed in ${Date.now() - startTime}ms`);
      return content;
    } catch (err) {
      console.warn(`[AI] OpenRouter attempt ${attempt + 1} with model ${modelId} threw exception:`, err.message);
      this.lastOpenRouterError = err.message;
      
      // Auto rotate
      return this.generateWithOpenRouter(prompt, context, attempt + 1);
    }
  }

  async generateWithGemini(prompt, context) {
    throw new Error('Gemini is disabled as per user request. Please use OpenRouter/KwaiPilot.');
  }

  async generateWithGPT4(prompt, context) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODELS.GPT4,
        messages: [{ role: 'user', content: `${context}\n\n${prompt}` }],
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();
  }

  getStatus() {
    return {
      primary: this.primaryProvider,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    };
  }
}

export const aiProvider = new AIProviderAdapter();
export default aiProvider;
