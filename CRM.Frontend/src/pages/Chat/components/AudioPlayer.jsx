import { useState, useRef } from 'react'
import { AudioOutlined } from '@ant-design/icons'

// Patrón fijo de barras — visual de waveform
const BARS = [3,4,6,8,5,9,7,6,4,8,10,7,5,6,9,8,4,6,5,8,7,6,4,5,9,8,6,5,4,3]

function formatTime(secs) {
  if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ src, isIncoming }) {
  const audioRef        = useRef(null)
  const waveRef         = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed]       = useState(1)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause() } else { a.play() }
    setPlaying(p => !p)
  }

  const onLoadedMetadata = () => setDuration(audioRef.current.duration)

  const onTimeUpdate = () => {
    const a = audioRef.current
    setCurrentTime(a.currentTime)
    setProgress((a.currentTime / a.duration) * 100 || 0)
  }

  const onEnded = () => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const seek = (e) => {
    const rect = waveRef.current.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (audioRef.current) audioRef.current.currentTime = pct * audioRef.current.duration
  }

  const cycleSpeed = (e) => {
    e.stopPropagation()
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const timeLabel = (playing || progress > 0) ? formatTime(currentTime) : formatTime(duration)

  return (
    <div className={`wap ${isIncoming ? 'wap--in' : 'wap--out'}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      />

      {/* Avatar micrófono */}
      <div className="wap-avatar">
        <AudioOutlined />
      </div>

      {/* Play / Pause */}
      <button className="wap-playbtn" onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproducir'}>
        {playing
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        }
      </button>

      {/* Zona central: waveform + meta */}
      <div className="wap-body">
        <div className="wap-wave" ref={waveRef} onClick={seek} title="Click para saltar">
          {BARS.map((h, i) => (
            <div
              key={i}
              className={`wap-bar ${(i / BARS.length) * 100 <= progress ? 'wap-bar--active' : ''}`}
              style={{ height: `${h * 2}px` }}
            />
          ))}
        </div>
        <div className="wap-meta">
          <span className="wap-time">{timeLabel}</span>
          <button className="wap-speed" onClick={cycleSpeed}>{speed}×</button>
        </div>
      </div>
    </div>
  )
}
