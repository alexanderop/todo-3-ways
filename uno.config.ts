import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  preflights: [
    {
      getCSS: () => `
        html, body, #__nuxt {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          background: #212737;
          color: #eaedf3;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `,
    },
  ],

  theme: {
    colors: {
      'fill': '#212737',
      'text-base': '#eaedf3',
      'accent': '#ff6bed',
      'card': '#343f60',
      'card-muted': '#8a337b',
      'border': '#ab4b99',
    },
  },

  shortcuts: [
    // App shell
    {
      'app-header': 'sticky top-0 z-50 backdrop-blur-[12px] bg-fill/80 border-b border-border/25',
      'header-inner': 'max-w-[640px] h-14 mx-auto px-6 flex items-center justify-between',
      'brand': 'font-serif text-[1.125rem] tracking-[-0.01em] text-text-base no-underline transition-colors duration-200 hover:text-text-base/60',
      'app-nav': 'flex gap-1',
      'nav-link': 'font-mono text-xs uppercase tracking-[0.06em] text-text-base/35 no-underline px-3 py-1.5 rounded-[6px] transition-all duration-200 hover:(text-text-base/70 bg-text-base/5)',
      'nav-link-active': 'text-accent bg-accent/10',
    },

    // Todo app shared
    {
      'todo-app': 'max-w-[640px] mx-auto px-6 pt-10 pb-16',
      'todo-title': 'font-serif text-[2rem] font-normal tracking-[-0.02em] text-text-base m-0',
      'todo-subtitle': 'font-mono text-[0.8rem] tracking-[0.03em] text-text-base/35 mt-1.5 mb-0',
    },

    // Todo card
    {
      'todo-card': 'relative mt-8 bg-card border border-border/25 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden before:(content-empty absolute top-0 left-0 right-0 h-[3px] bg-accent)',
    },

    // Add form
    {
      'add-input': 'flex-1 font-sans text-[0.9375rem] text-text-base px-4 py-[0.6875rem] bg-fill/60 border-[1.5px] border-border/25 rounded-[10px] outline-none transition-all duration-200 placeholder:text-text-base/25 focus:(border-accent bg-fill/80 shadow-[0_0_0_3px_rgba(255,107,237,0.12)])',
      'add-button': 'font-mono text-[0.8125rem] font-medium tracking-[0.04em] uppercase text-fill bg-accent border-none px-5 py-[0.6875rem] rounded-[10px] cursor-pointer whitespace-nowrap transition-all duration-200 hover:(bg-accent/85 shadow-[0_4px_16px_rgba(255,107,237,0.3)] -translate-y-px) active:translate-y-0',
    },

    // Todo items
    {
      'todo-item': 'flex items-center gap-3 px-3 py-[0.625rem] mx-[-0.75rem] my-[0.125rem] rounded-lg transition-colors duration-150 hover:bg-card-muted/12',
      'todo-text': 'flex-1 text-[0.9375rem] text-text-base transition-all duration-200',
      'todo-text-done': 'line-through text-text-base/25',
      'todo-delete': 'ml-auto bg-none border-none text-text-base/20 text-[0.8125rem] cursor-pointer px-2 py-1 rounded-[6px] transition-all duration-150 opacity-0 group-hover:opacity-100 hover:(text-accent bg-accent/10)',
    },

    // Status messages
    {
      'todo-status': 'font-mono text-[0.8125rem] text-text-base/35 text-center mt-6',
      'todo-status-error': 'text-accent',
    },

    // Dynamic class shortcuts (yjs sync dot)
    {
      online: 'bg-green-400!',
      synced: 'bg-yellow-400!',
    },
  ],

  rules: [
    // Custom checkbox - base
    ['todo-checkbox', {
      'appearance': 'none',
      '-webkit-appearance': 'none',
      'width': '20px',
      'height': '20px',
      'border': '2px solid rgba(171, 75, 153, 0.4)',
      'border-radius': '50%',
      'cursor': 'pointer',
      'transition': 'all 0.2s',
      'flex-shrink': '0',
    }],
    // Custom checkbox - checked state
    ['todo-checkbox-checked', {
      'background': '#ff6bed',
      'border-color': '#ff6bed',
      'background-image': `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='%23212737' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`,
      'background-size': '12px',
      'background-position': 'center',
      'background-repeat': 'no-repeat',
    }],
    // Sync dot base
    ['sync-dot', {
      'display': 'inline-block',
      'width': '8px',
      'height': '8px',
      'border-radius': '50%',
      'margin-left': '0.5rem',
      'vertical-align': 'middle',
      'transition': 'background 0.3s',
    }],
  ],

  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans',
        serif: 'DM Serif Display',
        mono: 'DM Mono',
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
