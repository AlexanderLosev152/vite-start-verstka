import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import fs from 'fs-extra';
import { glob } from 'glob';
import { resolve } from 'path';
import ttf2woff2 from 'ttf2woff2';

export default defineConfig({
	build: {
		outDir: 'docs',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html')
			}
		},
		assetsInlineLimit: 0 // Отключаем инлайнинг шрифтов
	},
	plugins: [
		ViteImageOptimizer({
			jpg: { quality: 50 },
			png: { quality: 50 },
			webp: { quality: 50 }
		}),
		{
			name: 'convert-assets',
			async writeBundle() {
				// 1. Конвертируем изображения в WebP
				const imageFiles = await glob('public/images/*.{jpg,png}');
				if (imageFiles.length > 0) {
					await imagemin(imageFiles, {
						destination: 'docs/images',
						plugins: [imageminWebp({ quality: 50 })]
					});
					console.log(`✅ ${imageFiles.length} images converted to WebP`);
				}

				// 2. Конвертируем шрифты в WOFF2
				const fontFiles = await glob('public/fonts/**/*.{ttf,otf}');
				if (fontFiles.length > 0) {
					await fs.ensureDir('docs/fonts');

					for (const fontFile of fontFiles) {
						try {
							const fileName = fontFile
								.split('/')
								.pop()
								.replace(/\.[^/.]+$/, '');
							const outputPath = `docs/fonts/${fileName}.woff2`;
							const input = fs.readFileSync(fontFile);
							fs.writeFileSync(outputPath, ttf2woff2(input));
							console.log(`✓ Converted ${fontFile} to WOFF2`);
						} catch (err) {
							console.error(`⚠️ Error converting ${fontFile}:`, err.message);
						}
					}
				}

				// 3. Удаляем оригинальные JPG/PNG/TTF/OTF
				const filesToDelete = [
					...(await glob('docs/images/*.{jpg,png}')),
					...(await glob('docs/fonts/*.{ttf,otf}'))
				];

				if (filesToDelete.length > 0) {
					await Promise.all(filesToDelete.map((file) => fs.remove(file)));
					console.log(`🧹 ${filesToDelete.length} original files removed`);
				}
			}
		}
	]
});
