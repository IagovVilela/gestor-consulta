import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Log apenas para requisições de clínicas para debug
      if (config.url?.includes('clinicas')) {
        console.log('📤 Requisição de clínica:', {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          tokenPreview: token.substring(0, 20) + '...',
        })
      }
    } else {
      console.warn('⚠️ Requisição sem token:', config.url)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor para tratar erros
api.interceptors.response.use(
  (response) => {
    // Log de respostas bem-sucedidas para debug
    if (response.config.url?.includes('clinicas')) {
      console.log('✅ Resposta de clínica (interceptor):', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        data: response.data,
        dataType: Array.isArray(response.data) ? 'Array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
      })
      console.log('✅ Resposta completa (interceptor):', response)
    }
    return response
  },
  (error) => {
    // Log detalhado de erros
    if (error.config?.url?.includes('clinicas')) {
      console.error('❌ Erro na requisição de clínica:', {
        url: error.config.url,
        method: error.config.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    }
    
    if (error.response?.status === 401) {
      // Não redirecionar se já estiver na página de login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api


