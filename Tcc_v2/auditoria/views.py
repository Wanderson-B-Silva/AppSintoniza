from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import LogAuditoria
from usuarios.models import Empresa


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_logs(request):
    """
    Lista os logs de auditoria.
    - Empresas veem logs de seus funcionários.
    - Psicólogos veem logs de avaliações.
    - Funcionários veem apenas seus próprios logs.
    """
    try:
        user = request.user

        # Filtros opcionais
        acao = request.query_params.get('acao')
        modelo = request.query_params.get('modelo')
        dias = request.query_params.get('dias', 30)
        pagina = int(request.query_params.get('pagina', 1))
        por_pagina = int(request.query_params.get('por_pagina', 50))

        data_inicio = timezone.now() - timedelta(days=int(dias))

        if user.tipo == 'empresa':
            try:
                empresa = Empresa.objects.get(usuario=user)
                funcionarios_ids = list(
                    empresa.funcionarios.filter(ativo=True)
                    .values_list('usuario_id', flat=True)
                )
                user_ids = [user.id] + funcionarios_ids
                logs = LogAuditoria.objects.filter(
                    usuario_id__in=user_ids,
                    data_hora__gte=data_inicio
                )
            except Empresa.DoesNotExist:
                return Response({'erro': 'Empresa não encontrada'}, status=403)

        elif user.tipo == 'psicologo':
            logs = LogAuditoria.objects.filter(
                data_hora__gte=data_inicio,
                modelo__in=['Avaliacao', 'Questionario', 'Resposta']
            )

        else:
            logs = LogAuditoria.objects.filter(
                usuario=user,
                data_hora__gte=data_inicio
            )

        if acao:
            logs = logs.filter(acao=acao)
        if modelo:
            logs = logs.filter(modelo__icontains=modelo)

        total = logs.count()
        offset = (pagina - 1) * por_pagina
        logs_page = logs[offset:offset + por_pagina]

        data = []
        for log in logs_page:
            data.append({
                'id': log.id,
                'usuario': log.usuario.username if log.usuario else 'Sistema',
                'usuario_nome': log.usuario.get_full_name() if log.usuario else 'Sistema',
                'acao': log.acao,
                'acao_display': log.get_acao_display(),
                'modelo': log.modelo,
                'objeto_id': log.objeto_id,
                'descricao': log.descricao,
                'ip_address': log.ip_address,
                'data_hora': log.data_hora,
            })

        return Response({
            'total': total,
            'pagina': pagina,
            'por_pagina': por_pagina,
            'total_paginas': (total + por_pagina - 1) // por_pagina,
            'logs': data
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalhe_log(request, log_id):
    """Retorna detalhes de um log específico, incluindo dados anteriores/novos."""
    try:
        user = request.user

        log = LogAuditoria.objects.get(id=log_id)

        # Verificar permissão
        if user.tipo == 'funcionario' and log.usuario != user:
            return Response({'erro': 'Acesso negado'}, status=403)

        return Response({
            'id': log.id,
            'usuario': log.usuario.username if log.usuario else 'Sistema',
            'usuario_nome': log.usuario.get_full_name() if log.usuario else 'Sistema',
            'acao': log.acao,
            'acao_display': log.get_acao_display(),
            'modelo': log.modelo,
            'objeto_id': log.objeto_id,
            'descricao': log.descricao,
            'dados_anteriores': log.dados_anteriores,
            'dados_novos': log.dados_novos,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'data_hora': log.data_hora,
        })

    except LogAuditoria.DoesNotExist:
        return Response({'erro': 'Log não encontrado'}, status=404)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resumo_auditoria(request):
    """Retorna um resumo estatístico dos logs de auditoria para o dashboard."""
    try:
        user = request.user
        dias = int(request.query_params.get('dias', 30))
        data_inicio = timezone.now() - timedelta(days=dias)

        if user.tipo != 'empresa':
            return Response({'erro': 'Apenas empresas podem acessar o resumo'}, status=403)

        empresa = Empresa.objects.get(usuario=user)
        funcionarios_ids = list(
            empresa.funcionarios.filter(ativo=True)
            .values_list('usuario_id', flat=True)
        )
        user_ids = [user.id] + funcionarios_ids

        logs = LogAuditoria.objects.filter(
            usuario_id__in=user_ids,
            data_hora__gte=data_inicio
        )

        from django.db.models import Count

        por_acao = list(logs.values('acao').annotate(total=Count('id')).order_by('-total'))
        por_modelo = list(logs.values('modelo').annotate(total=Count('id')).order_by('-total'))
        por_usuario = list(
            logs.values('usuario__username', 'usuario__first_name')
            .annotate(total=Count('id')).order_by('-total')[:10]
        )

        return Response({
            'periodo_dias': dias,
            'total_eventos': logs.count(),
            'por_acao': por_acao,
            'por_modelo': por_modelo,
            'usuarios_mais_ativos': por_usuario,
        })

    except Empresa.DoesNotExist:
        return Response({'erro': 'Empresa não encontrada'}, status=403)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)
