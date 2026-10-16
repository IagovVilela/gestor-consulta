import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { startGlobalLoading, stopGlobalLoading } from '@/lib/store/loading-store'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipLoading?: boolean
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.skipLoading) {
      startGlobalLoading()
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    stopGlobalLoading()
    return Promise.reject(error)
  },
)

function finishLoading(config?: InternalAxiosRequestConfig) {
  if (!config?.skipLoading) {
    stopGlobalLoading()
  }
}

api.interceptors.response.use(
  (response) => {
    finishLoading(response.config)
    return response
  },
  (error: AxiosError) => {
    finishLoading(error.config)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
