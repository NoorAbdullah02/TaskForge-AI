import { env } from '../config/env';

if (!env.MISTRAL_API_KEY) {
    console.warn('Warning: MISTRAL_API_KEY is not defined in the environment variables.');
}

export async function generateJSONResponse<T = any>(prompt: string): Promise<T> {
    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: any = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Mistral API returned an empty completion response.');
        }

        return JSON.parse(responseText) as T;
    } catch (error) {
        console.error('Error in generateJSONResponse (Mistral):', error);
        throw error;
    }
}

export async function generateTextResponse(prompt: string, chatHistory: any[] = []): Promise<string> {
    try {
        const messages = chatHistory.map(msg => {
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (msg.parts && Array.isArray(msg.parts)) {
                content = msg.parts[0]?.text || '';
            } else if (msg.parts && typeof msg.parts === 'string') {
                content = msg.parts;
            }
            const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user';
            return { role, content };
        });

        messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${env.MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: any = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Mistral API returned an empty completion response.');
        }

        return responseText;
    } catch (error) {
        console.error('Error in generateTextResponse (Mistral):', error);
        throw error;
    }
}
