import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin, Alert, Badge, Typography, Space } from 'antd'
import {
  MessageOutlined, UserOutlined, RiseOutlined, DollarOutlined
} from '@ant-design/icons'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../api/axios'
import { formatMoney, formatDate } from '../utils/format'

const { Title, Text } = Typography

export default function Dashboard() {
  const [resumen, setResumen] = useState(null)
  const [mensajesPorDia, setMensajesPorDia] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [resumenRes, mensajesRes, pipelineRes] = await Promise.allSettled([
          api.get('/Reporte/resumen'),
          api.get('/Reporte/mensajes-por-dia?dias=30'),
          api.get('/Reporte/pipeline')
        ])
        if (resumenRes.status === 'fulfilled') setResumen(resumenRes.value.data)
        if (mensajesRes.status === 'fulfilled') {
          const data = mensajesRes.value.data
          setMensajesPorDia(Array.isArray(data) ? data : [])
        }
        if (pipelineRes.status === 'fulfilled') {
          const data = pipelineRes.value.data
          setPipeline(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        setError('Error al cargar el dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />
  }

  const totalPipeline = pipeline.reduce((acc, s) => acc + (s.valorTotal || s.ValorTotal || 0), 0)

  const chartData = mensajesPorDia.map(d => ({
    fecha: formatDate(d.fecha || d.Fecha),
    Entrantes: d.entrantes || d.Entrantes || 0,
    Salientes: d.salientes || d.Salientes || 0
  }))

  const pipelineChartData = pipeline.map(s => ({
    etapa: s.nombreEtapa || s.NombreEtapa || s.nombre || s.Nombre || 'Etapa',
    valor: s.valorTotal || s.ValorTotal || 0,
    cantidad: s.cantidad || s.Cantidad || 0
  }))

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Conversaciones Activas"
              value={resumen?.conversacionesActivas ?? resumen?.ConversacionesActivas ?? 0}
              prefix={<MessageOutlined style={{ color: '#25D366' }} />}
              valueStyle={{ color: '#25D366' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Mensajes Hoy"
              value={resumen?.mensajesHoy ?? resumen?.MensajesHoy ?? 0}
              prefix={<RiseOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Total Contactos"
              value={resumen?.totalContactos ?? resumen?.TotalContactos ?? 0}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title="Valor Pipeline"
              value={totalPipeline}
              prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(val) => formatMoney(val)}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Mensajes últimos 30 días" styles={{ body: { padding: '16px 8px' } }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Entrantes" stroke="#25D366" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Salientes" stroke="#1677ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Sin datos disponibles</div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Pipeline por Etapa" styles={{ body: { padding: '16px 8px' } }}>
            {pipelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pipelineChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val) => formatMoney(val)} />
                  <Legend />
                  <Bar dataKey="valor" name="Valor" fill="#25D366" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#1677ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Sin datos de pipeline disponibles</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
