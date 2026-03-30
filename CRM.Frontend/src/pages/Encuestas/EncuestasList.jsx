import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  Typography, message, Alert, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined,
  BarChartOutlined, CopyOutlined, FormOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatDate } from '../../utils/format'

const { Title, Text } = Typography
const { Option } = Select

const ESTADO_COLORS = {
  activa: 'green',
  inactiva: 'default',
  borrador: 'orange',
  archivada: 'red'
}

export default function EncuestasList() {
  const navigate = useNavigate()
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [selectedEncuesta, setSelectedEncuesta] = useState(null)
  const [contactos, setContactos] = useState([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [form] = Form.useForm()
  const [sendForm] = Form.useForm()

  const fetchEncuestas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/Encuesta')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setEncuestas(data)
    } catch {
      setError('Error al cargar encuestas')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchContactos = useCallback(async () => {
    try {
      const res = await api.get('/Contacto')
      setContactos(Array.isArray(res.data) ? res.data : (res.data?.items || []))
    } catch {}
  }, [])

  useEffect(() => {
    fetchEncuestas()
    fetchContactos()
  }, [fetchEncuestas, fetchContactos])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const res = await api.post('/Encuesta', values)
      const newId = res.data?.id || res.data?.Id
      message.success('Encuesta creada')
      setCreateModalOpen(false)
      form.resetFields()
      if (newId) {
        navigate(`/encuestas/${newId}/disenar`)
      } else {
        fetchEncuestas()
      }
    } catch (err) {
      if (!err?.errorFields) message.error('Error al crear encuesta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Encuesta/${id}`)
      message.success('Encuesta eliminada')
      fetchEncuestas()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleSend = async () => {
    try {
      const values = await sendForm.validateFields()
      setSending(true)
      await api.post(`/Encuesta/${selectedEncuesta.id || selectedEncuesta.Id}/enviar`, values)
      message.success('Encuesta enviada')
      setSendModalOpen(false)
      sendForm.resetFields()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al enviar encuesta')
    } finally {
      setSending(false)
    }
  }

  const copyLink = (encuesta) => {
    const token = encuesta.token || encuesta.Token || encuesta.id || encuesta.Id
    const url = `${window.location.origin}/encuesta/${token}`
    navigator.clipboard.writeText(url).then(() => {
      message.success('Enlace copiado al portapapeles')
    }).catch(() => {
      message.info(`Enlace: ${url}`)
    })
  }

  const columns = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => <strong>{r.nombre || r.Nombre || '-'}</strong>
    },
    {
      title: 'Categoría',
      key: 'categoria',
      render: (_, r) => r.categoria || r.Categoria ? <Tag>{r.categoria || r.Categoria}</Tag> : '-'
    },
    {
      title: '# Preguntas',
      key: 'preguntas',
      render: (_, r) => r.cantidadPreguntas || r.CantidadPreguntas || (r.preguntas || r.Preguntas || []).length || 0
    },
    {
      title: 'Enviadas',
      key: 'enviadas',
      render: (_, r) => r.enviadas || r.Enviadas || 0
    },
    {
      title: 'Completadas',
      key: 'completadas',
      render: (_, r) => r.completadas || r.Completadas || 0
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
      title: 'Acciones',
      key: 'acciones',
      width: 220,
      render: (_, r) => {
        const id = r.id || r.Id
        return (
          <Space wrap>
            <Tooltip title="Diseñar">
              <Button size="small" icon={<FormOutlined />} onClick={() => navigate(`/encuestas/${id}/disenar`)}>
                Diseñar
              </Button>
            </Tooltip>
            <Tooltip title="Resultados">
              <Button size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/encuestas/${id}/resultados`)}>
                Resultados
              </Button>
            </Tooltip>
            <Tooltip title="Enviar por WhatsApp">
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => { setSelectedEncuesta(r); sendForm.resetFields(); setSendModalOpen(true) }}
              />
            </Tooltip>
            <Tooltip title="Copiar enlace">
              <Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(r)} />
            </Tooltip>
            <Popconfirm title="¿Eliminar encuesta?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
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
        <Title level={4} style={{ margin: 0 }}>Encuestas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModalOpen(true) }}>
          Nueva Encuesta
        </Button>
      </div>

      <Table
        dataSource={encuestas}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <Modal
        title="Nueva Encuesta"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={saving}
        okText="Crear y Diseñar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la encuesta" />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Categoría" name="categoria">
            <Input placeholder="Ej: Satisfacción, NPS, Feedback..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Enviar Encuesta: ${selectedEncuesta?.nombre || selectedEncuesta?.Nombre || ''}`}
        open={sendModalOpen}
        onOk={handleSend}
        onCancel={() => setSendModalOpen(false)}
        confirmLoading={sending}
        okText="Enviar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={sendForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Contactos" name="idContactos" rules={[{ required: true, message: 'Selecciona al menos un contacto' }]}>
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="children"
              placeholder="Seleccionar contactos"
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
          <Form.Item label="Mensaje personalizado (opcional)" name="mensajePersonalizado">
            <Input.TextArea rows={2} placeholder="Hola, te invitamos a completar nuestra encuesta..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
