import React, { useState, useEffect, useCallback } from 'react'
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  Typography, Tag, Space, Spin, Alert, message, Tooltip
} from 'antd'
import {
  PlusOutlined, DollarOutlined
} from '@ant-design/icons'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatMoney, formatDate } from '../../utils/format'
import { getPrioridadColor, getPrioridadLabel } from '../../utils/prioridad'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

function KanbanCard({ oportunidad, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(oportunidad.id || oportunidad.Id),
    data: { oportunidad }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  const prioridad = oportunidad.prioridad || oportunidad.Prioridad
  const monto = oportunidad.monto || oportunidad.Monto || 0
  const titulo = oportunidad.titulo || oportunidad.Titulo || 'Sin título'
  const contactoNombre = oportunidad.contacto?.nombre || oportunidad.Contacto?.Nombre ||
    oportunidad.nombreContacto || oportunidad.NombreContacto || ''
  const empresaNombre = oportunidad.empresa?.nombre || oportunidad.Empresa?.Nombre ||
    oportunidad.nombreEmpresa || ''
  const fechaCierre = oportunidad.fechaCierre || oportunidad.FechaCierre

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={onClick}
    >
      <div style={{ marginBottom: 6 }}>
        <Text strong style={{ fontSize: 13 }}>{titulo}</Text>
      </div>
      {contactoNombre && <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{contactoNombre}</div>}
      {empresaNombre && <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{empresaNombre}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#25D366', fontWeight: 600, fontSize: 13 }}>
          {formatMoney(monto)}
        </Text>
        {prioridad && (
          <Tag color={getPrioridadColor(prioridad)} style={{ fontSize: 10, padding: '0 6px' }}>
            {getPrioridadLabel(prioridad)}
          </Tag>
        )}
      </div>
      {fechaCierre && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          Cierre: {formatDate(fechaCierre)}
        </div>
      )}
    </div>
  )
}

