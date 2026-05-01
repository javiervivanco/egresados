.PHONY: install extract split data dev build preview clean

install:
	npm install

# Genera src/data/viajes.json desde el legacy viajes-corregido.jsx
extract:
	node scripts/extract-raw.mjs

# Divide src/data/viajes.json en un archivo por empresa.
# Skip de archivos ya existentes (preserva ediciones manuales).
split:
	node scripts/split-by-company.mjs

# Pipeline completo: extract → split
data: extract split

dev: install
	npm run dev

build: install
	npm run build

preview: build
	npm run preview

clean:
	rm -rf node_modules dist
