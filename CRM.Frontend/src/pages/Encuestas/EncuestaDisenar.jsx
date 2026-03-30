import React, { useState, useEffect } from 'react'
import {
  Card, Button, Input, Select, Switch, Space, Spin, Alert,
  Typography, message, Tooltip, Form, Divider, Tag
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ArrowLeftOutlined, SaveOutlined,
  MenuOutlined, HolderOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../../api/axios'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const TIPOS = [
  { value: 'texto_corto', label: 'Texto Corto', icon: 'T' },
  { value: 'texto_largo', label: 'Texto Largo', icon: '≡' },
  { value: 'opcion_unica', label: 'Opción Única', icon: '◉' },
  { value: 'opcion_multiple', label: 'Opción Múltiple', icon: '☑' },
  { value: 'escala', label: 'Escala', icon: '⭐' },
  { value: 'fecha', label: 'Fecha', icon: '📅' },
  { value: 'si_no', label: 'Sí / No', icon: '✓✗' },
  { value: 'desplegable', label: 'Desplegable', icon: '▾' }
]

function SortableQuestion({ pregunta, index, isSelected, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(pregunta.id || pregunta.tempId)
  })

  const tipo = TIPOS.find(t => t.value === (pregunta.tipo || pregunta.Tipo))
  const titulo = pregunta.titulo || pregunta.Titulo || `Pregunta ${index + 1}`

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: isSelected ? '#e6f7ff' : '#fff',
        border: `1px solid ${isSelected ? '#1677ff' : '#f0f0f0'}`,
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}
      onClick={onClick}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 16 }}>
        <HolderOutlined />
      </span>
      <div style={{
        width: 28, height: 28,
        background: '#f0f2f5',
        borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, flexShrink: 0
      }}>
        {tipo?.icon || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {titulo}
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>{tipo?.label || 'Desconocido'}</div>
      </div>
      {(pregunta.obligatorio || pregunta.Obligatorio) && (
        <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>*</Tag>
      )}
      <Button
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ flexShrink: 0 }}
      />
    </div>
  )
}

