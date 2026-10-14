-- =============================================================================
-- Meridian - estrutura do banco de dados
-- Corresponde ao modelo logico em docs/modelagem-banco-de-dados.png
--
-- Para criar do zero:  psql -U postgres -d meridian -f sql/schema.sql
-- =============================================================================

-- Permite buscar ignorando acentos ("Jose" encontra "Jose Silva" e "Jose" com acento)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Apaga tudo antes de recriar (a ordem importa por causa das chaves estrangeiras)
DROP TABLE IF EXISTS manutencoes, sessoes, veiculos, motoristas, usuarios, configuracoes CASCADE;
DROP TYPE IF EXISTS perfil_usuario, status_veiculo, categoria_cnh, tipo_manutencao, status_manutencao CASCADE;

-- -----------------------------------------------------------------------------
-- Tipos enumerados: a propria coluna so aceita estes valores
-- -----------------------------------------------------------------------------
CREATE TYPE perfil_usuario    AS ENUM ('ADMIN', 'GESTOR');
CREATE TYPE status_veiculo    AS ENUM ('ATIVO', 'EM_MANUTENCAO', 'INATIVO');
CREATE TYPE categoria_cnh     AS ENUM ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE');
CREATE TYPE tipo_manutencao   AS ENUM ('PREVENTIVA', 'CORRETIVA');
CREATE TYPE status_manutencao AS ENUM ('PENDENTE', 'REALIZADA', 'CANCELADA');

-- -----------------------------------------------------------------------------
-- usuarios: pessoas com acesso ao sistema (RNF01)
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id            SERIAL        PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL UNIQUE,
  -- hash bcrypt; a senha em texto puro nunca e guardada
  senha_hash    VARCHAR(255)  NOT NULL,
  perfil        perfil_usuario NOT NULL DEFAULT 'GESTOR',
  ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usuarios IS 'Usuarios do sistema (RNF01)';

