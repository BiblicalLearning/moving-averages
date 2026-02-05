/* ============================================
   TRADESAFEAI MOVING AVERAGES MODULE
   Professional Canvas Visualizations

   Concepts Covered:
   1. SMA vs EMA vs WMA differences
   2. Key periods: 9, 20, 50, 200
   3. Golden Cross and Death Cross
   4. Moving average ribbons
   5. Dynamic support and resistance
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    colors: {
        red: '#e74c3c',
        gold: '#f39c12',
        green: '#27ae60',
        blue: '#3498db',
        purple: '#9b59b6',
        cyan: '#00d4ff',
        white: '#f5f5f5',
        bgDark: '#080808',
        bgCard: '#0d0d0d',
        bgElevated: '#151515',
        text: '#f5f5f5',
        textMuted: '#888888',
        grid: 'rgba(255, 255, 255, 0.06)',
        bullCandle: '#27ae60',
        bearCandle: '#e74c3c',
        // MA specific colors
        ma9: '#e74c3c',
        ma20: '#f39c12',
        ma50: '#27ae60',
        ma200: '#3498db',
        sma: '#3498db',
        ema: '#e74c3c',
        wma: '#9b59b6',
        price: '#f39c12'
    },
    animation: {
        duration: 1500,
        easing: t => 1 - Math.pow(1 - t, 3) // ease-out-cubic
    }
};

// ============================================
// CANVAS UTILITIES
// ============================================
const Canvas = {
    getContext(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();

        let w = Math.floor(rect.width);
        let h = Math.floor(rect.height);

        if (h < 50) {
            const originalW = parseInt(canvas.getAttribute('width') || 500);
            const originalH = parseInt(canvas.getAttribute('height') || 300);
            h = Math.floor(w * (originalH / originalW));
        }

        w = Math.max(200, Math.min(w, 1400));
        h = Math.max(100, Math.min(h, 700));

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        return { ctx, w, h, canvas };
    },

    clear(ctx, w, h) {
        ctx.fillStyle = CONFIG.colors.bgElevated;
        ctx.fillRect(0, 0, w, h);
    },

    drawGrid(ctx, w, h, spacing = 40) {
        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 0.5;
        for (let x = spacing; x < w; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = spacing; y < h; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    },

    drawProgressiveLine(ctx, points, color, width, progress) {
        if (points.length < 2 || progress <= 0) return;
        const drawCount = Math.floor(points.length * progress);
        if (drawCount < 2) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < drawCount - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[Math.min(drawCount - 1, points.length - 1)].x,
                   points[Math.min(drawCount - 1, points.length - 1)].y);
        ctx.stroke();
    },

    drawLine(ctx, points, color, width) {
        if (points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    },

    drawSmoothLine(ctx, points, color, width, progress = 1) {
        if (points.length < 2 || progress <= 0) return;
        const drawCount = Math.max(2, Math.floor(points.length * progress));

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < drawCount; i++) {
            const xc = (points[i - 1].x + points[i].x) / 2;
            const yc = (points[i - 1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[drawCount - 1].x, points[drawCount - 1].y);
        ctx.stroke();
    },

    drawDashedLine(ctx, x1, y1, x2, y2, color, dashPattern = [5, 5]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash(dashPattern);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    drawText(ctx, text, x, y, color, size = 12, align = 'left') {
        ctx.fillStyle = color;
        ctx.font = `${size}px 'Rajdhani', sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    },

    drawCandle(ctx, x, open, close, high, low, width = 8) {
        const isGreen = close < open; // In canvas, lower y = higher price
        const color = isGreen ? CONFIG.colors.bullCandle : CONFIG.colors.bearCandle;
        const top = Math.min(open, close);
        const bottom = Math.max(open, close);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, low);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, top, width, Math.max(bottom - top, 1));
    },

    drawCircle(ctx, x, y, radius, fillColor, strokeColor = null, strokeWidth = 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    },

    drawArrow(ctx, fromX, fromY, toX, toY, color, headSize = 8) {
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // Line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headSize * Math.cos(angle - Math.PI / 6), toY - headSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headSize * Math.cos(angle + Math.PI / 6), toY - headSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
};

// ============================================
// DATA GENERATORS
// ============================================
const DataGen = {
    // Generate realistic price data
    generatePriceData(count, startPrice = 100, volatility = 2, trend = 0) {
        const prices = [startPrice];
        for (let i = 1; i < count; i++) {
            const change = (Math.random() - 0.5) * volatility + trend;
            prices.push(Math.max(prices[i - 1] + change, 10));
        }
        return prices;
    },

    // Calculate SMA
    calculateSMA(prices, period) {
        const sma = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    },

    // Calculate EMA
    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);

        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
            ema.push(null);
        }
        ema[period - 1] = sum / period;

        // Calculate EMA
        for (let i = period; i < prices.length; i++) {
            ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
        }
        return ema;
    },

    // Calculate WMA
    calculateWMA(prices, period) {
        const wma = [];
        const weightSum = (period * (period + 1)) / 2;

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                wma.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += prices[i - period + 1 + j] * (j + 1);
                }
                wma.push(sum / weightSum);
            }
        }
        return wma;
    },

    // Convert price array to canvas points
    toCanvasPoints(values, w, h, padding = 50) {
        const validValues = values.filter(v => v !== null);
        const min = Math.min(...validValues);
        const max = Math.max(...validValues);
        const range = max - min || 1;

        const points = [];
        const xStep = (w - padding * 2) / (values.length - 1);

        for (let i = 0; i < values.length; i++) {
            if (values[i] !== null) {
                const x = padding + i * xStep;
                const y = padding + (1 - (values[i] - min) / range) * (h - padding * 2);
                points.push({ x, y });
            }
        }
        return points;
    },

    // Generate trending price data for specific patterns
    generateTrendingData(count, type = 'uptrend') {
        const prices = [];
        let price = 100;

        for (let i = 0; i < count; i++) {
            const noise = (Math.random() - 0.5) * 3;
            let trend = 0;

            if (type === 'uptrend') {
                trend = 0.3 + Math.sin(i * 0.1) * 0.2;
            } else if (type === 'downtrend') {
                trend = -0.3 - Math.sin(i * 0.1) * 0.2;
            } else if (type === 'crossover-bull') {
                trend = i < count * 0.4 ? -0.4 : 0.6;
            } else if (type === 'crossover-bear') {
                trend = i < count * 0.4 ? 0.4 : -0.6;
            } else if (type === 'range') {
                trend = Math.sin(i * 0.15) * 0.8;
            }

            price = Math.max(price + trend + noise, 20);
            prices.push(price);
        }
        return prices;
    }
};

// ============================================
// ANIMATION CONTROLLER
// ============================================
const AnimationController = {
    animations: new Map(),

    animate(canvasId, drawFn, duration = 1500) {
        if (this.animations.has(canvasId)) {
            cancelAnimationFrame(this.animations.get(canvasId));
        }

        const startTime = performance.now();
        const easing = CONFIG.animation.easing;

        const frame = (currentTime) => {
            const elapsed = currentTime - startTime;
            const rawProgress = Math.min(elapsed / duration, 1);
            const progress = easing(rawProgress);

            drawFn(canvasId, progress);

            if (rawProgress < 1) {
                this.animations.set(canvasId, requestAnimationFrame(frame));
            } else {
                drawFn(canvasId, 1);
                this.animations.delete(canvasId);
            }
        };

        this.animations.set(canvasId, requestAnimationFrame(frame));
    }
};

// ============================================
// MOVING AVERAGE VISUALIZATIONS
// ============================================
const MAVisualizations = {
    // Cache for price data
    priceCache: new Map(),

    // Get or generate cached price data
    getPriceData(key, count, type = 'uptrend') {
        if (!this.priceCache.has(key)) {
            this.priceCache.set(key, DataGen.generateTrendingData(count, type));
        }
        return this.priceCache.get(key);
    },

    // 1. MA Basics - Shows price with a simple MA
    drawMABasics(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate price data
        const prices = this.getPriceData('basics', 60, 'uptrend');
        const ma20 = DataGen.calculateSMA(prices, 20);

        // Scale to canvas
        const allValues = [...prices, ...ma20.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw price line
        const pricePoints = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        const drawPriceCount = Math.floor(prices.length * progress);

        ctx.shadowColor = CONFIG.colors.gold;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, pricePoints.slice(0, drawPriceCount), CONFIG.colors.gold, 2);
        ctx.shadowBlur = 0;

        // Draw MA line
        const maPoints = ma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const drawMACount = Math.floor(maPoints.length * progress);

        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, maPoints.slice(0, drawMACount), CONFIG.colors.blue, 2.5);
        ctx.shadowBlur = 0;

        // Labels
        Canvas.drawText(ctx, 'Moving Average Smooths Price', w / 2, 20, CONFIG.colors.text, 14, 'center');
        Canvas.drawText(ctx, 'Price', w - pad + 5, pricePoints[pricePoints.length - 1].y, CONFIG.colors.gold, 10, 'left');
        if (maPoints.length > 0) {
            Canvas.drawText(ctx, '20 MA', w - pad + 5, maPoints[maPoints.length - 1].y, CONFIG.colors.blue, 10, 'left');
        }
    },

    // 2. MA Comparison - SMA vs EMA vs WMA
    drawMAComparison(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate volatile price data to show differences
        const prices = this.getPriceData('comparison', 60, 'range');
        const sma20 = DataGen.calculateSMA(prices, 20);
        const ema20 = DataGen.calculateEMA(prices, 20);
        const wma20 = DataGen.calculateWMA(prices, 20);

        const allValues = [
            ...prices,
            ...sma20.filter(v => v !== null),
            ...ema20.filter(v => v !== null),
            ...wma20.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw price line (thinner, gold)
        const pricePoints = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        Canvas.drawSmoothLine(ctx, pricePoints, CONFIG.colors.gold + '80', 1.5, progress);

        // Draw SMA (blue)
        const smaPoints = sma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.sma;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, smaPoints, CONFIG.colors.sma, 2, progress);
        ctx.shadowBlur = 0;

        // Draw EMA (red)
        const emaPoints = ema20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.ema;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, emaPoints, CONFIG.colors.ema, 2, progress);
        ctx.shadowBlur = 0;

        // Draw WMA (purple)
        const wmaPoints = wma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.wma;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, wmaPoints, CONFIG.colors.wma, 2, progress);
        ctx.shadowBlur = 0;

        // Legend
        Canvas.drawText(ctx, 'SMA vs EMA vs WMA (20 Period)', w / 2, 18, CONFIG.colors.text, 13, 'center');

        // Legend items at bottom
        const legendY = h - 15;
        Canvas.drawText(ctx, '● SMA', pad + 20, legendY, CONFIG.colors.sma, 11, 'left');
        Canvas.drawText(ctx, '● EMA', pad + 80, legendY, CONFIG.colors.ema, 11, 'left');
        Canvas.drawText(ctx, '● WMA', pad + 140, legendY, CONFIG.colors.wma, 11, 'left');
        Canvas.drawText(ctx, '● Price', pad + 200, legendY, CONFIG.colors.gold, 11, 'left');
    },

    // 3. Key Periods - 9, 20, 50, 200
    drawKeyPeriods(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate longer dataset for 200 MA
        const prices = this.getPriceData('periods', 250, 'uptrend');
        const ma9 = DataGen.calculateEMA(prices, 9);
        const ma20 = DataGen.calculateEMA(prices, 20);
        const ma50 = DataGen.calculateSMA(prices, 50);
        const ma200 = DataGen.calculateSMA(prices, 200);

        // Use last 60 points for display
        const displayStart = prices.length - 60;
        const displayPrices = prices.slice(displayStart);
        const displayMA9 = ma9.slice(displayStart);
        const displayMA20 = ma20.slice(displayStart);
        const displayMA50 = ma50.slice(displayStart);
        const displayMA200 = ma200.slice(displayStart);

        const allValues = [
            ...displayPrices,
            ...displayMA9.filter(v => v !== null),
            ...displayMA20.filter(v => v !== null),
            ...displayMA50.filter(v => v !== null),
            ...displayMA200.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (displayPrices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw all MAs with different colors
        const drawMA = (maData, color, width) => {
            const points = maData.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
            if (points.length > 0) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;
                Canvas.drawSmoothLine(ctx, points, color, width, progress);
                ctx.shadowBlur = 0;
            }
        };

        // Draw price candles/line
        const pricePoints = displayPrices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        Canvas.drawSmoothLine(ctx, pricePoints, CONFIG.colors.gold + '60', 1, progress);

        drawMA(displayMA200, CONFIG.colors.ma200, 3);
        drawMA(displayMA50, CONFIG.colors.ma50, 2.5);
        drawMA(displayMA20, CONFIG.colors.ma20, 2);
        drawMA(displayMA9, CONFIG.colors.ma9, 1.5);

        Canvas.drawText(ctx, 'Key Periods: 9, 20, 50, 200', w / 2, 18, CONFIG.colors.text, 13, 'center');
    },

    // 4. Crossover Basics
    drawCrossoverBasics(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate crossover data
        const prices = this.getPriceData('crossover', 100, 'crossover-bull');
        const ma50 = DataGen.calculateSMA(prices, 20); // Using 20 to simulate faster crossover
        const ma200 = DataGen.calculateSMA(prices, 40); // Using 40 to simulate 200

        const displayStart = 20;
        const displayPrices = prices.slice(displayStart);
        const displayMA50 = ma50.slice(displayStart);
        const displayMA200 = ma200.slice(displayStart);

        const allValues = [
            ...displayPrices,
            ...displayMA50.filter(v => v !== null),
            ...displayMA200.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (displayPrices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw price
        const pricePoints = displayPrices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        Canvas.drawSmoothLine(ctx, pricePoints, CONFIG.colors.gold + '50', 1.5, progress);

        // Draw MAs
        const ma50Points = displayMA50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const ma200Points = displayMA200.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, ma50Points, CONFIG.colors.green, 2.5, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, ma200Points, CONFIG.colors.blue, 2.5, progress);
        ctx.shadowBlur = 0;

        // Find and mark crossover point
        if (progress > 0.7) {
            for (let i = 1; i < displayMA50.length; i++) {
                if (displayMA50[i] !== null && displayMA200[i] !== null &&
                    displayMA50[i - 1] !== null && displayMA200[i - 1] !== null) {
                    if (displayMA50[i - 1] < displayMA200[i - 1] && displayMA50[i] >= displayMA200[i]) {
                        const x = toX(i);
                        const y = toY(displayMA50[i]);
                        Canvas.drawCircle(ctx, x, y, 8, null, CONFIG.colors.gold, 3);
                        Canvas.drawText(ctx, 'GOLDEN CROSS', x, y - 20, CONFIG.colors.green, 11, 'center');
                        break;
                    }
                }
            }
        }

        Canvas.drawText(ctx, 'MA Crossover Signal', w / 2, 18, CONFIG.colors.text, 13, 'center');
    },

    // 5. Golden Cross
    drawGoldenCross(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        const prices = this.getPriceData('golden', 120, 'crossover-bull');
        const ma50 = DataGen.calculateSMA(prices, 15);
        const ma200 = DataGen.calculateSMA(prices, 35);

        const displayStart = 35;
        const displayPrices = prices.slice(displayStart);
        const displayMA50 = ma50.slice(displayStart);
        const displayMA200 = ma200.slice(displayStart);

        const allValues = [
            ...displayPrices,
            ...displayMA50.filter(v => v !== null),
            ...displayMA200.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (displayPrices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw candlesticks - use sine for consistent wicks (no flickering)
        const drawCount = Math.floor(displayPrices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? displayPrices[i - 1] : displayPrices[i];
            const close = displayPrices[i];
            // Use sine functions instead of Math.random() for stable wicks
            const wickHigh = Math.abs(Math.sin(i * 0.7)) * 1.5 + 0.5;
            const wickLow = Math.abs(Math.sin(i * 0.5)) * 1.5 + 0.5;
            const high = toY(Math.max(open, close) + wickHigh);
            const low = toY(Math.min(open, close) - wickLow);
            Canvas.drawCandle(ctx, x, toY(open), toY(close), high, low, 4);
        }

        // Draw MAs
        const ma50Points = displayMA50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const ma200Points = displayMA200.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, ma50Points, CONFIG.colors.green, 3, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, ma200Points, CONFIG.colors.blue, 3, progress);
        ctx.shadowBlur = 0;

        // Mark crossover
        if (progress > 0.6) {
            for (let i = 1; i < displayMA50.length; i++) {
                if (displayMA50[i] !== null && displayMA200[i] !== null &&
                    displayMA50[i - 1] !== null && displayMA200[i - 1] !== null) {
                    if (displayMA50[i - 1] < displayMA200[i - 1] && displayMA50[i] >= displayMA200[i]) {
                        const x = toX(i);
                        const y = toY(displayMA50[i]);

                        // Golden glow effect
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
                        gradient.addColorStop(0, 'rgba(243, 156, 18, 0.8)');
                        gradient.addColorStop(1, 'rgba(243, 156, 18, 0)');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(x, y, 25, 0, Math.PI * 2);
                        ctx.fill();

                        Canvas.drawCircle(ctx, x, y, 6, CONFIG.colors.gold, CONFIG.colors.white, 2);
                        break;
                    }
                }
            }
        }

        Canvas.drawText(ctx, 'Golden Cross - 50 MA crosses above 200 MA', w / 2, 16, CONFIG.colors.green, 11, 'center');
    },

    // 6. Death Cross
    drawDeathCross(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        const prices = this.getPriceData('death', 120, 'crossover-bear');
        const ma50 = DataGen.calculateSMA(prices, 15);
        const ma200 = DataGen.calculateSMA(prices, 35);

        const displayStart = 35;
        const displayPrices = prices.slice(displayStart);
        const displayMA50 = ma50.slice(displayStart);
        const displayMA200 = ma200.slice(displayStart);

        const allValues = [
            ...displayPrices,
            ...displayMA50.filter(v => v !== null),
            ...displayMA200.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (displayPrices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw candlesticks - use sine for consistent wicks (no flickering)
        const drawCount = Math.floor(displayPrices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? displayPrices[i - 1] : displayPrices[i];
            const close = displayPrices[i];
            // Use sine functions instead of Math.random() for stable wicks
            const wickHigh = Math.abs(Math.sin(i * 0.7)) * 1.5 + 0.5;
            const wickLow = Math.abs(Math.sin(i * 0.5)) * 1.5 + 0.5;
            const high = toY(Math.max(open, close) + wickHigh);
            const low = toY(Math.min(open, close) - wickLow);
            Canvas.drawCandle(ctx, x, toY(open), toY(close), high, low, 4);
        }

        // Draw MAs
        const ma50Points = displayMA50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const ma200Points = displayMA200.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, ma50Points, CONFIG.colors.green, 3, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, ma200Points, CONFIG.colors.blue, 3, progress);
        ctx.shadowBlur = 0;

        // Mark crossover
        if (progress > 0.6) {
            for (let i = 1; i < displayMA50.length; i++) {
                if (displayMA50[i] !== null && displayMA200[i] !== null &&
                    displayMA50[i - 1] !== null && displayMA200[i - 1] !== null) {
                    if (displayMA50[i - 1] > displayMA200[i - 1] && displayMA50[i] <= displayMA200[i]) {
                        const x = toX(i);
                        const y = toY(displayMA50[i]);

                        // Red glow effect
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
                        gradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
                        gradient.addColorStop(1, 'rgba(231, 76, 60, 0)');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(x, y, 25, 0, Math.PI * 2);
                        ctx.fill();

                        Canvas.drawCircle(ctx, x, y, 6, CONFIG.colors.red, CONFIG.colors.white, 2);
                        break;
                    }
                }
            }
        }

        Canvas.drawText(ctx, 'Death Cross - 50 MA crosses below 200 MA', w / 2, 16, CONFIG.colors.red, 11, 'center');
    },

    // 7. MA Types Showcase
    drawMATypesShowcase(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 50;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        const prices = this.getPriceData('showcase', 80, 'range');
        const sma = DataGen.calculateSMA(prices, 20);
        const ema = DataGen.calculateEMA(prices, 20);
        const wma = DataGen.calculateWMA(prices, 20);

        const allValues = [
            ...prices,
            ...sma.filter(v => v !== null),
            ...ema.filter(v => v !== null),
            ...wma.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw price
        const pricePoints = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        Canvas.drawSmoothLine(ctx, pricePoints, CONFIG.colors.gold, 2, progress);

        // Draw SMA
        const smaPoints = sma.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, smaPoints, CONFIG.colors.blue, 2.5, progress);
        ctx.shadowBlur = 0;

        // Draw EMA
        const emaPoints = ema.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.red;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, emaPoints, CONFIG.colors.red, 2.5, progress);
        ctx.shadowBlur = 0;

        // Draw WMA
        const wmaPoints = wma.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.purple;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, wmaPoints, CONFIG.colors.purple, 2.5, progress);
        ctx.shadowBlur = 0;

        Canvas.drawText(ctx, 'Notice: EMA (red) reacts fastest to price changes', w / 2, h - 15, CONFIG.colors.textMuted, 11, 'center');
    },

    // 8. SMA Detail
    drawSMADetail(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        const prices = this.getPriceData('smadetail', 50, 'uptrend');
        const sma = DataGen.calculateSMA(prices, 20);

        const allValues = [...prices, ...sma.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? prices[i - 1] : prices[i];
            const close = prices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 1), toY(Math.min(open, close) - 1), 5);
        }

        // Draw SMA
        const smaPoints = sma.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, smaPoints, CONFIG.colors.blue, 3, progress);
        ctx.shadowBlur = 0;

        Canvas.drawText(ctx, 'SMA: Equal Weight to All Prices', w / 2, 16, CONFIG.colors.blue, 12, 'center');
    },

    // 9. EMA Detail
    drawEMADetail(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        const prices = this.getPriceData('emadetail', 50, 'range');
        const ema = DataGen.calculateEMA(prices, 20);

        const allValues = [...prices, ...ema.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? prices[i - 1] : prices[i];
            const close = prices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 1), toY(Math.min(open, close) - 1), 5);
        }

        // Draw EMA
        const emaPoints = ema.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        ctx.shadowColor = CONFIG.colors.red;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, emaPoints, CONFIG.colors.red, 3, progress);
        ctx.shadowBlur = 0;

        Canvas.drawText(ctx, 'EMA: Recent Prices Weighted More', w / 2, 16, CONFIG.colors.red, 12, 'center');
    },

    // 10. All Periods Canvas
    drawAllPeriods(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 50;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        const prices = this.getPriceData('allperiods', 250, 'uptrend');
        const ma9 = DataGen.calculateEMA(prices, 9);
        const ma20 = DataGen.calculateEMA(prices, 20);
        const ma50 = DataGen.calculateSMA(prices, 50);
        const ma200 = DataGen.calculateSMA(prices, 200);

        const displayStart = 190;
        const displayPrices = prices.slice(displayStart);
        const displayMA9 = ma9.slice(displayStart);
        const displayMA20 = ma20.slice(displayStart);
        const displayMA50 = ma50.slice(displayStart);
        const displayMA200 = ma200.slice(displayStart);

        const allValues = [
            ...displayPrices,
            ...displayMA9.filter(v => v !== null),
            ...displayMA20.filter(v => v !== null),
            ...displayMA50.filter(v => v !== null),
            ...displayMA200.filter(v => v !== null)
        ];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (displayPrices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw candlesticks
        const drawCount = Math.floor(displayPrices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? displayPrices[i - 1] : displayPrices[i];
            const close = displayPrices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 0.5), toY(Math.min(open, close) - 0.5), 3);
        }

        // Draw all MAs
        const drawMA = (maData, color, width) => {
            const points = maData.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
            if (points.length > 0) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;
                Canvas.drawSmoothLine(ctx, points, color, width, progress);
                ctx.shadowBlur = 0;
            }
        };

        drawMA(displayMA200, CONFIG.colors.ma200, 3);
        drawMA(displayMA50, CONFIG.colors.ma50, 2.5);
        drawMA(displayMA20, CONFIG.colors.ma20, 2);
        drawMA(displayMA9, CONFIG.colors.ma9, 1.5);

        Canvas.drawText(ctx, 'All Key Periods Working Together', w / 2, 20, CONFIG.colors.text, 14, 'center');
    },

    // 11. Ribbon Showcase
    drawRibbonShowcase(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 50;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Use cached data for consistent display
        if (!this.priceCache.has('ribbonShowcase')) {
            // Generate smooth uptrend price data for ribbon visualization
            const dataPoints = 100;
            const prices = [];
            let price = 50;
            for (let i = 0; i < dataPoints; i++) {
                // Smooth uptrend using sine waves (no random)
                price += 0.4 + Math.sin(i * 0.08) * 0.3 + Math.sin(i * 0.15) * 0.2;
                prices.push(price);
            }
            this.priceCache.set('ribbonShowcase', prices);
        }
        const prices = this.priceCache.get('ribbonShowcase');

        // Create ribbon with multiple EMAs (Fibonacci-based periods)
        const periods = [8, 13, 21, 34, 55];
        const ribbonMAs = periods.map(p => DataGen.calculateEMA(prices, p));

        // Find min/max for scaling (only use valid MA values)
        let allValues = [...prices];
        ribbonMAs.forEach(ma => {
            ma.forEach(v => { if (v !== null) allValues.push(v); });
        });
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw ribbon lines (fast to slow: red, orange, gold, green, blue)
        const colors = [
            CONFIG.colors.red,      // 8 EMA - fastest
            '#e67e22',              // 13 EMA
            CONFIG.colors.gold,     // 21 EMA
            CONFIG.colors.green,    // 34 EMA
            CONFIG.colors.blue      // 55 EMA - slowest
        ];

        // Draw from slowest (back) to fastest (front)
        for (let idx = ribbonMAs.length - 1; idx >= 0; idx--) {
            const maData = ribbonMAs[idx];
            const points = [];
            for (let i = 0; i < maData.length; i++) {
                if (maData[i] !== null) {
                    points.push({ x: toX(i), y: toY(maData[i]) });
                }
            }
            if (points.length > 1) {
                ctx.shadowColor = colors[idx];
                ctx.shadowBlur = 3;
                Canvas.drawSmoothLine(ctx, points, colors[idx], 2, progress);
                ctx.shadowBlur = 0;
            }
        }

        // Draw price line on top
        const pricePoints = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
        Canvas.drawSmoothLine(ctx, pricePoints, CONFIG.colors.white + '60', 1, progress);

        // Add legend at bottom
        const legendY = h - 15;
        const legendStartX = pad;
        const legendSpacing = (w - pad * 2) / 5;

        periods.forEach((period, idx) => {
            const x = legendStartX + idx * legendSpacing + 30;
            ctx.fillStyle = colors[idx];
            ctx.fillRect(x - 20, legendY - 4, 15, 3);
            ctx.fillStyle = CONFIG.colors.textMuted;
            ctx.font = '10px Rajdhani';
            ctx.fillText(`${period} EMA`, x, legendY);
        });

        Canvas.drawText(ctx, 'MA Ribbon - Visualizing Trend Strength', w / 2, 20, CONFIG.colors.text, 14, 'center');
    },

    // 12. Ribbon Expansion
    drawRibbonExpansion(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        // Use cached data for consistent display
        if (!this.priceCache.has('ribbonExpansion')) {
            // Generate smooth uptrend data with accelerating expansion
            const prices = [];
            let price = 50;
            for (let i = 0; i < 80; i++) {
                // Smooth trend with sine wave for natural movement
                const trendStrength = 0.3 + (i / 80) * 0.5; // Accelerating trend
                price += trendStrength + Math.sin(i * 0.1) * 0.3;
                prices.push(price);
            }
            this.priceCache.set('ribbonExpansion', prices);
        }
        const prices = this.priceCache.get('ribbonExpansion');

        const periods = [8, 13, 21, 34, 55];
        const ribbonMAs = periods.map(p => DataGen.calculateEMA(prices, p));

        const allValues = [...prices];
        ribbonMAs.forEach(ma => ma.filter(v => v !== null).forEach(v => allValues.push(v)));
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        const colors = [CONFIG.colors.red, CONFIG.colors.gold, CONFIG.colors.green, CONFIG.colors.blue, CONFIG.colors.purple];

        // Draw from slowest to fastest
        for (let idx = ribbonMAs.length - 1; idx >= 0; idx--) {
            const maData = ribbonMAs[idx];
            const points = [];
            for (let i = 0; i < maData.length; i++) {
                if (maData[i] !== null) {
                    points.push({ x: toX(i), y: toY(maData[i]) });
                }
            }
            if (points.length > 1) {
                ctx.shadowColor = colors[idx];
                ctx.shadowBlur = 4;
                Canvas.drawSmoothLine(ctx, points, colors[idx], 2.5, progress);
                ctx.shadowBlur = 0;
            }
        }

        Canvas.drawText(ctx, 'Ribbon Expanding = Strong Trend', w / 2, 16, CONFIG.colors.green, 11, 'center');
    },

    // 13. Ribbon Compression
    drawRibbonCompression(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        // Use cached data for consistent display
        if (!this.priceCache.has('ribbonCompression')) {
            // Generate data: initial trend, then ranging/compressing
            const prices = [];
            let price = 50;
            for (let i = 0; i < 80; i++) {
                if (i < 25) {
                    // Initial strong uptrend
                    price += 0.8 + Math.sin(i * 0.15) * 0.2;
                } else if (i < 50) {
                    // Trend weakening, volatility decreasing
                    price += 0.1 + Math.sin(i * 0.2) * 0.15;
                } else {
                    // Compression - very tight range
                    price += 0.05 + Math.sin(i * 0.25) * 0.08;
                }
                prices.push(price);
            }
            this.priceCache.set('ribbonCompression', prices);
        }
        const prices = this.priceCache.get('ribbonCompression');

        const periods = [8, 13, 21, 34, 55];
        const ribbonMAs = periods.map(p => DataGen.calculateEMA(prices, p));

        const allValues = [...prices];
        ribbonMAs.forEach(ma => ma.filter(v => v !== null).forEach(v => allValues.push(v)));
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        const colors = [CONFIG.colors.red, CONFIG.colors.gold, CONFIG.colors.green, CONFIG.colors.blue, CONFIG.colors.purple];

        // Draw from slowest to fastest
        for (let idx = ribbonMAs.length - 1; idx >= 0; idx--) {
            const maData = ribbonMAs[idx];
            const points = [];
            for (let i = 0; i < maData.length; i++) {
                if (maData[i] !== null) {
                    points.push({ x: toX(i), y: toY(maData[i]) });
                }
            }
            if (points.length > 1) {
                ctx.shadowColor = colors[idx];
                ctx.shadowBlur = 4;
                Canvas.drawSmoothLine(ctx, points, colors[idx], 2.5, progress);
                ctx.shadowBlur = 0;
            }
        }

        Canvas.drawText(ctx, 'Ribbon Compressing = Weakening Trend', w / 2, 16, CONFIG.colors.red, 11, 'center');
    },

    // 14. Dynamic S/R
    drawDynamicSR(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 50;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        const prices = this.getPriceData('dynamicsr', 80, 'uptrend');
        const ma50 = DataGen.calculateSMA(prices, 20);

        const allValues = [...prices, ...ma50.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw MA as support zone
        const maPoints = ma50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        // Fill support zone below MA in uptrend
        if (maPoints.length > 0) {
            ctx.fillStyle = 'rgba(39, 174, 96, 0.1)';
            ctx.beginPath();
            ctx.moveTo(maPoints[0].x, maPoints[0].y);
            maPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(maPoints[maPoints.length - 1].x, h - pad);
            ctx.lineTo(maPoints[0].x, h - pad);
            ctx.closePath();
            ctx.fill();
        }

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? prices[i - 1] : prices[i];
            const close = prices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 1), toY(Math.min(open, close) - 1), 4);
        }

        // Draw MA
        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 10;
        Canvas.drawSmoothLine(ctx, maPoints, CONFIG.colors.green, 3, progress);
        ctx.shadowBlur = 0;

        // Mark bounce points
        if (progress > 0.5) {
            for (let i = 5; i < prices.length - 5; i++) {
                if (ma50[i] !== null) {
                    const priceDiff = prices[i] - ma50[i];
                    const prevDiff = prices[i - 1] - ma50[i - 1];
                    const nextDiff = prices[i + 1] - ma50[i + 1];

                    // Check for bounce (price touches MA and bounces)
                    if (Math.abs(priceDiff) < 1 && priceDiff > 0 && prevDiff > priceDiff && nextDiff > priceDiff) {
                        const x = toX(i);
                        const y = toY(ma50[i]);
                        Canvas.drawCircle(ctx, x, y, 5, CONFIG.colors.gold, CONFIG.colors.white, 2);
                    }
                }
            }
        }

        Canvas.drawText(ctx, 'MA as Dynamic Support in Uptrends', w / 2, 20, CONFIG.colors.text, 14, 'center');
    },

    // 15. MA as Support
    drawMASupport(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        // Generate uptrend with pullbacks to MA
        const prices = [];
        let price = 80;
        for (let i = 0; i < 60; i++) {
            const cycle = Math.sin(i * 0.2) * 3;
            price += 0.4 + cycle * 0.1;
            prices.push(price + cycle);
        }

        const ma20 = DataGen.calculateEMA(prices, 15);

        const allValues = [...prices, ...ma20.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw support zone
        const maPoints = ma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        if (maPoints.length > 1) {
            ctx.fillStyle = 'rgba(39, 174, 96, 0.15)';
            ctx.beginPath();
            ctx.moveTo(maPoints[0].x, maPoints[0].y);
            maPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(maPoints[maPoints.length - 1].x, h - pad);
            ctx.lineTo(maPoints[0].x, h - pad);
            ctx.closePath();
            ctx.fill();
        }

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? prices[i - 1] : prices[i];
            const close = prices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 0.5), toY(Math.min(open, close) - 0.5), 4);
        }

        // Draw MA
        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, maPoints, CONFIG.colors.green, 2.5, progress);
        ctx.shadowBlur = 0;

        // Draw bounce arrows
        if (progress > 0.7) {
            [15, 30, 45].forEach(i => {
                if (i < prices.length && ma20[i]) {
                    const x = toX(i);
                    const y = toY(ma20[i]) + 15;
                    Canvas.drawArrow(ctx, x, y + 20, x, y, CONFIG.colors.green, 6);
                }
            });
        }

        Canvas.drawText(ctx, 'Buy Pullbacks to Rising MA', w / 2, 16, CONFIG.colors.green, 11, 'center');
    },

    // 16. MA as Resistance
    drawMAResistance(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 35;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 35);

        // Generate downtrend with rallies to MA
        const prices = [];
        let price = 120;
        for (let i = 0; i < 60; i++) {
            const cycle = Math.sin(i * 0.2) * 3;
            price -= 0.4 + cycle * 0.1;
            prices.push(price - cycle);
        }

        const ma20 = DataGen.calculateEMA(prices, 15);

        const allValues = [...prices, ...ma20.filter(v => v !== null)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Draw resistance zone
        const maPoints = ma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        if (maPoints.length > 1) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
            ctx.beginPath();
            ctx.moveTo(maPoints[0].x, pad);
            ctx.lineTo(maPoints[maPoints.length - 1].x, pad);
            maPoints.slice().reverse().forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fill();
        }

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 0; i < drawCount; i++) {
            const x = toX(i);
            const open = i > 0 ? prices[i - 1] : prices[i];
            const close = prices[i];
            Canvas.drawCandle(ctx, x, toY(open), toY(close),
                toY(Math.max(open, close) + 0.5), toY(Math.min(open, close) - 0.5), 4);
        }

        // Draw MA
        ctx.shadowColor = CONFIG.colors.red;
        ctx.shadowBlur = 8;
        Canvas.drawSmoothLine(ctx, maPoints, CONFIG.colors.red, 2.5, progress);
        ctx.shadowBlur = 0;

        // Draw rejection arrows
        if (progress > 0.7) {
            [15, 30, 45].forEach(i => {
                if (i < prices.length && ma20[i]) {
                    const x = toX(i);
                    const y = toY(ma20[i]) - 15;
                    Canvas.drawArrow(ctx, x, y - 20, x, y, CONFIG.colors.red, 6);
                }
            });
        }

        Canvas.drawText(ctx, 'Sell Rallies to Falling MA', w / 2, 16, CONFIG.colors.red, 11, 'center');
    },

    // ============================================
    // TRADING STYLE EXAMPLE CHARTS
    // Slower animations with prominent stop losses
    // ============================================

    // Day Trading Example - 9 EMA / 20 EMA crossover (simplified for mobile)
    drawDayTradingExample(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate cached price data for day trading scenario
        if (!this.priceCache.has('dayTradingExample')) {
            const prices = [];
            let price = 100;
            for (let i = 0; i < 80; i++) {
                if (i < 15) {
                    price -= 0.3 + Math.sin(i * 0.3) * 0.2;
                } else if (i < 25) {
                    price += Math.sin(i * 0.5) * 0.4;
                } else if (i < 55) {
                    price += 0.5 + Math.sin(i * 0.2) * 0.3;
                } else {
                    price -= 0.35 + Math.sin(i * 0.4) * 0.2;
                }
                prices.push(price);
            }
            this.priceCache.set('dayTradingExample', prices);
        }

        const prices = this.priceCache.get('dayTradingExample');
        const ema9 = DataGen.calculateEMA(prices, 9);
        const ema20 = DataGen.calculateEMA(prices, 20);

        const allValues = [...prices, ...ema9.filter(v => v !== null), ...ema20.filter(v => v !== null)];
        const min = Math.min(...allValues) - 3;
        const max = Math.max(...allValues) + 3;
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Find crossover points
        let entryIdx = null;
        let exitIdx = null;
        for (let i = 20; i < prices.length; i++) {
            if (ema9[i] && ema20[i] && ema9[i-1] && ema20[i-1]) {
                if (ema9[i-1] <= ema20[i-1] && ema9[i] > ema20[i] && !entryIdx) {
                    entryIdx = i;
                }
                if (entryIdx && ema9[i-1] >= ema20[i-1] && ema9[i] < ema20[i] && !exitIdx) {
                    exitIdx = i;
                }
            }
        }

        // Calculate stop loss price (below recent swing low at entry)
        const stopLossPrice = entryIdx ? prices[entryIdx] - 4 : null;

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 1; i < drawCount; i++) {
            const x = toX(i);
            const open = prices[i - 1];
            const close = prices[i];
            const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.7)) * 0.5;
            const low = Math.min(open, close) - Math.abs(Math.sin(i * 0.5)) * 0.5;
            Canvas.drawCandle(ctx, x, toY(open), toY(close), toY(high), toY(low), 4);
        }

        // Draw EMAs
        const ema9Points = ema9.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const ema20Points = ema20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.red;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, ema9Points, CONFIG.colors.red, 2.5, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.gold;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, ema20Points, CONFIG.colors.gold, 2.5, progress);
        ctx.shadowBlur = 0;

        // Draw entry, exit, and stop loss as simple dots - appears at 50% progress
        if (progress > 0.5) {
            // Green dot for entry (at crossover)
            if (entryIdx) {
                const entryX = toX(entryIdx);
                const entryY = toY(prices[entryIdx]);

                ctx.beginPath();
                ctx.arc(entryX, entryY, 8, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.colors.green;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Red dot for stop loss (below entry)
                if (stopLossPrice) {
                    const stopY = toY(stopLossPrice);
                    ctx.beginPath();
                    ctx.arc(entryX, stopY, 8, 0, Math.PI * 2);
                    ctx.fillStyle = CONFIG.colors.red;
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Gold dot for exit (at crossover back down)
            if (exitIdx) {
                const exitX = toX(exitIdx);
                const exitY = toY(prices[exitIdx]);

                ctx.beginPath();
                ctx.arc(exitX, exitY, 8, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.colors.gold;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Title
        Canvas.drawText(ctx, 'Day Trading: 9/20 EMA Crossover', w / 2, 18, CONFIG.colors.text, 12, 'center');

        // Simplified legend - tighter spacing for mobile
        const legendY = h - 18;
        Canvas.drawText(ctx, '● 9 EMA', pad, legendY, CONFIG.colors.red, 9, 'left');
        Canvas.drawText(ctx, '● 20 EMA', pad + 50, legendY, CONFIG.colors.gold, 9, 'left');
        Canvas.drawText(ctx, '● Entry', pad + 110, legendY, CONFIG.colors.green, 9, 'left');
        Canvas.drawText(ctx, '● Exit', pad + 155, legendY, CONFIG.colors.gold, 9, 'left');
        Canvas.drawText(ctx, '● Stop', pad + 195, legendY, CONFIG.colors.red, 9, 'left');
    },

    // Swing Trading Example - 20 SMA / 50 SMA pullback entry (simplified for mobile)
    drawSwingTradingExample(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate cached price data with CLEAR pullback scenario
        if (!this.priceCache.has('swingTradingExample2')) {
            const prices = [];
            let price = 80;
            for (let i = 0; i < 80; i++) {
                if (i < 25) {
                    price += 0.6 + Math.sin(i * 0.3) * 0.3;
                } else if (i < 35) {
                    price -= 0.4 + Math.sin(i * 0.4) * 0.2;
                } else if (i < 50) {
                    price += 0.5 + Math.sin(i * 0.25) * 0.3;
                } else if (i < 58) {
                    price -= 0.5 + Math.sin(i * 0.3) * 0.2;
                } else {
                    price += 0.7 + Math.sin(i * 0.2) * 0.25;
                }
                prices.push(price);
            }
            this.priceCache.set('swingTradingExample2', prices);
        }

        const prices = this.priceCache.get('swingTradingExample2');
        const sma20 = DataGen.calculateSMA(prices, 20);
        const sma50 = DataGen.calculateSMA(prices, 50);

        const allValues = [...prices, ...sma20.filter(v => v !== null), ...sma50.filter(v => v !== null)];
        const min = Math.min(...allValues) - 5;
        const max = Math.max(...allValues) + 3;
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Entry point at the bottom of the second pullback (index 57-58)
        const entryIdx = 57;

        // Calculate stop loss - below the 50 SMA
        const sma50AtEntry = sma50[entryIdx] || sma50[55] || 95;
        const stopLossPrice = sma50AtEntry - 3;

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 1; i < drawCount; i++) {
            const x = toX(i);
            const open = prices[i - 1];
            const close = prices[i];
            const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.7)) * 1;
            const low = Math.min(open, close) - Math.abs(Math.sin(i * 0.5)) * 1;
            Canvas.drawCandle(ctx, x, toY(open), toY(close), toY(high), toY(low), 4);
        }

        // Draw SMAs
        const sma20Points = sma20.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const sma50Points = sma50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, sma20Points, CONFIG.colors.green, 3, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.blue;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, sma50Points, CONFIG.colors.blue, 3, progress);
        ctx.shadowBlur = 0;

        // Draw entry and stop loss as simple dots - appears at 50% progress
        if (progress > 0.5) {
            const entryX = toX(entryIdx);
            const entryPrice = sma20[entryIdx] || prices[entryIdx];
            const entryY = toY(entryPrice);
            const stopY = toY(stopLossPrice);

            // Offset stop dot to the right to prevent overlap
            const stopX = entryX + 15;

            // Green dot for entry (on 20 SMA) - smaller for mobile
            ctx.beginPath();
            ctx.arc(entryX, entryY, 6, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.colors.green;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Red dot for stop loss (below 50 SMA, offset right) - smaller for mobile
            ctx.beginPath();
            ctx.arc(stopX, stopY, 6, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.colors.red;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Title
        Canvas.drawText(ctx, 'Swing Trading: Pullback to 20 SMA', w / 2, 18, CONFIG.colors.text, 12, 'center');

        // Simplified legend - moved up to prevent cutoff
        const legendY = h - 18;
        Canvas.drawText(ctx, '● 20 SMA', pad, legendY, CONFIG.colors.green, 9, 'left');
        Canvas.drawText(ctx, '● 50 SMA', pad + 55, legendY, CONFIG.colors.blue, 9, 'left');
        Canvas.drawText(ctx, '● Entry', pad + 110, legendY, CONFIG.colors.green, 9, 'left');
        Canvas.drawText(ctx, '● Stop', pad + 155, legendY, CONFIG.colors.red, 9, 'left');
    },

    // Position Trading Example - 50/200 SMA Golden Cross (simplified for mobile)
    drawPositionTradingExample(canvasId, progress = 1) {
        const data = Canvas.getContext(canvasId);
        if (!data) return;
        const { ctx, w, h } = data;
        const pad = 40;

        Canvas.clear(ctx, w, h);
        Canvas.drawGrid(ctx, w, h, 40);

        // Generate cached price data
        if (!this.priceCache.has('positionTradingExample')) {
            const prices = [];
            let price = 120;
            for (let i = 0; i < 100; i++) {
                if (i < 30) {
                    price -= 0.6 + Math.sin(i * 0.15) * 0.8;
                } else if (i < 50) {
                    price += Math.sin(i * 0.2) * 1.5 + 0.1;
                } else {
                    price += 0.7 + Math.sin(i * 0.1) * 0.5;
                }
                prices.push(price);
            }
            this.priceCache.set('positionTradingExample', prices);
        }

        const prices = this.priceCache.get('positionTradingExample');
        const sma50 = DataGen.calculateSMA(prices, 20);
        const sma200 = DataGen.calculateSMA(prices, 40);

        const allValues = [...prices, ...sma50.filter(v => v !== null), ...sma200.filter(v => v !== null)];
        const min = Math.min(...allValues) - 5;
        const max = Math.max(...allValues) + 5;
        const range = max - min;
        const xStep = (w - pad * 2) / (prices.length - 1);

        const toY = (val) => pad + (1 - (val - min) / range) * (h - pad * 2);
        const toX = (i) => pad + i * xStep;

        // Find Golden Cross point
        let goldenCrossIdx = null;
        for (let i = 45; i < prices.length; i++) {
            if (sma50[i] && sma200[i] && sma50[i-1] && sma200[i-1]) {
                if (sma50[i-1] <= sma200[i-1] && sma50[i] > sma200[i]) {
                    goldenCrossIdx = i;
                    break;
                }
            }
        }

        // Stop loss is below 200 SMA at entry
        const stopLossPrice = goldenCrossIdx && sma200[goldenCrossIdx] ? sma200[goldenCrossIdx] - 5 : null;

        // Draw candlesticks
        const drawCount = Math.floor(prices.length * progress);
        for (let i = 1; i < drawCount; i++) {
            const x = toX(i);
            const open = prices[i - 1];
            const close = prices[i];
            const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.3)) * 1.5;
            const low = Math.min(open, close) - Math.abs(Math.sin(i * 0.4)) * 1.5;
            Canvas.drawCandle(ctx, x, toY(open), toY(close), toY(high), toY(low), 5);
        }

        // Draw SMAs
        const sma50Points = sma50.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);
        const sma200Points = sma200.map((m, i) => m !== null ? { x: toX(i), y: toY(m) } : null).filter(p => p);

        ctx.shadowColor = CONFIG.colors.green;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, sma50Points, CONFIG.colors.green, 3, progress);
        ctx.shadowBlur = 0;

        ctx.shadowColor = CONFIG.colors.purple;
        ctx.shadowBlur = 6;
        Canvas.drawSmoothLine(ctx, sma200Points, CONFIG.colors.purple, 3, progress);
        ctx.shadowBlur = 0;

        // Draw Golden Cross, entry, and stop loss as simple dots - appears at 50% progress
        if (goldenCrossIdx && progress > 0.5) {
            const crossX = toX(goldenCrossIdx);
            const crossY = toY(sma50[goldenCrossIdx]);

            // Offset stop dot to the right to prevent overlap
            const stopX = crossX + 15;

            // Gold dot for Golden Cross (entry point) - smaller for mobile
            ctx.beginPath();
            ctx.arc(crossX, crossY, 7, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.colors.gold;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Red dot for stop loss (below 200 SMA, offset right) - smaller for mobile
            if (stopLossPrice) {
                const stopY = toY(stopLossPrice);
                ctx.beginPath();
                ctx.arc(stopX, stopY, 6, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.colors.red;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Title
        Canvas.drawText(ctx, 'Position Trading: Golden Cross Entry', w / 2, 18, CONFIG.colors.text, 12, 'center');

        // Simplified legend - tighter spacing for mobile
        const legendY = h - 18;
        Canvas.drawText(ctx, '● 50 SMA', pad, legendY, CONFIG.colors.green, 9, 'left');
        Canvas.drawText(ctx, '● 200 SMA', pad + 50, legendY, CONFIG.colors.purple, 9, 'left');
        Canvas.drawText(ctx, '● Entry', pad + 110, legendY, CONFIG.colors.gold, 9, 'left');
        Canvas.drawText(ctx, '● Stop', pad + 155, legendY, CONFIG.colors.red, 9, 'left');
    }
};

// ============================================
// UI INTERACTIONS
// ============================================
const UI = {
    init() {
        this.setupSmoothScroll();
        this.setupCanvasHover();
        this.initializeCanvases();
        this.setupBackToTop();
        this.setupActiveNavigation();
    },

    // Track which section is currently in view and highlight nav
    setupActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navItems = document.querySelectorAll('.toc-item[href^="#"]');

        if (sections.length === 0 || navItems.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper portion of viewport
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');

                    // Remove active from all nav items
                    navItems.forEach(item => item.classList.remove('active'));

                    // Add active to matching nav item
                    const activeNav = document.querySelector(`.toc-item[href="#${id}"]`);
                    if (activeNav) {
                        activeNav.classList.add('active');
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach(section => observer.observe(section));
    },

    setupBackToTop() {
        const backTopBtn = document.getElementById('backToTop');
        if (backTopBtn) {
            backTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    },

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const navHeight = document.querySelector('.toc')?.offsetHeight || 0;
                    const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                    window.scrollTo({ top: targetPos, behavior: 'smooth' });
                }
            });
        });
    },

    setupCanvasHover() {
        const canvasMap = {
            // Foundations section
            'maBasicsCanvas': MAVisualizations.drawMABasics.bind(MAVisualizations),
            'maComparisonCanvas': MAVisualizations.drawMAComparison.bind(MAVisualizations),
            'keyPeriodsCanvas': MAVisualizations.drawKeyPeriods.bind(MAVisualizations),
            'crossoverBasicsCanvas': MAVisualizations.drawCrossoverBasics.bind(MAVisualizations),

            // MA Types section
            'maTypesShowcase': MAVisualizations.drawMATypesShowcase.bind(MAVisualizations),
            'smaDetailCanvas': MAVisualizations.drawSMADetail.bind(MAVisualizations),
            'emaDetailCanvas': MAVisualizations.drawEMADetail.bind(MAVisualizations),

            // Key Periods section
            'allPeriodsCanvas': MAVisualizations.drawAllPeriods.bind(MAVisualizations),

            // Crossovers section
            'goldenCrossCanvas': MAVisualizations.drawGoldenCross.bind(MAVisualizations),
            'deathCrossCanvas': MAVisualizations.drawDeathCross.bind(MAVisualizations),

            // Ribbons section
            'ribbonShowcase': MAVisualizations.drawRibbonShowcase.bind(MAVisualizations),
            'ribbonExpansionCanvas': MAVisualizations.drawRibbonExpansion.bind(MAVisualizations),
            'ribbonCompressionCanvas': MAVisualizations.drawRibbonCompression.bind(MAVisualizations),

            // Dynamic S/R section
            'dynamicSRCanvas': MAVisualizations.drawDynamicSR.bind(MAVisualizations),
            'maSupportCanvas': MAVisualizations.drawMASupport.bind(MAVisualizations),
            'maResistanceCanvas': MAVisualizations.drawMAResistance.bind(MAVisualizations),

            // Trading Styles section
            'dayTradingExampleCanvas': MAVisualizations.drawDayTradingExample.bind(MAVisualizations),
            'swingTradingExampleCanvas': MAVisualizations.drawSwingTradingExample.bind(MAVisualizations),
            'positionTradingExampleCanvas': MAVisualizations.drawPositionTradingExample.bind(MAVisualizations)
        };

        // Trading style charts get slower animation (3000ms) for better comprehension
        const slowAnimationCharts = [
            'dayTradingExampleCanvas',
            'swingTradingExampleCanvas',
            'positionTradingExampleCanvas'
        ];

        Object.entries(canvasMap).forEach(([id, drawFn]) => {
            const canvas = document.getElementById(id);
            if (!canvas) return;

            const wrapper = canvas.closest('.canvas-wrapper') || canvas.closest('.canvas-container');
            if (!wrapper) return;

            // Use slower animation for trading style example charts
            const duration = slowAnimationCharts.includes(id) ? 3000 : CONFIG.animation.duration;

            // Mouse hover for desktop
            wrapper.addEventListener('mouseenter', () => {
                AnimationController.animate(id, drawFn, duration);
            });

            // Touch/tap for mobile devices
            wrapper.addEventListener('touchstart', (e) => {
                // Prevent double-firing on devices that support both touch and mouse
                e.stopPropagation();
                AnimationController.animate(id, drawFn, duration);
            }, { passive: true });

            // Click for accessibility and mobile fallback
            wrapper.addEventListener('click', () => {
                AnimationController.animate(id, drawFn, duration);
            });
        });
    },

    initializeCanvases() {
        const debounce = (fn, ms) => {
            let timeout;
            return () => {
                clearTimeout(timeout);
                timeout = setTimeout(fn, ms);
            };
        };

        const canvasList = [
            ['maBasicsCanvas', MAVisualizations.drawMABasics],
            ['maComparisonCanvas', MAVisualizations.drawMAComparison],
            ['keyPeriodsCanvas', MAVisualizations.drawKeyPeriods],
            ['crossoverBasicsCanvas', MAVisualizations.drawCrossoverBasics],
            ['maTypesShowcase', MAVisualizations.drawMATypesShowcase],
            ['smaDetailCanvas', MAVisualizations.drawSMADetail],
            ['emaDetailCanvas', MAVisualizations.drawEMADetail],
            ['allPeriodsCanvas', MAVisualizations.drawAllPeriods],
            ['goldenCrossCanvas', MAVisualizations.drawGoldenCross],
            ['deathCrossCanvas', MAVisualizations.drawDeathCross],
            ['ribbonShowcase', MAVisualizations.drawRibbonShowcase],
            ['ribbonExpansionCanvas', MAVisualizations.drawRibbonExpansion],
            ['ribbonCompressionCanvas', MAVisualizations.drawRibbonCompression],
            ['dynamicSRCanvas', MAVisualizations.drawDynamicSR],
            ['maSupportCanvas', MAVisualizations.drawMASupport],
            ['maResistanceCanvas', MAVisualizations.drawMAResistance],
            ['dayTradingExampleCanvas', MAVisualizations.drawDayTradingExample],
            ['swingTradingExampleCanvas', MAVisualizations.drawSwingTradingExample],
            ['positionTradingExampleCanvas', MAVisualizations.drawPositionTradingExample]
        ];

        const redraw = () => {
            // Clear price cache on resize
            MAVisualizations.priceCache.clear();

            canvasList.forEach(([id, drawFn]) => {
                if (document.getElementById(id)) {
                    drawFn.call(MAVisualizations, id, 1);
                }
            });
        };

        // Initial draw
        setTimeout(redraw, 100);

        // Handle resize
        const debouncedRedraw = debounce(redraw, 150);

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(debouncedRedraw);
            document.querySelectorAll('.canvas-wrapper, .canvas-container').forEach(wrapper => {
                observer.observe(wrapper);
            });
        }

        window.addEventListener('resize', debouncedRedraw);
    },

    // Auto-animate charts when they come into view (great for mobile)
    setupScrollAnimations() {
        // Check if device is touch-based (mobile/tablet)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (!isTouchDevice) return; // Only for touch devices

        const slowAnimationCharts = [
            'dayTradingExampleCanvas',
            'swingTradingExampleCanvas',
            'positionTradingExampleCanvas'
        ];

        const canvasMap = {
            'maBasicsCanvas': MAVisualizations.drawMABasics.bind(MAVisualizations),
            'maComparisonCanvas': MAVisualizations.drawMAComparison.bind(MAVisualizations),
            'keyPeriodsCanvas': MAVisualizations.drawKeyPeriods.bind(MAVisualizations),
            'crossoverBasicsCanvas': MAVisualizations.drawCrossoverBasics.bind(MAVisualizations),
            'maTypesShowcase': MAVisualizations.drawMATypesShowcase.bind(MAVisualizations),
            'smaDetailCanvas': MAVisualizations.drawSMADetail.bind(MAVisualizations),
            'emaDetailCanvas': MAVisualizations.drawEMADetail.bind(MAVisualizations),
            'allPeriodsCanvas': MAVisualizations.drawAllPeriods.bind(MAVisualizations),
            'goldenCrossCanvas': MAVisualizations.drawGoldenCross.bind(MAVisualizations),
            'deathCrossCanvas': MAVisualizations.drawDeathCross.bind(MAVisualizations),
            'ribbonShowcase': MAVisualizations.drawRibbonShowcase.bind(MAVisualizations),
            'ribbonExpansionCanvas': MAVisualizations.drawRibbonExpansion.bind(MAVisualizations),
            'ribbonCompressionCanvas': MAVisualizations.drawRibbonCompression.bind(MAVisualizations),
            'dynamicSRCanvas': MAVisualizations.drawDynamicSR.bind(MAVisualizations),
            'maSupportCanvas': MAVisualizations.drawMASupport.bind(MAVisualizations),
            'maResistanceCanvas': MAVisualizations.drawMAResistance.bind(MAVisualizations),
            'dayTradingExampleCanvas': MAVisualizations.drawDayTradingExample.bind(MAVisualizations),
            'swingTradingExampleCanvas': MAVisualizations.drawSwingTradingExample.bind(MAVisualizations),
            'positionTradingExampleCanvas': MAVisualizations.drawPositionTradingExample.bind(MAVisualizations)
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const canvas = entry.target.querySelector('canvas');
                    if (canvas && canvasMap[canvas.id]) {
                        const duration = slowAnimationCharts.includes(canvas.id) ? 3000 : CONFIG.animation.duration;
                        // Small delay so user sees the animation start
                        setTimeout(() => {
                            AnimationController.animate(canvas.id, canvasMap[canvas.id], duration);
                        }, 200);
                    }
                    // Unobserve after animating once
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3, // Trigger when 30% visible
            rootMargin: '0px 0px -50px 0px' // Slight offset from bottom
        });

        // Observe all canvas wrappers
        document.querySelectorAll('.canvas-wrapper, .canvas-container').forEach(wrapper => {
            observer.observe(wrapper);
        });
    }
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    UI.setupScrollAnimations();
});