function QuestionEditor({ pregunta, onChange }) {
  if (!pregunta) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Text type="secondary">Selecciona una pregunta para editarla</Text>
    </div>
  )

  const tipo = pregunta.tipo || pregunta.Tipo
  const opciones = pregunta.opciones || pregunta.Opciones || []

  const update = (field, value) => {
    onChange({ ...pregunta, [field]: value })
  }

  const addOpcion = () => {
    const newOp = { id: Date.now(), texto: '', valor: opciones.length + 1 }
    update('opciones', [...opciones, newOp])
  }

  const removeOpcion = (idx) => {
    update('opciones', opciones.filter((_, i) => i !== idx))
  }

  const updateOpcion = (idx, text) => {
    const updated = opciones.map((o, i) => i === idx ? { ...o, texto: text } : o)
    update('opciones', updated)
  }

  return (
    <div>
      <Form layout="vertical">
        <Form.Item label="Tipo de pregunta">
          <Select value={tipo} onChange={v => update('tipo', v)} style={{ width: '100%' }}>
            {TIPOS.map(t => (
              <Option key={t.value} value={t.value}>
                <Space>
                  <span style={{ fontWeight: 600 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Título de la pregunta">
          <Input
            value={pregunta.titulo || pregunta.Titulo || ''}
            onChange={e => update('titulo', e.target.value)}
            placeholder="Escribe la pregunta..."
          />
        </Form.Item>
        <Form.Item label="Descripción / ayuda (opcional)">
          <Input
            value={pregunta.descripcion || pregunta.Descripcion || ''}
            onChange={e => update('descripcion', e.target.value)}
            placeholder="Texto de ayuda..."
          />
        </Form.Item>
        <Form.Item label="¿Obligatoria?">
          <Switch
            checked={pregunta.obligatorio || pregunta.Obligatorio || false}
            onChange={v => update('obligatorio', v)}
            checkedChildren="Sí"
            unCheckedChildren="No"
          />
        </Form.Item>

        {['opcion_unica', 'opcion_multiple', 'desplegable'].includes(tipo) && (
          <Form.Item label="Opciones de respuesta">
            {opciones.map((op, idx) => (
              <div key={op.id || idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  value={op.texto || op.Texto || ''}
                  onChange={e => updateOpcion(idx, e.target.value)}
                  placeholder={`Opción ${idx + 1}`}
                  style={{ flex: 1 }}
                />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeOpcion(idx)} />
              </div>
            ))}
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={addOpcion}
              style={{ width: '100%', marginTop: 4 }}
              type="dashed"
            >
              Agregar opción
            </Button>
          </Form.Item>
        )}

        {tipo === 'escala' && (
          <Form.Item label="Escala">
            <Select
              value={pregunta.escalaMax || pregunta.EscalaMax || 5}
              onChange={v => update('escalaMax', v)}
            >
              <Option value={5}>1 - 5 estrellas</Option>
              <Option value={10}>1 - 10 (slider)</Option>
            </Select>
          </Form.Item>
        )}

        <Divider style={{ margin: '16px 0' }} />
        <Form.Item label="Lógica condicional">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Mostrar esta pregunta solo si:
          </Text>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Input
              placeholder="ID de pregunta"
              value={pregunta.condicionPreguntaId || ''}
              onChange={e => update('condicionPreguntaId', e.target.value)}
              style={{ width: 120 }}
            />
            <Text style={{ lineHeight: '32px' }}>=</Text>
            <Input
              placeholder="Valor esperado"
              value={pregunta.condicionValor || ''}
              onChange={e => update('condicionValor', e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </Form.Item>
      </Form>
    </div>
  )
}

export default function EncuestaDisenar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [encuesta, setEncuesta] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  let tempCounter = 1

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/Encuesta/${id}`)
        const data = res.data
        setEncuesta(data)
        setNombre(data.nombre || data.Nombre || '')
        setDescripcion(data.descripcion || data.Descripcion || '')
        const preg = (data.preguntas || data.Preguntas || []).map((p, i) => ({
          ...p,
          tempId: p.id || p.Id || `temp_${i}`
        }))
        setPreguntas(preg)
      } catch {
        setError('Error al cargar la encuesta')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  const addPregunta = () => {
    const newP = {
      tempId: `new_${Date.now()}`,
      tipo: 'texto_corto',
      titulo: '',
      descripcion: '',
      obligatorio: false,
      opciones: [],
      orden: preguntas.length + 1
    }
    const updated = [...preguntas, newP]
    setPreguntas(updated)
    setSelectedIdx(updated.length - 1)
  }

  const deletePregunta = (idx) => {
    const updated = preguntas.filter((_, i) => i !== idx)
    setPreguntas(updated)
    if (selectedIdx === idx) setSelectedIdx(null)
    else if (selectedIdx > idx) setSelectedIdx(selectedIdx - 1)
  }

  const updatePregunta = (idx, updated) => {
    setPreguntas(prev => prev.map((p, i) => i === idx ? updated : p))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = preguntas.findIndex(p => String(p.id || p.tempId) === String(active.id))
    const newIdx = preguntas.findIndex(p => String(p.id || p.tempId) === String(over.id))
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(preguntas, oldIdx, newIdx)
      setPreguntas(reordered)
      if (selectedIdx === oldIdx) setSelectedIdx(newIdx)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        nombre,
        descripcion,
        preguntas: preguntas.map((p, i) => ({
          ...p,
          orden: i + 1,
          id: typeof p.id === 'number' ? p.id : undefined
        }))
      }
      await api.put(`/Encuesta/${id}`, payload)
      message.success('Encuesta guardada')
    } catch {
      message.error('Error al guardar la encuesta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/encuestas')}>
            Volver
          </Button>
          <Title level={4} style={{ margin: 0 }}>Diseñador de Encuesta</Title>
        </Space>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          Guardar
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="Nombre de la encuesta">
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre de la encuesta"
              style={{ maxWidth: 500 }}
            />
          </Form.Item>
          <Form.Item label="Descripción" style={{ marginBottom: 0 }}>
            <Input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción breve..."
              style={{ maxWidth: 500 }}
            />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <Card
            title={`Preguntas (${preguntas.length})`}
            extra={
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addPregunta}>
                Agregar
              </Button>
            }
            styles={{ body: { padding: '12px' } }}
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={preguntas.map(p => String(p.id || p.tempId))}
                strategy={verticalListSortingStrategy}
              >
                {preguntas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text type="secondary">Sin preguntas aún</Text>
                    <div style={{ marginTop: 8 }}>
                      <Button type="dashed" icon={<PlusOutlined />} onClick={addPregunta} block>
                        Agregar primera pregunta
                      </Button>
                    </div>
                  </div>
                ) : (
                  preguntas.map((p, idx) => (
                    <SortableQuestion
                      key={p.id || p.tempId || idx}
                      pregunta={p}
                      index={idx}
                      isSelected={selectedIdx === idx}
                      onClick={() => setSelectedIdx(idx)}
                      onDelete={() => deletePregunta(idx)}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </Card>
        </div>

        <div style={{ flex: 1 }}>
          <Card title={selectedIdx !== null ? `Editando pregunta ${selectedIdx + 1}` : 'Editor de Pregunta'} style={{ minHeight: 400 }}>
            <QuestionEditor
              pregunta={selectedIdx !== null ? preguntas[selectedIdx] : null}
              onChange={(updated) => {
                if (selectedIdx !== null) updatePregunta(selectedIdx, updated)
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
