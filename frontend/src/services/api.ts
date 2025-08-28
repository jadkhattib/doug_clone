import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Enhanced API object with methods
const api = Object.assign(apiClient, {
  // Chat method
  chat: async (data: { message: string; persona?: string }) => {
    return await apiClient.post('/api/chat', {
      message: data.message,
      persona_id: data.persona,
      use_context: true,
      temperature: 0.7,
      max_tokens: 1000,
    })
  },

  // Ingest data method
  ingestData: async (data: { text: string; persona?: string }) => {
    return await apiClient.post('/api/ingest', {
      text: data.text,
      persona_id: data.persona,
    })
  },

  // Get personas method
  getPersonas: async () => {
    return await apiClient.get('/api/personas')
  },

  // Create persona method
  createPersona: async (data: { name: string }) => {
    return await apiClient.post('/api/personas', {
      persona_id: data.name,
    })
  },

  // Delete persona method
  deletePersona: async (personaId: string) => {
    return await apiClient.delete(`/api/personas/${personaId}`)
  },
})

// Legacy exports for backward compatibility
export const chatAPI = {
  sendMessage: async (
    messages: Array<{ role: string; content: string }>,
    personaId: string = 'default'
  ) => {
    const response = await apiClient.post('/api/chat', {
      messages,
      persona_id: personaId,
      use_context: true,
      temperature: 0.7,
      max_tokens: 1000,
    })
    return response.data
  },
}

export const ingestionAPI = {
  ingestText: async (text: string, personaId: string = 'default', metadata?: any) => {
    const response = await apiClient.post('/api/ingest', {
      text,
      persona_id: personaId,
      metadata,
    })
    return response.data
  },
}

export const personaAPI = {
  listPersonas: async () => {
    const response = await apiClient.get('/api/personas')
    return response.data
  },

  deletePersona: async (personaId: string) => {
    const response = await apiClient.delete(`/api/personas/${personaId}`)
    return response.data
  },
}

export default api
