# Configurar Stop Loss & Take Profit

Domina el arte de proteger tu capital y asegurar ganancias con órdenes stop loss (SL) y take profit (TP) adecuadas.

## ¿Qué son las Órdenes SL/TP?

**Stop Loss (SL):**
- **Cierra automáticamente tu posición** si el precio se mueve en tu contra
- **Limita tu pérdida** a una cantidad predefinida
- Herramienta **esencial de gestión de riesgo**

**Take Profit (TP):**
- **Cierra automáticamente tu posición** cuando alcanzas tu objetivo de ganancia
- **Asegura ganancias** sin monitorear 24/7
- Elimina la emoción de tomar ganancias

---

## Por Qué Usar SL/TP?

### Sin SL/TP

**Escenario:**
- Abres un long BTC a $96,000 con $1,000 de margen a 10x de apalancamiento
- El precio cae a $86,400 (-10%)
- **Te liquidan, pierdes $1,000**

O

- El precio sube a $105,000 (+9.4%)
- Te pones codicioso, no vendes
- El precio cae de vuelta a $96,000
- **Ganas $0, oportunidad desperdiciada**

---

### Con SL/TP

**Escenario:**
- Abres un long BTC a $96,000 con $1,000 de margen a 10x
- **SL establecido en $94,080** (-2%, -$200 pérdida)
- **TP establecido en $99,840** (+4%, +$400 ganancia)

**Resultados:**
- ✅ El precio cae a $94,080 → SL se dispara, **pierdes solo $200** (no $1,000)
- ✅ El precio sube a $99,840 → TP se dispara, **ganas $400** (incluso si estás durmiendo)
- ✅ Riesgo-recompensa: 1:2 (perfecto)

---

## Cómo Establecer SL/TP en Rayo

### Método 1: Durante Colocación de Orden

**Para posiciones nuevas:**

1. **Abre página de Trading**
2. **Ingresa detalles de orden** - Margen, apalancamiento, dirección
3. **Toca "Opciones Avanzadas"** (si está disponible)
4. **Ingresa precio de Stop Loss**
5. **Ingresa precio de Take Profit**
6. **Coloca orden**

---

### Método 2: Después de Abrir Posición

**Para posiciones existentes:**

1. **Ve al Panel de Posiciones**
2. **Encuentra la posición** que quieres proteger
3. **Toca botón "SL/TP"**
4. **Ingresa precio de Stop Loss**
5. **Ingresa precio de Take Profit**
6. **Toca "Confirmar"**

---

## Calcular Niveles SL/TP

### Método 1: Basado en Porcentaje

**Fórmula:**
```
Precio SL = Precio de Entrada × (1 - % SL)  [para longs]
Precio SL = Precio de Entrada × (1 + % SL)  [para shorts]

Precio TP = Precio de Entrada × (1 + % TP)  [para longs]
Precio TP = Precio de Entrada × (1 - % TP)  [para shorts]
```

**Ejemplo (Long BTC):**
- Entrada: $96,000
- SL: -3% → $96,000 × 0.97 = **$93,120**
- TP: +6% → $96,000 × 1.06 = **$101,760**

---

### Método 2: Basado en Dólares

**Ejemplo:**
- Entrada: $96,000
- Posición: 0.1 BTC ($9,600)
- Riesgo: $200
- Objetivo: $400

```
Precio SL = $96,000 - ($200 / 0.1) = $94,000
Precio TP = $96,000 + ($400 / 0.1) = $100,000
```

---

### Método 3: Niveles Técnicos

**Para Longs:**
- **SL:** Justo debajo de mínimo reciente o nivel de soporte
- **TP:** En nivel de resistencia o extensión Fibonacci

**Para Shorts:**
- **SL:** Justo encima de máximo reciente o nivel de resistencia
- **TP:** En nivel de soporte

---

## Mejores Prácticas SL/TP

### Directrices de Stop Loss

#### 1. Siempre Usa un Stop Loss

**Regla innegociable:** Cada posición debe tener un stop loss.

**Por qué:**
- Previene pérdidas catastróficas
- Elimina la emoción
- Protege de eventos cisne negro
- Te permite dormir por la noche

**Excepción:** Nunca.

---

#### 2. Establece Antes de Entrar

**Manera correcta:**
- Decide SL antes de abrir posición
- Establécelo inmediatamente después de abrir posición

**Manera incorrecta:**
- Abrir posición
- "Lo estableceré después"
- Olvidar
- Ser liquidado

