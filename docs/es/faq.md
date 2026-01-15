# Preguntas Frecuentes (FAQ)

Respuestas rápidas a preguntas comunes sobre Rayo.

## Primeros Pasos

### ¿Qué es Rayo?

Rayo es una plataforma descentralizada de trading de futuros perpetuos construida sobre Hyperliquid. Ofrece:
- Trading de futuros y spot ultrarrápido
- Hasta 50x de apalancamiento
- App web progresiva móvil primero
- Autocustodia (tus llaves, tu cripto)
- Sin KYC requerido

---

### ¿Necesito crear una cuenta?

**No se necesita cuenta tradicional.** Solo conecta tu wallet:
- Usa email/teléfono (wallet embebida de Privy)
- O conecta wallet existente (MetaMask, WalletConnect, etc.)

---

### ¿Se requiere KYC?

**No.** Rayo es completamente sin permisos. Sin verificación de identidad, sin carga de documentos, sin datos personales.

---

### ¿Cuál es el depósito mínimo?

- **Puente Hyperliquid:** $5 USDC
- **Depósitos spot:** 0.0001 BTC / 0.001 ETH / 0.01 SOL

---

### ¿Puedo usar Rayo en móvil?

**¡Sí!** Rayo es móvil primero. Es una Progressive Web App (PWA):
- Agrega a pantalla de inicio para experiencia tipo app
- Funciona en iOS y Android
- También funciona en escritorio

---

## Wallets y Seguridad

### ¿Qué wallets están soportadas?

**Wallets embebidas (Privy):**
- Login con email
- Login con teléfono

**Wallets externas:**
- MetaMask
- WalletConnect (cualquier wallet compatible)
- Coinbase Wallet
- Rainbow, Trust Wallet, etc.

---

### ¿Mi dinero está seguro?

**Rayo es no custodial:**
- ✅ Controlas tu wallet y claves privadas
- ✅ Los fondos están en Hyperliquid (L1 probado en batalla)
- ✅ Retira en cualquier momento sin permiso

**Riesgos:**
- Riesgo de smart contract (contratos Hyperliquid)
- Riesgo de puente (raro)
- Error del usuario (enviar a dirección incorrecta)

**Recomendación:** Solo opera con fondos que puedas permitirte perder.

---

### ¿Qué es una "agent wallet"?

La agent wallet te permite operar sin firmar cada transacción. La apruebas una vez, luego operas sin problemas.

**Cómo funciona:**
1. Apruebas la agent wallet (transacción única)
2. El agente puede ejecutar operaciones en tu nombre
3. Puedes revocar el acceso en cualquier momento

**Por qué se necesita:** Mejora la UX - sin popup para cada operación.

---

## Trading

### ¿Qué puedo operar en Rayo?

**Futuros Perpetuos:**
- 100+ mercados cripto (BTC, ETH, SOL, etc.)
- Acciones tokenizadas (AAPL, TSLA, NVDA, etc.)

**Spot:**
- 50+ criptomonedas

---

### ¿Cuál es el apalancamiento máximo?

- **Futuros cripto:** Hasta 50x
- **Futuros de acciones:** Hasta 20x
- **Spot:** 1x (sin apalancamiento)

**Recomendación:** Los principiantes deberían usar máximo 2-5x.

---

### ¿Puedo vender en corto?

**¡Sí!** Los futuros perpetuos permiten ventas en corto nativas:
- Corto con un clic
- No necesitas "pedir prestado" acciones
- Mismas comisiones para long y short

---

### ¿Qué son los funding rates?

Los funding rates son pagos periódicos entre traders long y short (cada 8 horas) para mantener el precio perpetuo anclado al precio spot.

**Funding positivo:** Los longs pagan a los shorts
**Funding negativo:** Los shorts pagan a los longs

Tasas típicas: 0.01% - 0.05% por 8 horas

