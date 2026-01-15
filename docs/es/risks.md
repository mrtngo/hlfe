# Riesgos y Advertencias

## ⚠️ IMPORTANTE: LEE ANTES DE OPERAR

Operar derivados apalancados es **extremadamente riesgoso** y puede resultar en la **pérdida total de tus fondos**. Esta página describe los riesgos que necesitas entender antes de usar Rayo.

## Advertencia de Riesgo

### Puedes Perder Todo

- **El apalancamiento amplifica las pérdidas** - Con 10x de apalancamiento, un movimiento del 10% en tu contra = 100% de pérdida
- **La liquidación es permanente** - Si el mercado se mueve en tu contra, puedes ser liquidado y perder todo tu margen
- **Sin reembolsos** - Todas las operaciones son finales y ejecutadas on-chain
- **Volatilidad del mercado** - Los mercados cripto pueden moverse 10-20% en minutos

### Trading de Alto Riesgo

Rayo te permite operar futuros perpetuos con apalancamiento de hasta **50x**. Esto significa:

✅ **Potencial de altos retornos** - Pequeños movimientos de precio pueden generar grandes ganancias
❌ **Potencial de pérdida total** - Pequeños movimientos de precio pueden eliminar toda tu posición

**Ejemplo de riesgo de apalancamiento:**
- Depositas $100 y usas 20x de apalancamiento para abrir una posición de $2,000
- Si el precio se mueve **5% en tu contra**, pierdes 100% ($100 liquidado)
- Si el precio se mueve **5% a tu favor**, ganas 100% ($100 de ganancia)

## Riesgos Específicos

### 1. Riesgo de Liquidación

**¿Qué es la liquidación?**
Cuando tu posición pierde suficiente valor que tu margen ya no es suficiente para mantenerla, eres liquidado. Tu posición se cierra automáticamente y pierdes tu margen.

**Disparadores de liquidación:**
- **Posiciones long**: El precio cae por debajo de tu precio de liquidación
- **Posiciones short**: El precio sube por encima de tu precio de liquidación

**Protección:**
- Usa menor apalancamiento (2-5x en lugar de 20-50x)
- Configura órdenes stop-loss
- Monitorea las posiciones activamente
- Nunca uses el 100% de tu margen disponible

### 2. Riesgo de Mercado

**Volatilidad extrema:**
- Los mercados cripto pueden tener gaps del 10-30% de la noche a la mañana
- Los flash crashes pueden disparar liquidaciones masivas
- Los eventos noticiosos causan rápidos cambios de precio
- Sin circuit breakers como en los mercados tradicionales

**Iliquidez:**
- Algunos mercados pueden tener baja liquidez
- Las órdenes grandes pueden experimentar slippage
- Durante volatilidad extrema, los spreads se amplían

### 3. Riesgo de Smart Contract

**Vulnerabilidades de código:**
- Los contratos inteligentes de Hyperliquid podrían tener bugs
- Las integraciones de contratos de Rayo podrían fallar
- Los puentes podrían ser explotados

**Aunque improbable, los riesgos de smart contract incluyen:**
- Pérdida de fondos debido a exploits
- Actualizaciones de contratos que cambian la funcionalidad
- Fallos del oráculo causando liquidaciones incorrectas

### 4. Riesgo de Puente

**Riesgos de puentes cross-chain:**
- El puente Rhino.fi podría fallar o ser explotado
- Los fondos podrían perderse durante el puenteo
- Los retrasos del puente podrían causar oportunidades perdidas

**Mitigación:**
- Solo puentea cantidades que estés listo para operar
- Espera las confirmaciones del puente antes de operar
- Usa puentes establecidos con historial comprobado

### 5. Riesgo de Custodia

**Wallets embebidas:**
- Tu wallet de email/teléfono está encriptada pero depende de la infraestructura de Privy
- Si pierdes acceso a tu email/teléfono, la recuperación puede ser difícil
- Siempre exporta y respalda tu clave privada

**Wallets externas:**
- Eres responsable de la seguridad de tu wallet
- Frases semilla perdidas = fondos perdidos para siempre
- Los ataques de phishing pueden robar tu wallet

### 6. Riesgo de Plataforma

**Riesgos específicos de Rayo:**
- Bugs de la plataforma podrían afectar el trading
- Tiempo de inactividad durante momentos críticos
- Problemas de UI/UX que llevan a operaciones no intencionadas
- Siendo una plataforma nueva, pueden surgir problemas inesperados

**Riesgos específicos de Hyperliquid:**
- Tiempo de inactividad del exchange (raro pero posible)
- Problemas de API que afectan la ejecución de órdenes
- Congestión de red causando retrasos

### 7. Riesgo Regulatorio

**Incertidumbre legal:**
- Las regulaciones cripto varían por jurisdicción
- El trading puede volverse restringido en tu país
- Las implicaciones fiscales pueden ser complejas
- Sin protecciones regulatorias como las casas de bolsa tradicionales

**Tu responsabilidad:**
- Asegúrate de que el trading sea legal en tu jurisdicción
- Paga los impuestos aplicables sobre las ganancias
- Comprende las regulaciones locales

### 8. Riesgo de Funding Rate

**Funding de futuros perpetuos:**
- Pagas funding rates a los shorts (si estás long) o recibes de los longs (si estás short)
- Los funding rates pueden ser 0.01% - 0.1% por 8 horas
- En mercados extremos, el funding puede ser 1%+ por día
- Mantener posiciones a largo plazo cuesta dinero vía funding

