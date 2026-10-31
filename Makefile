PORT ?= 4173

.PHONY: dev
dev:
	@echo "Kost Rapi: http://127.0.0.1:$(PORT)/app.html"
	@echo "Press Ctrl+C to stop. Refresh the browser after editing files."
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory dist
