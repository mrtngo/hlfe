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
    'INTC': 'Intel',
    'PLTR': 'Palantir',
    'ORCL': 'Oracle',
    'AMD': 'AMD',
    'MU': 'Micron',
    'SNDK': 'SanDisk',
    'MSTR': 'Strategy',
    'CRCL': 'Circle',
    'COST': 'Costco',
    'LLY': 'Eli Lilly',
    'RIVN': 'Rivian',
    'USAR': 'USA Rare Earth',
    'CRWV': 'CoreWeave',
    'GME': 'GameStop',
    'HIMS': 'Hims & Hers',
    'DKNG': 'DraftKings',
    'LITE': 'Lumentum',
    'RKLB': 'Rocket Lab',
    'BX': 'Blackstone',
    'MRVL': 'Marvell',
    'NBIS': 'Nebius',
    'WDC': 'Western Digital',
    'AVGO': 'Broadcom',
    'NOW': 'ServiceNow',
    'IBM': 'IBM',
    'DELL': 'Dell',
    'ZM': 'Zoom',
    'EBAY': 'eBay',
    'BIRD': 'Allbirds',
    'BB': 'BlackBerry',
    'TSM': 'TSMC',
    'BABA': 'Alibaba',
    'ASML': 'ASML',
    'ARM': 'Arm Holdings',
    'NOK': 'Nokia',

    // Korean & Japanese equities
    'SKHX': 'SK Hynix',
    'SMSN': 'Samsung Electronics',
    'HYUNDAI': 'Hyundai Motor',
    'SOFTBANK': 'SoftBank',
    'KIOXIA': 'Kioxia',

    // ETFs
    'URNM': 'Sprott Uranium Miners ETF',
    'EWY': 'iShares Corea ETF',
    'EWJ': 'iShares Japón ETF',
    'EWZ': 'iShares Brasil ETF',
    'EWT': 'iShares Taiwán ETF',
    'XLE': 'Energy Select Sector ETF',

    // Commodities
    'GOLD': 'Oro',
    'SILVER': 'Plata',
    'CL': 'Petróleo Crudo (WTI)',
    'COPPER': 'Cobre',
    'NATGAS': 'Gas Natural',
    'URANIUM': 'Uranio',
    'ALUMINIUM': 'Aluminio',
    'PLATINUM': 'Platino',
    'PALLADIUM': 'Paladio',
    'BRENTOIL': 'Petróleo Brent',
    'CORN': 'Maíz',
    'WHEAT': 'Trigo',
    'TTF': 'Gas Natural (TTF)',

    // Indices
    'XYZ100': 'Índice XYZ 100',
    'KR200': 'KOSPI 200',
    'JP225': 'Nikkei 225',
    'SP500': 'S&P 500',
    'NIFTY': 'Nifty 50',
    'IBOV': 'Bovespa',
    'DXY': 'Índice Dólar',
    'VIX': 'Índice VIX',

    // Forex
    'JPY': 'Yen Japonés',
    'EUR': 'Euro',
    'GBP': 'Libra Esterlina',
    'KRW': 'Won Surcoreano',

    // Pre-IPO / private
    'SPCX': 'SpaceX',
    'MINIMAX': 'MiniMax',
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
    'INTC': 'Intel es uno de los mayores fabricantes de chips del mundo, pionero en procesadores para computadoras. Busca recuperar terreno en la era de la inteligencia artificial.',
    'PLTR': 'Palantir crea software de análisis de datos con IA para gobiernos y grandes empresas. Es una de las acciones favoritas del boom de la inteligencia artificial.',
    'ORCL': 'Oracle es un gigante del software empresarial y bases de datos. Ha crecido fuerte ofreciendo infraestructura en la nube para entrenar modelos de inteligencia artificial.',
    'AMD': 'AMD diseña procesadores y tarjetas gráficas que compiten con Intel y NVIDIA. Es un actor clave en chips para gaming, centros de datos e inteligencia artificial.',
    'MU': 'Micron es uno de los mayores fabricantes de memorias y chips de almacenamiento del mundo, componentes esenciales para computadoras, móviles e inteligencia artificial.',
    'SNDK': 'SanDisk es líder en memorias flash y soluciones de almacenamiento de datos, presentes en móviles, cámaras y centros de datos de todo el mundo.',
    'MSTR': 'Strategy (antes MicroStrategy) es una empresa de software conocida por su enorme tesorería en Bitcoin. Sus acciones suelen moverse al ritmo del precio de BTC.',
    'CRCL': 'Circle es la empresa detrás de USDC, una de las stablecoins más usadas del mundo. Conecta el dinero tradicional con el ecosistema cripto.',
    'COST': 'Costco es una de las mayores cadenas de tiendas mayoristas por membresía del mundo, conocida por sus bajos precios y su base de clientes fieles.',
    'LLY': 'Eli Lilly es una de las farmacéuticas más grandes del mundo, líder en tratamientos para la diabetes y medicamentos para bajar de peso como Mounjaro.',
    'RIVN': 'Rivian es un fabricante estadounidense de camionetas y SUVs eléctricos, considerado uno de los principales retadores de Tesla en vehículos eléctricos.',
    'USAR': 'USA Rare Earth desarrolla la producción de tierras raras e imanes en Estados Unidos, materiales estratégicos para autos eléctricos, defensa y tecnología.',
    'CRWV': 'CoreWeave ofrece computación en la nube especializada en GPUs para inteligencia artificial. Es una de las empresas de infraestructura de IA de más rápido crecimiento.',
    'GME': 'GameStop es la cadena de tiendas de videojuegos que se volvió famosa en 2021 como la acción "meme" por excelencia, impulsada por inversores minoristas.',
    'HIMS': 'Hims & Hers es una plataforma de telemedicina que vende tratamientos de salud y bienestar en línea, desde pérdida de peso hasta cuidado de la piel.',
    'DKNG': 'DraftKings es una de las mayores plataformas de apuestas deportivas y juegos en línea de Estados Unidos.',
    'LITE': 'Lumentum fabrica componentes ópticos y láseres usados en redes de telecomunicaciones y en los centros de datos que impulsan la inteligencia artificial.',
    'RKLB': 'Rocket Lab es una empresa espacial que lanza satélites al espacio, considerada una de las principales alternativas a SpaceX en lanzamientos pequeños.',
    'BX': 'Blackstone es la mayor gestora de activos alternativos del mundo, con inversiones en bienes raíces, capital privado e infraestructura por billones de dólares.',
    'MRVL': 'Marvell diseña chips semiconductores para centros de datos, redes 5G e inteligencia artificial. Es un proveedor clave de la infraestructura de internet.',
    'NBIS': 'Nebius es una empresa de infraestructura de nube e inteligencia artificial, surgida del antiguo Yandex, enfocada en ofrecer cómputo con GPUs.',
    'WDC': 'Western Digital es uno de los mayores fabricantes de discos duros y almacenamiento de datos del mundo, clave para centros de datos y la nube.',
    'AVGO': 'Broadcom es un gigante de los semiconductores y el software, proveedor de chips esenciales para smartphones, redes e inteligencia artificial.',
    'NOW': 'ServiceNow ofrece software en la nube que ayuda a las grandes empresas a automatizar sus flujos de trabajo y procesos internos.',
    'IBM': 'IBM es una de las empresas tecnológicas más antiguas del mundo, hoy enfocada en computación en la nube, consultoría e inteligencia artificial con Watson.',
    'DELL': 'Dell es uno de los mayores fabricantes de computadoras y servidores del mundo, con creciente protagonismo en hardware para inteligencia artificial.',
    'ZM': 'Zoom es la plataforma de videollamadas que se volvió esencial para el trabajo remoto. Hoy amplía su oferta con herramientas de colaboración e IA.',
    'EBAY': 'eBay es uno de los marketplaces de comercio electrónico más antiguos del mundo, pionero en las subastas y la venta de productos entre particulares.',
    'BIRD': 'Allbirds es una marca de calzado y ropa sustentable, conocida por sus zapatillas fabricadas con materiales naturales como la lana merino.',
    'BB': 'BlackBerry, antes famosa por sus teléfonos, hoy es una empresa de software de ciberseguridad y sistemas para vehículos conectados.',
    'TSM': 'TSMC es el mayor fabricante de chips por contrato del mundo. Produce los semiconductores más avanzados para Apple, NVIDIA y casi toda la industria tecnológica.',
    'BABA': 'Alibaba es el gigante chino del comercio electrónico y la nube, a menudo comparado con Amazon. Es una de las mayores empresas tecnológicas de Asia.',
    'ASML': 'ASML es una empresa holandesa que fabrica las máquinas de litografía más avanzadas del mundo, indispensables para producir los chips más modernos.',
    'ARM': 'Arm Holdings diseña la arquitectura de chips que usan casi todos los smartphones del mundo. Sus diseños son la base de miles de millones de dispositivos.',
    'NOK': 'Nokia es una empresa finlandesa de telecomunicaciones, hoy enfocada en equipos de red 5G e infraestructura para operadores de todo el mundo.',

    // Korean & Japanese equities
    'SKHX': 'SK Hynix es uno de los mayores fabricantes de memorias del mundo, proveedor clave de los chips de alto rendimiento que demanda la inteligencia artificial.',
    'SMSN': 'Samsung Electronics es el gigante tecnológico surcoreano, líder mundial en smartphones, televisores y chips de memoria.',
    'HYUNDAI': 'Hyundai Motor es uno de los mayores fabricantes de automóviles del mundo, con creciente presencia en el mercado de vehículos eléctricos.',
    'SOFTBANK': 'SoftBank es un conglomerado japonés de inversión tecnológica, conocido por sus apuestas en startups a través del Vision Fund y por ser dueño de Arm.',
    'KIOXIA': 'Kioxia es un fabricante japonés de memorias flash y unidades de almacenamiento, surgido de la división de chips de Toshiba.',

    // ETFs
    'URNM': 'Fondo cotizado (ETF) que agrupa a las principales empresas mineras de uranio del mundo: una forma de invertir en el resurgimiento de la energía nuclear.',
    'EWY': 'Fondo cotizado (ETF) que sigue al mercado de acciones de Corea del Sur, con exposición a empresas como Samsung y SK Hynix en un solo activo.',
    'EWJ': 'Fondo cotizado (ETF) que sigue al mercado de acciones de Japón, agrupando a las mayores empresas japonesas en un solo activo.',
    'EWZ': 'Fondo cotizado (ETF) que sigue al mercado de acciones de Brasil, la mayor economía de América Latina.',
    'EWT': 'Fondo cotizado (ETF) que sigue al mercado de acciones de Taiwán, con fuerte peso en la industria de semiconductores como TSMC.',
    'XLE': 'Fondo cotizado (ETF) que agrupa a las mayores empresas energéticas de Estados Unidos, como Exxon y Chevron. Suele moverse con el precio del petróleo.',

    // Commodities
    'GOLD': 'El oro es la reserva de valor más antigua del mundo. Los inversores suelen acudir a él para protegerse de la inflación y la incertidumbre económica.',
    'SILVER': 'La plata es un metal precioso con doble uso: reserva de valor e insumo industrial clave para paneles solares y electrónica.',
    'CL': 'El petróleo crudo WTI es la referencia de precio del petróleo en Estados Unidos y una de las materias primas más negociadas del mundo.',
    'COPPER': 'El cobre es un metal industrial esencial para la construcción, la electrónica y los autos eléctricos. Su precio suele reflejar la salud de la economía global.',
    'NATGAS': 'El gas natural es una de las principales fuentes de energía del mundo, usado para calefacción, generación eléctrica e industria. Su precio es muy volátil.',
    'URANIUM': 'El uranio es el combustible de las centrales nucleares. Su demanda crece con el renovado interés mundial en la energía nuclear como fuente limpia.',
    'ALUMINIUM': 'El aluminio es un metal industrial ligero y versátil, usado en transporte, construcción y envases en todo el mundo.',
    'PLATINUM': 'El platino es un metal precioso usado en joyería y en los convertidores catalíticos de los automóviles. Es más escaso que el oro.',
    'PALLADIUM': 'El paladio es un metal precioso raro, fundamental para los convertidores catalíticos que reducen las emisiones de los autos a gasolina.',
    'BRENTOIL': 'El petróleo Brent es la referencia internacional de precio del petróleo, extraído del Mar del Norte y usado como estándar a nivel global.',
    'CORN': 'El maíz es uno de los cultivos más importantes del mundo, usado como alimento, forraje para animales y en la producción de biocombustibles.',
    'WHEAT': 'El trigo es uno de los cereales más cultivados del mundo y un alimento básico para gran parte de la población global.',
    'TTF': 'El TTF es el precio de referencia del gas natural en Europa. Se volvió clave tras la crisis energética que atravesó el continente.',

    // Indices
    'XYZ100': 'Índice que agrupa a las 100 mayores empresas tecnológicas, una forma de operar el sector tech completo en un solo activo.',
    'KR200': 'El KOSPI 200 reúne a las 200 mayores empresas que cotizan en la bolsa de Corea del Sur. Es el principal índice del mercado surcoreano.',
    'JP225': 'El Nikkei 225 es el índice más conocido de la bolsa de Japón, compuesto por 225 de las principales empresas japonesas.',
    'SP500': 'El S&P 500 agrupa a las 500 mayores empresas de Estados Unidos. Es el índice más seguido del mundo y un termómetro de la economía estadounidense.',
    'NIFTY': 'El Nifty 50 es el principal índice de la bolsa de India, compuesto por las 50 mayores empresas del país.',
    'IBOV': 'El Bovespa es el principal índice de la bolsa de Brasil, que reúne a las empresas más negociadas de la mayor economía de América Latina.',
    'DXY': 'El índice DXY mide la fuerza del dólar estadounidense frente a una canasta de monedas principales como el euro y el yen.',
    'VIX': 'El VIX es el "índice del miedo": mide la volatilidad esperada del mercado estadounidense. Suele subir cuando los inversores entran en pánico.',

    // Forex
    'JPY': 'El yen japonés es una de las monedas más negociadas del mundo y un refugio tradicional en tiempos de incertidumbre en los mercados.',
    'EUR': 'El euro es la moneda oficial de la zona euro y la segunda divisa más negociada del mundo después del dólar estadounidense.',
    'GBP': 'La libra esterlina es la moneda del Reino Unido y una de las divisas más antiguas y negociadas del mundo.',
    'KRW': 'El won es la moneda oficial de Corea del Sur, una de las economías más tecnológicas y exportadoras de Asia.',

    // Pre-IPO / private
    'SPCX': 'Exposición a SpaceX, la empresa aeroespacial de Elon Musk, líder en lanzamientos y en la red de internet satelital Starlink. Aún no cotiza en bolsa.',
    'MINIMAX': 'Exposición a MiniMax, una empresa china de inteligencia artificial enfocada en modelos generativos. Aún no cotiza en bolsa.',
};

/**
 * Get the description for an asset
 * Returns null if no description exists
 */
export function getTokenDescription(ticker: string): string | null {
    return TOKEN_DESCRIPTIONS[ticker.toUpperCase()] ?? null;
}
