import React, { useState, useEffect } from 'react'
import { Tag, Popover, Button, Spin, Tooltip } from 'antd'
import { TagsOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons'
import api from '../../../api/axios'

function TagPicker({ convId, currentTags, onAdd, onRemove }) {
  const [allTags,  setAllTags]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/Etiqueta')
      .then(r => setAllTags(Array.isArray(r.data) ? r.data : (r.data?.data ?? [])))
      .catch(() => setAllTags([]))
      .finally(() => setLoading(false))
  }, [])

  const currentIds = new Set((currentTags || []).map(t => t.id || t.Id))

  if (loading) return <div style={{ padding: 12, color: '#8696a0', fontSize: 13 }}><Spin size="small" /> Cargando...</div>
  if (!allTags.length) return <div style={{ padding: 12, color: '#8696a0', fontSize: 13 }}>Sin etiquetas configuradas</div>

  return (
    <div style={{ width: 220, maxHeight: 280, overflowY: 'auto' }}>
      <div style={{ padding: '6px 10px 4px', color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Etiquetas
      </div>
      {allTags.filter(t => (t.estado ?? t.Estado) !== false).map(t => {
        const id       = t.id || t.Id
        const nombre   = t.nombre || t.Nombre || ''
        const color    = t.color  || t.Color  || '#3B82F6'
        const selected = currentIds.has(id)

        return (
          <button
            key={id}
            onClick={() => selected ? onRemove(id) : onAdd(id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', background: selected ? '#2a3942' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              borderBottom: '1px solid #1f2d34', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#1f2d34' }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'none' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: '#e9edef', fontSize: 13, flex: 1 }}>{nombre}</span>
            {selected && <CloseOutlined style={{ color: '#8696a0', fontSize: 10 }} />}
          </button>
        )
      })}
    </div>
  )
}

export default function ConvTagsSelector({ convId, tags = [], onChange }) {
  const [open,    setOpen]    = useState(false)
  const [current, setCurrent] = useState(tags)
  const [loading, setLoading] = useState(false)

  // Sync when parent updates tags
  useEffect(() => { setCurrent(tags) }, [tags])

  const handleAdd = async (idEtiqueta) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await api.post(`/Conversacion/${convId}/etiquetas`, { idEtiqueta })
      const newTag = res.data
      const updated = [...current, newTag]
      setCurrent(updated)
      onChange?.(updated)
    } catch { /* silencio */ }
    finally { setLoading(false) }
  }

  const handleRemove = async (idEtiqueta) => {
    if (loading) return
    setLoading(true)
    try {
      await api.delete(`/Conversacion/${convId}/etiquetas/${idEtiqueta}`)
      const updated = current.filter(t => (t.id || t.Id) !== idEtiqueta)
      setCurrent(updated)
      onChange?.(updated)
    } catch { /* silencio */ }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {current.map(t => {
        const id     = t.id || t.Id
        const nombre = t.nombre || t.Nombre || ''
        const color  = t.color  || t.Color  || '#3B82F6'
        return (
          <Tag
            key={id}
            closable
            onClose={e => { e.preventDefault(); handleRemove(id) }}
            style={{
              background: color + '22',
              border: `1px solid ${color}66`,
              color: color,
              borderRadius: 12,
              fontSize: 11,
              padding: '1px 8px',
              cursor: 'default',
            }}
          >
            {nombre}
          </Tag>
        )
      })}

      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomLeft"
        content={
          <TagPicker
            convId={convId}
            currentTags={current}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        }
        overlayStyle={{ zIndex: 1060 }}
        styles={{ body: { background: '#202c33', border: '1px solid #2a3942', padding: 0 } }}
      >
        <Tooltip title="Agregar etiqueta">
          <Button
            size="small"
            icon={loading ? <Spin size="small" /> : <TagsOutlined />}
            style={{
              background: '#2a3942', border: 'none',
              color: '#8696a0', borderRadius: 12,
              fontSize: 11, height: 22, padding: '0 8px',
              display: 'flex', alignItems: 'center', gap: 3
            }}
          >
            {!current.length && <PlusOutlined style={{ fontSize: 9 }} />}
          </Button>
        </Tooltip>
      </Popover>
    </div>
  )
}
