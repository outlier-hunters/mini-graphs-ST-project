// Conexión WebSocket y arreglo de monedas se mantienen igual

// WebSocket setup
var preciosEndPoint = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin');
preciosEndPoint.onmessage = procesarNuevoMensaje;

// Coin data structure
const monedas = [
    { nombre: 'bitcoin', icono: "./images/bitcoin.png",  precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
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


function procesarNuevoMensaje(mensaje) {
    var mensajeJson = JSON.parse(mensaje.data);

    for (var nombreMoneda in mensajeJson) {
        for (var i = 0; i < monedas.length; i++) {
            var objetoMoneda = monedas[i];

            if (objetoMoneda.nombre === nombreMoneda) {
                var nuevoPrecio = parseFloat(mensajeJson[nombreMoneda]);

                // Store price history
                objetoMoneda.datos.push({
                    fecha: Date.now(),
                    precio: nuevoPrecio,
                });

                // Update current price
                objetoMoneda.precioActual = nuevoPrecio;

                // Update highest price
                if (!objetoMoneda.precioMasAlto || objetoMoneda.precioMasAlto < nuevoPrecio) {
                    objetoMoneda.precioMasAlto = nuevoPrecio;
                    document.getElementById(`high-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;
                }

                // Update lowest price
                if (!objetoMoneda.precioMasBajo || objetoMoneda.precioMasBajo > nuevoPrecio) {
                    objetoMoneda.precioMasBajo = nuevoPrecio;
                    document.getElementById(`low-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;
                }

                // Update UI with new price
                document.getElementById(`precio-${objetoMoneda.nombre}`).innerText = `$${nuevoPrecio.toFixed(2)}`;

                // Update the chart if the selected currency matches
                if (nombreMoneda === menu.value) {
                    actualizar(objetoMoneda);
                }
            }
        }
    }
}

// DOM elements
var contexto1 = document.getElementById('contexto1');
var contexto2 = document.getElementById('contexto2');
var formatoUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
var menu = document.getElementById('menuMonedas');

// Responsive dimensions
// Full width minus margins
var margen = { top: 20, right: 40, bottom: 30, left: 50 };
var ancho = window.innerWidth - margen.left - margen.right;   // full screen width
var alto = 500 - margen.top - margen.bottom;                  // height, adjustable

// Create SVG inside #modulo2
const svg = d3
    .select('#modulo2')
    .append('svg')
    .attr('width', ancho + margen.left + margen.right)
    .attr('height', alto + margen.top + margen.bottom)
    .append('g')
    .attr('transform', `translate(${margen.left},${margen.top})`);

// X and Y scales
const x = d3.scaleTime().range([0, ancho]);
const ejeX = d3.axisBottom().scale(x);
svg.append('g').attr('transform', `translate(0, ${alto})`).attr('class', 'ejeX');

const y = d3.scaleLinear().range([alto, 0]);
const ejeY = d3.axisLeft().scale(y);
svg.append('g').attr('class', 'ejeY');

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

// Draw/update chart
function actualizar(objetoMoneda) {
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

    const interval = 2 * 60 * 1000;
    x.domain([candles[0].start, candles[candles.length - 1].start + interval]);
    svg.selectAll('.ejeX').transition().duration(300).call(ejeX);

    y.domain([
        d3.min(candles, d => d.low),
        d3.max(candles, d => d.high)
    ]);
    svg.selectAll('.ejeY').transition().duration(300).call(ejeY);

    const candleWidth = (ancho / candles.length) * 0.3;

    // Join data
    const candlestick = svg.selectAll('.candlestick')
        .data(candles, d => d.start);

    candlestick.exit().remove();

    const candlestickEnter = candlestick.enter()
        .append('g')
        .attr('class', 'candlestick');

    const allCandles = candlestickEnter.merge(candlestick);

    // Wick
    allCandles.each(function (d) {
        const group = d3.select(this);

        let wick = group.select('.wick');
        if (wick.empty()) {
            wick = group.append('line')
                .attr('class', 'wick');
        }
        wick.transition().duration(300)
            .attr('x1', x(d.start) + candleWidth / 2)
            .attr('x2', x(d.start) + candleWidth / 2)
            .attr('y1', y(d.high))
            .attr('y2', y(d.low));
    });

    // Body
    allCandles.each(function (d) {
        const group = d3.select(this);

        let body = group.select('.body');
        if (body.empty()) {
            body = group.append('rect')
                .attr('class', 'body');
        }
        const open = d.open;
        const close = d.close;
        const yPos = y(Math.max(open, close));
        const height = Math.abs(y(open) - y(close));

        body.transition().duration(300)
            .attr('x', x(d.start))
            .attr('y', yPos)
            .attr('width', candleWidth)
            .attr('height', height === 0 ? 1 : height)
            .attr('fill', close >= open ? 'green' : 'red');
    });

    // Closing line
    const closingLineData = candles.map(c => ({ time: c.start, close: c.close }));
    const lineGenerator = d3.line()
        .x(d => x(d.time) + candleWidth / 2)
        .y(d => y(d.close));

    const closingLine = svg.selectAll('.closingLine')
        .data([closingLineData]);

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


/////////

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
                // Con offset se separa este eje del otro en el lado derecho
                offset: true
            }
        }
    }
});

// Función para actualizar el chart con los datos de cada criptomoneda
function updateCryptoChart() {

    var bitcoinData = [];
    var ethereumData = [];
    var moneroData = [];
    if (typeof monedas !== 'undefined') {
        var btc = monedas.find(c => c.nombre === 'bitcoin');
        var eth = monedas.find(c => c.nombre === 'ethereum');
        var xmr = monedas.find(c => c.nombre === 'monero');
        if (btc && btc.datos) {
            bitcoinData = btc.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
        }
        if (eth && eth.datos) {
            ethereumData = eth.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
        }
        if (xmr && xmr.datos) {
            moneroData = xmr.datos.map(d => ({ x: new Date(d.fecha), y: d.precio }));
        }
    } else {
        // En caso de que 'monedas' no esté definido, se pueden simular datos para fines de demostración.
        var now = new Date();
        bitcoinData.push({ x: now, y: Math.random() * 20000 + 10000 });
        ethereumData.push({ x: now, y: Math.random() * 1500 + 500 });
        moneroData.push({ x: now, y: Math.random() * 100 + 50 });
    }

    cryptoChart.data.datasets[0].data = bitcoinData;
    cryptoChart.data.datasets[1].data = ethereumData;
    cryptoChart.data.datasets[2].data = moneroData;

    cryptoChart.update();
}

// Actualiza el gráfico cada 5 segundos sin interferir con la implementación anterior
setInterval(updateCryptoChart, 5000);
