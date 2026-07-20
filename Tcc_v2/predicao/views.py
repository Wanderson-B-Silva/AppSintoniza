"""
views.py - Endpoints da API de Predição com Machine Learning
Inclui: predição, fila de prioridade para psicólogos, métricas e dashboard ML.
"""

import os
import pandas as pd
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count

from .models import Predicao
from .ml.model_repository import ModelRepository
from usuarios.models import Funcionario, Empresa, Psicologo
from auditoria.utils import log_create, registrar_log


# ─── Cache global do modelo carregado ───
_modelo_cache = None


def _carregar_modelo():
    """Carrega o modelo do disco (com cache em memória)."""
    global _modelo_cache
    if _modelo_cache is not None:
        return _modelo_cache

    repo = ModelRepository()
    if not repo.modelo_existe():
        return None

    _modelo_cache = repo.carregar_modelo()
    return _modelo_cache


# ═══════════════════════════════════════════════════════════════
#  ENDPOINT PRINCIPAL: POST /api/predicao/predict/
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict(request):
    """
    Endpoint POST /predict - Recebe features e retorna predição do modelo.

    Pode receber features direto no JSON ou usar as respostas do questionário
    do funcionário logado para gerar a predição automaticamente.

    Body JSON:
    {
        "features": {
            "Idade": 30,
            "Tempo Empresa (anos)": 5,
            "Estresse (0-10)": 7.5,
            "Burnout (0-10)": 6.0,
            ...
        }
    }

    OU (sem body, usa dados do questionário do funcionário logado):
    POST /api/predicao/predict/
    """
    try:
        # Carregar modelo
        artefatos = _carregar_modelo()
        if artefatos is None:
            return Response(
                {'erro': 'Modelo não treinado. Execute o pipeline de treinamento primeiro.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        modelo = artefatos['modelo']
        preprocessador = artefatos['preprocessador']
        features_info = artefatos.get('features_info', {})
        feature_names = features_info.get('features', [])

        # Obter features da requisição
        features_dict = request.data.get('features')

        if not features_dict:
            # Tentar usar dados das respostas do questionário do funcionário
            features_dict = _extrair_features_do_questionario(request.user)

        if not features_dict:
            return Response(
                {
                    'erro': 'Features não fornecidas e não há dados de questionário disponíveis.',
                    'features_esperadas': feature_names,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar features
        faltando = [f for f in feature_names if f not in features_dict]
        if faltando:
            return Response(
                {
                    'erro': f'Features faltando: {faltando}',
                    'features_esperadas': feature_names,
                    'features_recebidas': list(features_dict.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar DataFrame com as features
        df_input = pd.DataFrame([features_dict])
        df_input = df_input[feature_names]  # Garantir ordem correta

        # Pré-processar
        X_processado = preprocessador.transform(df_input)

        # Predizer
        prediction = int(modelo.predict(X_processado)[0])
        nivel_predito = preprocessador.decodificar_target(prediction)

        # Probabilidades
        probabilidades = None
        probabilidade_max = 0.0
        if hasattr(modelo, 'predict_proba'):
            proba = modelo.predict_proba(X_processado)[0]
            labels = preprocessador.MAPA_RISCO_INVERSO
            probabilidades = {
                labels.get(i, f'Classe {i}'): round(float(p), 4)
                for i, p in enumerate(proba)
            }
            probabilidade_max = round(float(max(proba)), 4)

        # Salvar predição no banco (se usuário for funcionário)
        predicao_obj = None
        try:
            funcionario = Funcionario.objects.get(usuario=request.user, ativo=True)
            predicao_obj = Predicao.objects.create(
                funcionario=funcionario,
                nivel_risco_predito=nivel_predito,
                probabilidade=probabilidade_max,
                probabilidades_detalhadas=probabilidades,
                features_entrada=features_dict,
            )
            predicao_obj.calcular_score_prioridade()
            predicao_obj.save()

            log_create(
                request, 'Predicao', predicao_obj.id,
                f'Predição ML: {nivel_predito} ({probabilidade_max:.2%}) '
                f'para {funcionario.usuario.get_full_name()}',
                dados_novos={
                    'nivel': nivel_predito,
                    'probabilidade': probabilidade_max,
                    'score_prioridade': predicao_obj.score_prioridade,
                }
            )
        except Funcionario.DoesNotExist:
            pass

        resposta = {
            'prediction': prediction,
            'nivel_risco': nivel_predito,
            'probability': probabilidade_max,
            'probabilidades': probabilidades,
        }

        if predicao_obj:
            resposta['predicao_id'] = predicao_obj.id
            resposta['score_prioridade'] = predicao_obj.score_prioridade

        return Response(resposta)

    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _extrair_features_do_questionario(usuario):
    """
    Tenta extrair features a partir das respostas do questionário do funcionário.
    Mapeia as respostas do questionário para as features do modelo.
    """
    try:
        from questionarios.models import Resposta, Avaliacao

        funcionario = Funcionario.objects.get(usuario=usuario, ativo=True)

        # Pegar as respostas mais recentes do funcionário
        respostas = Resposta.objects.filter(
            funcionario=funcionario
        ).select_related('pergunta').order_by('-data_resposta')

        if not respostas.exists():
            return None

        # Mapeamento das perguntas do questionário para features do modelo
        # Os valores das respostas (1-5) são normalizados para escala 0-10
        features = {
            'Idade': funcionario.idade or 30,
            'Tempo Empresa (anos)': 1,
            'Estresse (0-10)': 5.0,
            'Burnout (0-10)': 5.0,
            'Satisfação (0-10)': 5.0,
            'Relacionamentos (0-10)': 5.0,
            'Carga Trabalho (0-10)': 5.0,
            'Equilíbrio V/T (0-10)': 5.0,
            'Autonomia (0-10)': 5.0,
            'Reconhecimento (0-10)': 5.0,
            'Comunicação Gestor (0-10)': 5.0,
            'Segurança Psicológica (0-10)': 5.0,
            'Suporte Pares (0-10)': 5.0,
            'Clareza de Papel (0-10)': 5.0,
            'Ausências (dias)': 0,
            'Horas Extras/semana': 0,
        }

        # Normalizar respostas (1-5) para escala (0-10)
        for resp in respostas:
            valor_normalizado = (resp.valor - 1) * 2.5  # 1->0, 2->2.5, 3->5, 4->7.5, 5->10
            texto = resp.pergunta.texto.lower()

            if 'estresse' in texto or 'estressado' in texto:
                features['Estresse (0-10)'] = valor_normalizado
            elif 'burnout' in texto or 'esgotamento' in texto or 'exaust' in texto:
                features['Burnout (0-10)'] = valor_normalizado
            elif 'satisf' in texto:
                features['Satisfação (0-10)'] = valor_normalizado
            elif 'relacionamento' in texto or 'colegas' in texto:
                features['Relacionamentos (0-10)'] = valor_normalizado
            elif 'carga' in texto or 'sobrecarga' in texto:
                features['Carga Trabalho (0-10)'] = valor_normalizado
            elif 'equilíbrio' in texto or 'vida pessoal' in texto:
                features['Equilíbrio V/T (0-10)'] = valor_normalizado
            elif 'autonomia' in texto or 'liberdade' in texto:
                features['Autonomia (0-10)'] = valor_normalizado
            elif 'reconhecimento' in texto or 'valoriz' in texto:
                features['Reconhecimento (0-10)'] = valor_normalizado
            elif 'comunicação' in texto or 'gestor' in texto or 'chefia' in texto:
                features['Comunicação Gestor (0-10)'] = valor_normalizado
            elif 'segurança' in texto or 'protegido' in texto:
                features['Segurança Psicológica (0-10)'] = valor_normalizado
            elif 'suporte' in texto or 'apoio' in texto:
                features['Suporte Pares (0-10)'] = valor_normalizado
            elif 'clareza' in texto or 'papel' in texto or 'função' in texto:
                features['Clareza de Papel (0-10)'] = valor_normalizado

        # Calcular tempo de empresa
        if funcionario.data_admissao:
            from datetime import date
            hoje = date.today()
            diff = (hoje - funcionario.data_admissao).days / 365.25
            features['Tempo Empresa (anos)'] = round(diff, 1)

        return features

    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════
#  FILA DE PRIORIDADE PARA PSICÓLOGOS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fila_prioridade(request):
    """
    Retorna a fila de prioridade para o psicólogo.
    Funcionários são ordenados pelo score de prioridade (maior = mais urgente).

    Filtros (query params):
        - nivel: 'Crítico', 'Alto', 'Médio', 'Baixo'
        - empresa_id: ID da empresa
        - atendido: 'true' ou 'false'
        - departamento: nome do departamento
    """
    try:
        # Verificar se é psicólogo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            # Empresas também podem ver a fila
            try:
                empresa = Empresa.objects.get(usuario=request.user)
                return _fila_empresa(request, empresa)
            except Empresa.DoesNotExist:
                return Response(
                    {'erro': 'Apenas psicólogos e empresas podem acessar a fila de prioridade.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Filtros
        nivel = request.query_params.get('nivel')
        empresa_id = request.query_params.get('empresa_id')
        atendido = request.query_params.get('atendido')
        departamento = request.query_params.get('departamento')

        # ── Escopo por empresa: cada psicólogo só acessa os funcionários das
        #    empresas que ele acompanha (psicologo.empresas_acompanhadas).
        #    Isso garante que cada empresa tenha o SEU psicólogo, vinculado pelo
        #    id da empresa, e que um psicólogo nunca veja dados de outra empresa.
        empresas_do_psicologo = psicologo.empresas_acompanhadas.all()

        # Buscar última predição de cada funcionário (não atendidas por padrão)
        predicoes = Predicao.objects.select_related(
            'funcionario', 'funcionario__usuario', 'funcionario__empresa'
        ).filter(
            funcionario__empresa__in=empresas_do_psicologo
        ).order_by('-score_prioridade', '-data_predicao')

        # ── Regra da fila: só entram casos que exigem ação do psicólogo,
        #    do nível "Atenção" (Médio) até "Crítico". O nível "Baixo" (sem
        #    risco significativo) NÃO aparece na fila de prioridade.
        NIVEIS_FILA = ['Médio', 'Alto', 'Crítico']
        predicoes = predicoes.filter(nivel_risco_predito__in=NIVEIS_FILA)

        # Filtros
        if nivel and nivel in NIVEIS_FILA:
            predicoes = predicoes.filter(nivel_risco_predito=nivel)
        elif nivel:
            predicoes = predicoes.none()  # nível fora do escopo da fila
        if empresa_id:
            predicoes = predicoes.filter(funcionario__empresa_id=empresa_id)
        if departamento:
            predicoes = predicoes.filter(
                funcionario__departamento__icontains=departamento
            )
        if atendido is not None:
            atendido_bool = atendido.lower() == 'true'
            predicoes = predicoes.filter(atendido=atendido_bool)
        else:
            predicoes = predicoes.filter(atendido=False)

        # Pegar apenas a última predição por funcionário
        vistos = set()
        fila = []
        for pred in predicoes:
            if pred.funcionario_id not in vistos:
                vistos.add(pred.funcionario_id)
                fila.append({
                    'predicao_id': pred.id,
                    'funcionario_id': pred.funcionario.id,
                    'funcionario_nome': pred.funcionario.usuario.get_full_name(),
                    'empresa_nome': pred.funcionario.empresa.razao_social,
                    'departamento': pred.funcionario.departamento,
                    'cargo': pred.funcionario.cargo,
                    'nivel_risco': pred.nivel_risco_predito,
                    'probabilidade': pred.probabilidade,
                    'score_prioridade': pred.score_prioridade,
                    'data_predicao': pred.data_predicao,
                    'atendido': pred.atendido,
                    'probabilidades': pred.probabilidades_detalhadas,
                })

        # Contadores para resumo
        contagem_niveis = {}
        for item in fila:
            nivel_item = item['nivel_risco']
            contagem_niveis[nivel_item] = contagem_niveis.get(nivel_item, 0) + 1

        return Response({
            'total': len(fila),
            'resumo_niveis': contagem_niveis,
            'fila': fila,
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _fila_empresa(request, empresa):
    """Retorna a fila de prioridade filtrada para a empresa."""
    funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)

    predicoes = Predicao.objects.filter(
        funcionario__in=funcionarios,
        atendido=False
    ).select_related(
        'funcionario', 'funcionario__usuario'
    ).order_by('-score_prioridade', '-data_predicao')

    # Fila vai apenas de "Atenção" (Médio) até "Crítico"; "Baixo" fica de fora.
    NIVEIS_FILA = ['Médio', 'Alto', 'Crítico']
    predicoes = predicoes.filter(nivel_risco_predito__in=NIVEIS_FILA)

    nivel = request.query_params.get('nivel')
    departamento = request.query_params.get('departamento')

    if nivel and nivel in NIVEIS_FILA:
        predicoes = predicoes.filter(nivel_risco_predito=nivel)
    elif nivel:
        predicoes = predicoes.none()
    if departamento:
        predicoes = predicoes.filter(
            funcionario__departamento__icontains=departamento
        )

    vistos = set()
    fila = []
    for pred in predicoes:
        if pred.funcionario_id not in vistos:
            vistos.add(pred.funcionario_id)
            fila.append({
                'predicao_id': pred.id,
                'funcionario_id': pred.funcionario.id,
                'funcionario_nome': pred.funcionario.usuario.get_full_name(),
                'departamento': pred.funcionario.departamento,
                'cargo': pred.funcionario.cargo,
                'nivel_risco': pred.nivel_risco_predito,
                'probabilidade': pred.probabilidade,
                'score_prioridade': pred.score_prioridade,
                'data_predicao': pred.data_predicao,
            })

    contagem = {}
    for item in fila:
        n = item['nivel_risco']
        contagem[n] = contagem.get(n, 0) + 1

    return Response({
        'total': len(fila),
        'resumo_niveis': contagem,
        'fila': fila,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_atendido(request, predicao_id):
    """
    Psicólogo marca uma predição como atendida na fila de prioridade.

    Body JSON:
    {
        "observacoes": "Paciente encaminhado para acompanhamento semanal."
    }
    """
    try:
        psicologo = Psicologo.objects.get(usuario=request.user)

        predicao = Predicao.objects.get(id=predicao_id)
        predicao.atendido = True
        predicao.data_atendimento = timezone.now()
        predicao.psicologo_responsavel = psicologo
        predicao.observacoes_psicologo = request.data.get('observacoes', '')
        predicao.save()

        registrar_log(
            request, 'UPDATE', 'Predicao', predicao.id,
            f'Predição #{predicao.id} marcada como atendida pelo psicólogo '
            f'{psicologo.usuario.get_full_name()}'
        )

        return Response({
            'mensagem': 'Predição marcada como atendida com sucesso!',
            'predicao_id': predicao.id,
            'atendido': True,
            'data_atendimento': predicao.data_atendimento,
        })

    except Psicologo.DoesNotExist:
        return Response(
            {'erro': 'Apenas psicólogos podem marcar atendimentos.'},
            status=status.HTTP_403_FORBIDDEN
        )
    except Predicao.DoesNotExist:
        return Response(
            {'erro': 'Predição não encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
#  ENDPOINTS DE INFORMAÇÕES DO MODELO
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([AllowAny])
def info_modelo(request):
    """Retorna informações sobre o modelo treinado e métricas de avaliação."""
    try:
        repo = ModelRepository()
        info = repo.obter_info_modelo()
        return Response(info)
    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_predicoes(request):
    """Retorna as predições do funcionário logado."""
    try:
        funcionario = Funcionario.objects.get(usuario=request.user, ativo=True)

        predicoes = Predicao.objects.filter(
            funcionario=funcionario
        ).order_by('-data_predicao')

        data = []
        for pred in predicoes:
            data.append({
                'id': pred.id,
                'nivel_risco': pred.nivel_risco_predito,
                'probabilidade': pred.probabilidade,
                'score_prioridade': pred.score_prioridade,
                'data_predicao': pred.data_predicao,
                'atendido': pred.atendido,
                'data_atendimento': pred.data_atendimento,
                'observacoes': pred.observacoes_psicologo if pred.atendido else None,
                'probabilidades': pred.probabilidades_detalhadas,
            })

        return Response({
            'total': len(data),
            'predicoes': data,
        })

    except Funcionario.DoesNotExist:
        return Response(
            {'erro': 'Apenas funcionários podem ver suas predições.'},
            status=status.HTTP_403_FORBIDDEN
        )
    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_ml(request):
    """
    Dashboard com estatísticas de ML para empresa ou psicólogo.
    Mostra distribuição de predições, scores e tendências.
    """
    try:
        # Verificar tipo de usuário
        predicoes_qs = Predicao.objects.all()

        if request.user.tipo == 'empresa':
            empresa = Empresa.objects.get(usuario=request.user)
            funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)
            predicoes_qs = predicoes_qs.filter(funcionario__in=funcionarios)
        elif request.user.tipo == 'psicologo':
            pass  # Psicólogo vê tudo
        else:
            return Response({'erro': 'Acesso negado'}, status=403)

        total_predicoes = predicoes_qs.count()
        total_atendidos = predicoes_qs.filter(atendido=True).count()
        total_pendentes = predicoes_qs.filter(atendido=False).count()

        # Distribuição por nível de risco
        dist_risco = list(
            predicoes_qs.values('nivel_risco_predito')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        # Score médio de prioridade por nível
        from django.db.models import Avg
        score_medio = list(
            predicoes_qs.values('nivel_risco_predito')
            .annotate(score_medio=Avg('score_prioridade'))
            .order_by('-score_medio')
        )

        return Response({
            'total_predicoes': total_predicoes,
            'total_atendidos': total_atendidos,
            'total_pendentes': total_pendentes,
            'distribuicao_risco': dist_risco,
            'score_medio_por_nivel': score_medio,
        })

    except Empresa.DoesNotExist:
        return Response({'erro': 'Empresa não encontrada'}, status=403)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)
