-- Table: empresas
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    tipo_empresa VARCHAR(50) CHECK (tipo_empresa IN ('Clinica', 'Hospital', 'Cooperativa', 'Home_Care', 'Escola', 'Igreja')),
    responsavel VARCHAR(255),
    endereco JSONB,
    telefone_contato VARCHAR(20),
    plano VARCHAR(20) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    senha_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    foto_url TEXT,
    status VARCHAR(20) DEFAULT 'pending_invite',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: membros_empresa (Multi-empresa support)
CREATE TABLE IF NOT EXISTS membros_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    papel VARCHAR(20) CHECK (papel IN ('ADMIN', 'COORDENADOR', 'USUARIO')),
    status VARCHAR(20) DEFAULT 'active',
    data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, usuario_id)
);

-- Table: setores
CREATE TABLE IF NOT EXISTS setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE
);

-- Table: locais
CREATE TABLE IF NOT EXISTS locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    setor_id UUID REFERENCES setores(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    raio_geolocalizacao INTEGER DEFAULT 100 -- metros
);

-- Table: escalas
CREATE TABLE IF NOT EXISTS escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    setor_id UUID REFERENCES setores(id) ON DELETE CASCADE,
    local_id UUID REFERENCES locais(id) ON DELETE CASCADE,
    coordenador_id UUID REFERENCES usuarios(id),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('semanal', 'mensal', 'personalizado')),
    status VARCHAR(20) DEFAULT 'draft'
);

-- Table: turnos
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID REFERENCES escalas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    valor_plantao DECIMAL(10, 2),
    status VARCHAR(30) CHECK (status IN ('VAGO', 'OCUPADO', 'TROCA_SOLICITADA', 'TROCA_APROVADA', 'ANUNCIADO', 'DIVIDIDO')),
    max_distance INTEGER DEFAULT 500, -- metros
    parent_turno_id UUID REFERENCES turnos(id) -- Rastreabilidade de divisão
);

-- Table: checkins
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    checkin_time TIMESTAMP,
    checkout_time TIMESTAMP,
    checkin_latitude DECIMAL(10, 8),
    checkin_longitude DECIMAL(11, 8),
    checkout_latitude DECIMAL(10, 8),
    checkout_longitude DECIMAL(11, 8),
    distancia_local INTEGER,
    status VARCHAR(20) DEFAULT 'pendente'
);

-- Table: solicitacoes_trocas
CREATE TABLE IF NOT EXISTS solicitacoes_trocas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id) ON DELETE CASCADE,
    solicitante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_destino_id UUID REFERENCES usuarios(id),
    status VARCHAR(30) CHECK (status IN ('PENDENTE', 'APROVADA', 'NEGADA')),
    aprovado_por UUID REFERENCES usuarios(id),
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aprovacao TIMESTAMP,
    motivo TEXT
);

-- Table: disponibilidades
CREATE TABLE IF NOT EXISTS disponibilidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('DISPONIVEL', 'INDISPONIVEL')),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inicio TIME,
    hora_fim TIME,
    recorrencia VARCHAR(100), -- Ex: 'MO,WE,FR' ou padrão CRON simplificado
    observacao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_membros_empresa_usuario_id ON membros_empresa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_membros_empresa_empresa_id ON membros_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_turnos_data ON turnos(data);
CREATE INDEX IF NOT EXISTS idx_turnos_usuario_id ON turnos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_turnos_status ON turnos(status);
CREATE INDEX IF NOT EXISTS idx_checkins_turno_id ON checkins(turno_id);
CREATE INDEX IF NOT EXISTS idx_escalas_empresa_id ON escalas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_trocas_turno_id ON solicitacoes_trocas(turno_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidades_usuario_id ON disponibilidades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidades_data ON disponibilidades(data_inicio);
