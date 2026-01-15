# Comisiones

Entender la estructura de comisiones en Rayo es esencial para calcular tus costos de trading y rentabilidad. Esta página desglosa todas las comisiones que encontrarás.

## Comisiones de Trading

### Trading de Futuros

Cuando operas futuros perpetuos en Rayo, pagas dos comisiones:

#### 1. Comisión de Mercado Hyperliquid: **0.045%**

Esta es la comisión base de trading cobrada por Hyperliquid por ejecutar tu orden.

**Ejemplo:**
- Abres una posición de $1,000
- Comisión de mercado: $1,000 × 0.045% = **$0.45**

#### 2. Comisión del Builder Rayo: **0.03%**

Esta comisión opcional apoya el desarrollo y mantenimiento de Rayo. Puedes elegir aprobar esta comisión en Ajustes.

**Ejemplo:**
- Abres una posición de $1,000
- Comisión del builder: $1,000 × 0.03% = **$0.30**

#### Comisión Total de Trading: **0.075%**

Si has aprobado la comisión del builder, tu costo total por operación es:

**Ejemplo:**
- Posición de $1,000
- Comisiones totales: $1,000 × 0.075% = **$0.75**

---

## Funding Rates

### ¿Qué son los Funding Rates?

Los futuros perpetuos no tienen fecha de expiración como los futuros tradicionales. Para mantener el precio perpetuo anclado al precio spot, se intercambian **funding rates** entre traders long y short cada 8 horas.

### Cómo Funciona

- **Funding rate positivo** → Los longs pagan a los shorts
- **Funding rate negativo** → Los shorts pagan a los longs
- **Funding pagado/recibido cada 8 horas** (00:00, 08:00, 16:00 UTC)

### Funding Rates Típicos

| Condición de Mercado | Funding Rate | Costo Anualizado |
|----------------------|--------------|------------------|
| **Normal** | 0.01% / 8h | ~11% por año |
| **Alcista** | 0.03% / 8h | ~33% por año |
| **Muy Alcista** | 0.10% / 8h | ~110% por año |
| **Bajista** | -0.01% / 8h | -11% por año (ganas) |

**Ejemplo:**
- Mantienes una posición long de $10,000
- Funding rate: 0.01% por 8 horas
- Pagas: $10,000 × 0.01% = **$1 cada 8 horas** ($3/día)

### Por Qué Importan los Funding Rates

- **Mantener posiciones a largo plazo cuesta dinero** vía funding
- **En mercados alcistas extremos**, el funding puede alcanzar 1% por día (muy caro)
- **Shortear en mercados alcistas** = recibes funding (rentable si el precio no se mueve)

---

## Comisiones de Depósito y Retiro

### Puente Hyperliquid (Arbitrum ↔ Hyperliquid)

- **Depósito a Hyperliquid**: Solo comisiones de gas (~$0.50 - $2)
- **Retiro de Hyperliquid**: Solo comisiones de gas (~$0.50 - $2)

**Tiempo:** 30 segundos a 2 minutos

---

### Puente Cross-Chain (Rhino.fi)

Puentea USDC desde otras chains a Arbitrum:

| Chain de Origen | Comisión de Puente | Tiempo |
|-----------------|-------------------|--------|
| **Ethereum** | ~$5-$20 (dependiente de gas) | 1-3 minutos |
| **Polygon** | ~$0.50 - $2 | 1-3 minutos |
| **Base** | ~$0.50 - $2 | 1-3 minutos |
| **Optimism** | ~$0.50 - $2 | 1-3 minutos |

**Nota:** Las comisiones varían según la congestión de red. Rhino.fi muestra las comisiones exactas antes de puentear.

---

## Comparación de Comisiones con Competidores

### Comisiones de Trading de Futuros

| Plataforma | Comisión Maker | Comisión Taker | Comisión Builder | Total (Taker) |
|------------|---------------|----------------|------------------|---------------|
| **Rayo** | 0.02% | 0.045% | 0.03% | **0.075%** |
| **Binance** | 0.02% | 0.05% | - | **0.05%** |
| **Bybit** | 0.01% | 0.06% | - | **0.06%** |
| **OKX** | 0.02% | 0.05% | - | **0.05%** |
| **Coinbase** | 0.15% | 0.40% | - | **0.40%** |
| **Kraken** | 0.02% | 0.05% | - | **0.05%** |
| **dYdX** | 0.02% | 0.05% | - | **0.05%** |

**Veredicto:** Rayo es competitivo con los mejores CEXs y **5x más barato que Coinbase**.

---

## Estrategias de Optimización de Comisiones

### 1. Usa Órdenes Límite (Cuando Sea Posible)

- **Órdenes de mercado**: 0.045% comisión taker
- **Órdenes límite que se ejecutan**: 0.02% comisión maker (si proporcionas liquidez)

**Ahorro:** 0.025% por operación (56% más barato)

**Ejemplo:**
- Operación de $10,000 con orden de mercado: $4.50 comisión
- Operación de $10,000 con orden límite: $2.00 comisión
- **Ahorra $2.50 por operación**

---

### 2. Considera los Funding Rates para Mantener a Largo Plazo

Si planeas mantener una posición por días/semanas:

- **Verifica el funding rate actual** antes de abrir
- **Si el funding es alto** (>0.05% por 8h), considera:
  - Esperar a que el funding se normalice
  - Usar spot en lugar de futuros
  - Aceptar el costo como parte de tu estrategia

---

## Resumen: Costo Total de Trading

Para una operación típica de $10,000 mantenida por 1 día:

| Tipo de Comisión | Cantidad | % de Posición |
|------------------|----------|---------------|
| **Comisión de orden de mercado** | $4.50 | 0.045% |
| **Comisión del builder** | $3.00 | 0.03% |
| **Funding (1 día)** | $3.00 | 0.03% |
| **Costo Total** | **$10.50** | **0.105%** |

**Para ganar:** Tu posición necesita moverse >0.105% a tu favor solo para estar en punto de equilibrio.

---

**Conclusión:** Las comisiones de Rayo son competitivas con los mejores CEXs y significativamente más baratas que plataformas enfocadas en retail como Coinbase.

➡️ [Comienza a operar](getting-started.md)

➡️ [Aprende sobre los riesgos](risks.md)
