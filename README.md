Sintoniza — Plataforma de suporte à saúde mental para ambientes corporativos, desenvolvida como Trabalho de Conclusão de Curso (UniCesumar).

Aplicação full-stack com três perfis de usuário (colaborador, psicólogo e empresa), que combina check-ins de humor, questionários de risco e uma fila de priorização baseada em Machine Learning para direcionar o atendimento psicológico de forma mais eficiente. Os dashboards agregados seguem princípios de anonimização (k-anonimato) e conformidade com a LGPD.

Stack técnica:

Backend: Django REST Framework + MySQL
Frontend: React Native (Expo SDK 54) + TypeScript
Machine Learning: scikit-learn (Random Forest, 200 estimadores) para triagem de risco por prioridade

Principais funcionalidades:

Fila de priorização por ML com base em respostas de questionários
Dashboards agregados anônimos (k-anonimato, grupo mínimo de 5)
Mascaramento de CPF e escopo psicólogo-empresa com controle de acesso (403)
Check-ins de humor com streaks e tendências de 7 dias
Seed de demonstração com múltiplas empresas e colaboradores simulados
