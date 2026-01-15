# Documentación Técnica

Detalles técnicos sobre la arquitectura, integraciones e implementación de Rayo para desarrolladores y usuarios avanzados.

## Resumen de Arquitectura

### Stack Tecnológico

**Frontend:**
- **Framework:** Next.js 16 (React 19)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS + Sistema de Diseño Personalizado
- **Gestión de Estado:** React Context + Hooks
- **Gráficos:** TradingView (embebido)

**Integración de Wallet:**
- **Privy:** Wallet embebida (autenticación email/teléfono)
- **WalletConnect:** Conexiones de wallets externas
- **Wallets soportadas:** MetaMask, Coinbase Wallet, Rainbow, etc.

**Blockchain:**
- **Capa de Trading:** Hyperliquid L1
- **Capa de Puenteo:** Arbitrum
- **Puentes Cross-chain:** Rhino.fi SDK

**Backend/APIs:**
- **API Hyperliquid:** Ejecución de órdenes, datos de mercado, info de cuenta
- **API Rhino.fi:** Puenteo cross-chain
- **API Interna:** Preferencias de usuario, analytics

---

## Integración Hyperliquid

### ¿Qué es Hyperliquid?

Hyperliquid es una blockchain Layer 1 optimizada para trading descentralizado de futuros perpetuos.

**Características clave:**
- **Order book on-chain** - Totalmente transparente
- **Finalidad subsegundo** - Ejecución ~200ms
- **Motor de matching nativo** - Sin componentes off-chain
- **Liquidez profunda** - Miles de millones en TVL
- **100+ mercados** - Cripto y acciones tokenizadas

**Website:** https://hyperliquid.xyz

---

### Endpoints de API

Rayo usa la API pública de Hyperliquid:

**URL Base:**
```
https://api.hyperliquid.xyz
```

**Endpoints clave:**

#### 1. Datos de Mercado

**Obtener todos los mercados:**
```
GET /info
POST {"type": "meta"}
```

**Obtener orderbook:**
```
POST /info
{"type": "l2Book", "coin": "BTC"}
```

**Obtener operaciones recientes:**
```
POST /info
{"type": "trades", "coin": "BTC"}
```

---

#### 2. Datos de Cuenta

**Obtener estado de cuenta:**
```
POST /info
{"type": "clearinghouseState", "user": "0x..."}
```

**La respuesta incluye:**
- Posiciones abiertas
- Margen disponible
- P&L no realizado
- Margen cross vs aislado

---

#### 3. Ejecución de Órdenes

**Colocar orden:**
```
POST /exchange
{
  "action": {
    "type": "order",
    "orders": [{
      "a": 1, // índice de activo
      "b": true, // es compra
      "p": "96000", // precio
      "s": "0.01", // tamaño
      "r": false, // solo reducir
      "t": {"limit": {"tif": "Gtc"}} // tipo de orden
    }],
    "grouping": "na"
  },
  "nonce": timestamp,
  "signature": {...}
}
```

---

### Autenticación y Firma

Las órdenes deben ser firmadas con tu clave privada usando firma de datos estructurados EIP-712.

**Proceso de firma:**
1. Construir objeto de orden
2. Hash con dominio EIP-712
3. Firmar con clave privada (ethers.js/viem)
4. Enviar mensaje firmado a `/exchange`

**Agent wallet:**
- El usuario aprueba el agente una vez
- La clave del agente puede firmar órdenes en nombre del usuario
- Habilita UX de trading sin gas

---

## Integración de Wallet (Privy)

### Configuración de Privy

Rayo usa Privy para autenticación de wallet sin problemas.

**Métodos de login soportados:**
- Email (verificación OTP)
- Teléfono (verificación SMS)
- Logins sociales (Google, Apple, Discord - si está habilitado)
- Wallets externas (MetaMask, WalletConnect)

**Configuración:**
```typescript
<PrivyProvider
  appId="YOUR_PRIVY_APP_ID"
  config={{
    loginMethods: ['email', 'wallet'],
    appearance: {
      theme: 'dark',
      accentColor: '#FACC15', // Amarillo Rayo
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
  }}
>
  {children}
</PrivyProvider>
```

**Características clave:**
- Wallets embebidas no custodiales
- Exportar claves privadas
- Soporte multi-chain
- Integración WalletConnect

---

## Arquitectura de Puenteo

### Puente Arbitrum ↔ Hyperliquid

**Cómo funciona:**

1. **Depósito (Arbitrum → Hyperliquid):**
   - El usuario aprueba USDC en Arbitrum
   - Llama al contrato de puente Hyperliquid
   - USDC bloqueado en Arbitrum
   - Hyperliquid acredita cuenta de usuario (~30 segundos)

2. **Retiro (Hyperliquid → Arbitrum):**
   - El usuario firma solicitud de retiro en Hyperliquid
   - Hyperliquid valida y procesa
   - USDC desbloqueado en Arbitrum (~30 segundos)

**Costos de gas:** ~$0.50 - $2 (comisiones de gas Arbitrum)

---

### Puente Cross-Chain (Rhino.fi)

