import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Statistic, Tabs, Table, Spin, Alert, Typography, Space
} from 'antd'
import { DatePicker } from 'antd'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../../api/axios'
import { formatDate, formatMoney } from '../../utils/format'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function Reportes() {
  const [mensajes, setMensajes] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const dias = 30
        let msgUrl = `/Reporte/mensajes-por-dia?dias=${dias}`
        let pipeUrl = '/Reporte/pipeline'

        const [msgRes, pipeRes, resumenRes] = await Promise.allSettled([
          api.get(msgUrl),
          api.get(pipeUrl),
          api.get('/Reporte/resumen')
        ])

        if (msgRes.status === 'fulfilled') {
          const data = Array.isArray(msgRes.value.data) ? msgRes.value.data : []
          setMensajes(data)
        }
        if (pipeRes.status === 'fulfilled') {
          const data = Array.isArray(pipeRes.value.data) ? pipeRes.value.data : []
          setPipeline(data)
        }
        if (resumenRes.status === 'fulfilled') {
          setResumen(resumenRes.value.data)
        }
      } catch {
        setError('Error al cargar reportes')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [dateRange])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />

  const mensajesChartData = mensajes.map(d => ({
    fecha: formatDate(d.fecha || d.Fecha),
    Entrantes: d.entrantes || d.Entrantes || 0,
    Salientes: d.salientes || d.Salientes || 0,
    Total: (d.entrantes || d.Entrantes || 0) + (d.salientes || d.Salientes || 0)
  }))

  const totalEntrantes = mensajes.reduce((acc, d) => acc + (d.entrantes || d.Entrantes || 0), 0)
  const totalSalientes = mensajes.reduce((acc, d) => acc + (d.salientes || d.Salientes || 0), 0)

  const pipelineChartData = pipeline.map(s => ({
    etapa: s.nombreEtapa || s.NombreEtapa || s.nombre || s.Nombre || 'Etapa',
    valor: s.valorTotal || s.ValorTotal || 0,
    cantidad: s.cantidad || s.Cantidad || 0
  }))

  const pipelineColumns = [
    { title: 'Etapa', dataIndex: 'etapa', key: 'etapa' },
    { title: 'Oportunidades', dataIndex: 'cantidad', key: 'cantidad' },
    { title: 'Valor Total', dataIndex: 'valor', key: 'valor', render: (val) => formatMoney(val) }
  ]

  const totalPipelineValor = pipeline.reduce((acc, s) => acc + (s.valorTotal || s.ValorTotal || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Reportes</Title>
        <RangePicker
          onChange={setDateRange}
          placeholder={['Fecha inicio', 'Fecha fin']}
        />
      </div>

      <Tabs
        items={[
          {
            key: 'mensajes',
            label: 'Mensajes',
            children: (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Total Entrantes (30 días)"
                        value={totalEntrantes}
                        valueStyle={{ color: '#25D366' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Total Salientes (30 días)"
                        value={totalSalientes}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Conversaciones Activas"
                        value={resumen?.conversacionesActivas ?? resumen?.ConversacionesActivas ?? 0}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Mensajes Hoy"
                        value={resumen?.mensajesHoy ?? resumen?.MensajesHoy ?? 0}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="Mensajes por Día (últimos 30 días)" styles={{ body: { padding: '16px 8px' } }}>
                  {mensajesChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mensajesChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Entrantes" stroke="#25D366" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Salientes" stroke="#1677ff" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Total" stroke="#fa8c16" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Sin datos</div>
                  )}
                </Card>
              </div>
            )
          },
          {
            key: 'pipeline',
            label: 'Pipeline',
            children: (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Valor Total Pipeline"
                        value={totalPipelineValor}
                        formatter={v => formatMoney(v)}
                        valueStyle={{ color: '#25D366' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Total Oportunidades"
                        value={pipeline.reduce((acc, s) => acc + (s.cantidad || s.Cantidad || 0), 0)}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="Etapas Activas"
                        value={pipeline.length}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="Valor por Etapa" styles={{ body: { padding: '16px 8px' } }}>
                      {pipelineChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={pipelineChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="etapa" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val, name) => name === 'valor' ? formatMoney(val) : val} />
                            <Legend />
                            <Bar dataKey="valor" name="Valor" fill="#25D366" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cantidad" name="Cantidad" fill="#1677ff" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Sin datos</div>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="Detalle por Etapa">
                      <Table
                        dataSource={pipelineChartData}
                        columns={pipelineColumns}
                        rowKey="etapa"
                        pagination={false}
                        size="small"
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <strong>{pipelineChartData.reduce((a, d) => a + d.cantidad, 0)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <strong>{formatMoney(totalPipelineValor)}</strong>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          }
        ]}
      />
    </div>
  )
}
