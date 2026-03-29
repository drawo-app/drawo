<div align="center">

# 🎨 Drawo

### Pizarra visual open source construida con React + TypeScript + Canvas

<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.3-0ea5e9" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-22c55e" />
  <img alt="Stack" src="https://img.shields.io/badge/stack-React%2019%20%2B%20TypeScript%20%2B%20Vite-111827" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20.18.0-16a34a" />
</p>

<p><strong>Drawo</strong> es una app de dibujo y diagramación estilo whiteboard con foco en velocidad, UX y edición visual fluida.</p>

<p>
  <img src="assets/changelog/1.1.2.png" alt="Drawo preview" width="86%" />
</p>

</div>

## ✨ Qué es Drawo
Drawo es un lienzo interactivo pensado para crear bocetos, diagramas y explicaciones visuales rápidas. El proyecto ya incluye herramientas de dibujo, formas, texto enriquecido, imágenes, agrupación, atajos avanzados y exportación.

Todo corre en cliente y guarda estado local del proyecto en el navegador para que puedas continuar donde lo dejaste.

## 🚀 Features actuales (v1.1.3)
- Lienzo infinito con cámara (`pan`, `zoom`, centrado y navegación fluida).
- Herramientas: selección, mano, texto, rectángulo, círculo, línea/flecha, lápiz, pluma, marcador, láser e imagen.
- Edición avanzada de elementos (rotación, `resize`, opacidad, alineación y orden por capas).
- Agrupación y desagrupación de elementos.
- Duplicado rápido y movimiento por teclado.
- Texto enriquecido con `Slate` (negrita, cursiva, tachado, tamaño, color, alineación).
- Selección múltiple + guías inteligentes + ajuste a cuadrícula.
- Modos especiales: `Zen Mode` y `Presentation Mode`.
- Exportación de imagen (`png`, `jpg`, `svg`, `pdf`) con padding, calidad y transparencia.
- Guardado y apertura de proyectos `.drawo`.
- Soporte de imágenes por input/drag&drop con optimización.
- Internacionalización incluida (`es_ES`, `en_US`).
- Theming amplio (Drawo, Catppuccin, Nord, Solarized, Gruvbox, TokyoNight, Rose Pine, Everforest, Kanagawa, Dracula, One, Ayu).

## 🧱 Stack técnico
- `React 19`
- `TypeScript 5`
- `Vite 7`
- `Slate` para edición de texto enriquecido
- `Radix UI` + librerías de iconos
- Canvas 2D API para render/interaction layer

## ⚙️ Cómo ejecutarlo localmente
### Requisitos
- `Node.js >= 20.18.0`
- `pnpm` recomendado

### Instalación
```bash
pnpm install
```

### Desarrollo
```bash
pnpm dev
```

### Build de producción
```bash
pnpm build
```

### Preview de build
```bash
pnpm preview
```

## ⌨️ Atajos útiles
- `V`: selección
- `H`: mano (pan)
- `1`: texto
- `2`: rectángulo
- `3`: círculo
- `4`: dibujar
- `K`: láser
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Shift + Z` o `Ctrl/Cmd + Y`: redo
- `Ctrl/Cmd + A`: seleccionar todo
- `Ctrl/Cmd + D`: duplicar
- `Ctrl/Cmd + G`: agrupar
- `Ctrl/Cmd + Shift + G`: desagrupar
- `Ctrl/Cmd + +/-/0`: zoom in/out/reset
- `Alt + Z`: alternar modo zen
- `Alt + R`: alternar modo presentación
- `Delete/Backspace`: borrar selección

## 🗂️ Estructura del proyecto
```text
src/
  app/
    state/        # reducer, historial undo/redo, persistencia local
    theme/        # tokens y esquemas visuales
    App.tsx       # composición principal de la aplicación
  core/
    elements/     # modelos y utilidades de cada tipo de elemento
    scene/        # lógica de escena (selección, agrupado, transformaciones)
  features/
    canvas/       # renderizado e interacción del canvas
    workspace/    # barra de herramientas, menú, exportación, shortcuts
    music/        # barra de música
    timer/        # countdown integrado
  shared/
    i18n/         # localización
    ui/           # componentes de interfaz reutilizables
```

## 🛣️ Roadmap
### v1.x (actual)
- Seguir puliendo estabilidad, rendimiento del trazo y UX de edición.
- Mejorar exportación y consistencia visual entre temas.
- Continuar refactorizando módulos internos para facilitar extensión.

### v2.0 (objetivo principal)
En `v2.0` Drawo evolucionará de app standalone a **librería npm** para React.

Objetivo de producto:
- Exponer Drawo como un **componente React reutilizable y personalizable**.
- Permitir integración embebida en productos externos (SaaS, paneles, LMS, documentación, etc.).

Dirección técnica prevista:
- Publicación en npm con API estable.
- Componente principal tipo `<DrawoCanvas />`.
- Configuración por props para tema, idioma, herramientas disponibles, atajos y comportamiento del canvas.
- Hooks/eventos para sincronizar estado externo (`onChange`, import/export, selección, etc.).
- Estilos y tokens para personalización visual sin forks.

## 📦 Estado del release
Versión actual: **1.1.3** (ver [CHANGELOG](./CHANGELOG.md)).

## 🤝 Contribuciones
Si quieres aportar:
1. Haz un fork.
2. Crea una rama de feature/fix.
3. Abre PR con una descripción clara de qué cambias y por qué.

## ⭐ Cierre
Si te mola Drawo, dale estrella al repo y compártelo.  
La meta de `v2.0` es que puedas enchufarlo en tu app React como si fuese una pieza nativa de tu producto.
