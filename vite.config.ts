import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import preload from "vite-plugin-preload";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]],
			},
		}),
		tailwindcss(),
		preload({
			includeJs: false, // Set to true if you want JS preload too
			includeCss: true, // Preload CSS files
			mode: "preload", // Use 'preload' for critical resources
		}),
	],
	base: process.env.VITE_BASE_PATH || "/",
});
