import React, { useEffect, useRef, useState, useCallback } from 'react';

const SYMBOL_LIBRARY = [
  [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 
  [0x18, 0x18, 0x18, 0x7E, 0x7E, 0x18, 0x18, 0x18], 
  [0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81], 
  [0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF], 
  [0x18, 0x3C, 0x7E, 0xDB, 0x7E, 0x3C, 0x18, 0x00], 
  [0x00, 0x44, 0x28, 0x10, 0x10, 0x28, 0x44, 0x00], 
  [0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55], 
  [0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00], 
  [0x81, 0xC3, 0xE7, 0xFF, 0xFF, 0xE7, 0xC3, 0x81], 
];

const generateRandomPalette = (size: number) => {
  const baseHue = Math.random() * 360;
  return Array.from({ length: size }, (_, i) => {
    if (i === 0) return '#050505'; 
    const h = (baseHue + Math.random() * 120) % 360;
    const s = 70 + Math.random() * 30;
    const l = 40 + Math.random() * 40;
    return `hsl(${h}, ${s}%, ${l}%)`;
  });
};

const hslToUint32 = (hsl: string) => {
  const dummy = document.createElement('div');
  dummy.style.color = hsl;
  document.body.appendChild(dummy);
  const color = getComputedStyle(dummy).color;
  document.body.removeChild(dummy);
  const matches = color.match(/\d+/g);
  if (!matches) return 0xFF000000;
  const [r, g, b] = matches.map(Number);
  return (255 << 24) | (b << 16) | (g << 8) | r;
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [palette, setPalette] = useState<string[]>(generateRandomPalette(8));
  const [uint32Palette, setUint32Palette] = useState<Uint32Array>(new Uint32Array());
  const [symbols, setSymbols] = useState<number[][]>(SYMBOL_LIBRARY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [kernel, setKernel] = useState<'CYCLIC' | 'FRACTAL' | 'STOCHASTIC' | 'LIGHTNING'>('LIGHTNING');
  
  const [params, setParams] = useState({
    states: 8,
    threshold: 4,
    resolution: 150,
    pixelSize: 6,
    orthoWeight: 2.5,
    persistence: 0.95,
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(0);
  const gridRef = useRef<Uint8Array | null>(null);
  const nextGridRef = useRef<Uint8Array | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    setUint32Palette(new Uint32Array(palette.map(hslToUint32)));
  }, [palette]);

  const initGrid = useCallback((isSparse = true) => {
    const size = params.resolution;
    const newGrid = new Uint8Array(size * size);
    if (kernel === 'LIGHTNING') {
      // Começa com sementes no topo para o raio descer
      for (let x = 0; x < size; x++) {
        if (Math.random() > 0.95) newGrid[x] = 1 + Math.floor(Math.random() * (params.states - 1));
      }
    } else {
      for (let i = 0; i < newGrid.length; i++) {
        newGrid[i] = Math.random() > (isSparse ? 0.92 : 0.5) ? Math.floor(Math.random() * params.states) : 0;
      }
    }
    gridRef.current = newGrid;
    nextGridRef.current = new Uint8Array(size * size);
  }, [params.resolution, params.states, kernel]);

  useEffect(() => { initGrid(); }, [initGrid]);

  const mutateAll = useCallback(() => {
    setPalette(generateRandomPalette(params.states));
    setSymbols([...SYMBOL_LIBRARY].sort(() => Math.random() - 0.5));
    initGrid(true);
  }, [params.states, initGrid]);

  const step = () => {
    if (!gridRef.current || !nextGridRef.current) return;
    const grid = gridRef.current;
    const nextGrid = nextGridRef.current;
    const { resolution: res, states, threshold, orthoWeight, persistence } = params;

    // Reset nextGrid to current to keep trails in LIGHTNING mode
    if (kernel === 'LIGHTNING') {
      nextGrid.set(grid);
    }

    for (let y = 0; y < res; y++) {
      const yRes = y * res;
      for (let x = 0; x < res; x++) {
        const idx = yRes + x;
        const state = grid[idx];

        if (kernel === 'CYCLIC') {
          if (state !== 0 && Math.random() < persistence) { nextGrid[idx] = state; continue; }
          const nextState = (state + 1) % states;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = (y + dy + res) % res;
            const nyRes = ny * res;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = (x + dx + res) % res;
              if (grid[nyRes + nx] === nextState) count += (dx === 0 || dy === 0) ? orthoWeight : 1;
            }
          }
          nextGrid[idx] = count >= threshold ? nextState : state;
        } 
        else if (kernel === 'FRACTAL') {
          const left = grid[yRes + ((x - 1 + res) % res)];
          const up = grid[((y - 1 + res) % res) * res + x];
          nextGrid[idx] = (left ^ up ^ state) % states;
        }
        else if (kernel === 'STOCHASTIC') {
          if (state !== 0) { nextGrid[idx] = Math.random() < 0.98 ? state : 0; continue; }
          const nx = (x + (Math.random() > 0.5 ? 1 : -1) + res) % res;
          const ny = (y + (Math.random() > 0.5 ? 1 : -1) + res) % res;
          const neighbor = grid[ny * res + nx];
          if (neighbor !== 0 && Math.random() < 0.1) nextGrid[idx] = neighbor;
        }
        else if (kernel === 'LIGHTNING') {
          // Só processa pixels que "estão vivos" (últimos a serem criados)
          // Na verdade, para simplificar: se um vizinho acima ou lateral estiver ativo, 
          // este pixel tem chance de "ligar"
          if (state !== 0) continue; // Já é rastro
          
          const up = grid[((y - 1 + res) % res) * res + x];
          const left = grid[yRes + ((x - 1 + res) % res)];
          const right = grid[yRes + ((x + 1 + res) % res)];
          
          // Chance de crescer a partir de cima (frente principal) ou lados (ramificação)
          if (up !== 0 && Math.random() < 0.15) {
            nextGrid[idx] = up;
          } else if ((left !== 0 || right !== 0) && Math.random() < 0.05) {
            nextGrid[idx] = left || right;
          }
        }
      }
    }
    gridRef.current = nextGrid;
    nextGridRef.current = grid;
  };

  useEffect(() => {
    let animationFrameId: number;
    const render = (time: number) => {
      if (isPlaying) step();
      frameCountRef.current++;
      if (time - lastTimeRef.current >= 1000) { setFps(frameCountRef.current); frameCountRef.current = 0; lastTimeRef.current = time; }
      const canvas = canvasRef.current;
      if (!canvas || !gridRef.current || uint32Palette.length === 0) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      const { resolution, pixelSize } = params;
      const grid = gridRef.current;
      const width = resolution * pixelSize;
      const height = resolution * pixelSize;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = new Uint32Array(imageData.data.buffer);

      for (let y = 0; y < height; y++) {
        const gridY = Math.floor(y / pixelSize);
        const gridYRes = gridY * resolution;
        const sy = y % 8;
        for (let x = 0; x < width; x++) {
          const gridX = Math.floor(x / pixelSize);
          const state = grid[gridYRes + gridX];
          const color = uint32Palette[state % uint32Palette.length];
          const sx = x % 8;
          const symbolPattern = symbols[state % symbols.length];
          const isSymbolPixel = (symbolPattern[sy] >> (7 - sx)) & 1;
          if (isSymbolPixel && state !== 0) data[y * width + x] = 0xFFFFFFFF; 
          else data[y * width + x] = color;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, params, uint32Palette, symbols, kernel]);

  const startRecording = () => {
    if (!canvasRef.current) return;
    const stream = canvasRef.current.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `art-ruido-${kernel}-${Date.now()}.webm`;
      a.click();
      setIsRecording(false);
      setRecordProgress(0);
    };
    setIsRecording(true); recorder.start();
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2; setRecordProgress(progress);
      if (progress >= 100) { recorder.stop(); clearInterval(interval); }
    }, 100);
  };

  return (
    <div className="app-container">
      <div className="canvas-wrapper">
        <div className="technical-overlay">
          KERNEL: {kernel} // NON_CYCLIC_GROWTH<br />
          STATES: {params.states}<br />
          FPS: {fps}
        </div>
        <canvas ref={canvasRef} onMouseDown={() => initGrid(true)} />
      </div>

      <aside className="sidebar">
        <div className="header">
          <span className="status-badge">ARCHIVE // {kernel}</span>
          <h1>Art_Ruido</h1>
          <p>Sistemas de Crescimento Direcional</p>
        </div>

        <div className="control-group">
          <label>Simulation Kernel</label>
          <select className="control-input" value={kernel} onChange={(e) => setKernel(e.target.value as any)}>
            <option value="LIGHTNING">LIGHTNING (Branching/Descarga)</option>
            <option value="CYCLIC">CYCLIC (Spirals/Blocks)</option>
            <option value="FRACTAL">FRACTAL (XOR/Linear)</option>
            <option value="STOCHASTIC">STOCHASTIC (Organic/Mofo)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Ações</label>
          <button className="btn btn-primary" onClick={mutateAll}>⚡ MUTATE & RE-SEED</button>
          <button className="btn" onClick={startRecording} disabled={isRecording}>
            {isRecording ? `REC ${recordProgress}%` : '🔴 RECORD CLIP'}
          </button>
        </div>

        <div className="control-group">
          <label>Parâmetros de Crescimento</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '10px' }}>Resolution: {params.resolution}p</label>
            <input type="range" min="50" max="300" step="10" value={params.resolution} onChange={(e) => setParams({...params, resolution: parseInt(e.target.value)})} />
            <label style={{ fontSize: '10px' }}>Symbol Size: {params.pixelSize}</label>
            <input type="range" min="2" max="12" step="1" value={params.pixelSize} onChange={(e) => setParams({...params, pixelSize: parseInt(e.target.value)})} />
          </div>
        </div>

        <div className="stats">
          <span>MODE: NON_ITERATIVE_BRANCHING</span>
          <span>SYSTEM: GABRIEL_BAIANO_STUDIO</span>
          <span>BUILD: 2026.05.13</span>
        </div>
      </aside>
    </div>
  );
};

export default App;
