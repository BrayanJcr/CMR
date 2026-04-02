import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#25D366', borderRadius: 6 } }}>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
)
