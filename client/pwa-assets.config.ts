import {
	combinePresetAndAppleSplashScreens,
	defineConfig,
	minimal2023Preset,
} from '@vite-pwa/assets-generator/config';


export default defineConfig({
	images: ['public/logo_transparent.svg'],
	preset: {
		transparent: {
			sizes: [64, 192, 512],
			favicons: [[48, 'favicon.ico']],
			resizeOptions: {
				background: '#222222',
			},
		},
		maskable: {
			sizes: [512],
			resizeOptions: {
				background: '#222222',
			},
		},
		apple: {
			sizes: [180],
			resizeOptions: { background: '#222222', fit: 'contain' },
		},
	},
});
