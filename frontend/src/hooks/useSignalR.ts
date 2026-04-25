import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { getAccessToken } from '@/services/httpClient'

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export function useSignalR(hubUrl: string) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const [state, setState] = useState<ConnectionState>('disconnected')

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build()

    connection.onreconnecting(() => setState('reconnecting'))
    connection.onreconnected(() => setState('connected'))
    connection.onclose(() => setState('disconnected'))

    connectionRef.current = connection

    setState('connecting')
    connection.start()
      .then(() => setState('connected'))
      .catch(() => setState('disconnected'))

    return () => { connection.stop() }
  }, [hubUrl])

  const on = (event: string, handler: (...args: unknown[]) => void) => {
    connectionRef.current?.on(event, handler)
    return () => connectionRef.current?.off(event, handler)
  }

  return { state, on }
}
