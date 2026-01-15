# Trading de Futuros

Aprende cómo operar futuros perpetuos en Rayo con esta guía detallada.

## ¿Qué son los Futuros Perpetuos?

Los futuros perpetuos (también llamados "perps") son contratos derivados que rastrean el precio de un activo subyacente sin fecha de expiración.

### Características Clave

**A diferencia de los futuros tradicionales:**
- ✅ **Sin expiración** - Mantén posiciones el tiempo que quieras
- ✅ **Funding rates** - Pagos periódicos entre longs y shorts
- ✅ **Apalancamiento** - Opera con hasta 50x de apalancamiento en Rayo

**A diferencia del trading spot:**
- ✅ **Sin propiedad** - No posees realmente el activo
- ✅ **Venta en corto** - Gana con caídas de precio
- ✅ **Eficiencia de capital** - Controla grandes posiciones con poco margen

---

## Mercados Disponibles

Rayo (vía Hyperliquid) ofrece futuros perpetuos en:

### Mercados Cripto
- **Criptos principales:** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC, AVAX, DOT, LINK, y más
- **Apalancamiento:** Hasta 50x
- **Tamaño mínimo de orden:** Varía por activo (típicamente $10-$50)

### Acciones Tokenizadas
- **Acciones US:** AAPL, TSLA, NVDA, MSFT, GOOGL, AMZN, META, y más
- **Apalancamiento:** Hasta 20x
- **Horario de trading:** 24/7 (a diferencia de mercados de acciones tradicionales)

---

## Tipos de Órdenes Explicados

### 1. Orden de Mercado

**Mejor para:** Entrar/salir inmediatamente al precio actual.

**Pros:**
- ✅ Ejecución instantánea
- ✅ Garantía de ejecución

**Contras:**
- ❌ Posible slippage en órdenes grandes
- ❌ Comisiones más altas (0.045% taker)

---

### 2. Orden Límite

**Mejor para:** Entrar a un precio específico o mejor.

**Pros:**
- ✅ Control de precio
- ✅ Comisiones más bajas (0.02% maker)

**Contras:**
- ❌ Puede no ejecutarse si el precio no alcanza tu límite
- ❌ Requiere paciencia

---

### 3. Orden Stop Market

**Mejor para:** Auto-cerrar posiciones en un nivel de stop loss o take profit.

**Cuando se dispara:** Ejecuta una orden de mercado.

---

## Apalancamiento Explicado

### Cómo Funciona el Apalancamiento

El apalancamiento multiplica tu poder de compra:

```
Tamaño de Posición = Margen × Apalancamiento
```

**Ejemplos:**

| Margen | Apalancamiento | Tamaño de Posición |
|--------|----------------|-------------------|
| $100 | 1x | $100 |
| $100 | 5x | $500 |
| $100 | 10x | $1,000 |
| $100 | 20x | $2,000 |
| $100 | 50x | $5,000 |

---

### Apalancamiento y Liquidación

Mayor apalancamiento = precio de liquidación más cercano.

**Ejemplo: Long BTC a $96,000**

| Apalancamiento | Precio de Liquidación | % de Movimiento para Liquidación |
|----------------|----------------------|----------------------------------|
| 2x | $48,000 | -50% |
| 5x | $76,800 | -20% |
| 10x | $86,400 | -10% |
| 20x | $91,200 | -5% |
| 50x | $94,080 | -2% |

**Conocimiento clave:** Con 50x de apalancamiento, un movimiento del 2% en tu contra = 100% de pérdida.

---

### Apalancamiento Recomendado por Experiencia

**Principiantes:**
- Usa máximo 2-5x de apalancamiento
- Enfócate en aprender, no en ganancias

**Intermedios:**
- 5-10x de apalancamiento
- Ten estrategia probada

**Avanzados:**
- 10-20x de apalancamiento
- Gestión de riesgo ajustada

**Solo expertos:**
- 20-50x de apalancamiento
- Estrategias de scalping
- Conciencia de riesgo extremo

---

## Funding Rates

### ¿Qué son los Funding Rates?

Los futuros perpetuos usan **funding rates** para mantener el precio de futuros cerca del precio spot.

**Cómo funciona:**
- Pagado/recibido cada 8 horas (00:00, 08:00, 16:00 UTC)
- Intercambiado entre traders long y short
- Basado en la diferencia entre precio de futuros y spot

---

### Funding Positivo vs Negativo

**Funding Rate Positivo:**
- Precio de futuros > Precio spot
- **Los longs pagan a los shorts**
- El mercado es alcista (más personas comprando)

**Funding Rate Negativo:**
- Precio de futuros < Precio spot
- **Los shorts pagan a los longs**
- El mercado es bajista (más personas vendiendo)

---

## Gestión de Posiciones

### Abrir una Posición

**Paso a paso:**

1. **Selecciona mercado** - Elige BTC, ETH, o cualquier otro activo
2. **Decide dirección** - Long si alcista, Short si bajista
3. **Determina tamaño de posición** - ¿Cuánto margen usar?
4. **Elige apalancamiento** - Comienza con 2-5x
5. **Establece stop loss** - Protege tu desventaja
6. **Establece take profit** - Define tu objetivo de ganancia
7. **Coloca orden** - Orden de mercado o límite
8. **Monitorea posición** - Observa P&L, ajusta si es necesario

---

### Cerrar Posiciones

#### Cierre Completo

1. Encuentra tu posición en Panel de Posiciones
2. Toca "Cerrar"
3. La posición se cierra al precio de mercado
4. P&L realizado y agregado al saldo

#### Cierre Parcial

1. Toca en posición
2. Selecciona "Reducir"
3. Ingresa % para cerrar (ej., 50%)
4. La posición restante permanece abierta

---

## Errores Comunes

### 1. Sobre-Apalancamiento

**Error:** Usar 50x de apalancamiento porque "¡mayores ganancias!"

**Realidad:** Liquidado en movimiento del 2%.

**Solución:** Comienza con 2-5x, aumenta gradualmente.

---

### 2. Sin Stop Loss

**Error:** "Cerraré manualmente si va en mi contra."

**Realidad:** No lo haces, y te liquidan.

**Solución:** Siempre establece stop loss duro.

---

### 3. Ignorar Funding

**Error:** Mantener un long por una semana con funding rate del 0.05%.

**Realidad:** Pagaste 1% de posición en comisiones.

**Solución:** Verifica funding antes de abrir, cierra durante la noche si es extremo.

---

## Checklist de Trading de Futuros

Antes de cada operación, pregúntate:

- [ ] ¿Tengo una razón clara de entrada?
- [ ] ¿Tengo un stop loss establecido?
- [ ] ¿Tengo un objetivo de take profit?
- [ ] ¿Mi riesgo es 1-2% de cuenta o menos?
- [ ] ¿Mi riesgo-recompensa es al menos 1:2?
- [ ] ¿He verificado el funding rate?
- [ ] ¿Estoy usando apalancamiento apropiado?
- [ ] ¿Estoy operando emocionalmente o sistemáticamente?

Si no puedes marcar todas las casillas, no tomes la operación.

---

➡️ [Aprende sobre Trading Spot](spot-trading.md)
➡️ [Configurar Stop Loss & Take Profit](sl-tp-guide.md)
➡️ [Entender Comisiones](fees.md)
