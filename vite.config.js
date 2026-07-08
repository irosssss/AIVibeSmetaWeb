import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Корень — web/ (там index.html и весь фронт). Сборка кладётся в ../dist.
// Статика с runtime-путями (img/*.jpg в строках JS) живёт в web/public.
export default defineConfig({
  root: "web",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // pdfmake/vfs_fonts/xlsx грузятся лениво (отдельные чанки по клику на
    // выгрузку/импорт), стартовый бандл — компактный. Предупреждение о размере
    // остаётся только на ленивом чанке pdfmake (~1.4 МБ) — он вне
    // критического пути, поэтому порог поднят.
    chunkSizeWarningLimit: 1500,
  },
  optimizeDeps: {
    // глубокие импорты pdfmake требуют явного pre-bundle (даже при ленивой
    // загрузке — чтобы dev-сервер не дёргал reload при первом import()).
    include: ["pdfmake/build/pdfmake", "pdfmake/build/vfs_fonts"],
  },
});
