# questionarios/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from .models import Questionario, Pergunta, Resposta, Avaliacao
from usuarios.models import Funcionario, Empresa
from .services import CalculadoraPontuacao
from auditoria.utils import log_create

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_questionarios(request):
    """
    View simples: retorna lista de questionários ativos
    """
    try:
        questionarios = Questionario.objects.filter(ativo=True)
        data = []
        
        for q in questionarios:
            data.append({
                'id': q.id,
                'titulo': q.titulo,
                'descricao': q.descricao,
                'total_perguntas': q.perguntas.count()
            })
        
        return Response(data)
    
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def perguntas_questionario(request, questionario_id):
    """
    Retorna todas as perguntas de um questionário
    """
    try:
        questionario = Questionario.objects.get(id=questionario_id, ativo=True)
        perguntas = questionario.perguntas.all().order_by('ordem')
        
        data = []
        for p in perguntas:
            data.append({
                'id': p.id,
                'texto': p.texto,
                'ordem': p.ordem,
                'opcoes': [
                    {'valor': 1, 'label': 'Nunca'},
                    {'valor': 2, 'label': 'Raramente'},
                    {'valor': 3, 'label': 'Às vezes'},
                    {'valor': 4, 'label': 'Frequentemente'},
                    {'valor': 5, 'label': 'Sempre'}
                ]
            })
        
        return Response(data)
    
    except Questionario.DoesNotExist:
        return Response({'erro': 'Questionário não encontrado'}, status=404)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def salvar_respostas(request):
    """
    Salva as respostas do funcionário
    """
    try:
        # Verifica se o usuário é um funcionário
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response(
                {'erro': 'Apenas funcionários podem responder questionários'}, 
                status=403
            )
        
        # Pega dados da requisição
        respostas = request.data.get('respostas', [])
        questionario_id = request.data.get('questionario_id')
        
        if not respostas:
            return Response({'erro': 'Nenhuma resposta enviada'}, status=400)
        
        if not questionario_id:
            return Response({'erro': 'ID do questionário não informado'}, status=400)
        
        # Verifica se o questionário existe
        try:
            questionario = Questionario.objects.get(id=questionario_id, ativo=True)
        except Questionario.DoesNotExist:
            return Response({'erro': 'Questionário não encontrado'}, status=404)
        
        # Salva cada resposta
        pontuacao_total = 0
        respostas_criadas = []
        
        for item in respostas:
            pergunta_id = item.get('pergunta_id')
            valor = item.get('valor')
            
            try:
                pergunta = Pergunta.objects.get(id=pergunta_id, questionario=questionario)
                
                # Cria ou atualiza resposta
                resposta, created = Resposta.objects.update_or_create(
                    funcionario=funcionario,
                    pergunta=pergunta,
                    defaults={
                        'valor': valor, 
                        'data_resposta': timezone.now()
                    }
                )
                respostas_criadas.append(resposta)
                
                # Calcula pontuação (valor * peso)
                pontuacao_total += valor * pergunta.peso
                
            except Pergunta.DoesNotExist:
                return Response(
                    {'erro': f'Pergunta {pergunta_id} não encontrada no questionário'}, 
                    status=400
                )
        
        # Calcula nível usando a classe CalculadoraPontuacao
        nivel = CalculadoraPontuacao.calcular_nivel(pontuacao_total)
        recomendacoes = CalculadoraPontuacao.gerar_recomendacoes(nivel)
        
        # Salva avaliação
        avaliacao = Avaliacao.objects.create(
            funcionario=funcionario,
            pontuacao_total=pontuacao_total,
            nivel=nivel,
            recomendacoes=recomendacoes
        )

        log_create(request, 'Avaliacao', avaliacao.id,
                   f'Avaliação criada para {funcionario.usuario.get_full_name()} - Nível: {nivel} - Pontuação: {pontuacao_total}',
                   dados_novos={'nivel': nivel, 'pontuacao': pontuacao_total})

        # ─── INTEGRAÇÃO COM MACHINE LEARNING ───
        # Após salvar as respostas, chama o modelo de ML para gerar predição
        # e inserir o funcionário na fila de prioridade do psicólogo
        predicao_ml = None
        try:
            from predicao.views import _carregar_modelo, _extrair_features_do_questionario
            from predicao.models import Predicao
            import pandas as pd

            artefatos = _carregar_modelo()
            if artefatos:
                modelo = artefatos['modelo']
                preprocessador = artefatos['preprocessador']
                features_info = artefatos.get('features_info', {})
                feature_names = features_info.get('features', [])

                features_dict = _extrair_features_do_questionario(request.user)
                if features_dict:
                    df_input = pd.DataFrame([features_dict])
                    df_input = df_input[feature_names]
                    X_proc = preprocessador.transform(df_input)

                    pred_code = int(modelo.predict(X_proc)[0])
                    nivel_ml = preprocessador.decodificar_target(pred_code)

                    prob_max = 0.0
                    probabilidades = None
                    if hasattr(modelo, 'predict_proba'):
                        proba = modelo.predict_proba(X_proc)[0]
                        labels_inv = preprocessador.MAPA_RISCO_INVERSO
                        probabilidades = {
                            labels_inv.get(i, f'Classe {i}'): round(float(p), 4)
                            for i, p in enumerate(proba)
                        }
                        prob_max = round(float(max(proba)), 4)

                    predicao_obj = Predicao.objects.create(
                        funcionario=funcionario,
                        nivel_risco_predito=nivel_ml,
                        probabilidade=prob_max,
                        probabilidades_detalhadas=probabilidades,
                        features_entrada=features_dict,
                    )
                    predicao_obj.calcular_score_prioridade()
                    predicao_obj.save()

                    predicao_ml = {
                        'predicao_id': predicao_obj.id,
                        'nivel_risco_ml': nivel_ml,
                        'probabilidade': prob_max,
                        'score_prioridade': predicao_obj.score_prioridade,
                    }
        except Exception as e_ml:
            # Se o ML falhar, não impede o fluxo normal
            predicao_ml = {'aviso': f'Predição ML não disponível: {str(e_ml)}'}
        
        resposta_data = {
            'mensagem': 'Respostas salvas com sucesso!',
            'id_avaliacao': avaliacao.id,
            'pontuacao_total': pontuacao_total,
            'nivel': nivel,
            'recomendacoes': recomendacoes,
            'data_avaliacao': avaliacao.data_avaliacao,
        }
        if predicao_ml:
            resposta_data['predicao_ml'] = predicao_ml

        return Response(resposta_data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_avaliacoes(request):
    """
    Retorna todas as avaliações do funcionário logado
    """
    try:
        # Verifica se o usuário é um funcionário
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response(
                {'erro': 'Apenas funcionários podem ver avaliações'}, 
                status=403
            )
        
        # Busca todas as avaliações do funcionário
        avaliacoes = Avaliacao.objects.filter(
            funcionario=funcionario
        ).order_by('-data_avaliacao')
        
        data = []
        for av in avaliacoes:
            data.append({
                'id': av.id,
                'data_avaliacao': av.data_avaliacao,
                'pontuacao_total': av.pontuacao_total,
                'nivel': av.nivel,
                'recomendacoes': av.recomendacoes
            })
        
        return Response({
            'total': len(data),
            'avaliacoes': data
        })
    
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ultima_avaliacao(request):
    """
    Retorna a última avaliação do funcionário
    """
    try:
        # Verifica se o usuário é um funcionário
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response(
                {'erro': 'Apenas funcionários podem ver avaliações'}, 
                status=403
            )
        
        # Busca a última avaliação
        ultima = Avaliacao.objects.filter(
            funcionario=funcionario
        ).order_by('-data_avaliacao').first()
        
        if ultima:
            return Response({
                'id': ultima.id,
                'data_avaliacao': ultima.data_avaliacao,
                'pontuacao_total': ultima.pontuacao_total,
                'nivel': ultima.nivel,
                'recomendacoes': ultima.recomendacoes,
                'dias_desde_ultima': (timezone.now() - ultima.data_avaliacao).days
            })
        else:
            return Response({
                'mensagem': 'Nenhuma avaliação encontrada'
            }, status=404)
    
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def avaliacao_detalhe(request, avaliacao_id):
    """
    Retorna detalhes de uma avaliação específica
    """
    try:
        # Verifica se o usuário é um funcionário
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response(
                {'erro': 'Apenas funcionários podem ver avaliações'}, 
                status=403
            )
        
        # Busca a avaliação
        avaliacao = Avaliacao.objects.get(
            id=avaliacao_id,
            funcionario=funcionario
        )
        
        # Busca as respostas dessa avaliação
        # Nota: Isso é uma simplificação - idealmente você teria um campo
        # ligando respostas à avaliação, mas por enquanto vamos pegar as
        # respostas mais recentes até a data da avaliação
        respostas = Resposta.objects.filter(
            funcionario=funcionario,
            data_resposta__lte=avaliacao.data_avaliacao
        ).order_by('-data_resposta')[:10]  # Limita a 10 respostas
        
        respostas_data = []
        for r in respostas:
            respostas_data.append({
                'pergunta_id': r.pergunta.id,
                'pergunta_texto': r.pergunta.texto,
                'resposta': r.valor,
                'resposta_label': r.get_valor_display(),
                'data_resposta': r.data_resposta
            })
        
        return Response({
            'avaliacao': {
                'id': avaliacao.id,
                'data_avaliacao': avaliacao.data_avaliacao,
                'pontuacao_total': avaliacao.pontuacao_total,
                'nivel': avaliacao.nivel,
                'recomendacoes': avaliacao.recomendacoes
            },
            'respostas': respostas_data
        })
    
    except Avaliacao.DoesNotExist:
        return Response({'erro': 'Avaliação não encontrada'}, status=404)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estatisticas_empresa(request):
    """
    Retorna estatísticas da empresa para gestores/RH
    """
    try:
        # Verifica se o usuário é uma empresa
        try:
            empresa = Empresa.objects.get(usuario=request.user)
        except Empresa.DoesNotExist:
            return Response(
                {'erro': 'Apenas empresas podem ver estatísticas'}, 
                status=403
            )
        
        # Busca todos os funcionários da empresa
        funcionarios = Funcionario.objects.filter(empresa=empresa)
        total_funcionarios = funcionarios.count()
        
        # Estatísticas das avaliações
        avaliacoes_recentes = Avaliacao.objects.filter(
            funcionario__in=funcionarios
        ).order_by('-data_avaliacao')[:100]
        
        total_avaliacoes = avaliacoes_recentes.count()
        
        if total_avaliacoes > 0:
            # Contagem por nível
            nivel_bom = avaliacoes_recentes.filter(nivel='bom').count()
            nivel_medio = avaliacoes_recentes.filter(nivel='medio').count()
            nivel_risco = avaliacoes_recentes.filter(nivel='risco').count()
            
            # Média de pontuação
            media_pontuacao = sum(a.pontuacao_total for a in avaliacoes_recentes) / total_avaliacoes
            
            # Funcionários em risco (última avaliação)
            funcionarios_risco = []
            for func in funcionarios:
                ultima = Avaliacao.objects.filter(
                    funcionario=func
                ).order_by('-data_avaliacao').first()
                if ultima and ultima.nivel == 'risco':
                    funcionarios_risco.append({
                        'funcionario_id': func.id,
                        'nome': func.usuario.get_full_name(),
                        'data_avaliacao': ultima.data_avaliacao,
                        'pontuacao': ultima.pontuacao_total
                    })
        else:
            nivel_bom = nivel_medio = nivel_risco = 0
            media_pontuacao = 0
            funcionarios_risco = []
        
        return Response({
            'total_funcionarios': total_funcionarios,
            'total_avaliacoes': total_avaliacoes,
            'estatisticas': {
                'nivel_bom': nivel_bom,
                'nivel_medio': nivel_medio,
                'nivel_risco': nivel_risco,
                'media_pontuacao': round(media_pontuacao, 2)
            },
            'funcionarios_risco': funcionarios_risco
        })
    
    except Exception as e:
        return Response({'erro': str(e)}, status=500)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_questionario(request):
    """
    Psicólogo cria um novo questionário com perguntas
    """
    try:
        from usuarios.models import Psicologo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            return Response(
                {'erro': 'Apenas psicólogos podem criar questionários'},
                status=403
            )

        titulo = request.data.get('titulo')
        descricao = request.data.get('descricao', '')
        perguntas_data = request.data.get('perguntas', [])

        if not titulo:
            return Response({'erro': 'Título é obrigatório'}, status=400)

        if not perguntas_data or len(perguntas_data) == 0:
            return Response({'erro': 'Adicione pelo menos uma pergunta'}, status=400)

        questionario = Questionario.objects.create(
            titulo=titulo,
            descricao=descricao,
            ativo=True
        )

        for i, p in enumerate(perguntas_data):
            Pergunta.objects.create(
                questionario=questionario,
                texto=p.get('texto', ''),
                ordem=i + 1,
                peso=p.get('peso', 1)
            )

        return Response({
            'mensagem': 'Questionário criado com sucesso!',
            'id': questionario.id,
            'titulo': questionario.titulo,
            'total_perguntas': len(perguntas_data)
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_avaliacoes_psicologo(request):
    """
    Psicólogo vê as avaliações dos funcionários APENAS das empresas que ele
    acompanha (escopo por empresa). Nunca vê dados de outra empresa.
    """
    try:
        from usuarios.models import Psicologo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            return Response(
                {'erro': 'Apenas psicólogos podem ver avaliações'},
                status=403
            )

        empresas_do_psicologo = psicologo.empresas_acompanhadas.all()

        avaliacoes = Avaliacao.objects.select_related(
            'funcionario', 'funcionario__usuario', 'funcionario__empresa'
        ).filter(
            funcionario__empresa__in=empresas_do_psicologo
        ).order_by('-data_avaliacao')

        status_filter = request.query_params.get('status')

        data = []
        for av in avaliacoes:
            item = {
                'id': av.id,
                'funcionario_id': av.funcionario.id,
                'funcionario_nome': av.funcionario.usuario.get_full_name(),
                'empresa_nome': av.funcionario.empresa.razao_social,
                'data_avaliacao': av.data_avaliacao,
                'pontuacao_total': av.pontuacao_total,
                'nivel': av.nivel,
                'nivel_display': av.get_nivel_display(),
                'recomendacoes': av.recomendacoes,
            }
            data.append(item)

        if status_filter and status_filter != 'todos':
            data = [d for d in data if d['nivel'] == status_filter]

        return Response({
            'total': len(data),
            'avaliacoes': data
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalhe_avaliacao_psicologo(request, avaliacao_id):
    """
    Psicólogo vê detalhes de uma avaliação específica com respostas
    """
    try:
        from usuarios.models import Psicologo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            return Response(
                {'erro': 'Apenas psicólogos podem ver avaliações'},
                status=403
            )

        avaliacao = Avaliacao.objects.select_related(
            'funcionario', 'funcionario__usuario', 'funcionario__empresa'
        ).get(id=avaliacao_id)

        # Escopo por empresa: o psicólogo só acessa avaliações das suas empresas.
        if not psicologo.empresas_acompanhadas.filter(
            id=avaliacao.funcionario.empresa_id
        ).exists():
            return Response(
                {'erro': 'Esta avaliação não pertence a uma empresa que você acompanha.'},
                status=403
            )

        respostas = Resposta.objects.filter(
            funcionario=avaliacao.funcionario,
        ).select_related('pergunta', 'pergunta__questionario').order_by('pergunta__ordem')

        respostas_data = []
        for r in respostas:
            respostas_data.append({
                'pergunta_id': r.pergunta.id,
                'pergunta_texto': r.pergunta.texto,
                'questionario': r.pergunta.questionario.titulo,
                'resposta': r.valor,
                'resposta_label': r.get_valor_display(),
                'peso': r.pergunta.peso,
            })

        # Parecer já emitido por ESTE psicólogo (se houver)
        from .models import ParecerPsicologo
        parecer_data = None
        parecer = ParecerPsicologo.objects.filter(
            avaliacao=avaliacao, psicologo=psicologo
        ).first()
        if parecer:
            parecer_data = {
                'id': parecer.id,
                'parecer': parecer.parecer,
                'nivel_atencao': parecer.nivel_atencao,
                'nivel_atencao_display': parecer.get_nivel_atencao_display(),
                'encaminhamento': parecer.encaminhamento,
                'necessita_acompanhamento': parecer.necessita_acompanhamento,
                'criado_em': parecer.criado_em,
            }

        return Response({
            'avaliacao': {
                'id': avaliacao.id,
                'funcionario_nome': avaliacao.funcionario.usuario.get_full_name(),
                'data_avaliacao': avaliacao.data_avaliacao,
                'pontuacao_total': avaliacao.pontuacao_total,
                'nivel': avaliacao.nivel,
                'nivel_display': avaliacao.get_nivel_display(),
                'recomendacoes': avaliacao.recomendacoes,
            },
            'respostas': respostas_data,
            'parecer': parecer_data,
        })

    except Avaliacao.DoesNotExist:
        return Response({'erro': 'Avaliação não encontrada'}, status=404)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def teste_questionarios(request):
    """View de teste para ver se o app está funcionando"""
    return Response({
        'mensagem': 'App questionarios está funcionando!',
        'endpoints_disponiveis': [
            '/api/questionarios/listar/',
            '/api/questionarios/1/perguntas/',
            '/api/questionarios/responder/',
            '/api/questionarios/minhas-avaliacoes/',
        ]
    })

# ─────────────────────────────────────────────────────────────
# PARECER DO PSICÓLOGO (psicólogo AVALIA os questionários respondidos)
# ─────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_parecer(request, avaliacao_id):
    """
    Psicólogo registra (ou atualiza) um parecer clínico sobre uma avaliação.
    """
    try:
        from usuarios.models import Psicologo
        from .models import ParecerPsicologo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            return Response({'erro': 'Apenas psicólogos podem emitir pareceres'}, status=403)

        try:
            avaliacao = Avaliacao.objects.select_related('funcionario').get(id=avaliacao_id)
        except Avaliacao.DoesNotExist:
            return Response({'erro': 'Avaliação não encontrada'}, status=404)

        # Escopo por empresa: só emite parecer para funcionário das suas empresas.
        if not psicologo.empresas_acompanhadas.filter(
            id=avaliacao.funcionario.empresa_id
        ).exists():
            return Response(
                {'erro': 'Esta avaliação não pertence a uma empresa que você acompanha.'},
                status=403
            )

        texto = (request.data.get('parecer') or '').strip()
        if not texto:
            return Response({'erro': 'O parecer não pode estar vazio'}, status=400)

        nivel_atencao = request.data.get('nivel_atencao', 'rotina')
        encaminhamento = request.data.get('encaminhamento', '')
        necessita = bool(request.data.get('necessita_acompanhamento', False))

        parecer, created = ParecerPsicologo.objects.update_or_create(
            avaliacao=avaliacao,
            psicologo=psicologo,
            defaults={
                'parecer': texto,
                'nivel_atencao': nivel_atencao,
                'encaminhamento': encaminhamento,
                'necessita_acompanhamento': necessita,
            }
        )

        try:
            log_create(request, 'ParecerPsicologo', parecer.id,
                       f'Parecer {"criado" if created else "atualizado"} para avaliação #{avaliacao.id}')
        except Exception:
            pass

        return Response({
            'mensagem': 'Parecer salvo com sucesso!' if created else 'Parecer atualizado com sucesso!',
            'id': parecer.id,
            'criado': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pareceres_psicologo(request):
    """
    Lista todos os pareceres emitidos pelo psicólogo logado.
    """
    try:
        from usuarios.models import Psicologo
        from .models import ParecerPsicologo
        try:
            psicologo = Psicologo.objects.get(usuario=request.user)
        except Psicologo.DoesNotExist:
            return Response({'erro': 'Apenas psicólogos têm pareceres'}, status=403)

        pareceres = ParecerPsicologo.objects.filter(
            psicologo=psicologo
        ).select_related('avaliacao', 'avaliacao__funcionario', 'avaliacao__funcionario__usuario')

        data = []
        for p in pareceres:
            data.append({
                'id': p.id,
                'avaliacao_id': p.avaliacao_id,
                'funcionario_nome': p.avaliacao.funcionario.usuario.get_full_name(),
                'nivel_atencao': p.nivel_atencao,
                'nivel_atencao_display': p.get_nivel_atencao_display(),
                'parecer': p.parecer,
                'encaminhamento': p.encaminhamento,
                'necessita_acompanhamento': p.necessita_acompanhamento,
                'criado_em': p.criado_em,
            })

        return Response({'total': len(data), 'pareceres': data})

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# CHECK-IN DE HUMOR (funcionário) — registra e consulta histórico
# ─────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_checkin(request):
    """Funcionário registra o humor do dia."""
    try:
        from .models import CheckinHumor
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response({'erro': 'Apenas funcionários podem registrar humor'}, status=403)

        humor = request.data.get('humor')
        if not humor:
            return Response({'erro': 'Informe o humor'}, status=400)

        notas_por_humor = {'bem': 5, 'motivado': 5, 'cansado': 3, 'triste': 2, 'ansioso': 2}
        nota = request.data.get('nota', notas_por_humor.get(humor, 3))

        checkin = CheckinHumor.objects.create(
            funcionario=funcionario,
            humor=humor,
            nota=nota,
            observacao=request.data.get('observacao', ''),
        )

        return Response({
            'mensagem': 'Check-in registrado! Obrigado por compartilhar como se sente.',
            'id': checkin.id,
            'humor': checkin.humor,
            'nota': checkin.nota,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historico_checkin(request):
    """Histórico de check-ins de humor do funcionário (últimos 30) com
    indicadores de acompanhamento: sequência de dias (streak), série dos
    últimos 7 dias e humor predominante."""
    try:
        from .models import CheckinHumor
        from datetime import timedelta
        try:
            funcionario = Funcionario.objects.get(usuario=request.user)
        except Funcionario.DoesNotExist:
            return Response({'erro': 'Apenas funcionários têm histórico'}, status=403)

        checkins = CheckinHumor.objects.filter(funcionario=funcionario)[:30]
        data = [{
            'id': c.id,
            'humor': c.humor,
            'humor_display': c.get_humor_display(),
            'nota': c.nota,
            'observacao': c.observacao,
            'data': c.data,
        } for c in checkins]

        media = round(sum(c['nota'] for c in data) / len(data), 1) if data else 0

        # ── Conjunto de dias (local) que tiveram pelo menos um check-in ──
        todos = CheckinHumor.objects.filter(funcionario=funcionario)
        dias_com_checkin = set(
            timezone.localtime(c.data).date() for c in todos
        )

        # Streak: dias consecutivos com check-in, contando a partir de hoje
        # (ou de ontem, para não "quebrar" antes do check-in de hoje).
        hoje = timezone.localdate()
        streak = 0
        if hoje in dias_com_checkin:
            cursor = hoje
        elif (hoje - timedelta(days=1)) in dias_com_checkin:
            cursor = hoje - timedelta(days=1)
        else:
            cursor = None
        while cursor is not None and cursor in dias_com_checkin:
            streak += 1
            cursor = cursor - timedelta(days=1)

        # Série dos últimos 7 dias (média de nota por dia; None se sem registro)
        ROTULOS_DIA = {0: 'Seg', 1: 'Ter', 2: 'Qua', 3: 'Qui', 4: 'Sex', 5: 'Sáb', 6: 'Dom'}
        serie_7dias = []
        for i in range(6, -1, -1):
            dia = hoje - timedelta(days=i)
            notas_do_dia = [
                c.nota for c in todos
                if timezone.localtime(c.data).date() == dia
            ]
            media_dia = round(sum(notas_do_dia) / len(notas_do_dia), 1) if notas_do_dia else None
            serie_7dias.append({
                'dia': dia.isoformat(),
                'rotulo': ROTULOS_DIA[dia.weekday()],
                'media': media_dia,
            })

        # Humor predominante
        contagem = {}
        for c in data:
            contagem[c['humor']] = contagem.get(c['humor'], 0) + 1
        humor_predominante = max(contagem, key=contagem.get) if contagem else None

        return Response({
            'total': len(data),
            'media_bem_estar': media,
            'streak': streak,
            'total_dias_registrados': len(dias_com_checkin),
            'humor_predominante': humor_predominante,
            'serie_7dias': serie_7dias,
            'checkins': data,
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def humor_empresa(request):
    """
    Resumo agregado dos check-ins de humor dos funcionários da empresa logada.
    Permite ao gestor ver o 'clima emocional' da equipe (sem identificar pessoas).
    """
    try:
        from .models import CheckinHumor
        try:
            empresa = Empresa.objects.get(usuario=request.user)
        except Empresa.DoesNotExist:
            return Response({'erro': 'Apenas empresas podem ver este resumo'}, status=403)

        funcionarios = Funcionario.objects.filter(empresa=empresa)
        checkins = CheckinHumor.objects.filter(funcionario__in=funcionarios)

        total = checkins.count()
        contagem = {'bem': 0, 'motivado': 0, 'cansado': 0, 'triste': 0, 'ansioso': 0}
        soma_nota = 0
        for c in checkins:
            if c.humor in contagem:
                contagem[c.humor] += 1
            soma_nota += c.nota

        media = round(soma_nota / total, 1) if total else 0

        # percentuais por humor
        distribuicao = []
        rotulos = {'bem': 'Bem', 'motivado': 'Motivado', 'cansado': 'Cansado',
                   'triste': 'Triste', 'ansioso': 'Ansioso'}
        for chave, qtd in contagem.items():
            distribuicao.append({
                'humor': chave,
                'label': rotulos[chave],
                'quantidade': qtd,
                'percentual': round(qtd / total * 100, 1) if total else 0,
            })

        return Response({
            'total_checkins': total,
            'media_bem_estar': media,
            'distribuicao': distribuicao,
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)
