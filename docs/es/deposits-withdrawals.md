# Depósitos y Retiros

Aprende cómo mover fondos hacia y desde Rayo de manera segura y eficiente.

## Resumen

Rayo soporta múltiples métodos de depósito y retiro:

1. **Puente Hyperliquid** (Arbitrum ↔ Hyperliquid)
2. **Puente Cross-Chain** (Ethereum, Polygon, Base, Optimism → Arbitrum vía Rhino.fi)
3. **Depósitos Spot** (BTC, ETH, SOL directamente a Hyperliquid)
4. **Retiros** (Hyperliquid → Arbitrum → Tu wallet)

---

## Métodos de Depósito

### Método 1: Puente Hyperliquid (Arbitrum → Hyperliquid)

**Mejor para:** Si ya tienes USDC en Arbitrum.

#### Paso a Paso

1. **Abre app Rayo** → Ve a pantalla Inicio → Toca "Deposit"
2. **Selecciona pestaña "Bridge"**
3. **Ingresa cantidad** - Cuánto USDC puentear (Mínimo: $5)
4. **Revisa detalles** - De: Arbitrum, A: Hyperliquid, Comisión: Solo gas (~$0.50), Tiempo: ~30 segundos
5. **Toca "Deposit to Hyperliquid"**
6. **Aprueba en wallet** - Confirma la transacción
7. **Espera confirmación** - Los fondos aparecen en ~30 segundos a 2 minutos
8. **✅ ¡Listo!** - USDC ahora disponible para operar

**Comisión:** Solo comisiones de gas (~$0.50 - $2)
**Tiempo:** 30 segundos a 2 minutos
**Mínimo:** $5

---

### Método 2: Puente Cross-Chain (Otras Chains → Arbitrum)

**Mejor para:** Si tienes USDC en Ethereum, Polygon, Base u Optimism.

**Impulsado por:** Rhino.fi

#### Paso a Paso

1. **Abre app Rayo** → Inicio → "Deposit"
2. **Selecciona pestaña "Cross-Chain Bridge"**
3. **Selecciona chain de origen** - Ethereum, Polygon, Base u Optimism
4. **Ingresa cantidad** - Cuánto USDC puentear
5. **Revisa detalles del puente** - Chain origen, Destino: Arbitrum, Estimación de comisión y tiempo
6. **Toca "Bridge to Arbitrum"**
7. **Aprueba en wallet** - Confirma transacción en chain origen
8. **Espera el puente** - 1-3 minutos (a veces hasta 10 minutos)
9. **✅ USDC llega a Arbitrum** - Ahora usa Método 1 para puentear a Hyperliquid

#### Comisiones y Tiempos

| Chain Origen | Comisión | Tiempo |
|--------------|----------|--------|
| **Ethereum** | $5-$20 (dependiente de gas) | 1-3 minutos |
| **Polygon** | $0.50-$2 | 1-3 minutos |
| **Base** | $0.50-$2 | 1-3 minutos |
| **Optimism** | $0.50-$2 | 1-3 minutos |

---

### Método 3: Depósitos Spot (BTC, ETH, SOL)

**Mejor para:** Si tienes BTC, ETH o SOL y quieres depositarlos directamente.

#### Activos Soportados
- **BTC** - Bitcoin
- **ETH** - Ethereum
- **SOL** - Solana

#### Paso a Paso

1. **Abre app Rayo** → Inicio → "Deposit"
2. **Selecciona pestaña "Assets"**
3. **Elige activo** - BTC, ETH o SOL
4. **Ve tu dirección de depósito** - Copia la dirección O escanea código QR
5. **Envía desde wallet externa** - Pega la dirección de depósito Hyperliquid, Ingresa cantidad, ¡Verifica dos veces la dirección!, Envía transacción
6. **Espera confirmaciones** - BTC: 1-3 confirmaciones (~10-30 mins), ETH: 12-35 confirmaciones (~3-8 mins), SOL: ~1 minuto
7. **✅ Los activos aparecen** - Ver en Perfil → Assets

#### Mínimos y Comisiones

| Activo | Depósito Mínimo | Comisión de Red |
|--------|-----------------|-----------------|
| **BTC** | 0.0001 BTC (~$9) | ~0.00005 BTC (~$4.50) |
| **ETH** | 0.001 ETH (~$3) | ~0.0005 ETH (~$1.50) |
| **SOL** | 0.01 SOL (~$2) | ~0.005 SOL (~$1) |

---

## Métodos de Retiro

### Método 1: Hyperliquid → Arbitrum

**Paso a Paso:**

1. **Abre app Rayo** → Perfil → "Withdraw"
2. **Ingresa cantidad** - Cuánto USDC retirar
3. **Elige destino** - Tu wallet Arbitrum (wallet conectada)
4. **Revisa detalles** - Cantidad, Dirección de destino, Comisión: Solo gas (~$0.50)
5. **Toca "Withdraw"**
6. **Confirma transacción**
7. **Espera el retiro** - ~30 segundos a 2 minutos
8. **✅ USDC en tu wallet Arbitrum** - Ahora puedes enviar a CEX o usar en DeFi