-- -----------------------------------------------------------------------------
-- sessoes: sessoes de login abertas (duram 8 horas)
-- -----------------------------------------------------------------------------
CREATE TABLE sessoes (
  token      CHAR(64)    PRIMARY KEY,
  usuario_id INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  expira_em  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessoes_usuario ON sessoes (usuario_id);

-- -----------------------------------------------------------------------------
-- motoristas (RF01)
-- -----------------------------------------------------------------------------
CREATE TABLE motoristas (
  id            SERIAL        PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  cpf           CHAR(11)      NOT NULL UNIQUE,
  cnh           CHAR(11)      NOT NULL UNIQUE,
  categoria_cnh categoria_cnh NOT NULL,
  validade_cnh  DATE          NOT NULL,
  telefone      VARCHAR(11),
  ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT cpf_so_digitos      CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT cnh_so_digitos      CHECK (cnh ~ '^[0-9]{11}$'),
  CONSTRAINT telefone_so_digitos CHECK (telefone IS NULL OR telefone ~ '^[0-9]{10,11}$')
);

COMMENT ON TABLE motoristas IS 'Motoristas da frota (RF01)';

-- -----------------------------------------------------------------------------
-- veiculos (RF01)
-- -----------------------------------------------------------------------------
CREATE TABLE veiculos (
  id            SERIAL         PRIMARY KEY,
  placa         CHAR(7)        NOT NULL UNIQUE,
  marca         VARCHAR(60)    NOT NULL,
  modelo        VARCHAR(60)    NOT NULL,
  chassi        CHAR(17)       NOT NULL UNIQUE,
  renavam       CHAR(11)       NOT NULL UNIQUE,
  ano_aquisicao SMALLINT       NOT NULL,
  km_atual      INTEGER        NOT NULL DEFAULT 0,
  status        status_veiculo NOT NULL DEFAULT 'ATIVO',
  -- UNIQUE: um motorista responde por no maximo um veiculo
  motorista_id  INTEGER        UNIQUE REFERENCES motoristas (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Placa no padrao antigo (ABC1234) ou Mercosul (ABC1D23)
  CONSTRAINT placa_valida   CHECK (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  -- Chassi: 17 caracteres, sem as letras I, O e Q
  CONSTRAINT chassi_valido  CHECK (chassi ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  CONSTRAINT renavam_valido CHECK (renavam ~ '^[0-9]{11}$'),
  CONSTRAINT ano_valido     CHECK (ano_aquisicao BETWEEN 1950 AND 2100),
  CONSTRAINT km_nao_negativo CHECK (km_atual >= 0)
);

COMMENT ON TABLE veiculos IS 'Veiculos da frota (RF01)';

-- -----------------------------------------------------------------------------
-- manutencoes (RF02 e RF03)
-- -----------------------------------------------------------------------------
CREATE TABLE manutencoes (
  id              SERIAL            PRIMARY KEY,
  veiculo_id      INTEGER           NOT NULL REFERENCES veiculos (id) ON DELETE RESTRICT,
  tipo            tipo_manutencao   NOT NULL,
  descricao       VARCHAR(255)      NOT NULL,
  status          status_manutencao NOT NULL DEFAULT 'PENDENTE',

  -- Programacao: criterios do alerta (RF03)
  data_programada DATE,
  km_limite       INTEGER,

  -- Recorrencia: ao concluir, a proxima e programada com estes intervalos
  intervalo_km    INTEGER,
  intervalo_dias  INTEGER,

  -- Execucao: preenchidos quando a manutencao e realizada
  data_realizacao DATE,
  km_realizacao   INTEGER,
  custo           NUMERIC(10,2),
  oficina         VARCHAR(120),

  criado_em       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- RN04: preventiva pendente precisa de data, de km ou dos dois
  CONSTRAINT preventiva_tem_programacao CHECK (
    status <> 'PENDENTE' OR tipo <> 'PREVENTIVA'
    OR data_programada IS NOT NULL OR km_limite IS NOT NULL
  ),
  -- RN04: manutencao realizada precisa da data de realizacao
  CONSTRAINT realizada_tem_data CHECK (
    status <> 'REALIZADA' OR data_realizacao IS NOT NULL
  ),
  CONSTRAINT intervalo_km_positivo   CHECK (intervalo_km   IS NULL OR intervalo_km   > 0),
  CONSTRAINT intervalo_dias_positivo CHECK (intervalo_dias IS NULL OR intervalo_dias > 0),
  CONSTRAINT custo_nao_negativo      CHECK (custo IS NULL OR custo >= 0)
);

CREATE INDEX idx_manutencoes_veiculo ON manutencoes (veiculo_id);
CREATE INDEX idx_manutencoes_status  ON manutencoes (status);

COMMENT ON TABLE manutencoes IS 'Manutencoes programadas e realizadas (RF02 e RF03)';

-- -----------------------------------------------------------------------------
-- configuracoes: antecedencia dos alertas (RF03). Tabela de uma linha so.
-- -----------------------------------------------------------------------------
CREATE TABLE configuracoes (
  id                       SMALLINT    PRIMARY KEY DEFAULT 1,
  alerta_antecedencia_km   INTEGER     NOT NULL DEFAULT 500,
  alerta_antecedencia_dias INTEGER     NOT NULL DEFAULT 15,
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante que existe no maximo uma linha de configuracao
  CONSTRAINT linha_unica CHECK (id = 1),
  CONSTRAINT antecedencia_km_valida   CHECK (alerta_antecedencia_km   BETWEEN 0 AND 100000),
  CONSTRAINT antecedencia_dias_valida CHECK (alerta_antecedencia_dias BETWEEN 0 AND 365)
);

INSERT INTO configuracoes (id) VALUES (1);

COMMENT ON TABLE configuracoes IS 'Antecedencia dos alertas (RF03)';
