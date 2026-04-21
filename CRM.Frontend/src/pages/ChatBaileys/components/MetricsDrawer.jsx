import React, { useState, useEffect } from 'react'
import { Drawer, Spin, Statistic, Badge } from 'antd'
import {
  BarChartOutlined, MessageOutlined, UserOutlined,
  ClockCircleOutlined, BellOutlined, TeamOutlined
} from '@ant-design/icons'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import api from '../../../api/axios'

const ESTADO_COLOR  = { abierta: '#52c41a', en_progreso: '#1677ff', resuelta: '#8696a0', spam: '#ff4d4f' }
const ESTADO_LABEL  = { abierta: 'Abiertas', en_progreso: 'En progreso', resuelta: 'Resueltas', spam: 'Spam' }

function KpiCard({ icon, label, value, sub, color = '#e9edef' }) {
  return (
    <div style={{
      background: '#202c33', borderRadius: 10, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid #2a3942',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8696a0', fontSize: 12 }}>
        {icon} {label}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#8696a0', fontSize: 11 }}>{sub}</div>}
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#202c33', border: '1px solid #2a3942', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#8696a0', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  )
}

export default function MetricsDrawer({ open, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get('/Metricas/chat')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChartOutlined style={{ color: '#00a884' }} />
          <span>Métricas del Chat</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={480}
      styles={{
        header:  { background: '#202c33', borderBottom: '1px solid #2a3942', color: '#e9edef' },
        body:    { background: '#111b21', padding: '16px' },
        wrapper: { background: '#111b21' },
      }}
    >
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" tip="Cargando métricas..." />
        </div>
      )}

      {!loading && !data && (
        <div style={{ color: '#8696a0', textAlign: 'center', padding: 32, fontSize: 14 }}>
          No se pudieron cargar las métricas
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPIs de hoy */}
          <section>
            <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Hoy</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KpiCard
                icon={<MessageOutlined />}
                label="Mensajes recibidos"
                value={data.mensajesHoy?.entrantes ?? 0}
                color="#00a884"
              />
              <KpiCard
                icon={<MessageOutlined />}
                label="Mensajes enviados"
                value={data.mensajesHoy?.salientes ?? 0}
                color="#53bdeb"
              />
            </div>
          </section>

          {/* KPIs generales */}
          <section>
            <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Conversaciones activas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KpiCard icon={<UserOutlined />} label="Total activas"      value={data.totalConversaciones} />
              <KpiCard icon={<BellOutlined />}  label="Recordatorios"
                value={data.recordatorios?.pendientes ?? 0}
                sub={data.recordatorios?.vencidos > 0 ? `${data.recordatorios.vencidos} vencidos` : null}
                color={data.recordatorios?.vencidos > 0 ? '#fa8c16' : '#e9edef'}
              />
            </div>
          </section>

          {/* Donut de estados */}
          <section>
            <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Por estado</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(data.porEstado || {}).map(([k, v]) => (
                <div key={k} style={{
                  background: (ESTADO_COLOR[k] || '#8696a0') + '22',
                  border: `1px solid ${(ESTADO_COLOR[k] || '#8696a0')}44`,
                  borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 80, textAlign: 'center',
                }}>
                  <div style={{ color: ESTADO_COLOR[k] || '#8696a0', fontSize: 22, fontWeight: 700 }}>{v}</div>
                  <div style={{ color: '#8696a0', fontSize: 11 }}>{ESTADO_LABEL[k] || k}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Actividad por hora */}
          <section>
            <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Actividad por hora (hoy)</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.porHora || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d34" />
                <XAxis dataKey="hora" tick={{ fill: '#8696a0', fontSize: 10 }}
                  tickFormatter={h => h % 3 === 0 ? `${h}h` : ''} />
                <YAxis tick={{ fill: '#8696a0', fontSize: 10 }} />
                <RTooltip content={<ChartTooltip />} />
                <Bar dataKey="entrantes" name="Recibidos" fill="#00a884"  radius={[2, 2, 0, 0]} />
                <Bar dataKey="salientes" name="Enviados"  fill="#53bdeb"  radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Actividad últimos 7 días */}
          <section>
            <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Últimos 7 días</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.porDia || []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2d34" />
                <XAxis dataKey="label" tick={{ fill: '#8696a0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8696a0', fontSize: 10 }} />
                <RTooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: '#8696a0', fontSize: 11 }} />
                <Line type="monotone" dataKey="entrantes" name="Recibidos" stroke="#00a884" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="salientes" name="Enviados"  stroke="#53bdeb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conversaciones" name="Nuevas convs." stroke="#fa8c16" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Top agentes */}
          {data.topAgentes?.length > 0 && (
            <section>
              <h4 style={{ color: '#8696a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                <TeamOutlined style={{ marginRight: 4 }} /> Agentes con más conversaciones
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.topAgentes.map((a, i) => {
                  const pct = Math.round((a.cantidad / data.totalConversaciones) * 100)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#8696a0', fontSize: 11, width: 16, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                      <span style={{ color: '#e9edef', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agente}</span>
                      <div style={{ width: 80, height: 6, background: '#2a3942', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#00a884', borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#00a884', fontSize: 12, width: 28, textAlign: 'right', flexShrink: 0 }}>{a.cantidad}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>
      )}
    </Drawer>
  )
}
