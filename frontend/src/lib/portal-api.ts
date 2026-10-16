import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { startGlobalLoading, stopGlobalLoading } from '@/lib/store/loading-store'

const portalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

portalApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.skipLoading) {
      startGlobalLoading()
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

portalApi.interceptors.response.use(
  (response) => {
    finishLoading(response.config)
    return response
  },
  (error: AxiosError) => {
    finishLoading(error.config)
    return Promise.reject(error)
  },
)

export function portalErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export default portalApi
