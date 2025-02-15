// Conexión WebSocket y arreglo de monedas se mantienen igual
var preciosEndPoint;
function iniciarWebSocket() {
    if (preciosEndPoint) {
        preciosEndPoint.close(); // Close any previous connection
    }
    preciosEndPoint = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin');

    preciosEndPoint.onmessage = procesarNuevoMensaje;

    preciosEndPoint.onclose = function () {
        console.warn("WebSocket Disconnected. Reconnecting in 5 seconds...");
        setTimeout(iniciarWebSocket, 5000); // Reconnect after 5s
    };
}

iniciarWebSocket();

// Coin data structure
const monedas = [
    { nombre: 'bitcoin', icono: "./images/bitcoin.png", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'ethereum', icono: "./images/ethereum.png", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'monero', icono: "./images/monero.png", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'litecoin', icono: "./images/litecoin.png", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
];

// Función para actualizar la hora cada segundo
function actualizarReloj() {
    document.getElementById('clock').innerText = moment().format('hh:mm:ss A');
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

// Renderizar tarjetas de criptomonedas al cargar la página
function renderizarTarjetas() {
    const container = document.getElementById('crypto-container');
    container.innerHTML = ''; // Limpiar antes de renderizar

    monedas.forEach(moneda => {
        container.innerHTML += `
            <div class="col-md-3">
                <div class="crypto-card">
                    <img src="${moneda.icono}" class="crypto-icon" alt="${moneda.nombre}">
                    <h4 class="mt-2">${moneda.nombre.toUpperCase()}</h4>
                    <p class="price" id="precio-${moneda.nombre}">Loading...</p>
                    <p class="high-low">
                        High: <span id="high-${moneda.nombre}">--</span> | Low: <span id="low-${moneda.nombre}">--</span>
                    </p>
                </div>
            </div>
        `;
    });
}

renderizarTarjetas();


// Máximo periodo de tiempo que queremos mantener (ej. 2 horas en ms)
const MAX_TIMEFRAME = 2 * 60 * 60 * 1000;

function procesarNuevoMensaje(mensaje) {
    const mensajeJson = JSON.parse(mensaje.data);
    const now = Date.now(); // Marca de tiempo actual

    for (let nombreMoneda in mensajeJson) {
        // Busca el objeto en el array 'monedas' correspondiente
        const objetoMoneda = monedas.find(m => m.nombre === nombreMoneda);
        if (!objetoMoneda) continue;

        // Parsear el nuevo precio
        const nuevoPrecio = parseFloat(mensajeJson[nombreMoneda]);

        // Agregar nuevo dato
        objetoMoneda.datos.push({
            fecha: now,
            precio: nuevoPrecio,
        });

        // 🚀 Prune: Filtra datos anteriores al periodo máximo
        objetoMoneda.datos = objetoMoneda.datos.filter(d => d.fecha >= now - MAX_TIMEFRAME);

        // Actualizar precio actual
        objetoMoneda.precioActual = nuevoPrecio;

        // Actualizar precio más alto
        if (!objetoMoneda.precioMasAlto || objetoMoneda.precioMasAlto < nuevoPrecio) {
            objetoMoneda.precioMasAlto = nuevoPrecio;
            document.getElementById(`high-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;
        }

        // Actualizar precio más bajo
        if (!objetoMoneda.precioMasBajo || objetoMoneda.precioMasBajo > nuevoPrecio) {
            objetoMoneda.precioMasBajo = nuevoPrecio;
            document.getElementById(`low-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;
        }

        // Actualizar la UI con el nuevo precio
        document.getElementById(`precio-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;

        // Si la moneda coincide con la seleccionada en el menú, actualiza el gráfico de velas
        if (nombreMoneda === menu.value) {
            actualizar(objetoMoneda);
        }
    }
}

// DOM elements
var contexto1 = document.getElementById('contexto1');
var contexto2 = document.getElementById('contexto2');
var formatoUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
var menu = document.getElementById('menuMonedas');

// Aggregate data into 2-minute candles
function aggregateCandlesticks(data) {
    const interval = 1 * 60 * 1000; // 2 minutes
    if (data.length === 0) return [];

    const sorted = data.slice().sort((a, b) => a.fecha - b.fecha);
    let candles = [];

    let startTime = sorted[0].fecha - (sorted[0].fecha % interval);
    let candle = { start: startTime, open: null, high: -Infinity, low: Infinity, close: null };

    sorted.forEach(point => {
        if (point.fecha >= candle.start + interval) {
            if (candle.open !== null) {
                candles.push(candle);
            }
            candle = {
                start: point.fecha - (point.fecha % interval),
                open: null,
                high: -Infinity,
                low: Infinity,
                close: null
            };
        }
        if (candle.open === null) {
            candle.open = point.precio;
        }
        candle.high = Math.max(candle.high, point.precio);
        candle.low = Math.min(candle.low, point.precio);
        candle.close = point.precio;
    });

    if (candle.open !== null) {
        candles.push(candle);
    }
    return candles;
}
// Maximum chart width
const MAX_WIDTH = 1200;
var margen = { top: 20, right: 40, bottom: 30, left: 50 };
var ancho = Math.min(window.innerWidth - margen.left - margen.right, MAX_WIDTH); // Limit width to 1000px
var alto = 500 - margen.top - margen.bottom;

// Create SVG with fixed width (1000px max)
const svg = d3
    .select('#modulo2')
    .append('svg')
    .attr('width', ancho + margen.left + margen.right)
    .attr('height', alto + margen.top + margen.bottom)
    .append('g')
    .attr('transform', `translate(${margen.left},${margen.top})`);

// Append Y-axis Label (Price in USD)
// Append Y-axis Label (Price in USD)
svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)") // Rotate text for Y-axis
    .attr("y", -margen.left + 10) // Move left
    .attr("x", -alto / 2) // Center vertically
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#333")
    .text("Price in USD");

// Append X-axis Label (Time Interval - Last 2 Hours)
svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", ancho / 2) // Center horizontally
    .attr("y", alto + margen.bottom) // Position below X-axis
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#333")
    .text("Time - (Last 2 Hours & Intervals each 2 Min for each candle)");

// Define X and Y scales
const x = d3.scaleTime().range([0, ancho]);
const ejeX = d3.axisBottom().scale(x).ticks(6).tickFormat(d3.timeFormat("%H:%M"));
svg.append('g').attr('transform', `translate(0, ${alto})`).attr('class', 'ejeX');

const y = d3.scaleLinear().range([alto, 0]);
const ejeY = d3.axisLeft().scale(y);
svg.append('g').attr('class', 'ejeY');

function actualizar(objetoMoneda) {
    let now = Date.now();

    // Keep only candles within the last 2 hours
    objetoMoneda.datos = objetoMoneda.datos.filter(d => d.fecha >= now - MAX_TIMEFRAME);

    const candles = aggregateCandlesticks(objetoMoneda.datos);
    if (candles.length === 0) return;

    const lastCandle = candles[candles.length - 1];
    contexto1.innerText = '- ' + menu.value + ' Close Price: ' + formatoUSD.format(lastCandle.close);

    if (lastCandle.close === lastCandle.high) {
        contexto2.innerText = 'Candle closed at its high.';
    } else if (lastCandle.close > lastCandle.open) {
        contexto2.innerText = 'Candle closed up.';
    } else if (lastCandle.close < lastCandle.open) {
        contexto2.innerText = 'Candle closed down.';
    } else {
        contexto2.innerText = 'Candle remained unchanged.';
    }

    // Get first timestamp in dataset to align candles correctly
    const firstTimestamp = candles[0].start;

    // Adjust X-axis scale to fit within the 1000px width
    x.domain([firstTimestamp, firstTimestamp + MAX_TIMEFRAME]);
    svg.selectAll('.ejeX').transition().duration(300).call(ejeX);

    // Adjust Y-axis range dynamically
    y.domain([
        d3.min(candles, d => d.low),
        d3.max(candles, d => d.high)
    ]);
    svg.selectAll('.ejeY').transition().duration(300).call(ejeY);

    // Define spacing and thickness
    const totalCandles = candles.length;
    const availableWidth = ancho - (totalCandles * 20); // Reserve 20px per candle for spacing
    const candleWidth = Math.min((availableWidth / totalCandles), 15); // Ensure candles remain visible

    // Bind data to candlesticks
    const candlestick = svg.selectAll('.candlestick').data(candles, d => d.start);
    candlestick.exit().remove(); // Remove old candles

    const candlestickEnter = candlestick.enter()
        .append('g')
        .attr('class', 'candlestick');

    const allCandles = candlestickEnter.merge(candlestick);

    // Wick (High-Low Line)
    allCandles.each(function (d, i) {
        const group = d3.select(this);
        let wick = group.select('.wick');
        if (wick.empty()) {
            wick = group.append('line').attr('class', 'wick');
        }
        wick.transition().duration(300)
            .attr('x1', x(d.start) + (candleWidth / 2) + (i * 20)) // Apply spacing
            .attr('x2', x(d.start) + (candleWidth / 2) + (i * 20))
            .attr('y1', y(d.high))
            .attr('y2', y(d.low));
    });

    // Body (Open-Close Rectangle)
    allCandles.each(function (d, i) {
        const group = d3.select(this);
        let body = group.select('.body');
        if (body.empty()) {
            body = group.append('rect').attr('class', 'body');
        }
        const open = d.open;
        const close = d.close;
        const yPos = y(Math.max(open, close));
        const height = Math.abs(y(open) - y(close));

        body.transition().duration(300)
            .attr('x', x(d.start) - (candleWidth / 2) + (i * 20)) // Apply spacing
            .attr('y', yPos)
            .attr('width', candleWidth) // Apply increased width
            .attr('height', height === 0 ? 1 : height)
            .attr('fill', close >= open ? 'green' : 'red');
    });

    // Closing Line (Price Trend)
    const closingLineData = candles.map(c => ({ time: c.start, close: c.close }));
    const lineGenerator = d3.line()
        .x((d, i) => x(d.time) + (i * 20)) // Apply spacing
        .y(d => y(d.close));

    const closingLine = svg.selectAll('.closingLine').data([closingLineData]);

    closingLine.join('path')
        .attr('class', 'closingLine')
        .transition().duration(300)
        .attr('d', lineGenerator);
}

// Menu selection
menu.onchange = function () {
    var objetoMoneda = monedas.find(function (obj) {
        return obj.nombre === menu.value;
    });
    actualizar(objetoMoneda);
};

//Price comparison

// Obtenemos el contexto del canvas
var ctx = document.getElementById('cryptoChart').getContext('2d');

// Creamos el gráfico
var cryptoChart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [
            {
                label: 'Bitcoin',
                data: [],
                borderColor: 'orange',
                backgroundColor: 'orange',
                yAxisID: 'y-bitcoin',
                fill: false,
                tension: 0.1
            },
            {
                label: 'Ethereum',
                data: [],
                borderColor: 'purple',
                backgroundColor: 'purple',
                yAxisID: 'y-ethereum',
                fill: false,
                tension: 0.1
            },
            {
                label: 'Monero',
                data: [],
                borderColor: 'teal',
                backgroundColor: 'teal',
                yAxisID: 'y-monero',
                fill: false,
                tension: 0.1
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    tooltipFormat: 'HH:mm:ss'
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            'y-bitcoin': {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Bitcoin (USD)'
                }
            },
            'y-ethereum': {
                type: 'linear',
                position: 'right',
                grid: {
                    drawOnChartArea: false
                },
                title: {
                    display: true,
                    text: 'Ethereum (USD)'
                }
            },
            'y-monero': {
                type: 'linear',
                position: 'right',
                grid: {
                    drawOnChartArea: false
                },
                title: {
                    display: true,
                    text: 'Monero (USD)'
                },

                offset: true
            }
        }
    }
});

// Función para actualizar el chart con los datos de cada criptomoneda
function updateCryptoChart() {
    let bitcoinData = [];
    let ethereumData = [];
    let moneroData = [];

    // Confiamos en que 'procesarNuevoMensaje' ya filtra los datos obsoletos
    const btc = monedas.find(c => c.nombre === 'bitcoin');
    const eth = monedas.find(c => c.nombre === 'ethereum');
    const xmr = monedas.find(c => c.nombre === 'monero');

    if (btc && btc.datos) {
        bitcoinData = btc.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
    }
    if (eth && eth.datos) {
        ethereumData = eth.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
    }
    if (xmr && xmr.datos) {
        moneroData = xmr.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
    }

    cryptoChart.data.datasets[0].data = bitcoinData;
    cryptoChart.data.datasets[1].data = ethereumData;
    cryptoChart.data.datasets[2].data = moneroData;

    cryptoChart.update();
}


// Actualiza el gráfico cada 5 segundos sin interferir con la implementación anterior
setInterval(updateCryptoChart, 5000);



// Market Volume
const volCtx = document.getElementById("bubbleChart").getContext("2d");

// 🚀 Define fixed colors for each crypto asset
const cryptoColors = {
    "Bitcoin": "#FFD700",    // Gold
    "Ethereum": "#1E90FF",   // Blue
    "XRP": "#FF0000",        // Red
    "Tether": "#00FF00",     // Green
    "Solana": "#9932CC",     // Purple
    "BNB": "#FF4500",        // Orange-Red
    "USDC": "#FF1493",       // Pink
    "Dogecoin": "#FF69B4",   // Light Pink
    "Cardano": "#00BFFF",    // Deep Sky Blue
    "Lido Staked ETH": "#8A2BE2" // Blue-Violet
};

// Initialize Chart
const bubbleChart = new Chart(volCtx, {
    type: "bubble",
    data: { datasets: [] },
    options: {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const asset = context.dataset.label;
                        const marketCap = context.raw.x.toLocaleString();
                        const volume = context.raw.y.toLocaleString();
                        const price = context.raw.r.toLocaleString();
                        return `${asset}\nMarket Cap: $${marketCap}\nVolume: $${volume}\nPrice: $${price}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: "Market Capitalization (USD)" },
                type: "logarithmic",
                position: "bottom"
            },
            y: {
                title: { display: true, text: "24h Trading Volume (USD)" },
                type: "logarithmic"
            }
        }
    }
});

// Function to fetch and update market data
async function fetchMarketData() {
    try {
        const response = await fetch("https://api.coincap.io/v2/assets");
        const data = await response.json();

        // 🔹 Use FIXED COLORS for each cryptocurrency
        bubbleChart.data.datasets = data.data.slice(0, 10).map(asset => ({
            label: asset.name,
            data: [{
                x: parseFloat(asset.marketCapUsd),
                y: parseFloat(asset.volumeUsd24Hr),
                r: Math.min(Math.sqrt(parseFloat(asset.priceUsd)) * 0.5, 50)
            }],
            backgroundColor: cryptoColors[asset.name] || "#999999", // Default to grey if unknown
            borderColor: cryptoColors[asset.name] || "#999999"
        }));

        bubbleChart.update();
    } catch (error) {
        console.error("Error fetching market data:", error);
    }
}
fetchMarketData();

setInterval(fetchMarketData, 60000);

function showTooltip(id) {
    document.getElementById(id).style.display = 'block';
}
function hideTooltip(id) {
    document.getElementById(id).style.display = 'none';
}