**Rutas soportadas:**
- Ethereum → Arbitrum
- Polygon → Arbitrum
- Base → Arbitrum
- Optimism → Arbitrum

**Integración:**
```typescript
import { RhinoSdk } from '@rhino.fi/sdk'

const rhinoClient = new RhinoSdk({
  apiKey: process.env.NEXT_PUBLIC_RHINO_API_KEY
})

const quote = await rhinoClient.getQuote({
  fromChainId: 1, // Ethereum
  toChainId: 42161, // Arbitrum
  fromToken: 'USDC',
  toToken: 'USDC',
  amount: '1000000000' // 1000 USDC (6 decimales)
})

const tx = await rhinoClient.executeBridge(quote)
```

**Tiempo:** 1-10 minutos
**Comisiones:** Dinámicas basadas en congestión de red

---

## Cálculos de P&L

### P&L No Realizado

**Para longs:**
```typescript
pnlNoRealizado = (precioActual - precioEntrada) * tamañoPosición

// Ejemplo:
// Entrada: $96,000, Actual: $98,000, Tamaño: 0.1 BTC
// PnL = (98000 - 96000) * 0.1 = $200
```

**Para shorts:**
```typescript
pnlNoRealizado = (precioEntrada - precioActual) * tamañoPosición
```

**Con comisiones:**
```typescript
const comisionEntrada = valorPosición * 0.00075 // 0.075%
const comisionSalida = valorPosición * 0.00075
const pnlNeto = pnlNoRealizado - comisionEntrada - comisionSalida
```

---

### P&L Realizado

**Cálculo:**
```typescript
pnlRealizado = (precioSalida - precioEntrada) * tamaño - comisiones

// Las comisiones incluyen:
// - Comisión de entrada (0.075%)
// - Comisión de salida (0.075%)
// - Pagos de funding (suma de todos los períodos de 8h)
```

---

## Consideraciones de Seguridad

### Riesgo de Smart Contract

**Contratos Hyperliquid:**
- Auditados por múltiples firmas
- Miles de millones en TVL (probado en batalla)
- On-chain y verificable

**Riesgos:**
- Vulnerabilidades no descubiertas
- Manipulación del oráculo (teórico)
- Ataques de gobernanza (si aplica)

**Mitigación:**
- Solo opera con fondos que puedas permitirte perder
- Diversifica entre plataformas
- Monitorea actividad inusual

---

### Seguridad de Wallet

**Mejores prácticas:**

**Para wallets embebidas (Privy):**
- ✅ Habilita 2FA en email/teléfono
- ✅ Exporta y respalda clave privada
- ✅ Usa contraseñas fuertes

**Para wallets externas:**
- ✅ Usa hardware wallet (Ledger, Trezor)
- ✅ Nunca compartas frase semilla
- ✅ Verifica direcciones de contrato antes de firmar

**Agent wallet:**
- ⚠️ El agente puede operar en tu nombre
- ⚠️ Revoca agente si está comprometido
- ⚠️ No apruebes agentes no confiables

---

## Límites de Velocidad de API

### API Hyperliquid

**Endpoints públicos:**
- 1200 solicitudes/minuto (datos de mercado)

**Endpoints autenticados:**
- 1200 solicitudes/minuto (datos de cuenta)
- 60 órdenes/minuto (ejecución de órdenes)

**WebSocket:**
- Sin límites duros (pero no hagas spam de suscripciones)

---

## Optimizaciones de Rendimiento

### Estrategia de Caché

**Datos de precio:**
- Caché por 1 segundo
- Invalida en actualización WebSocket

**Posiciones de usuario:**
- Caché por 5 segundos
- Invalida en ejecución de operación

**Datos estáticos (activos, mercados):**
- Caché por 1 hora
- Invalida diariamente

---

## Configuración de Desarrollo

### Prerequisitos

- Node.js 18+
- npm o yarn
- Git

### Instalación

```bash
git clone https://github.com/rayoprotocol/rayo-app
cd rayo-app
npm install
```

### Variables de Entorno

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Rhino.fi
NEXT_PUBLIC_RHINO_API_KEY=your_rhino_api_key

# Hyperliquid
NEXT_PUBLIC_HYPERLIQUID_API_URL=https://api.hyperliquid.xyz

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### Ejecutar Localmente

```bash
npm run dev
# Abre http://localhost:3000
```

### Construir para Producción

```bash
npm run build
npm start
```

---

## Deployment

### Deployment en Vercel

**Configuración:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_PRIVY_APP_ID": "@privy-app-id",
    "NEXT_PUBLIC_RHINO_API_KEY": "@rhino-api-key"
  }
}
```

**Deployment automático:**
- Push a rama `main`
- Vercel construye y despliega
- Deployments de preview para PRs

---

## Soporte y Recursos

**Para desarrolladores:**
- GitHub: github.com/rayoprotocol
- Discord: Únete al canal #developers
- Email: dev@rayo.trade

**Docs externas:**
- Hyperliquid: docs.hyperliquid.xyz
- Privy: docs.privy.io
- Rhino.fi: docs.rhino.fi

---

**Contribuir:** Rayo da la bienvenida a contribuciones open-source. Ver CONTRIBUTING.md en el repo.
