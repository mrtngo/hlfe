# Guía de Trading

Esta guía completa te enseñará todo lo que necesitas saber sobre operar en Rayo, desde conceptos básicos hasta estrategias avanzadas.

## Entendiendo los Futuros Perpetuos

### ¿Qué son los Futuros Perpetuos?

Los futuros perpetuos son **contratos derivados** que te permiten especular sobre el precio de un activo (como BTC) **sin poseerlo directamente**.

**Diferencias clave del trading spot:**

| Característica | Trading Spot | Futuros Perpetuos |
|----------------|-------------|-------------------|
| **Propiedad** | Posees el activo | No posees el activo |
| **Apalancamiento** | 1x (sin apalancamiento) | Hasta 50x |
| **Venta en corto** | Debes pedir prestado | Corto nativo |
| **Funding** | Sin costo continuo | Funding rates cada 8h |

---

## Long vs Short

**Posición Long:**
- Crees que el precio **subirá**
- **Ganas** cuando el precio aumenta
- **Pierdes** cuando el precio disminuye

**Posición Short:**
- Crees que el precio **bajará**
- **Ganas** cuando el precio disminuye
- **Pierdes** cuando el precio aumenta

---

## Cómo Funciona el Apalancamiento

El apalancamiento te permite controlar una **posición más grande** con una **cantidad más pequeña de capital**.

**Fórmula:**
```
Tamaño de Posición = Margen × Apalancamiento
```

**Ejemplo con 10x de apalancamiento:**
- Tu margen: $1,000
- Apalancamiento: 10x
- Tamaño de posición: $1,000 × 10 = **$10,000**

**Punto crítico:** El apalancamiento amplifica **tanto las ganancias como las pérdidas** igualmente.

---

## Tipos de Órdenes

### 1. Orden de Mercado
Ejecuta inmediatamente al mejor precio disponible.

**Usa cuando:**
- Quieres entrar/salir de una posición ahora mismo
- La velocidad es más importante que el precio exacto

---

### 2. Orden Límite
Solo ejecuta a tu precio especificado (o mejor).

**Usa cuando:**
- Quieres un precio de entrada/salida específico
- No tienes prisa

---

### 3. Orden Stop Market
Dispara una orden de mercado cuando el precio alcanza tu precio stop.

**Usa cuando:**
- Proteger ganancias (trailing stop)
- Limitar pérdidas (stop loss)

---

## Gestión de Riesgo

### La Regla del 1%

**Nunca arriesgues más del 1-2% de tu cuenta por operación.**

**Ejemplo:**
- Saldo de cuenta: $10,000
- Riesgo máximo por operación: 1% = $100

---

### Mejores Prácticas de Stop Loss

**1. Siempre usa stop losses**
- Nunca operes sin un stop loss
- Protégete de movimientos inesperados

**2. Coloca stops en niveles técnicos**
- Debajo de soporte (para longs)
- Encima de resistencia (para shorts)

**3. No muevas stops en tu contra**
- Acepta la pérdida y cierra la operación

---

## Estrategias de Take Profit

### 1. Objetivo Fijo
Establece un nivel de TP único.

### 2. Take Profits Escalonados
Cierra porciones de tu posición en múltiples niveles:
- 25% en +10%
- 25% en +20%
- 25% en +30%
- 25% déjalo correr

---

## Errores Comunes a Evitar

### 1. Sobre-Apalancamiento
**Error:** Usar 50x de apalancamiento como principiante

**Solución:** Comienza con 2-5x de apalancamiento

---

### 2. Sin Stop Loss
**Error:** "Vigilaré el gráfico y cerraré manualmente si es necesario"

**Solución:** **SIEMPRE establece un stop loss duro**

---

### 3. Trading por Venganza
**Error:** Perder $100 en BTC long, inmediatamente abrir un long de $500 para "recuperarlo"

**Solución:** Acepta la pérdida, toma un descanso, regresa con mente clara

---

### 4. Ignorar Funding Rates
**Error:** Abrir un long cuando el funding es 0.1% por 8h

**Solución:** Verifica el funding antes de abrir posiciones

---

### 5. FOMO
**Error:** BTC sube 10% en 1 hora, entras long en el tope

**Solución:** Espera retrocesos, usa órdenes límite

---

## Próximos Pasos

Ahora que entiendes los conceptos básicos de trading:

1. **Lee las guías detalladas:**
   - [Trading de Futuros](futures-trading.md)
   - [Trading Spot](spot-trading.md)
   - [Configurar Stop Loss & Take Profit](sl-tp-guide.md)

2. **Practica con posiciones pequeñas:**
   - Comienza con $10-$50
   - Usa máximo 2-3x de apalancamiento
   - Enfócate en aprender, no en ganancias

3. **Desarrolla un plan de trading:**
   - Define tu estrategia
   - Establece límites de riesgo
   - Rastrea tus operaciones

---

**Recuerda:** El trading es un maratón, no un sprint. Enfócate en ejecución consistente y disciplinada a lo largo del tiempo.

➡️ [Comenzar a operar](getting-started.md)
➡️ [Entender los riesgos](risks.md)
➡️ [Aprender sobre comisiones](fees.md)
