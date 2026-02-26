/**
 * Token display names and utilities
 * Maps ticker symbols to human-readable names
 */

/**
 * Full names for token tickers
 * Used for display in watchlist, market selector, etc.
 */
export const TOKEN_FULL_NAMES: Record<string, string> = {
    // Major Cryptocurrencies
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'BNB': 'BNB',
    'XRP': 'XRP',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap',
    'ATOM': 'Cosmos',
    'LTC': 'Litecoin',
    'SHIB': 'Shiba Inu',

    // L1/L2 & Infrastructure
    'APT': 'Aptos',
    'ARB': 'Arbitrum',
    'OP': 'Optimism',
    'SUI': 'Sui',
    'SEI': 'Sei',
    'INJ': 'Injective',
    'TIA': 'Celestia',
    'NEAR': 'Near Protocol',
    'FTM': 'Fantom',
    'TON': 'Toncoin',
    'TRX': 'Tron',
    'KAS': 'Kaspa',
    'STX': 'Stacks',
    'XLM': 'Stellar',
    'ALGO': 'Algorand',
    'VET': 'VeChain',
    'CFX': 'Conflux',
    'HBAR': 'Hedera',
    'EGLD': 'MultiversX',
    'ICP': 'Internet Computer',
    'FIL': 'Filecoin',

    // Hyperliquid ecosystem
    'HYPE': 'Hyperliquid',

    // Memecoins
    'PEPE': 'Pepe',
    'WIF': 'dogwifhat',
    'BONK': 'Bonk',

    // DeFi
    'JUP': 'Jupiter',
    'PYTH': 'Pyth Network',
    'JTO': 'Jito',
    'AAVE': 'Aave',
    'MKR': 'Maker',
    'CRV': 'Curve',
    'LDO': 'Lido DAO',
    'GMX': 'GMX',
    'SNX': 'Synthetix',
    'PENDLE': 'Pendle',
    'ENA': 'Ethena',
    'ONDO': 'Ondo Finance',
    'RUNE': 'THORChain',

    // AI & Infrastructure
    'RENDER': 'Render',
    'FET': 'Fetch.ai',
    'TAO': 'Bittensor',
    'WLD': 'Worldcoin',

    // Web3 & Identity
    'W': 'Wormhole',
    'STRK': 'Starknet',
    'BLUR': 'Blur',
    'ENS': 'ENS',
    'ORDI': 'ORDI',

    // Gaming & Metaverse
    'IMX': 'Immutable X',
    'APE': 'ApeCoin',
    'GALA': 'Gala',
    'AXS': 'Axie Infinity',
    'SAND': 'The Sandbox',
    'MANA': 'Decentraland',

    // Stocks (Trade.xyz / Hyperunit)
    'NVDA': 'NVIDIA',
    'MSFT': 'Microsoft',
    'TSLA': 'Tesla',
    'GOOGL': 'Alphabet',
    'AMZN': 'Amazon',
    'AAPL': 'Apple',
    'META': 'Meta',
    'NFLX': 'Netflix',
    'COIN': 'Coinbase',
    'HOOD': 'Robinhood',
    'PYPL': 'PayPal',
};

/**
 * Get the full display name for a token ticker
 * Returns the ticker itself if no mapping exists
 */
export function getTokenFullName(ticker: string): string {
    return TOKEN_FULL_NAMES[ticker] || ticker;
}

/**
 * Known Trade.xyz (Hyperunit) stock tickers
 * These require isolated margin mode
 */
export const STOCK_TICKERS = [
    'XYZ100', 'NVDA', 'MSFT', 'TSLA', 'GOOGL',
    'AMZN', 'COIN', 'HOOD', 'PYPL', 'AAPL',
    'META', 'NFLX'
];

/**
 * Check if a ticker is a stock/equity
 */
export function isStockTicker(ticker: string): boolean {
    return STOCK_TICKERS.includes(ticker.toUpperCase());
}

/**
 * Short descriptions for assets (in Spanish, default language)
 */
