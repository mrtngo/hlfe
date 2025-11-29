# Hyperliquid LATAM - Trading de Futuros Cripto 🚀

Una interfaz de trading premium optimizada para traders hispanohablantes en América Latina. Opera futuros de Bitcoin, Ethereum y más con apalancamiento en una plataforma diseñada específicamente para la comunidad LATAM.

## ✨ Características Principales

- **🎨 Diseño Premium LATAM**: Colores vibrantes (naranjas cálidos, azules profundos, acentos dorados) con efectos glassmorphism
- **🌎 100% en Español**: Traducciones completas con terminología optimizada para América Latina
- **📱 Mobile-First**: Diseño responsivo que funciona perfectamente en todos los dispositivos
- **⚡ Tiempo Real**: Actualización de precios en vivo cada 2 segundos
- **📊 Trading Completo**: Órdenes Market/Limit, apalancamiento hasta 50x, gestión de posiciones
- **🎓 Educativo**: Tooltips explicativos para cada término de trading

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

## 📁 Estructura del Proyecto

```
/hlfe
├── app/
│   ├── globals.css       → Sistema de diseño premium
│   ├── layout.tsx         → Layout principal con SEO
│   └── page.tsx           → Dashboard de trading
├── components/
│   ├── WalletConnect.tsx  → Conexión de billetera
│   ├── MarketOverview.tsx → Lista de mercados
│   ├── TradingChart.tsx   → Gráfico de precios
│   ├── OrderPanel.tsx     → Panel de órdenes
│   └── PositionsPanel.tsx → Posiciones activas
├── hooks/
│   ├── useLanguage.tsx    → Internacionalización
│   └── useHyperliquid.tsx → Lógica de trading
└── lib/i18n/
    ├── es.json            → Traducciones español
    └── en.json            → Traducciones inglés
```

## 🎯 Funcionalidades

### Mercados
- ✅ Lista de mercados con búsqueda
- ✅ Precios en tiempo real
- ✅ Cambio 24h con indicadores visuales
- ✅ Sistema de favoritos
- ✅ Volumen y tasas de financiamiento

### Órdenes
- ✅ Órdenes Market (instantáneas)
- ✅ Órdenes Limit (precio específico)
- ✅ Apalancamiento 1x-50x con slider
- ✅ Cálculo automático de comisiones
- ✅ Precio de liquidación estimado
- ✅ Validación de balance y tamaño mínimo

### Posiciones
- ✅ Visualización de posiciones activas
- ✅ P&L en tiempo real (USD y %)
- ✅ Precios de entrada, mark y liquidación
- ✅ Indicadores Long/Short
- ✅ Cierre rápido de posiciones

### Cuenta
- ✅ Balance total
- ✅ Margen disponible/usado
- ✅ P&L no realizado
- ✅ Simulación de conexión de billetera

## 🌐 Idiomas

- **Español (ES)** - Predeterminado, optimizado para LATAM
- **Inglés (EN)** - Idioma secundario

Cambia el idioma haciendo clic en el botón 🌐 en el header.

## 🎨 Sistema de Diseño

### Colores
- **Primario**: `#FF6B35` (Naranja Cálido - Energía)
- **Secundario**: `#1E3A8A` (Azul Profundo - Confianza)
- **Acento**: `#F59E0B` (Oro - Éxito)
- **Compra**: `#10B981` (Verde - Ganancias)
- **Venta**: `#EF4444` (Rojo - Precaución)

### Tipografía
- **UI**: Inter (legible, moderna)
- **Números**: Roboto Mono (ancho fijo para precios)

## 🔧 Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS + CSS Custom Properties
- **Iconos**: Lucide React
- **Estado**: React Hooks

## 📝 Próximos Pasos

### Para Producción

1. **Integración Hyperliquid Real**:
   ```bash
   npm install @hyperliquid-dex/sdk
   ```
   Reemplaza las funciones mock en `hooks/useHyperliquid.tsx`

2. **WebSocket Real**:
   - Conecta a `wss://api.hyperliquid.xyz/ws`
   - Suscríbete a feeds de precios
   - Implementa reconexión automática

3. **Wallet Real**:
   - Integra MetaMask
   - Manejo de claves privadas
   - Firma de transacciones

### Mejoras Opcionales

- 📈 **TradingView Charts**: Gráficos profesionales interactivos
- 🎯 **Stop-Loss/Take-Profit**: Órdenes avanzadas
- 📊 **Analytics**: Historial y métricas de rendimiento
- 🔔 **Notificaciones**: Alertas de órdenes completadas
- 💱 **Monedas Locales**: Conversión a MXN, ARS, BRL, COP, CLP
- 🎓 **Tutorial Interactivo**: Onboarding para nuevos usuarios

## 🚀 Deployment

### Vercel (Recomendado)
```bash
vercel --prod
```

### Build Manual
```bash
npm run build
npm start
```

## 📱 Compatibilidad

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## 🎉 Demo

El servidor de desarrollo está corriendo en http://localhost:3000

**Características demostradas**:
- Interfaz en español con diseño LATAM
- Conexión de billetera simulada
- Selección de mercados (BTC, ETH, SOL, ARB)
- Colocación de órdenes
- Actualización de precios en tiempo real
- Responsive en todos los tamaños de pantalla

## 📄 Licencia

MIT

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Este proyecto está diseñado para servir a la comunidad hispanohablante de trading.

---

**Hecho con ❤️ para la comunidad LATAM de traders**