---

#### 3. Coloca Stops en Niveles Lógicos

**Buena colocación de SL (Long):**
- ✅ Debajo de niveles de soporte
- ✅ Debajo de mínimos recientes
- ✅ Debajo de líneas de tendencia
- ✅ Más allá de niveles Fibonacci clave

**Mala colocación de SL:**
- ❌ Porcentaje aleatorio (ej., siempre -5%)
- ❌ Muy ajustado (golpeado por ruido)
- ❌ Exactamente en números redondos ($95,000 - el stop de todos está ahí)

---

#### 4. No Muevas Stops en Tu Contra

**Incorrecto:**
- SL en $94,000
- El precio se acerca a $94,000
- Mueves SL a $93,000 "para darle más espacio"
- **Resultado:** Pérdida mayor cuando finalmente te detiene

**Correcto:**
- SL en $94,000
- El precio se acerca a $94,000
- Aceptas el stop out
- Re-evalúas
- Re-entras si el setup sigue siendo válido

---

### Directrices de Take Profit

#### 1. Usa Múltiples Niveles de TP

**Estrategia:** Escala salida en diferentes objetivos de ganancia.

**Ejemplo:**
- TP1 en +5%: Cierra 33%
- TP2 en +10%: Cierra 33%
- TP3 en +20%: Cierra 33%

**Beneficios:**
- ✅ Asegura ganancias en el camino
- ✅ Deja correr parte de posición
- ✅ Reduce arrepentimiento

---

#### 2. TP Basado en Riesgo-Recompensa

**Mínimo recomendado:** 1:2 riesgo-recompensa

**Ejemplo:**
- Riesgo: $100 (SL en -2%)
- Recompensa: $200 (TP en +4%)
- **R:R = 1:2**

---

## Errores Comunes SL/TP

### 1. Sin Stop Loss

**Error:** "Lo vigilaré y cerraré manualmente si es necesario."

**Realidad:** Te duermes / te distraes → Liquidado.

**Solución:** Siempre establece stop loss duro inmediatamente.

---

### 2. Stop Muy Ajustado

**Error:** Entrada BTC $96k, SL en $95,900 (0.1%).

**Realidad:** La volatilidad normal te detiene, luego el precio va a tu favor.

**Solución:** Da espacio para acción de precio normal.

---

### 3. Mover Stop Lejos

**Error:** SL acercándose, lo mueves más lejos para evitar pérdida.

**Realidad:** Pérdida mayor cuando finalmente te detiene.

**Solución:** Acepta el stop. Re-entra si sigue siendo válido.

---

### 4. Sin Take Profit (Codicia)

**Error:** +50%, no tomas ganancias, "¡irá más alto!"

**Realidad:** El precio cae, devuelves todas las ganancias.

**Solución:** Escala salida. Toma 50% de ganancia en objetivo, deja correr resto.

---

## Checklist Antes de Establecer SL/TP

- [ ] ¿He calculado mi tamaño de posición basado en riesgo?
- [ ] ¿Mi stop loss está en un nivel técnico lógico?
- [ ] ¿Mi SL es suficientemente amplio para la volatilidad?
- [ ] ¿Mi take profit es al menos 2× mi riesgo?
- [ ] ¿He establecido SL inmediatamente después de abrir posición?
- [ ] ¿He considerado comisiones en mi objetivo de ganancia?
- [ ] ¿Tengo un plan para si/cuando se dispare el SL?
- [ ] ¿Estoy preparado para aceptar la pérdida sin revenge trading?

---

## Resumen: Reglas SL/TP

**Reglas de Oro:**

1. **SIEMPRE usa un stop loss** (sin excepciones)
2. **Establece SL antes o inmediatamente después** de abrir posición
3. **Nunca muevas SL lejos** de entrada (solo hacia ganancia)
4. **Mínimo 1:2 riesgo-recompensa** para TP
5. **Coloca stops en niveles técnicos**, no porcentajes aleatorios
6. **Acepta los stop outs** sin revenge trading
7. **Escala salida** en múltiples niveles de TP

---

**Recuerda:** El objetivo no es evitar pérdidas (imposible), sino asegurar que **tus ganadores sean mayores que tus perdedores** a lo largo del tiempo.

➡️ [Dominar Trading de Futuros](futures-trading.md)
➡️ [Entender Gestión de Riesgo](trading-guide.md#gestión-de-riesgo)
➡️ [Aprender sobre Comisiones](fees.md)
