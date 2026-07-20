# Sintonize - Sistema de Saúde Mental

Sistema para promoção da saúde mental no ambiente corporativo, com autenticação,
questionários, predição via Machine Learning e fila de prioridade para psicólogos.

## Tecnologias

- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React Native + Expo Router
- **Machine Learning**: scikit-learn (Random Forest)
- **Banco de Dados**: MySQL (compatível com SQLite para desenvolvimento)

## Estrutura do Projeto

```
Tcc_v2/                     # Backend Django
├── core/                   # Configurações do projeto
├── usuarios/               # Cadastro, login, LGPD, dashboard
├── questionarios/          # Questionários e avaliações
├── conteudos/              # Conteúdos educativos
├── mensagens/              # Chat/mensagens
├── auditoria/              # Logs de auditoria
├── predicao/               # Módulo de Machine Learning
│   ├── ml/                 # Pipeline de ML
│   │   ├── data_loader.py  # Carregamento de dados
│   │   ├── preprocessing.py # Pré-processamento
│   │   ├── training.py     # Treinamento do modelo
│   │   ├── evaluation.py   # Avaliação de performance
│   │   └── model_repository.py # Persistência
│   ├── models/             # Artefatos (modelo.pkl, scaler.pkl)
│   ├── views.py            # Endpoints /predict e fila
│   ├── urls.py             # Rotas
│   └── main.py             # Pipeline completo
├── requirements.txt
└── manage.py

sintonizeApp_v2/            # Frontend React Native
├── app/
│   ├── (auth)/             # Telas de autenticação
│   └── (tabs)/
│       ├── (empresa)/      # Telas da empresa
│       ├── (clientes)/     # Telas do funcionário
│       └── (psicologo)/    # Telas do psicólogo (inclui fila ML)
├── services/api.ts         # Rotas da API
└── package.json
```

## Instalação e Execução

### Backend
```bash
cd Tcc_v2
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env      # Configurar variáveis
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Machine Learning (primeira vez)
```bash
cd Tcc_v2/predicao
python main.py
```
Isso treina o modelo e salva os artefatos em `predicao/models/`.

### Frontend
```bash
cd sintonizeApp_v2
npm install
npx expo start
```

## Endpoints da API

### Predição ML
- `POST /api/predicao/predict/` - Gerar predição
- `GET /api/predicao/fila/` - Fila de prioridade (psicólogo)
- `POST /api/predicao/fila/<id>/atender/` - Marcar atendido
- `GET /api/predicao/minhas-predicoes/` - Predições do funcionário
- `GET /api/predicao/dashboard/` - Dashboard ML
- `GET /api/predicao/info/` - Info do modelo

### Demais endpoints
- `/api/usuarios/` - Cadastro, login, perfil, LGPD
- `/api/questionarios/` - Questionários e avaliações
- `/api/conteudos/` - Conteúdos educativos
- `/api/mensagens/` - Mensagens/chat
- `/api/auditoria/` - Logs de auditoria

## Métricas do Modelo ML
- **Algoritmo**: Random Forest (200 árvores)
- **Acurácia**: 85%
- **ROC-AUC**: 0.94
- **Dataset**: 1.000 registros, 16 features

## Fila de Prioridade
O sistema calcula automaticamente um score de prioridade baseado no resultado
do modelo de ML. Funcionários com maior risco aparecem primeiro na fila do
psicólogo, que pode filtrar por nível (Crítico, Alto, Médio, Baixo).
