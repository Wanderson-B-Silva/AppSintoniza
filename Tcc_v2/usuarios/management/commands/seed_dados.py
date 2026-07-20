"""
Comando de SEED (popular banco com dados de demonstração).

Cria automaticamente:
  - 1 psicólogo
  - 5 empresas (200 funcionários cada = 1000 funcionários)
  - 2 questionários com perguntas ponderadas
  - Respostas + avaliações para a maioria dos funcionários
  - Check-ins de humor
  - Pareceres do psicólogo nos casos de risco
  - Predições de ML (alimenta a fila de prioridade)
  - Conteúdos de apoio

COMO USAR:
    python manage.py seed_dados
    python manage.py seed_dados --reset          (apaga os dados de seed antes)
    python manage.py seed_dados --empresas 5 --funcionarios 200

CREDENCIAIS GERADAS (senha padrão: senha123)
    Psicólogo:   psicologo
    Empresas:    empresa1 ... empresa5
    Funcionário demo: funcionario   (ou func1, func2, ...)
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from usuarios.models import Usuario, Empresa, Funcionario, Psicologo
from questionarios.models import (
    Questionario, Pergunta, Resposta, Avaliacao,
    ParecerPsicologo, CheckinHumor,
)
from questionarios.services import CalculadoraPontuacao

try:
    from predicao.models import Predicao
    TEM_PREDICAO = True
except Exception:
    TEM_PREDICAO = False

try:
    from conteudos.models import Conteudo
    TEM_CONTEUDO = True
except Exception:
    TEM_CONTEUDO = False


SENHA_PADRAO = "senha123"

NOMES = [
    "Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique",
    "Isabela", "João", "Karina", "Lucas", "Mariana", "Nathan", "Olívia", "Pedro",
    "Queila", "Rafael", "Sofia", "Thiago", "Úrsula", "Vinícius", "Wesley", "Yasmin",
    "Camila", "Rodrigo", "Larissa", "Matheus", "Beatriz", "Gustavo", "Juliana",
    "Leonardo", "Patrícia", "Ricardo", "Tatiane", "André", "Fernanda", "Marcelo",
]
SOBRENOMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira",
    "Almeida", "Gomes", "Ribeiro", "Martins", "Carvalho", "Rocha", "Barbosa",
    "Araújo", "Cardoso", "Teixeira", "Moraes", "Nunes", "Mendes", "Castro",
]
DEPARTAMENTOS = [
    "Recursos Humanos", "Tecnologia", "Financeiro", "Comercial", "Operações",
    "Marketing", "Atendimento", "Logística", "Jurídico", "Produção",
]
CARGOS = [
    "Analista", "Assistente", "Coordenador", "Especialista", "Gerente",
    "Auxiliar", "Supervisor", "Estagiário", "Consultor", "Técnico",
]
TURNOS = ["manha", "tarde", "noite", "integral"]

NOMES_EMPRESAS = [
    ("TechNova Soluções", "TechNova"),
    ("Bem Viver Saúde", "Bem Viver"),
    ("LogPrime Transportes", "LogPrime"),
    ("EducaMais Ensino", "EducaMais"),
    ("Construtora Horizonte", "Horizonte"),
    ("Varejo Central", "VC Stores"),
    ("AgroVale Alimentos", "AgroVale"),
]

PERGUNTAS_BASE = [
    ("Tenho me sentido sobrecarregado(a) com as demandas do trabalho.", 3),
    ("Tenho dificuldade para relaxar mesmo fora do horário de trabalho.", 2),
    ("Sinto que minha qualidade de sono tem piorado.", 3),
    ("Tenho me sentido desmotivado(a) para realizar minhas tarefas.", 2),
    ("Sinto ansiedade ao pensar nas responsabilidades do dia.", 3),
    ("Percebo que minha concentração tem diminuído.", 2),
    ("Tenho me sentido irritado(a) ou impaciente com mais frequência.", 2),
    ("Sinto que não tenho tempo para mim mesmo(a).", 2),
    ("Tenho evitado contato com colegas ou amigos.", 2),
    ("Sinto cansaço físico e mental constante.", 3),
]

PERGUNTAS_CLIMA = [
    ("Sinto-me valorizado(a) pela minha liderança.", 2),
    ("Tenho clareza sobre o que é esperado de mim.", 1),
    ("O ambiente de trabalho é colaborativo.", 1),
    ("Recebo apoio quando enfrento dificuldades.", 2),
    ("Consigo equilibrar vida pessoal e profissional.", 2),
    ("Sinto-me seguro(a) para expressar minhas opiniões.", 1),
]

CONTEUDOS_DEMO = [
    ("Respiração para acalmar a ansiedade", "video", "ansiedade",
     "Técnica guiada de respiração diafragmática em 5 minutos.", "Dra. Helena Castro", "5 min"),
    ("Entendendo o Burnout", "artigo", "burnout",
     "O que é o esgotamento profissional e como identificar os sinais.", "Equipe Sintoniza", ""),
    ("Higiene do sono: durma melhor", "video", "bem_estar",
     "Hábitos simples para melhorar a qualidade do seu sono.", "Dr. Paulo Lemos", "8 min"),
    ("Meditação guiada para o trabalho", "podcast", "estresse",
     "Pausa de 10 minutos para reduzir o estresse durante o expediente.", "Espaço Mente", "10 min"),
    ("Como pedir ajuda profissional", "artigo", "depressao",
     "Quando e como procurar apoio psicológico sem culpa.", "Equipe Sintoniza", ""),
    ("Mindfulness para iniciantes", "video", "autoconhecimento",
     "Introdução prática à atenção plena no dia a dia.", "Clara Monteiro", "12 min"),
]


class Command(BaseCommand):
    help = "Popula o banco com dados de demonstração (empresas, funcionários, avaliações...)."

    def add_arguments(self, parser):
        parser.add_argument("--empresas", type=int, default=5, help="Quantidade de empresas")
        parser.add_argument("--funcionarios", type=int, default=200, help="Funcionários por empresa")
        parser.add_argument("--reset", action="store_true", help="Apaga dados de seed antes de criar")

    def handle(self, *args, **opts):
        random.seed(42)
        n_empresas = opts["empresas"]
        n_func = opts["funcionarios"]

        if opts["reset"]:
            self._reset()
        else:
            # Evita erro de duplicidade se o seed já tiver sido rodado
            if Usuario.objects.filter(username__startswith="funcseed_").exists() or \
               Usuario.objects.filter(username="funcionario").exists():
                self.stdout.write(self.style.ERROR(
                    "\nOs dados de demonstração já parecem existir.\n"
                    "Para recriar do zero, rode:  python manage.py seed_dados --reset\n"
                ))
                return

        senha_hash = make_password(SENHA_PADRAO)
        agora = timezone.now()

        self.stdout.write(self.style.WARNING(
            f"Criando {n_empresas} empresas com {n_func} funcionários cada "
            f"(total: {n_empresas * n_func} funcionários)...\n"
        ))

        with transaction.atomic():
            questionarios = self._criar_questionarios()
            empresas = self._criar_empresas(senha_hash, n_empresas)
            funcionarios = self._criar_funcionarios(senha_hash, empresas, n_func)
            psicologo, mapa_psi = self._criar_psicologos(senha_hash, empresas)

        # Avaliações, check-ins e predições (fora da transação gigante para liberar memória)
        self._criar_avaliacoes_e_extras(funcionarios, questionarios, psicologo, agora, mapa_psi)

        if TEM_CONTEUDO:
            self._criar_conteudos()

        self._resumo(empresas, funcionarios)

    # ──────────────────────────────────────────────────────────
    def _reset(self):
        self.stdout.write(self.style.WARNING("Apagando dados de seed (usuários de demonstração)..."))
        # Apaga usuários criados pelo seed (prefixos conhecidos)
        Usuario.objects.filter(username__startswith="empseed_").delete()
        Usuario.objects.filter(username__startswith="funcseed_").delete()
        Usuario.objects.filter(username__in=["psicologo", "funcionario"]).delete()
        for i in range(1, 20):
            Usuario.objects.filter(username=f"empresa{i}").delete()
            Usuario.objects.filter(username=f"psicologo{i}").delete()
            Usuario.objects.filter(username=f"func{i}").delete()
        Questionario.objects.filter(titulo__startswith="[DEMO]").delete()
        if TEM_CONTEUDO:
            Conteudo.objects.filter(titulo__in=[c[0] for c in CONTEUDOS_DEMO]).delete()
        self.stdout.write(self.style.SUCCESS("Reset concluído.\n"))

    # ──────────────────────────────────────────────────────────
    def _criar_psicologos(self, senha_hash, empresas):
        """
        Cria UM psicólogo por empresa, vinculado pelo id da empresa
        (empresas_acompanhadas). Assim cada empresa tem o seu psicólogo e a
        fila de prioridade de cada psicólogo mostra apenas a sua empresa.
        Retorna (psicologo_principal, mapa_empresa_id -> psicologo).
        """
        NOMES_PSI = [
            ("Helena", "Castro"), ("Rafael", "Moreira"), ("Beatriz", "Lima"),
            ("Diego", "Santos"), ("Camila", "Rocha"), ("André", "Nunes"),
        ]
        mapa = {}
        principal = None
        for i, empresa in enumerate(empresas, start=1):
            username = "psicologo" if i == 1 else f"psicologo{i}"
            nome, sobrenome = NOMES_PSI[(i - 1) % len(NOMES_PSI)]
            user, created = Usuario.objects.get_or_create(
                username=username,
                defaults=dict(
                    tipo="psicologo", first_name=nome, last_name=sobrenome,
                    email=f"{username}@sintoniza.com", password=senha_hash,
                ),
            )
            if not created:
                user.password = senha_hash
                user.save(update_fields=["password"])
            psi, _ = Psicologo.objects.get_or_create(
                usuario=user,
                defaults=dict(
                    crp=f"06/{123450 + i:06d}",
                    especialidade="Psicologia Organizacional",
                ),
            )
            # Vínculo pelo id da empresa (cada empresa tem o seu psicólogo)
            psi.empresas_acompanhadas.set([empresa])
            mapa[empresa.id] = psi
            if i == 1:
                principal = psi
        self.stdout.write(self.style.SUCCESS(
            f"✓ {len(empresas)} psicólogo(s) criado(s), cada um vinculado à sua "
            f"empresa (login: psicologo, psicologo2..psicologo{len(empresas)})"
        ))
        return principal, mapa

    def _criar_questionarios(self):
        q1, _ = Questionario.objects.get_or_create(
            titulo="[DEMO] Avaliação de Bem-Estar e Saúde Mental",
            defaults=dict(
                descricao="Questionário para identificar sinais de estresse, "
                          "ansiedade e esgotamento no ambiente de trabalho.",
                ativo=True,
            ),
        )
        if not q1.perguntas.exists():
            Pergunta.objects.bulk_create([
                Pergunta(questionario=q1, texto=t, ordem=i + 1, peso=p)
                for i, (t, p) in enumerate(PERGUNTAS_BASE)
            ])

        q2, _ = Questionario.objects.get_or_create(
            titulo="[DEMO] Clima Organizacional",
            defaults=dict(
                descricao="Avaliação rápida da percepção do colaborador sobre "
                          "o ambiente e a liderança.",
                ativo=True,
            ),
        )
        if not q2.perguntas.exists():
            Pergunta.objects.bulk_create([
                Pergunta(questionario=q2, texto=t, ordem=i + 1, peso=p)
                for i, (t, p) in enumerate(PERGUNTAS_CLIMA)
            ])

        self.stdout.write(self.style.SUCCESS("✓ 2 questionários criados"))
        return [q1, q2]

    def _criar_empresas(self, senha_hash, n_empresas):
        empresas = []
        portes = ["Pequeno", "Médio", "Grande"]
        for i in range(1, n_empresas + 1):
            razao, fantasia = NOMES_EMPRESAS[(i - 1) % len(NOMES_EMPRESAS)]
            if i > len(NOMES_EMPRESAS):
                razao = f"{razao} {i}"
            username = f"empresa{i}"
            user, created = Usuario.objects.get_or_create(
                username=username,
                defaults=dict(
                    tipo="empresa", first_name=fantasia, last_name="",
                    email=f"{username}@sintoniza.com", password=senha_hash,
                ),
            )
            if not created:
                user.password = senha_hash
                user.save(update_fields=["password"])
            empresa, _ = Empresa.objects.get_or_create(
                usuario=user,
                defaults=dict(
                    cnpj=f"{10000000 + i:08d}0001{i:02d}",
                    razao_social=razao,
                    nome_fantasia=fantasia,
                    email_corporativo=f"contato@{fantasia.lower().replace(' ', '')}.com",
                    representante_nome=f"Representante {fantasia}",
                    representante_cpf=f"{100000000 + i:09d}{i:02d}",
                    porte_empresa=portes[i % len(portes)],
                    ramo_atividade="Serviços",
                    cidade="São Paulo", estado="SP",
                    aceitou_lgpd=True, data_aceite_lgpd=timezone.now(),
                ),
            )
            empresas.append(empresa)
        self.stdout.write(self.style.SUCCESS(f"✓ {len(empresas)} empresas criadas (login: empresa1..empresa{n_empresas})"))
        return empresas

    def _criar_funcionarios(self, senha_hash, empresas, n_func):
        funcionarios = []
        contador = 0
        primeiro_demo_feito = False

        for emp_idx, empresa in enumerate(empresas):
            usuarios_novos = []
            metas = []  # (username, nome, sobrenome, dept, cargo, turno)
            for j in range(n_func):
                contador += 1
                nome = random.choice(NOMES)
                sobrenome = random.choice(SOBRENOMES)
                # Primeiro funcionário tem login amigável "funcionario"
                if not primeiro_demo_feito:
                    username = "funcionario"
                    primeiro_demo_feito = True
                else:
                    username = f"funcseed_{contador}"
                metas.append((username, nome, sobrenome,
                              random.choice(DEPARTAMENTOS),
                              random.choice(CARGOS),
                              random.choice(TURNOS)))
                usuarios_novos.append(Usuario(
                    username=username, tipo="funcionario",
                    first_name=nome, last_name=sobrenome,
                    email=f"{username}@sintoniza.com",
                    password=senha_hash,
                ))

            Usuario.objects.bulk_create(usuarios_novos, batch_size=500)

            # Recarrega para obter IDs
            usernames = [m[0] for m in metas]
            user_map = {u.username: u for u in Usuario.objects.filter(username__in=usernames)}

            funcs_novos = []
            for (username, nome, sobrenome, dept, cargo, turno) in metas:
                u = user_map[username]
                funcs_novos.append(Funcionario(
                    usuario=u, empresa=empresa,
                    cargo=f"{cargo} de {dept.split()[0]}",
                    departamento=dept, turno=turno,
                    matricula=f"M{u.id:05d}",
                    genero=random.choice(["M", "F", "NB", "PNI"]),
                    aceitou_lgpd=True, data_aceite_lgpd=timezone.now(),
                    ativo=True,
                ))
            Funcionario.objects.bulk_create(funcs_novos, batch_size=500)

            # atualiza contagem de funcionários da empresa
            empresa.quantidade_funcionarios = n_func
            empresa.save(update_fields=["quantidade_funcionarios"])

            criados = list(Funcionario.objects.filter(empresa=empresa).select_related("usuario"))
            funcionarios.extend(criados)
            self.stdout.write(f"   • {empresa.nome_fantasia}: {len(criados)} funcionários")

        self.stdout.write(self.style.SUCCESS(f"✓ {len(funcionarios)} funcionários criados no total"))
        return funcionarios

    # ──────────────────────────────────────────────────────────
    def _criar_avaliacoes_e_extras(self, funcionarios, questionarios, psicologo, agora, mapa_psi=None):
        q_principal = questionarios[0]
        perguntas = list(q_principal.perguntas.all())
        peso_total = sum(p.peso for p in perguntas)  # define as faixas de pontuação

        # alvo de média por nível (1 a 5) para cair nas faixas do CalculadoraPontuacao
        # bom <=50 ; medio 51-100 ; risco >100  (com peso_total ~24 => max 120)
        alvo_por_nivel = {"bom": (1, 2), "medio": (2, 3), "risco": (4, 5)}

        respostas_buffer = []
        avaliacoes_info = []   # (funcionario, pontuacao, nivel, dias_atras)
        checkins_buffer = []

        HUMORES = ["bem", "motivado", "cansado", "triste", "ansioso"]
        nota_humor = {"bem": 5, "motivado": 5, "cansado": 3, "triste": 2, "ansioso": 2}

        # ~88% dos funcionários respondem ao questionário
        for func in funcionarios:
            responde = random.random() < 0.88

            # Check-ins de humor (1 a 6 por funcionário que respondeu)
            if responde:
                for _ in range(random.randint(1, 6)):
                    h = random.choices(HUMORES, weights=[35, 15, 20, 15, 15])[0]
                    checkins_buffer.append(CheckinHumor(
                        funcionario=func, humor=h, nota=nota_humor[h],
                    ))

            if not responde:
                continue

            # sorteia nível com distribuição realista
            nivel_alvo = random.choices(
                ["bom", "medio", "risco"], weights=[55, 30, 15]
            )[0]
            lo, hi = alvo_por_nivel[nivel_alvo]

            pontuacao = 0
            for p in perguntas:
                valor = random.randint(lo, hi)
                valor = max(1, min(5, valor))
                respostas_buffer.append(Resposta(
                    funcionario=func, pergunta=p, valor=valor,
                ))
                pontuacao += valor * p.peso

            nivel = CalculadoraPontuacao.calcular_nivel(pontuacao)
            recomendacoes = CalculadoraPontuacao.gerar_recomendacoes(nivel)
            dias_atras = random.randint(0, 60)
            avaliacoes_info.append((func, pontuacao, nivel, recomendacoes, dias_atras))

        # bulk respostas
        Resposta.objects.bulk_create(respostas_buffer, batch_size=1000, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"✓ {len(respostas_buffer)} respostas criadas"))

        # bulk avaliações
        avaliacoes_objs = [
            Avaliacao(funcionario=f, pontuacao_total=pt, nivel=nv, recomendacoes=rec)
            for (f, pt, nv, rec, dias) in avaliacoes_info
        ]
        Avaliacao.objects.bulk_create(avaliacoes_objs, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"✓ {len(avaliacoes_objs)} avaliações criadas"))

        # backdatar datas das avaliações (agrupado por dias_atras)
        # recarrega avaliações recém-criadas e casa pela ordem
        criadas = list(Avaliacao.objects.order_by("-id")[:len(avaliacoes_objs)])
        criadas.reverse()
        buckets = {}
        for av, (f, pt, nv, rec, dias) in zip(criadas, avaliacoes_info):
            buckets.setdefault(dias, []).append(av.id)
        for dias, ids in buckets.items():
            Avaliacao.objects.filter(id__in=ids).update(
                data_avaliacao=agora - timedelta(days=dias)
            )

        # check-ins
        CheckinHumor.objects.bulk_create(checkins_buffer, batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"✓ {len(checkins_buffer)} check-ins de humor criados"))

        # pareceres do psicólogo + predições ML
        self._criar_pareceres_e_predicoes(criadas, avaliacoes_info, psicologo, mapa_psi)

        # sequência de check-ins do funcionário demo (streak/tendência na apresentação)
        self._criar_streak_demo(agora)

    def _criar_streak_demo(self, agora):
        """Dá ao funcionário demo uma sequência de check-ins diários nos últimos
        8 dias, para a tela inicial exibir streak e tendência preenchidos."""
        try:
            func = Funcionario.objects.filter(usuario__username="funcionario").first()
            if not func:
                return
            CheckinHumor.objects.filter(funcionario=func).delete()
            # 8 dias terminando em "motivado" (tendência de melhora)
            sequencia = [
                ("ansioso", 2), ("cansado", 3), ("triste", 2), ("bem", 4),
                ("bem", 4), ("motivado", 5), ("bem", 4), ("motivado", 5),
            ]
            CheckinHumor.objects.bulk_create([
                CheckinHumor(funcionario=func, humor=h, nota=n) for (h, n) in sequencia
            ])
            criados = list(CheckinHumor.objects.filter(funcionario=func).order_by("id"))
            total = len(criados)
            for idx, c in enumerate(criados):
                dias_atras = (total - 1) - idx
                CheckinHumor.objects.filter(id=c.id).update(
                    data=agora - timedelta(days=dias_atras)
                )
            self.stdout.write(self.style.SUCCESS(
                "✓ Sequência de check-ins do funcionário demo criada (streak)"
            ))
        except Exception:
            pass

    def _criar_pareceres_e_predicoes(self, avaliacoes, avaliacoes_info, psicologo, mapa_psi=None):
        mapa_psi = mapa_psi or {}
        pareceres = []
        predicoes = []
        textos_parecer = {
            "risco": "Avaliação indica nível elevado de sofrimento psíquico. "
                     "Recomenda-se contato imediato e oferta de acompanhamento.",
            "medio": "Há sinais de atenção. Sugiro reavaliar em 2 semanas e "
                     "indicar conteúdos de manejo de estresse.",
        }
        nivel_atencao = {"risco": "urgente", "medio": "acompanhar", "bom": "rotina"}

        for av, (f, pt, nv, rec, dias) in zip(avaliacoes, avaliacoes_info):
            # psicólogo responsável = o da empresa do funcionário
            psi = mapa_psi.get(getattr(f, "empresa_id", None), psicologo)

            # parecer em ~70% dos casos de risco e ~25% dos médios
            if (nv == "risco" and random.random() < 0.70) or (nv == "medio" and random.random() < 0.25):
                pareceres.append(ParecerPsicologo(
                    avaliacao=av, psicologo=psi,
                    parecer=textos_parecer.get(nv, "Acompanhamento de rotina."),
                    nivel_atencao=nivel_atencao[nv],
                    necessita_acompanhamento=(nv == "risco"),
                ))

            # predição ML para alimentar a fila (médio -> Atenção; risco -> Alto ou Crítico)
            if TEM_PREDICAO and nv in ("risco", "medio"):
                if nv == "medio":
                    nivel_risco = "Médio"
                else:
                    # os casos de risco se dividem entre Alto e Crítico
                    nivel_risco = "Crítico" if random.random() < 0.40 else "Alto"
                prob = round(random.uniform(0.62, 0.96), 2)
                p = Predicao(
                    funcionario=f,
                    nivel_risco_predito=nivel_risco,
                    probabilidade=prob,
                    probabilidades_detalhadas={nivel_risco: prob},
                )
                p.calcular_score_prioridade()
                predicoes.append(p)

        if pareceres:
            ParecerPsicologo.objects.bulk_create(pareceres, batch_size=500, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f"✓ {len(pareceres)} pareceres do psicólogo criados"))
        if predicoes:
            Predicao.objects.bulk_create(predicoes, batch_size=500)
            self.stdout.write(self.style.SUCCESS(f"✓ {len(predicoes)} predições de ML criadas (fila de prioridade)"))

    def _criar_conteudos(self):
        novos = 0
        for titulo, tipo, cat, desc, autor, dur in CONTEUDOS_DEMO:
            _, created = Conteudo.objects.get_or_create(
                titulo=titulo,
                defaults=dict(tipo=tipo, categoria=cat, descricao=desc,
                              autor=autor, duracao=dur, ativo=True,
                              destaque=(novos < 2)),
            )
            if created:
                novos += 1
        self.stdout.write(self.style.SUCCESS(f"✓ {novos} conteúdos de apoio criados"))

    def _resumo(self, empresas, funcionarios):
        self.stdout.write("\n" + "=" * 56)
        self.stdout.write(self.style.SUCCESS("  SEED CONCLUÍDO COM SUCESSO!"))
        self.stdout.write("=" * 56)
        self.stdout.write(f"  Empresas:      {len(empresas)}")
        self.stdout.write(f"  Funcionários:  {len(funcionarios)}")
        self.stdout.write(f"  Avaliações:    {Avaliacao.objects.count()}")
        self.stdout.write("-" * 56)
        self.stdout.write("  CREDENCIAIS (senha para todos: senha123)")
        self.stdout.write("    Psicólogo:        psicologo")
        self.stdout.write("    Empresa (gestor): empresa1")
        self.stdout.write("    Funcionário:      funcionario")
        self.stdout.write("=" * 56 + "\n")