### 9. Manipulación de Precio

**Posible manipulación del mercado:**
- Manipulación de ballenas en mercados delgados
- Wash trading afectando el descubrimiento de precio
- Manipulación del oráculo (teórico)
- Front-running de órdenes grandes

### 10. Riesgo Operacional

**Errores del usuario:**
- Colocar tamaños de orden incorrectos (errores de dedo gordo)
- Usar apalancamiento excesivo por error
- Olvidar posiciones abiertas
- No configurar stop-losses

**Prevención:**
- Revisa dos veces cada orden antes de enviar
- Comienza con tamaños pequeños
- Usa órdenes límite cuando sea posible
- Configura alertas para P&L de posiciones

## Quién NO Debería Operar en Rayo

❌ NO deberías usar Rayo si:

- No puedes permitirte perder el dinero que estás operando
- Estás operando con dinero prestado o deuda
- No entiendes el apalancamiento y la liquidación
- Buscas "retornos garantizados"
- No puedes manejar alto estrés o volatilidad
- No tienes tiempo para monitorear posiciones
- No has leído toda esta divulgación de riesgos

## Quién PUEDE Considerar Operar en Rayo

✅ Podrías considerar Rayo si:

- Entiendes completamente los riesgos del trading apalancado
- Tienes experiencia con derivados
- Puedes permitirte perder el 100% de tu capital de trading
- Tienes una estrategia de gestión de riesgo
- Entiendes la dinámica del mercado cripto
- Aceptas total responsabilidad por tus operaciones
- Estás operando por especulación, no por supervivencia

## Mejores Prácticas de Gestión de Riesgo

Si decides operar a pesar de estos riesgos:

### 1. Gestión de Capital
- **Nunca arriesgues más del 1-2% por operación**
- Mantén 50%+ de cuenta en reserva (no uses 100% de margen)
- Ten fondos de emergencia fuera de cripto

### 2. Dimensionamiento de Posición
- Comienza con 2-5x de apalancamiento máximo
- Usa tamaños de posición más pequeños (0.5-1% de cuenta)
- Aumenta el tamaño solo con experiencia

### 3. Stop Losses
- **SIEMPRE configura stop-losses**
- Coloca stops en pérdida máxima del 2-5%
- Mueve stops a breakeven después de ganancia

### 4. Reglas de Apalancamiento
- Principiantes: 2-5x máximo
- Intermedios: 5-10x máximo
- Avanzados: 10-20x máximo
- **Evita 30-50x a menos que seas experto**

### 5. Diversificación
- No pongas todos los fondos en una posición
- Opera múltiples mercados no correlacionados
- Mantén fondos en múltiples plataformas

### 6. Control Emocional
- Nunca hagas revenge trading después de pérdidas
- Toma descansos después de 2-3 operaciones perdedoras
- No operes en exceso (máx 3-5 operaciones por día)
- Apégate a tu plan de trading

### 7. Aprendizaje Continuo
- Mantén un diario de trading
- Revisa las operaciones perdedoras
- Aprende de los errores
- Estudia el comportamiento del mercado

## Descargo Legal

### Sin Asesoramiento Financiero
- Rayo no proporciona asesoramiento de inversión
- Toda la información es solo para fines educativos
- No somos asesores financieros
- Haz tu propia investigación (DYOR)

### Sin Garantías
- Rendimiento pasado ≠ resultados futuros
- Sin garantías de ganancias
- Rendimiento de la plataforma no garantizado
- Tiempo de actividad no garantizado

### Jurisdicción
- El trading puede ser ilegal en tu jurisdicción
- Eres responsable del cumplimiento de las leyes locales
- Algunas regiones pueden estar restringidas
- El uso de VPN no te exime de las leyes

### Responsabilidad del Usuario
Al usar Rayo, reconoces que:

- ✅ Has leído y entendido todos los riesgos
- ✅ Estás operando bajo tu propio riesgo
- ✅ Puedes permitirte perder el 100% de tus fondos
- ✅ No responsabilizarás a Rayo por las pérdidas
- ✅ Estás legalmente autorizado para operar en tu jurisdicción
- ✅ Entiendes que esto no es asesoramiento financiero

## Advertencia Final

**🚨 LA MAYORÍA DE LOS TRADERS PIERDEN DINERO 🚨**

Los estudios muestran que **70-90% de los traders retail pierden dinero** al operar productos apalancados. Las probabilidades están estadísticamente en tu contra. Solo opera si:

1. Aceptas completamente que probablemente perderás dinero
2. Estás operando por educación/experiencia
3. Puedes permitirte perder el 100% de tu capital
4. Tienes expectativas realistas
5. Entiendes todos los riesgos en esta página

---

## ¿Aún Quieres Operar?

Si has leído todo lo anterior y aún quieres proceder:

1. Comienza con **una cantidad muy pequeña** ($10-$50)
2. Usa **bajo apalancamiento** (2-3x máximo)
3. Practica con **posiciones pequeñas**
4. Aprende de cada operación
5. Nunca arriesgues dinero que necesites

➡️ [Continuar a la Guía de Trading](trading-guide.md)

➡️ [Volver a Primeros Pasos](getting-started.md)

---

**Recuerda: El trading no es apostar. Ten un plan, gestiona el riesgo y nunca operes emocionalmente.**