**Comisión:** Solo comisiones de gas (~$0.50 - $2)
**Tiempo:** 30 segundos a 2 minutos
**Mínimo:** $1

---

### Método 2: Retirar Activos Spot (BTC, ETH, SOL)

**Paso a Paso:**

1. **Ve a Perfil → Assets**
2. **Selecciona activo** (BTC, ETH, SOL)
3. **Toca "Withdraw"**
4. **Ingresa dirección de destino** - Dirección de tu wallet externa - ¡Verifica tres veces la dirección!
5. **Ingresa cantidad** - Cuánto retirar
6. **Revisa** - Dirección de destino, Cantidad, Comisión de red
7. **Confirma retiro**
8. **Espera confirmaciones blockchain**
9. **✅ Activos llegan a wallet externa**

**Comisiones:**
- BTC: ~0.00005 BTC (~$4.50)
- ETH: ~0.0005 ETH (~$1.50)
- SOL: ~0.005 SOL (~$1)

**Tiempo:**
- BTC: 10-30 minutos
- ETH: 3-8 minutos
- SOL: ~1 minuto

---

## Resumen de Comisiones

### Comisiones de Depósito

| Método | Comisión | Tiempo |
|--------|----------|--------|
| **Arbitrum → Hyperliquid** | $0.50 - $2 (gas) | 30 seg - 2 min |
| **Ethereum → Arbitrum (Rhino.fi)** | $5 - $20 | 1-3 min |
| **Polygon → Arbitrum (Rhino.fi)** | $0.50 - $2 | 1-3 min |
| **Depósito Spot BTC** | ~0.00005 BTC | 10-30 min |
| **Depósito Spot ETH** | ~0.0005 ETH | 3-8 min |
| **Depósito Spot SOL** | ~0.005 SOL | ~1 min |

### Comisiones de Retiro

| Método | Comisión | Tiempo |
|--------|----------|--------|
| **Hyperliquid → Arbitrum** | $0.50 - $2 (gas) | 30 seg - 2 min |
| **Retiro BTC** | ~0.00005 BTC | 10-30 min |
| **Retiro ETH** | ~0.0005 ETH | 3-8 min |
| **Retiro SOL** | ~0.005 SOL | ~1 min |

---

## Seguridad y Mejores Prácticas

### Antes de Depositar

**1. Comienza Pequeño**
- Prueba con cantidad mínima primero ($5-$10)
- Verifica que funciona antes de depositar grandes cantidades

**2. Verifica Dos Veces las Direcciones**
- Siempre verifica la dirección de destino
- Un carácter incorrecto = fondos perdidos para siempre

**3. Verifica la Red**
- Asegúrate de estar usando la red correcta (Arbitrum, Hyperliquid, etc.)
- Enviar a red incorrecta = fondos perdidos

---

### Antes de Retirar

**1. Cierra Todas las Posiciones**
- No puedes retirar margen bloqueado en posiciones
- Cierra posiciones primero

**2. Considera las Comisiones**
- No intentes retirar saldo exacto
- Deja buffer para comisiones de gas

**3. Verifica Dirección**
- Verifica tres veces la dirección de retiro
- Envía cantidad de prueba primero si es retiro grande

---

## Solución de Problemas

### Depósito No Aparece

**Si puente Hyperliquid:**
1. Verifica hash TX en Arbiscan
2. Verifica que se envió a dirección correcta
3. Espera 5 minutos (a veces retrasado)
4. Contacta soporte si >10 minutos

**Si puente cross-chain:**
1. Verifica estado de transacción Rhino.fi
2. Los puentes pueden tomar hasta 10 minutos
3. Verifica wallet de destino en Arbiscan

---

### Retiro Falló

**Razones comunes:**

**1. Saldo insuficiente** - Intentaste retirar más que lo disponible - Considera las comisiones

**2. Posiciones activas** - No puedes retirar margen bloqueado en posiciones - Cierra posiciones primero

**3. Órdenes pendientes** - Cancela órdenes abiertas que bloquean fondos

---

## Preguntas Comunes

### ¿Puedo depositar fiat (USD) directamente?

**No.** Rayo no soporta depósitos fiat. Necesitas:
1. Comprar cripto (USDC) en un CEX
2. Retirar a tu wallet
3. Puentear a Hyperliquid

---

### ¿Cuánto tardan los depósitos?

- **Arbitrum → Hyperliquid:** 30 segundos a 2 minutos
- **Puentes cross-chain:** 1-10 minutos
- **Depósitos spot:** 1-30 minutos (varía por blockchain)

---

### ¿Hay límites de retiro?

**Sin límites diarios** en Rayo/Hyperliquid.

Sin embargo, retiros grandes (>$100k) pueden:
- Requerir confirmaciones blockchain adicionales
- Tomar ligeramente más tiempo

---

**Próximos Pasos:**
- [Comenzar a Operar](getting-started.md)
- [Entender Comisiones](fees.md)
- [Leer las FAQ](faq.md)
