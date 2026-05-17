.PHONY: install extract split data dev build preview clean \
        up down restart db-reset studio logs status \
        admin-install admin-dev admin-build

# ============================================================
# Frontend público
# ============================================================
# Limpiamos VITE_SUPABASE_* del shell para forzar que Vite tome los valores
# de .env.local (algunas shells del usuario los exportan apuntando a prod).
VITE_ENV := env -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY

install:
	npm install

dev: install
	$(VITE_ENV) npm run dev

build: install
	$(VITE_ENV) npm run build

preview: build
	$(VITE_ENV) npm run preview

clean:
	rm -rf node_modules dist admin/node_modules admin/dist

# ============================================================
# Dataset legacy (JSON por empresa)
# ============================================================
# Genera src/data/viajes.json desde el legacy viajes-corregido.jsx
extract:
	node scripts/extract-raw.mjs

# Divide src/data/viajes.json en un archivo por empresa.
# Skip de archivos ya existentes (preserva ediciones manuales).
split:
	node scripts/split-by-company.mjs

# Pipeline completo: extract → split
data: extract split

# Importa los JSON locales (src/data/*.json) al modelo normalizado en la DB.
# Idempotente. Requiere SUPABASE_SECRET_KEY en .env.local.
data-import:
	node scripts/import-json-to-db.mjs

# Crea un user administrativo en Supabase Auth + profile vinculado.
# Uso: make admin-create-user EMAIL=foo@bar PASSWORD=Pass ROL=super_admin
#      make admin-create-user EMAIL=ana@flecha.com ROL=empresa_admin EMPRESA_SLUG=flecha
admin-create-user:
	@node scripts/create-admin-user.mjs

# ============================================================
# Supabase local (Docker + CLI)
# ============================================================
# Requiere: docker + npx. La CLI se descarga on-demand via npx la primera vez.
SUPABASE := npx -y supabase@latest

up:
	$(SUPABASE) start

down:
	$(SUPABASE) stop

restart: down up

# Borra la DB local y la recrea aplicando migrations + seed.
db-reset:
	$(SUPABASE) db reset

studio:
	@echo "Studio: http://127.0.0.1:54323"
	@command -v xdg-open >/dev/null && xdg-open http://127.0.0.1:54323 || true

logs:
	$(SUPABASE) logs

status:
	$(SUPABASE) status

# ============================================================
# Admin SPA
# ============================================================
admin-install:
	cd admin && npm install

admin-dev: admin-install
	cd admin && $(VITE_ENV) npm run dev

admin-build: admin-install
	cd admin && $(VITE_ENV) npm run build