[Aprende más sobre funding rates](fees.md#funding-rates)

---

### ¿Puedo operar 24/7?

**¡Sí!** Los mercados cripto nunca cierran:
- Opera 24/7/365
- Fines de semana, feriados, en cualquier momento
- Sin restricciones de horarios de mercado

**Incluso acciones:** Opera acciones tokenizadas 24/7 (a diferencia de mercados tradicionales).

---

## Comisiones

### ¿Cuáles son las comisiones de trading?

**Futuros y Spot:**
- Orden de mercado: 0.045%
- Comisión del builder (opcional): 0.03%
- **Total: 0.075%** (si se aprobó comisión del builder)

**Ejemplo:** Operación de $1,000 = $0.75 en comisiones

[Desglose completo de comisiones](fees.md)

---

### ¿Hay comisiones de depósito/retiro?

**Depósitos:**
- Puente Hyperliquid: Solo gas (~$0.50)
- Puente cross-chain: Varía por red ($0.50 - $20)

**Retiros:**
- Hyperliquid → Arbitrum: Solo gas (~$0.50)
- Retiros spot (BTC/ETH): Comisiones de red (~$1.50 - $4.50)

---

## Depósitos y Retiros

### ¿Cómo deposito fondos?

**4 métodos:**

1. **Puente Hyperliquid** (Arbitrum → Hyperliquid)
2. **Puente cross-chain** (Ethereum, Polygon, Base → Arbitrum)
3. **Depósitos spot** (Envía BTC, ETH, SOL directamente)
4. **Compra USDC en CEX** → Retira a Arbitrum → Puente

[Guía detallada de depósitos](deposits-withdrawals.md)

---

### ¿Puedo depositar USD/EUR directamente?

**No.** Rayo no soporta depósitos fiat. Necesitas criptomoneda (USDC, BTC, ETH, SOL).

**Cómo comenzar:**
1. Compra USDC en Coinbase/Binance
2. Retira a red Arbitrum
3. Puente a Hyperliquid vía Rayo

---

### ¿Cuánto tardan los depósitos?

- **Arbitrum → Hyperliquid:** 30 segundos
- **Puente cross-chain:** 1-10 minutos
- **Depósitos spot:** 1-30 minutos

---

### ¿Puedo retirar en cualquier momento?

**Sí**, pero:
- Cierra todas las posiciones abiertas primero (no puedes retirar margen bloqueado)
- Cancela órdenes pendientes
- Considera las comisiones de gas

---

## Preguntas Técnicas

### ¿En qué blockchain está construido Rayo?

**Rayo opera en:**
- **Hyperliquid L1** (ejecución de trading)
- **Arbitrum** (capa de puenteo)

**Puentes soportados:**
- Ethereum, Polygon, Base, Optimism (vía Rhino.fi)

---

### ¿Qué es Hyperliquid?

Hyperliquid es un exchange descentralizado de futuros perpetuos de alto rendimiento con:
- Order book on-chain
- Finalidad subsegundo
- Liquidez profunda
- Miles de millones en volumen de trading

Rayo está construido sobre Hyperliquid.

---

## Solución de Problemas

### Mi depósito no aparece

**Verifica:**
1. ¿Transacción confirmada en explorador de blockchain?
2. ¿Enviado a dirección correcta?
3. ¿Usada red correcta?

**Espera:**
- Puente Hyperliquid: 5 minutos
- Puente cross-chain: 10 minutos
- Depósitos spot: 30 minutos

**¿Aún falta?** Contacta soporte con hash TX.

---

### No puedo colocar una operación

**Razones comunes:**

**1. Saldo insuficiente**
- Necesitas suficiente USDC para margen + comisiones

**2. Agent wallet no habilitada**
- Ve a Ajustes → Habilita Agent Wallet

**3. Posición demasiado grande**
- Excede margen disponible
- Reduce tamaño o apalancamiento

---

## Riesgo y Legal

### ¿Es legal operar en Rayo?

**Depende de tu jurisdicción.**

- Operar derivados cripto puede estar restringido/ilegal en algunos países
- Eres responsable del cumplimiento con las leyes locales
- Rayo no proporciona asesoramiento legal

**Regiones restringidas:** Verifica tus regulaciones locales antes de operar.

---

### ¿Qué pasa si Rayo cierra?

**Tus fondos están seguros** porque Rayo es no custodial:
- ✅ Los fondos están en blockchain Hyperliquid (no en servidores de Rayo)
- ✅ Puedes retirar directamente vía interfaz Hyperliquid
- ✅ Las claves privadas te dan control completo

**Incluso si Rayo desaparece, aún puedes acceder a tus fondos.**

---

## Comparaciones

### Rayo vs Binance?

| Característica | Rayo | Binance |
|----------------|------|---------|
| **KYC** | No | Sí |
| **Custodia** | Autocustodia | Custodial |
| **Apalancamiento** | Hasta 50x | Hasta 125x |
| **Comisiones** | 0.075% | 0.05% |
| **Transparencia** | On-chain | Off-chain |
| **Censura** | Resistente | Posible |

**Rayo es mejor para:** Privacidad, autocustodia, transparencia
**Binance es mejor para:** Rampas fiat, comisiones más bajas, más mercados

---

## ¿Aún Tienes Preguntas?

**Recursos:**
- 📖 [Guía de Trading](trading-guide.md)
- ⚠️ [Riesgos y Advertencias](risks.md)
- 💰 [Desglose de Comisiones](fees.md)
- 🔧 [Documentación Técnica](technical.md)

**Comunidad:**
- Discord: [Únete a nuestro Discord](#)
- Telegram: [Únete a nuestro Telegram](#)
- Twitter: [@RayoTrade](#)

---

**¿No encontraste tu respuesta?** ¡Pregunta en nuestros canales de comunidad!