export const TOKEN_DESCRIPTIONS: Record<string, string> = {
    // Major Cryptocurrencies
    'BTC': 'La primera criptomoneda del mundo. Dinero digital descentralizado con un suministro fijo de 21 millones de monedas, diseñado para ser una reserva de valor global.',
    'ETH': 'La plataforma líder para contratos inteligentes y aplicaciones descentralizadas. Motor del ecosistema DeFi, NFTs y Web3 a nivel mundial.',
    'SOL': 'Blockchain de alta velocidad que procesa miles de transacciones por segundo con tarifas mínimas. Popular en DeFi, NFTs y trading on-chain.',
    'BNB': 'Token nativo del ecosistema Binance. Se usa para pagar tarifas con descuento y potencia la BNB Smart Chain, una de las redes más activas del mundo.',
    'XRP': 'Criptomoneda de Ripple diseñada para pagos internacionales rápidos y económicos entre bancos e instituciones financieras.',
    'ADA': 'Blockchain de Cardano basada en investigación académica. Ofrece contratos inteligentes con un enfoque en escalabilidad y sostenibilidad.',
    'DOGE': 'La memecoin original, creada como broma en 2013. Tiene una comunidad enorme y es apoyada por figuras como Elon Musk.',
    'DOT': 'Protocolo de Polkadot que conecta múltiples blockchains. Permite que diferentes redes intercambien datos y valor de forma segura.',
    'MATIC': 'Token de Polygon, solución Layer 2 para Ethereum. Permite transacciones rápidas y baratas manteniendo la seguridad de la red principal.',
    'AVAX': 'Blockchain de alta velocidad de Avalanche con finalidad de transacción de menos de 2 segundos. Popular en DeFi y creación de subredes personalizadas.',
    'LINK': 'El oráculo descentralizado líder que conecta contratos inteligentes con datos del mundo real. Infraestructura crítica para el ecosistema DeFi.',
    'UNI': 'Token de gobernanza de Uniswap, el exchange descentralizado más grande del mundo. Los titulares votan sobre el futuro del protocolo.',
    'ATOM': 'Token del Hub de Cosmos, el "Internet de Blockchains". Permite la comunicación entre redes blockchain mediante el protocolo IBC.',
    'LTC': 'Una de las primeras criptomonedas, lanzada en 2011. Más rápida y barata que Bitcoin, con tiempos de bloque de 2.5 minutos.',
    'SHIB': 'Memecoin del ecosistema Shiba Inu con ambiciones de convertirse en token de utilidad a través de ShibaSwap y su propio metaverso.',

    // L1/L2 & Infrastructure
    'APT': 'Blockchain Layer 1 desarrollada por ex-empleados de Diem (Meta). Usa el lenguaje Move para smart contracts seguros y de alto rendimiento.',
    'ARB': 'Token de gobernanza de Arbitrum, la principal red Layer 2 de Ethereum por volumen. Permite transacciones rápidas y baratas compatibles con EVM.',
    'OP': 'Token de gobernanza de Optimism, red Layer 2 de Ethereum. Usa pruebas de fraude optimistas y distribuye ganancias a proyectos de bien público.',
    'SUI': 'Blockchain de alta velocidad que usa el lenguaje Move. Diseñada para aplicaciones de consumo masivo con baja latencia y alta escalabilidad.',
    'SEI': 'Blockchain Layer 1 optimizada específicamente para trading. Tiene un motor de coincidencia de órdenes nativo y baja latencia para DeFi.',
    'INJ': 'Protocolo DeFi diseñado para productos financieros descentralizados como derivados, forex y mercados sintéticos sin permisos.',
    'TIA': 'Celestia es la primera red modular de disponibilidad de datos. Separa la disponibilidad de datos del procesamiento para mayor escalabilidad blockchain.',
    'NEAR': 'Blockchain escalable con cuentas de usuario amigables. Usa tecnología de sharding para alta capacidad de procesamiento y experiencia de usuario simplificada.',
    'FTM': 'Red de Fantom orientada a DeFi con transacciones de menos de 1 segundo y tarifas ultra-bajas. Ahora actualizada a la red Sonic.',
    'TON': 'La blockchain de Telegram. Con 900 millones de usuarios de Telegram como audiencia potencial, es una de las redes con mayor adopción masiva.',
    'TRX': 'Blockchain de Tron enfocada en entretenimiento y contenido digital. Procesa más de 2.000 transacciones por segundo con tarifas mínimas.',
    'KAS': 'Criptomoneda de prueba de trabajo (PoW) con tecnología BlockDAG. Permite bloques paralelos para mayor velocidad sin sacrificar descentralización.',
    'STX': 'Token de Stacks, la capa de contratos inteligentes construida sobre Bitcoin. Hereda la seguridad de Bitcoin para aplicaciones DeFi.',
    'XLM': 'Red de Stellar para pagos internacionales rápidos y económicos. Se enfoca en inclusión financiera y conexión con sistemas bancarios tradicionales.',
    'ALGO': 'Blockchain de Algorand con prueba de participación pura. Diseñada para finanzas y activos digitales con alta velocidad y sin bifurcaciones.',
    'VET': 'Blockchain VeChain orientada a la gestión de cadena de suministro y trazabilidad empresarial. Cuenta con alianzas con empresas Fortune 500.',
    'HBAR': 'Red Hedera Hashgraph con gobernanza de consejo empresarial. Ofrece transacciones rápidas, baratas y de bajo impacto ambiental.',
    'ICP': 'Internet Computer de DFINITY. Busca reemplazar servicios de nube tradicionales con computación descentralizada y aplicaciones web on-chain.',
    'FIL': 'Red de almacenamiento descentralizado Filecoin. Permite alquilar espacio de disco duro a cambio de tokens, compitiendo con AWS S3.',

    // Hyperliquid Ecosystem
    'HYPE': 'Token nativo de Hyperliquid, el exchange on-chain de perpetuos más popular. Otorga derechos de gobernanza y participación en las ganancias del protocolo.',

    // Memecoins
    'PEPE': 'Memecoin basada en el famoso meme de la rana Pepe. Una de las memecoins más populares y negociadas del ciclo 2023-2024.',
    'WIF': 'Memecoin de Solana con la imagen de un perro con gorro. Se convirtió en una de las memecoins de mayor capitalización de su ciclo.',
    'BONK': 'El memecoin original de Solana, distribuido a la comunidad en Navidad 2022. Símbolo del resurgimiento del ecosistema Solana.',

    // DeFi
    'JUP': 'Token de gobernanza de Jupiter, el agregador de DEX más importante de Solana. Enruta operaciones para obtener el mejor precio disponible en cadena.',
    'PYTH': 'Protocolo de oráculos de alta frecuencia para datos financieros en tiempo real. Alimenta más de 400 aplicaciones DeFi en múltiples blockchains.',
    'JTO': 'Token de gobernanza de Jito, el principal protocolo de liquid staking en Solana. Maximiza rendimientos capturando MEV para sus depositantes.',
    'AAVE': 'Protocolo líder de préstamos descentralizados con miles de millones en liquidez. Permite pedir prestado contra colateral crypto o ganar interés depositando.',
    'MKR': 'Token de gobernanza del protocolo Maker, creador de la stablecoin DAI. Los titulares controlan los parámetros de riesgo del sistema.',
    'CRV': 'Token de Curve Finance, el exchange descentralizado especializado en stablecoins y activos de valor similar con mínimo deslizamiento de precio.',
    'LDO': 'Token de gobernanza de Lido, el mayor protocolo de liquid staking de Ethereum. Permite hacer staking de ETH sin los 32 ETH requeridos.',
    'GMX': 'Exchange de perpetuos descentralizado en Arbitrum y Avalanche. Ofrece trading sin libro de órdenes con liquidez profunda y bajos spreads.',
    'SNX': 'Token de Synthetix, plataforma de activos sintéticos en Ethereum y Optimism. Permite la creación de derivados on-chain respaldados por colateral.',
    'PENDLE': 'Protocolo DeFi que tokeniza rendimientos futuros. Permite comprar o vender rendimientos futuros y especular con las tasas de interés en DeFi.',
    'ENA': 'Token del protocolo Ethena, creador de USDe, la stablecoin sintética respaldada por posiciones delta-neutral en ETH y BTC.',
    'ONDO': 'Protocolo de tokenización de activos del mundo real (RWA). Lleva bonos del Tesoro de EE.UU. y activos financieros tradicionales a la blockchain.',
    'RUNE': 'Token nativo de THORChain, el protocolo de intercambio cross-chain. Permite intercambios nativos entre Bitcoin, Ethereum y otras redes sin wrapped tokens.',

    // AI & Infrastructure
    'RENDER': 'Red de computación GPU descentralizada para renderizado 3D e IA. Conecta artistas y desarrolladores con proveedores de GPU a nivel global.',
    'FET': 'Token de Fetch.ai, plataforma de agentes autónomos de inteligencia artificial. Permite crear redes de agentes de IA que operan en mercados descentralizados.',
    'TAO': 'Token de Bittensor, red descentralizada de inteligencia artificial. Incentiva el desarrollo y despliegue de modelos de IA a través de subredes especializadas.',
    'WLD': 'Proyecto de Sam Altman (OpenAI) que crea identidad digital global mediante escaneo biométrico del iris para distinguir humanos de IA en internet.',

    // Web3 & Identity
    'W': 'Token de Wormhole, el protocolo líder de mensajería cross-chain. Conecta más de 30 blockchains permitiendo transferencias de activos y datos entre redes.',
    'STRK': 'Token de Starknet, solución Layer 2 de Ethereum basada en pruebas ZK. Ofrece mayor seguridad criptográfica y escalabilidad que otras redes L2.',
    'BLUR': 'Token del marketplace de NFTs Blur, diseñado para traders profesionales. Ofrece royalties flexibles, agregación de mercados y liquidez de préstamos NFT.',
    'ENS': 'Ethereum Name Service: el sistema de nombres descentralizado de Ethereum. Convierte direcciones hexadecimales en nombres legibles como "usuario.eth".',
    'ORDI': 'El primer token BRC-20 en Bitcoin, creado con el protocolo Ordinals. Pionero en la inscripción de datos en satoshis de la red Bitcoin.',

    // Gaming & Metaverse
    'IMX': 'Token de Immutable X, la principal plataforma Layer 2 para NFTs y juegos en Ethereum. Sin gas y con transacciones instantáneas para activos digitales.',
    'APE': 'Token de gobernanza del ecosistema Bored Ape Yacht Club. Usado en el metaverso Otherside y como moneda en el ecosistema de Yuga Labs.',
    'GALA': 'Token del ecosistema Gala Games, plataforma de juegos blockchain. Los jugadores poseen sus activos digitales y pueden ganar tokens jugando.',
    'AXS': 'Token de Axie Infinity, el juego play-to-earn que popularizó la economía de juegos blockchain. Los jugadores crían y batallan con criaturas NFT.',
    'SAND': 'Token de The Sandbox, metaverso donde los usuarios crean y monetizan experiencias virtuales. Terrenos y activos son NFTs negociables.',
    'MANA': 'Token de Decentraland, mundo virtual descentralizado en Ethereum. Los usuarios compran terrenos, crean experiencias y gobiernan la plataforma.',

    // Stocks
    'NVDA': 'NVIDIA es el líder mundial en GPUs para inteligencia artificial y computación acelerada. Sus chips son la infraestructura crítica del boom de IA.',
    'MSFT': 'Microsoft es una de las empresas más grandes del mundo. Lidera en software empresarial, nube con Azure e IA con su inversión estratégica en OpenAI.',
    'TSLA': 'Tesla es el fabricante de vehículos eléctricos más valioso del mundo. Bajo Elon Musk también desarrolla software de conducción autónoma y energía solar.',
    'GOOGL': 'Alphabet es la empresa matriz de Google, dueña del mayor motor de búsqueda y plataforma publicitaria del mundo, además de YouTube y Google Cloud.',
    'AMZN': 'Amazon domina el e-commerce global y es líder en computación en la nube con AWS. También opera Prime Video, Alexa y una red logística propia.',
    'AAPL': 'Apple es una de las empresas más valiosas del mundo. Crea el iPhone, Mac y servicios como App Store, iCloud y Apple Pay con miles de millones de usuarios.',
    'META': 'Meta es dueña de Facebook, Instagram y WhatsApp. Lidera en publicidad en redes sociales e invierte fuertemente en realidad virtual con Vision Pro.',
    'NFLX': 'Netflix es el mayor servicio de streaming del mundo con más de 300 millones de suscriptores. Produce contenido original premiado en múltiples idiomas.',
    'COIN': 'Coinbase es la mayor exchange de criptomonedas de EE.UU., cotizada en Nasdaq. Ofrece servicios de trading, custodia y staking para retail e instituciones.',
    'HOOD': 'Robinhood democratizó el trading gratuito de acciones para millones de jóvenes inversores. También opera un exchange de criptomonedas y tarjeta de débito.',
    'PYPL': 'PayPal es el líder mundial en pagos digitales con más de 400 millones de usuarios. Ofrece pagos, crédito, compra/venta de criptomonedas y su stablecoin PYUSD.',
};

/**
 * Get the description for an asset
 * Returns null if no description exists
 */
export function getTokenDescription(ticker: string): string | null {
    return TOKEN_DESCRIPTIONS[ticker.toUpperCase()] ?? null;
}
