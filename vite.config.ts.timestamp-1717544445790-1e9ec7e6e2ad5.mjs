// vite.config.ts
import { vitePlugin as remix } from "file:///C:/Users/crist/workspace/ventesca-v2/node_modules/@remix-run/dev/dist/index.js";
import { sentryVitePlugin } from "file:///C:/Users/crist/workspace/ventesca-v2/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import { glob } from "file:///C:/Users/crist/workspace/ventesca-v2/node_modules/glob/dist/esm/index.js";
import { flatRoutes } from "file:///C:/Users/crist/workspace/ventesca-v2/node_modules/remix-flat-routes/dist/index.js";
import { defineConfig } from "file:///C:/Users/crist/workspace/ventesca-v2/node_modules/vite/dist/node/index.js";
var MODE = process.env.NODE_ENV;
var vite_config_default = defineConfig({
  build: {
    cssMinify: MODE === "production",
    rollupOptions: {
      external: [/node:.*/, "stream", "crypto", "fsevents"]
    },
    assetsInlineLimit: (source) => {
      if (source.endsWith("sprite.svg")) {
        return false;
      }
    },
    sourcemap: true
  },
  server: {
    watch: {
      ignored: ["**/playwright-report/**"]
    }
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*"],
      serverModuleFormat: "esm",
      routes: async (defineRoutes) => {
        return flatRoutes("routes", defineRoutes, {
          ignoredRouteFiles: [
            ".*",
            "**/*.css",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__*.*",
            // This is for server-side utilities you want to colocate
            // next to your routes without making an additional
            // directory. If you need a route that includes "server" or
            // "client" in the filename, use the escape brackets like:
            // my-route.[server].tsx
            "**/*.server.*",
            "**/*.client.*"
          ]
        });
      }
    }),
    process.env.SENTRY_AUTH_TOKEN ? sentryVitePlugin({
      disable: MODE !== "production",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: {
        name: process.env.COMMIT_SHA,
        setCommits: {
          auto: true
        }
      },
      sourcemaps: {
        filesToDeleteAfterUpload: await glob([
          "./build/**/*.map",
          ".server-build/**/*.map"
        ])
      }
    }) : null
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjcmlzdFxcXFx3b3Jrc3BhY2VcXFxcdmVudGVzY2EtdjJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGNyaXN0XFxcXHdvcmtzcGFjZVxcXFx2ZW50ZXNjYS12MlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvY3Jpc3Qvd29ya3NwYWNlL3ZlbnRlc2NhLXYyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgdml0ZVBsdWdpbiBhcyByZW1peCB9IGZyb20gJ0ByZW1peC1ydW4vZGV2J1xuaW1wb3J0IHsgc2VudHJ5Vml0ZVBsdWdpbiB9IGZyb20gJ0BzZW50cnkvdml0ZS1wbHVnaW4nXG5pbXBvcnQgeyBnbG9iIH0gZnJvbSAnZ2xvYidcbmltcG9ydCB7IGZsYXRSb3V0ZXMgfSBmcm9tICdyZW1peC1mbGF0LXJvdXRlcydcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5cbmNvbnN0IE1PREUgPSBwcm9jZXNzLmVudi5OT0RFX0VOVlxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRidWlsZDoge1xuXHRcdGNzc01pbmlmeTogTU9ERSA9PT0gJ3Byb2R1Y3Rpb24nLFxuXG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0ZXh0ZXJuYWw6IFsvbm9kZTouKi8sICdzdHJlYW0nLCAnY3J5cHRvJywgJ2ZzZXZlbnRzJ10sXG5cdFx0fSxcblxuXHRcdGFzc2V0c0lubGluZUxpbWl0OiAoc291cmNlOiBzdHJpbmcpID0+IHtcblx0XHRcdGlmIChzb3VyY2UuZW5kc1dpdGgoJ3Nwcml0ZS5zdmcnKSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0c291cmNlbWFwOiB0cnVlLFxuXHR9LFxuXHRzZXJ2ZXI6IHtcblx0XHR3YXRjaDoge1xuXHRcdFx0aWdub3JlZDogWycqKi9wbGF5d3JpZ2h0LXJlcG9ydC8qKiddLFxuXHRcdH0sXG5cdH0sXG5cdHBsdWdpbnM6IFtcblx0XHRyZW1peCh7XG5cdFx0XHRpZ25vcmVkUm91dGVGaWxlczogWycqKi8qJ10sXG5cdFx0XHRzZXJ2ZXJNb2R1bGVGb3JtYXQ6ICdlc20nLFxuXHRcdFx0cm91dGVzOiBhc3luYyBkZWZpbmVSb3V0ZXMgPT4ge1xuXHRcdFx0XHRyZXR1cm4gZmxhdFJvdXRlcygncm91dGVzJywgZGVmaW5lUm91dGVzLCB7XG5cdFx0XHRcdFx0aWdub3JlZFJvdXRlRmlsZXM6IFtcblx0XHRcdFx0XHRcdCcuKicsXG5cdFx0XHRcdFx0XHQnKiovKi5jc3MnLFxuXHRcdFx0XHRcdFx0JyoqLyoudGVzdC57anMsanN4LHRzLHRzeH0nLFxuXHRcdFx0XHRcdFx0JyoqL19fKi4qJyxcblx0XHRcdFx0XHRcdC8vIFRoaXMgaXMgZm9yIHNlcnZlci1zaWRlIHV0aWxpdGllcyB5b3Ugd2FudCB0byBjb2xvY2F0ZVxuXHRcdFx0XHRcdFx0Ly8gbmV4dCB0byB5b3VyIHJvdXRlcyB3aXRob3V0IG1ha2luZyBhbiBhZGRpdGlvbmFsXG5cdFx0XHRcdFx0XHQvLyBkaXJlY3RvcnkuIElmIHlvdSBuZWVkIGEgcm91dGUgdGhhdCBpbmNsdWRlcyBcInNlcnZlclwiIG9yXG5cdFx0XHRcdFx0XHQvLyBcImNsaWVudFwiIGluIHRoZSBmaWxlbmFtZSwgdXNlIHRoZSBlc2NhcGUgYnJhY2tldHMgbGlrZTpcblx0XHRcdFx0XHRcdC8vIG15LXJvdXRlLltzZXJ2ZXJdLnRzeFxuXHRcdFx0XHRcdFx0JyoqLyouc2VydmVyLionLFxuXHRcdFx0XHRcdFx0JyoqLyouY2xpZW50LionLFxuXHRcdFx0XHRcdF0sXG5cdFx0XHRcdH0pXG5cdFx0XHR9LFxuXHRcdH0pLFxuXHRcdHByb2Nlc3MuZW52LlNFTlRSWV9BVVRIX1RPS0VOXG5cdFx0XHQ/IHNlbnRyeVZpdGVQbHVnaW4oe1xuXHRcdFx0XHRcdGRpc2FibGU6IE1PREUgIT09ICdwcm9kdWN0aW9uJyxcblx0XHRcdFx0XHRhdXRoVG9rZW46IHByb2Nlc3MuZW52LlNFTlRSWV9BVVRIX1RPS0VOLFxuXHRcdFx0XHRcdG9yZzogcHJvY2Vzcy5lbnYuU0VOVFJZX09SRyxcblx0XHRcdFx0XHRwcm9qZWN0OiBwcm9jZXNzLmVudi5TRU5UUllfUFJPSkVDVCxcblx0XHRcdFx0XHRyZWxlYXNlOiB7XG5cdFx0XHRcdFx0XHRuYW1lOiBwcm9jZXNzLmVudi5DT01NSVRfU0hBLFxuXHRcdFx0XHRcdFx0c2V0Q29tbWl0czoge1xuXHRcdFx0XHRcdFx0XHRhdXRvOiB0cnVlLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHNvdXJjZW1hcHM6IHtcblx0XHRcdFx0XHRcdGZpbGVzVG9EZWxldGVBZnRlclVwbG9hZDogYXdhaXQgZ2xvYihbXG5cdFx0XHRcdFx0XHRcdCcuL2J1aWxkLyoqLyoubWFwJyxcblx0XHRcdFx0XHRcdFx0Jy5zZXJ2ZXItYnVpbGQvKiovKi5tYXAnLFxuXHRcdFx0XHRcdFx0XSksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSlcblx0XHRcdDogbnVsbCxcblx0XSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdTLFNBQVMsY0FBYyxhQUFhO0FBQzVVLFNBQVMsd0JBQXdCO0FBQ2pDLFNBQVMsWUFBWTtBQUNyQixTQUFTLGtCQUFrQjtBQUMzQixTQUFTLG9CQUFvQjtBQUU3QixJQUFNLE9BQU8sUUFBUSxJQUFJO0FBRXpCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLE9BQU87QUFBQSxJQUNOLFdBQVcsU0FBUztBQUFBLElBRXBCLGVBQWU7QUFBQSxNQUNkLFVBQVUsQ0FBQyxXQUFXLFVBQVUsVUFBVSxVQUFVO0FBQUEsSUFDckQ7QUFBQSxJQUVBLG1CQUFtQixDQUFDLFdBQW1CO0FBQ3RDLFVBQUksT0FBTyxTQUFTLFlBQVksR0FBRztBQUNsQyxlQUFPO0FBQUEsTUFDUjtBQUFBLElBQ0Q7QUFBQSxJQUVBLFdBQVc7QUFBQSxFQUNaO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTixTQUFTLENBQUMseUJBQXlCO0FBQUEsSUFDcEM7QUFBQSxFQUNEO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixNQUFNO0FBQUEsTUFDTCxtQkFBbUIsQ0FBQyxNQUFNO0FBQUEsTUFDMUIsb0JBQW9CO0FBQUEsTUFDcEIsUUFBUSxPQUFNLGlCQUFnQjtBQUM3QixlQUFPLFdBQVcsVUFBVSxjQUFjO0FBQUEsVUFDekMsbUJBQW1CO0FBQUEsWUFDbEI7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFNQTtBQUFBLFlBQ0E7QUFBQSxVQUNEO0FBQUEsUUFDRCxDQUFDO0FBQUEsTUFDRjtBQUFBLElBQ0QsQ0FBQztBQUFBLElBQ0QsUUFBUSxJQUFJLG9CQUNULGlCQUFpQjtBQUFBLE1BQ2pCLFNBQVMsU0FBUztBQUFBLE1BQ2xCLFdBQVcsUUFBUSxJQUFJO0FBQUEsTUFDdkIsS0FBSyxRQUFRLElBQUk7QUFBQSxNQUNqQixTQUFTLFFBQVEsSUFBSTtBQUFBLE1BQ3JCLFNBQVM7QUFBQSxRQUNSLE1BQU0sUUFBUSxJQUFJO0FBQUEsUUFDbEIsWUFBWTtBQUFBLFVBQ1gsTUFBTTtBQUFBLFFBQ1A7QUFBQSxNQUNEO0FBQUEsTUFDQSxZQUFZO0FBQUEsUUFDWCwwQkFBMEIsTUFBTSxLQUFLO0FBQUEsVUFDcEM7QUFBQSxVQUNBO0FBQUEsUUFDRCxDQUFDO0FBQUEsTUFDRjtBQUFBLElBQ0QsQ0FBQyxJQUNBO0FBQUEsRUFDSjtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
