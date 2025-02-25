import { Ollama } from 'ollama/browser'

// Create Ollama client instance
export const ollama = new Ollama({
  host: 'http://127.0.0.1:11434'
})

// Check if Ollama is running and available
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await ollama.list()
    return true
  } catch {
    return false
  }
}

// Get list of available local models
export async function getLocalModels() {
  try {
    const response = await ollama.list()
    return response.models || []
  } catch {
    return []
  }
}

// Simple chat completion with error handling
export async function generateCompletion(model: string, messages: any[]) {
  try {
    const response = await ollama.chat({
      model,
      messages,
      stream: false
    })
    return { success: true, data: response.message.content }
  } catch (error) {
    console.error('Ollama completion error:', error)
    return { success: false, error: 'Failed to generate completion' }
  }
} 