-- ============================================================
-- ADD-COM — Schema inicial normalizado
-- Tablas: usuarios, productos, mensajes, sugerencias
-- ============================================================

-- Extensión para generar UUIDs si se necesita en el futuro
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- usuarios: vendedores y compradores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL PRIMARY KEY,
  identificacion  VARCHAR(20),
  nombres         VARCHAR(150) NOT NULL,
  telefono        VARCHAR(20),
  email           VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  ubicacion       VARCHAR(255),
  whatsapp        VARCHAR(20),
  rol             VARCHAR(20)  NOT NULL,
  foto_perfil     VARCHAR(255),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('vendedor', 'comprador')),
  CONSTRAINT usuarios_email_unico
    UNIQUE (email),
  CONSTRAINT usuarios_identificacion_unica
    UNIQUE (identificacion)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol
  ON usuarios (rol);

CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- Solo los vendedores deben tener identificación (cédula / NIT).
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_identificacion_vendedores
  ON usuarios (identificacion)
  WHERE rol = 'vendedor' AND identificacion IS NOT NULL;

-- ------------------------------------------------------------
-- productos: pertenecen a un vendedor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id               SERIAL PRIMARY KEY,
  vendedor_id      INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre           VARCHAR(150) NOT NULL,
  precio           NUMERIC(12,2) NOT NULL,
  especificaciones TEXT,
  foto             VARCHAR(255),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT productos_precio_positivo
    CHECK (precio >= 0)
);

CREATE INDEX IF NOT EXISTS idx_productos_vendedor
  ON productos (vendedor_id);

CREATE INDEX IF NOT EXISTS idx_productos_nombre
  ON productos (nombre);

-- ------------------------------------------------------------
-- mensajes: chat entre un comprador y un vendedor
-- conversacion = par (vendedor_id, comprador_id)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes (
  id              SERIAL PRIMARY KEY,
  vendedor_id     INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comprador_id    INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  remitente_id    INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido       TEXT         NOT NULL,
  leido           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT mensajes_contenido_no_vacio
    CHECK (LENGTH(TRIM(contenido)) > 0),
  CONSTRAINT mensajes_participantes_distintos
    CHECK (vendedor_id <> comprador_id)
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion
  ON mensajes (vendedor_id, comprador_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mensajes_remitente
  ON mensajes (remitente_id);

CREATE INDEX IF NOT EXISTS idx_mensajes_created
  ON mensajes (created_at DESC);

-- ------------------------------------------------------------
-- sugerencias: buzón institucional
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sugerencias (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150),
  email       VARCHAR(150),
  mensaje     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT sugerencias_mensaje_no_vacio
    CHECK (LENGTH(TRIM(mensaje)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_created
  ON sugerencias (created_at DESC);

-- Trigger genérico para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
