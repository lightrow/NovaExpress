import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		legacy({
			targets: ['iOS>11.0'],
			polyfills: ['es.object.has-own'],
			modernPolyfills: ['es.object.has-own'],
		}),
		VitePWA({
			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
			manifest: {
				name: 'Nova Express',
				short_name: 'NovaExpress',
				description: 'NovaExpress Client',
				theme_color: '#312931',
				icons: [
					{
						src: 'pwa-64x64.png',
						sizes: '64x64',
						type: 'image/png',
					},
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
		}),
	],
	build: {
		outDir: '../dist',
	},
	server: {
		host: '0.0.0.0',
	},
	preview: {
		port: 8081,
		host: '0.0.0.0',
	},
});
