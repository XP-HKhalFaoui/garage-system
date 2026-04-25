import axios from 'axios'

// Access token stored in memory — never in localStorage (XSS prevention)
let _accessToken: string | null = null

export const setAccessToken = (token: string | null) => { _accessToken = token }
export const getAccessToken = () => _accessToken

const httpClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request: inject Bearer token
httpClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

// Response: on 401, attempt token refresh then retry
let _isRefreshing = false
let _failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  _failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  _failedQueue = []
}

httpClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return httpClient(original)
      })
    }

    original._retry = true
    _isRefreshing = true

    try {
      const { data } = await axios.post('/api/auth/refresh', { refreshToken })
      setAccessToken(data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      processQueue(null, data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return httpClient(original)
    } catch (err) {
      processQueue(err, null)
      setAccessToken(null)
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      _isRefreshing = false
    }
  },
)

export default httpClient
