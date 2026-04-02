import React, { useState, useRef } from 'react'
import { Button, Tooltip } from 'antd'
import { AudioOutlined, StopOutlined, CloseOutlined } from '@ant-design/icons'

/**
 * Graba audio usando MediaRecorder API (webm/opus).
 * Llama onRecorded(blob) con el audio cuando el usuario para la grabación.
 */
export default function AudioRecorder({ onRecorded, onCancel }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds]     = useState(0)
  const mediaRef                  = useRef(null)
  const chunksRef                 = useRef([])
  const timerRef                  = useRef(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecorded(blob)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      onCancel()
    }
  }

  const stop = () => {
    clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setRecording(false)
    setSeconds(0)
  }

  const cancel = () => {
    clearInterval(timerRef.current)
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.ondataavailable = null
      mediaRef.current.onstop = null
      mediaRef.current.stop()
      mediaRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    setRecording(false)
    setSeconds(0)
    onCancel()
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (!recording) {
    return (
      <Tooltip title="Grabar nota de voz">
        <Button
          shape="circle"
          icon={<AudioOutlined />}
          onClick={start}
          style={{ background: '#2a3942', border: 'none', color: '#e9edef' }}
        />
      </Tooltip>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#ff4d4f', fontSize: 18 }}>●</span>
      <span style={{ color: '#e9edef', fontSize: 13, minWidth: 40 }}>{fmt(seconds)}</span>
      <Tooltip title="Enviar">
        <Button shape="circle" icon={<StopOutlined />} onClick={stop}
          style={{ background: '#00a884', border: 'none', color: '#fff' }} />
      </Tooltip>
      <Tooltip title="Cancelar">
        <Button shape="circle" icon={<CloseOutlined />} onClick={cancel}
          style={{ background: '#2a3942', border: 'none', color: '#e9edef' }} />
      </Tooltip>
    </div>
  )
}