function DroppableColumn({ columna, oportunidades, onAddClick, navigate }) {
  const { setNodeRef, isOver } = useSortable({
    id: `col-${columna.id || columna.Id}`,
    data: { isColumn: true, columnaId: columna.id || columna.Id }
  })

  const totalValor = oportunidades.reduce((acc, o) => acc + (o.monto || o.Monto || 0), 0)
  const color = columna.color || columna.Color || '#1677ff'
  const nombre = columna.nombre || columna.Nombre || 'Etapa'

  return (
    <div
      className="kanban-col"
      style={{ background: isOver ? '#e6f7ff' : '#f4f6f8', transition: 'background 0.15s' }}
    >
      <div className="kanban-col-header">
        <Space>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
          <span>{nombre}</span>
          <Tag style={{ fontSize: 11 }}>{oportunidades.length}</Tag>
        </Space>
        <Space>
          <Text style={{ fontSize: 12, color: '#666' }}>{formatMoney(totalValor)}</Text>
          <Tooltip title="Nueva oportunidad">
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => { e.stopPropagation(); onAddClick(columna) }}
              style={{ padding: '0 6px' }}
            />
          </Tooltip>
        </Space>
      </div>
      <SortableContext
        items={oportunidades.map(o => String(o.id || o.Id))}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} style={{ minHeight: 80 }}>
          {oportunidades.map(op => (
            <KanbanCard
              key={op.id || op.Id}
              oportunidad={op}
              onClick={() => navigate(`/oportunidades/${op.id || op.Id}`)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Pipeline() {
  const navigate = useNavigate()
  const [kanban, setKanban] = useState(null)
  const [columnas, setColumnas] = useState([])
  const [oportunidadesByCol, setOportunidadesByCol] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultEtapa, setDefaultEtapa] = useState(null)
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [saving, setSaving] = useState(false)
  const [activeOp, setActiveOp] = useState(null)
  const [form] = Form.useForm()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchKanban = useCallback(async () => {
    try {
      const res = await api.get('/Pipeline/kanban')
      const data = res.data
      setKanban(data)
      const cols = data.columnas || data.Columnas || data.etapas || data.Etapas || []
      setColumnas(cols)
      const ops = data.oportunidades || data.Oportunidades || []
      const byCol = {}
      cols.forEach(c => {
        const cid = c.id || c.Id
        byCol[cid] = ops.filter(o =>
          (o.idEtapa || o.IdEtapa || o.etapa?.id || o.Etapa?.Id) === cid
        )
      })
      setOportunidadesByCol(byCol)
    } catch {
      setError('Error al cargar el pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSupport = useCallback(async () => {
    try {
      const [cRes, eRes] = await Promise.all([
        api.get('/Contacto'),
        api.get('/Empresa')
      ])
      setContactos(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
      setEmpresas(Array.isArray(eRes.data) ? eRes.data : (eRes.data?.items || []))
    } catch {}
  }, [])

  useEffect(() => {
    fetchKanban()
    fetchSupport()
  }, [fetchKanban, fetchSupport])

  const handleDragStart = (event) => {
    const op = event.active?.data?.current?.oportunidad
    if (op) setActiveOp(op)
  }

  const handleDragEnd = async (event) => {
    setActiveOp(null)
    const { active, over } = event
    if (!over || !active) return

    const activeId = active.id
    const overId = over.id

    let targetColId = null
    if (String(overId).startsWith('col-')) {
      targetColId = parseInt(overId.replace('col-', ''))
    } else {
      for (const [colId, ops] of Object.entries(oportunidadesByCol)) {
        if (ops.find(o => String(o.id || o.Id) === String(overId))) {
          targetColId = parseInt(colId)
          break
        }
      }
    }

    if (!targetColId) return

    let sourceColId = null
    let draggedOp = null
    for (const [colId, ops] of Object.entries(oportunidadesByCol)) {
      const found = ops.find(o => String(o.id || o.Id) === String(activeId))
      if (found) {
        sourceColId = parseInt(colId)
        draggedOp = found
        break
      }
    }

    if (!draggedOp || sourceColId === targetColId) return

    const opId = draggedOp.id || draggedOp.Id
    setOportunidadesByCol(prev => {
      const next = { ...prev }
      next[sourceColId] = (next[sourceColId] || []).filter(o => (o.id || o.Id) !== opId)
      next[targetColId] = [...(next[targetColId] || []), { ...draggedOp, idEtapa: targetColId }]
      return next
    })

    try {
      await api.put(`/Oportunidad/${opId}/etapa`, { idEtapa: targetColId })
    } catch {
      message.error('Error al mover la oportunidad')
      fetchKanban()
    }
  }

  const openAddModal = (columna) => {
    setDefaultEtapa(columna?.id || columna?.Id || null)
    form.resetFields()
    if (columna) {
      form.setFieldValue('idEtapa', columna.id || columna.Id)
    }
    setModalOpen(true)
  }

  const handleSaveOportunidad = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        fechaCierre: values.fechaCierre ? values.fechaCierre.toISOString() : null
      }
      await api.post('/Oportunidad', payload)
      message.success('Oportunidad creada')
      setModalOpen(false)
      fetchKanban()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al crear la oportunidad')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon action={<Button onClick={fetchKanban}>Reintentar</Button>} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Pipeline de Ventas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal(null)}>
          Nueva Oportunidad
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {columnas.map(col => {
            const colId = col.id || col.Id
            return (
              <DroppableColumn
                key={colId}
                columna={col}
                oportunidades={oportunidadesByCol[colId] || []}
                onAddClick={openAddModal}
                navigate={navigate}
              />
            )
          })}
        </div>
        <DragOverlay>
          {activeOp ? (
            <div className="kanban-card" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.2)', opacity: 0.9 }}>
              <Text strong>{activeOp.titulo || activeOp.Titulo}</Text>
              <div style={{ color: '#25D366', marginTop: 4 }}>
                {formatMoney(activeOp.monto || activeOp.Monto || 0)}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        title="Nueva Oportunidad"
        open={modalOpen}
        onOk={handleSaveOportunidad}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Crear"
        cancelText="Cancelar"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Título" name="titulo" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Nombre de la oportunidad" />
          </Form.Item>
          <Form.Item label="Etapa" name="idEtapa" rules={[{ required: true }]}>
            <Select placeholder="Seleccionar etapa">
              {columnas.map(c => (
                <Option key={c.id || c.Id} value={c.id || c.Id}>{c.nombre || c.Nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Monto" name="monto">
            <InputNumber
              style={{ width: '100%' }}
              prefix={<DollarOutlined />}
              formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={val => val.replace(/[,$]/g, '')}
              min={0}
            />
          </Form.Item>
          <Form.Item label="Contacto" name="idContacto">
            <Select showSearch optionFilterProp="children" allowClear placeholder="Seleccionar contacto">
              {contactos.map(c => {
                const nom = `${c.nombres || c.Nombres || ''} ${c.apellidos || c.Apellidos || ''}`.trim()
                return <Option key={c.id || c.Id} value={c.id || c.Id}>{nom}</Option>
              })}
            </Select>
          </Form.Item>
          <Form.Item label="Empresa" name="idEmpresa">
            <Select showSearch optionFilterProp="children" allowClear placeholder="Seleccionar empresa">
              {empresas.map(e => (
                <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Prioridad" name="prioridad">
            <Select>
              <Option value="baja">Baja</Option>
              <Option value="media">Media</Option>
              <Option value="alta">Alta</Option>
              <Option value="urgente">Urgente</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Fecha de cierre" name="fechaCierre">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
