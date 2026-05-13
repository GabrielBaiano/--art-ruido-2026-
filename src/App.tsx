import React, { useEffect, useRef, useState, useCallback } from 'react';

// Paleta extraída diretamente da imagem de referência
const PALETTES = [
  ['#d60000', '#008a3e', '#2b59c3', '#f9c80e', '#ffffff', '#0a0a0a', '#ff6f00', '#7b1fa2'], // Origin (Saturada)
  ['#0a0a0a', '#27272a', '#52525b', '#a1a1aa', '#e4e4e7', '#ffffff', '#facc15', '#eab308'], // Industrial
  ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'], // 8-bit
];

const getUint32Palette = (colors: string[]) => {
  return colors.map(c => {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return (255 << 24) | (b << 16) | (g << 8) | r;
  });
};

const UINT32_PALETTES = PALETTES.map(getUint32Palette);

// Padrões de Símbolos 8x8 (Representados como array de 8 números de 8 bits)
const SYMBOLS = [
  [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // 0: Empty
  [0x18, 0x18, 0x18, 0x7E, 0x7E, 0x18, 0x18, 0x18], // 1: Plus (+)
  [0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81], // 2: Cross (x)
  [0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF], // 3: Square (□)
  [0x18, 0x3C, 0x7E, 0xDB, 0x7E, 0x3C, 0x18, 0x00], // 4: Diamond (◇)
  [0x00, 0x44, 0x28, 0x10, 0x10, 0x28, 0x44, 0x00], // 5: Star (*)
  [0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55], // 6: Checker
  [0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00], // 7: Lines (=)
  [0x81, 0x81, 0x42, 0x42, 0x24, 0x24, 0x18, 0x18], // 8: Wave (~)
];

const STATE_NAMES = ["VOID", "PLUS", "CROSS", "BLOCK", "DIAMOND", "STAR", "CHECK", "LINE", "WAVE", "PULSE", "CORE", "GATE"];

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useState({
    states: 8,
    threshold: 3,
    neighborhood: 1, 
    paletteIdx: 0,
    resolution: 160,
    pixelSize: 6, // Símbolos maiores para detalhamento
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(0);
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([]);
  
  const gridRef = useRef<Uint8Array | null>(null);
  const nextGridRef = useRef<Uint8Array | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{time, msg}, ...prev].slice(0, 10));
  }, []);

  const initGrid = useCallback(() => {
    const size = params.resolution;
    const newGrid = new Uint8Array(size * size);
    for (let i = 0; i < newGrid.length; i++) {
      newGrid[i] = Math.floor(Math.random() * params.states);
    }
    gridRef.current = newGrid;
    nextGridRef.current = new Uint8Array(size * size);
    addLog("System reset. Origin palette synchronized.");
  }, [params.resolution, params.states, addLog]);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  const step = () => {
    if (!gridRef.current || !nextGridRef.current) return;
    const grid = gridRef.current;
    const nextGrid = nextGridRef.current;
    const { resolution, states, threshold, neighborhood } = params;
    const res = resolution;

    for (let y = 0; y < res; y++) {
      const yRes = y * res;
      for (let x = 0; x < res; x++) {
        const idx = yRes + x;
        const state = grid[idx];
        const nextState = (state + 1) % states;
        let count = 0;

        if (neighborhood === 1) { 
          for (let dy = -1; dy <= 1; dy++) {
            const ny = (y + dy + res) % res;
            const nyRes = ny * res;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = (x + dx + res) % res;
              if (grid[nyRes + nx] === nextState) count++;
            }
          }
        } else { 
          const nx1 = (x + 1 + res) % res;
          const nx2 = (x - 1 + res) % res;
          const ny1 = (y + 1 + res) % res;
          const ny2 = (y - 1 + res) % res;
          if (grid[y * res + nx1] === nextState) count++;
          if (grid[y * res + nx2] === nextState) count++;
          if (grid[ny1 * res + x] === nextState) count++;
          if (grid[ny2 * res + x] === nextState) count++;
        }

        nextGrid[idx] = count >= threshold ? nextState : state;
      }
    }
    gridRef.current = nextGrid;
    nextGridRef.current = grid;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const size = params.resolution;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = size; offCanvas.height = size;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;
        offCtx.drawImage(img, 0, 0, size, size);
        const pixels = offCtx.getImageData(0, 0, size, size).data;
        const newGrid = new Uint8Array(size * size);
        for (let i = 0; i < size * size; i++) {
          newGrid[i] = Math.floor(((pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 765) * (params.states - 1));
        }
        gridRef.current = newGrid;
        nextGridRef.current = new Uint8Array(size * size);
        addLog("Ref. Image injected as structure.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let animationFrameId: number;
    const render = (time: number) => {
      if (isPlaying) step();
      frameCountRef.current++;
      if (time - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = time;
      }

      const canvas = canvasRef.current;
      if (!canvas || !gridRef.current) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { resolution, paletteIdx, pixelSize } = params;
      const palette = UINT32_PALETTES[paletteIdx % UINT32_PALETTES.length];
      const grid = gridRef.current;

      const width = resolution * pixelSize;
      const height = resolution * pixelSize;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = new Uint32Array(imageData.data.buffer);

      // Symbol Drawing Engine 8x8
      for (let y = 0; y < height; y++) {
        const gridY = Math.floor(y / pixelSize);
        const gridYRes = gridY * resolution;
        const sy = y % 8; // Symbol row index

        for (let x = 0; x < width; x++) {
          const gridX = Math.floor(x / pixelSize);
          const state = grid[gridYRes + gridX];
          const color = palette[state % palette.length];
          const sx = x % 8; // Symbol col index
          
          const symbolPattern = SYMBOLS[state % SYMBOLS.length];
          const isSymbolPixel = (symbolPattern[sy] >> (7 - sx)) & 1;
          
          if (isSymbolPixel) {
            // Draw symbol pixel (usually white or black contrast)
            // If the state is high, use white symbols, if low use black
            const contrast = (state > 4) ? 0xFFFFFFFF : 0xFF000000;
            data[y * width + x] = contrast;
          } else {
            data[y * width + x] = color;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, params]);

  return (
    <div className="app-container">
      <div className="canvas-wrapper">
        <div className="technical-overlay">
          ARCHIVE_ID: ORIGIN_RECOVERY_2026<br />
          STATE: {STATE_NAMES[params.states - 1]}<br />
          RES: {params.resolution}p // FPS: {fps}
        </div>
        <canvas ref={canvasRef} onMouseDown={initGrid} />
      </div>

      <aside className="sidebar">
        <div className="header">
          <span className="status-badge">ARCHIVE // ORIGIN</span>
          <h1>Art_Ruido</h1>
          <p>Reconstrução Visual de Alta Fidelidade</p>
        </div>

        <div className="control-group">
          <label>Data Input</label>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            [+] Sync Reference Image
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
        </div>

        <div className="control-group">
          <label>Simulation</label>
          <button className={`btn ${isPlaying ? 'btn-primary' : ''}`} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '▌▌ Suspend' : '▶ Resume'}
          </button>
          <button className="btn" onClick={initGrid}>↺ Purge Cache</button>
        </div>

        <div className="control-group">
          <label>Complexity ({params.states})</label>
          <input type="range" min="2" max="12" step="1" value={params.states} onChange={(e) => setParams({...params, states: parseInt(e.target.value)})} />
        </div>

        <div className="control-group">
          <label>Threshold ({params.threshold})</label>
          <input type="range" min="1" max="5" step="1" value={params.threshold} onChange={(e) => setParams({...params, threshold: parseInt(e.target.value)})} />
        </div>

        <div className="control-group">
          <label>Symbol Scale ({params.pixelSize})</label>
          <input type="range" min="4" max="12" step="1" value={params.pixelSize} onChange={(e) => setParams({...params, pixelSize: parseInt(e.target.value)})} />
        </div>

        <div className="control-group">
          <label>Internal Logs</label>
          <div className="log-container">
            {logs.map((log, i) => (
              <div key={i} className="log-entry"><span className="log-time">[{log.time}]</span><span>{log.msg}</span></div>
            ))}
          </div>
        </div>

        <div className="stats">
          <span>PALETTE: ORIGIN_SATURATED</span>
          <span>ENGINE: SYMBOL_RENDERER_v1.0</span>
          <span>SRC: GABRIEL_BAIANO_REF</span>
        </div>
      </aside>
    </div>
  );
};

export default App;
