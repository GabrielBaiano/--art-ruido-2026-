# Art_Ruido // 2026

**Art_Ruido** é uma plataforma experimental de arte generativa baseada em Autômatos Celulares (CA) e sistemas de crescimento estocástico. Projetado com uma estética brutalista e industrial, o sistema transforma lógica matemática em texturas visuais complexas que lembram diagramas técnicos, circuitos impressos e interfaces de sistemas legados.

![Preview Art Ruido](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXIzZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/xT9IgZOJ3O9qU1vH68/giphy.gif) *(Exemplo de geração)*

## 🛠 Kernels de Simulação

O projeto conta com quatro "físicas" matemáticas distintas:

*   **CYCLIC (The Archive):** Baseado em *Cyclic Cellular Automata*. Gera espirais e ondas de cores que caçam umas às outras em um ciclo infinito. Ideal para criar blocos sólidos e frentes de onda.
*   **FRACTAL (XOR Parity):** Utiliza operações de paridade binária (XOR) entre vizinhos para criar estruturas auto-similares e caixas fractais. Lembra o design interno de processadores e arquiteturas de silício.
*   **STOCHASTIC (Digital Slime):** Um modelo de crescimento orgânico e aleatório que simula mofo digital ou líquens. Gera texturas "sujas" e complexas.
*   **LIGHTNING (Descarga):** Um algoritmo de crescimento não-cíclico que "desenha" raios e ramificações persistentes na tela, partindo de sementes no topo até preencher o vácuo.

## 🚀 Funcionalidades Principais

*   **Infinite Variety Engine:** Sistema de cores baseado em HSL generativo e mutação de símbolos 8x8. Cada clique no botão `MUTATE EVERYTHING` gera uma obra única.
*   **Symbol Rendering:** Em vez de pixels simples, o sistema utiliza uma biblioteca de símbolos (`+`, `x`, `□`, `◇`, `*`, `~`) para criar densidade visual e profundidade.
*   **High-Quality Recording:** Exportação de clipes de 5 segundos em formato `.webm` usando o codec **VP9** com alto bitrate (8Mbps), garantindo nitidez absoluta dos símbolos.
*   **Image Injection:** Permite carregar qualquer imagem de referência para servir como "semente" da simulação, transformando fotos em padrões generativos.
*   **Persistent Physics:** Controles de persistência, limite de limiar (threshold) e pesos ortogonais para criar padrões estáveis que não se dissolvem rapidamente.

## 💻 Tecnologias

*   **React + TypeScript** (Vite)
*   **Canvas API + Uint32Array Buffer:** Manipulação direta de bits na memória para performance de 60 FPS em resoluções altas.
*   **MediaRecorder API:** Captura de vídeo nativa de alta fidelidade.
*   **Vanilla CSS:** Estética Brutalista/Industrial.

## 🕹 Como Rodar

1.  Clone o repositório.
2.  Instale as dependências: `npm install`
3.  Inicie o servidor de desenvolvimento: `npm run dev`
4.  Abra em: `http://localhost:5173`

---

**Desenvolvido por Gabriel Baiano & Antigravity AI**  
*Sistemas de Reconstrução de Dados Perdidos // 2026*
