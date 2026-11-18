import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

export default defineConfig({

    plugins: [react(), tailwindcss()],

    /**
     * Versione con cui è stato fatto il build: VersionCheck la confronta con
     * /version.json sul server per sapere se il bundle in esecuzione è vecchio.
     * Sta nel bundle e non in localStorage, che è condiviso tra i tab.
     */
    define: {
        __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('public/version.json', 'utf-8')).version)
    },

    /**
     * Il framework scrive JSX dentro file con estensione .js (src/core, src/components,
     * src/pages e le pagine custom in src/config): esbuild va istruito a trattarli
     * come JSX, altrimenti fallisce il parsing. Evita di dover rinominare in .jsx
     * centinaia di file, incluse le pagine custom di ogni progetto.
     *
     * Il pattern include anche .jsx: impostando 'include' si sostituisce il default
     * di Vite, quindi ometterlo lascerebbe i file .jsx senza trasformazione.
     */
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.jsx?$/,
        exclude: []
    },

    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx'
            }
        }
    },

    css: {
        preprocessorOptions: {
            scss: {
                /**
                 * Alcune librerie usano ancora @import e le funzioni colore globali
                 * di Sass: evita centinaia di deprecation warning nelle pagine
                 * custom dei progetti che importano .scss.
                 */
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'color-functions']
            }
        }
    },

    server: {
        port: 3000,
        open: true
    },

    build: {
        /** 'build' e non 'dist': mantiene invariati i deploy esistenti (Netlify e Apache) */
        outDir: 'build',
        sourcemap: false
    }

});
