import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space,
  Typography, message, Alert, Spin, Progress, Popconfirm, Tooltip
} from 'antd'
import {
  PlusOutlined, PlayCircleOutlined, EyeOutlined
} from '@ant-design/icons'
import api from '../../api/axios'
import { formatDateTime } from '../../utils/format'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const ESTADO_COLORS = {
  borrador: 'default',
  programada: 'blue',
  enviando: 'processing',
  completada: 'success',
  fallida: 'error',
  cancelada: 'warning'
}

export default function Campanas() {
  const [campanas, setCampanas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plantillas, setPlantillas] = useState([])
  const [contactos, setContactos] = useState([])
  const [form] = Form.useForm()
  const pollRef = useRef(null)

  const fetchCampanas = useCallback(async () => {
    try {
      const res = await api.get('/Campana')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setCampanas(data)
      return data
    } catch {
      setError('Error al cargar campañas')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSupport = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/Plantilla'),
        api.get('/Contacto')
      ])
      setPlantillas(Array.isArray(pRes.data) ? pRes.data : (pRes.data?.items || []))
      setContactos(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
    } catch {}
  }, [])

  useEffect(() => {
    fetchCampanas()
    fetchSupport()
  }, [fetchCampanas, fetchSupport])

  useEffect(() => {
    const hasActive = campanas.some(c => {
      const estado = c.estado || c.Estado
      return estado === 'enviando'
    })
    if (hasActive) {
      pollRef.current = setInterval(fetchCampanas, 2000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [campanas, fetchCampanas])

  const handleIniciar = async (id) => {
    try {
      await api.post(`/Campana/${id}/iniciar`)
      message.success('Campaña iniciada')
      fetchCampanas()
    } catch {
      message.error('Error al iniciar la campaña')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Campana/${id}`)
      message.success('Campaña eliminada')
      fetchCampanas()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        fechaProgramada: values.fechaProgramada ? values.fechaProgramada.toISOString() : null
      }
      await api.post('/Campana', payload)
      message.success('Campaña creada')
      setModalOpen(false)
      form.resetFields()
      fetchCampanas()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al crear la campaña')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => <strong>{r.nombre || r.Nombre || '-'}</strong>
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, r) => {
        const e = r.estado || r.Estado
        return <Tag color={ESTADO_COLORS[e] || 'default'}>{e || '-'}</Tag>
      }
    },
    {
      title: 'Progreso',
      key: 'progreso',
      render: (_, r) => {
        const total = r.totalContactos || r.TotalContactos || 0
        const enviados = r.mensajesEnviados || r.MensajesEnviados || 0
        const fallidos = r.mensajesFallidos || r.MensajesFallidos || 0
        if (!total) return '-'
        const pct = Math.round((enviados / total) * 100)
        const estado = r.estado || r.Estado
        return (
          <div style={{ minWidth: 160 }}>
            <Progress
              percent={pct}
              size="small"
              status={estado === 'fallida' ? 'exception' : estado === 'completada' ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {enviados}/{total} enviados{fallidos > 0 ? `, ${fallidos} fallidos` : ''}
            </Text>
          </div>
        )
      }
    },
    {
      title: 'Fecha Programada',
      key: 'fecha',
      render: (_, r) => formatDateTime(r.fechaProgramada || r.FechaProgramada) || '-'
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 140,
      render: (_, r) => {
        const id = r.id || r.Id
        const estado = r.estado || r.Estado
        return (
          <Space>
            {estado === 'borrador' && (
              <Tooltip title="Iniciar campaña">
                <Button
                  size="small"
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleIniciar(id)}
                  style={{ background: '#25D366', borderColor: '#25D366' }}
                >
                  Iniciar
                </Button>
              </Tooltip>
            )}
            <Popconfirm title="¿Eliminar campaña?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Button size="small" danger>Eliminar</Button>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  if (error) return <Alert message={error} type="error" showIcon />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Campañas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true) }}>
          Nueva Campaña
        </Button>
      </div>

      <Table
        dataSource={campanas}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <Modal
        title="Nueva Campaña"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Crear"
        cancelText="Cancelar"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la campaña" />
          </Form.Item>
          <Form.Item label="Plantilla (opcional)" name="idPlantilla">
            <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar plantilla">
              {plantillas.map(p => (
                <Option key={p.id || p.Id} value={p.id || p.Id}>{p.nombre || p.Nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Mensaje personalizado"
            name="mensaje"
            extra="Si no selecciona plantilla, escriba el mensaje aquí"
          >
            <Input.TextArea rows={4} placeholder="Escribe el mensaje de la campaña..." />
          </Form.Item>
          <Form.Item label="Contactos destinatarios" name="idContactos">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="children"
              placeholder="Seleccionar contactos"
              allowClear
            >
              {contactos.map(c => {
                const n = `${c.nombres || c.Nombres || ''} ${c.apellidos || c.Apellidos || ''}`.trim()
                const phone = c.numeroWhatsApp || c.NumeroWhatsApp || ''
                return (
                  <Option key={c.id || c.Id} value={c.id || c.Id}>
                    {n} {phone ? `(${phone})` : ''}
                  </Option>
                )
              })}
            </Select>
          </Form.Item>
          <Form.Item label="Fecha programada" name="fechaProgramada">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabledDate={d => d && d < dayjs().startOf('day')}
              placeholder="Programar envío (opcional)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
