from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Max, Count
from .models import Conversa, Mensagem
from usuarios.models import Usuario


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_conversas(request):
    """Lista todas as conversas do usuário logado."""
    user = request.user
    conversas = Conversa.objects.filter(
        Q(participante1=user) | Q(participante2=user),
        ativa=True
    ).select_related('participante1', 'participante2')

    data = []
    for c in conversas:
        outro = c.participante2 if c.participante1 == user else c.participante1
        ultima_msg = c.mensagens.order_by('-data_envio').first()
        nao_lidas = c.mensagens.filter(lida=False).exclude(remetente=user).count()

        data.append({
            'id': c.id,
            'participante_id': outro.id,
            'participante_nome': outro.get_full_name() or outro.username,
            'participante_tipo': outro.tipo,
            'ultima_mensagem': ultima_msg.conteudo[:100] if ultima_msg else '',
            'data_ultima_msg': ultima_msg.data_envio if ultima_msg else c.criada_em,
            'nao_lidas': nao_lidas,
        })

    data.sort(key=lambda x: x['data_ultima_msg'], reverse=True)
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_conversa(request):
    """Cria uma nova conversa com outro usuário."""
    participante_id = request.data.get('participante_id')
    if not participante_id:
        return Response({'erro': 'participante_id é obrigatório'}, status=400)

    try:
        outro = Usuario.objects.get(id=participante_id)
    except Usuario.DoesNotExist:
        return Response({'erro': 'Usuário não encontrado'}, status=404)

    if outro == request.user:
        return Response({'erro': 'Não pode conversar consigo mesmo'}, status=400)

    # Verifica se já existe conversa entre os dois
    existente = Conversa.objects.filter(
        (Q(participante1=request.user, participante2=outro) |
         Q(participante1=outro, participante2=request.user)),
        ativa=True
    ).first()

    if existente:
        return Response({'mensagem': 'Conversa já existe', 'conversa_id': existente.id})

    conversa = Conversa.objects.create(participante1=request.user, participante2=outro)

    from auditoria.utils import log_create
    log_create(request, 'Conversa', conversa.id,
               f'Conversa criada entre {request.user.username} e {outro.username}')

    return Response({
        'mensagem': 'Conversa criada com sucesso!',
        'conversa_id': conversa.id,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalhe_conversa(request, conversa_id):
    """Retorna as mensagens de uma conversa específica."""
    try:
        conversa = Conversa.objects.get(
            Q(participante1=request.user) | Q(participante2=request.user),
            id=conversa_id, ativa=True
        )
    except Conversa.DoesNotExist:
        return Response({'erro': 'Conversa não encontrada'}, status=404)

    # Marca mensagens como lidas
    conversa.mensagens.filter(lida=False).exclude(remetente=request.user).update(lida=True)

    mensagens = conversa.mensagens.select_related('remetente').all()
    data = [{
        'id': m.id,
        'remetente_id': m.remetente.id,
        'remetente_nome': m.remetente.get_full_name() or m.remetente.username,
        'conteudo': m.conteudo,
        'lida': m.lida,
        'data_envio': m.data_envio,
        'minha': m.remetente == request.user,
    } for m in mensagens]

    outro = conversa.participante2 if conversa.participante1 == request.user else conversa.participante1

    return Response({
        'conversa_id': conversa.id,
        'participante_nome': outro.get_full_name() or outro.username,
        'participante_tipo': outro.tipo,
        'mensagens': data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_mensagem(request, conversa_id):
    """Envia uma nova mensagem na conversa."""
    try:
        conversa = Conversa.objects.get(
            Q(participante1=request.user) | Q(participante2=request.user),
            id=conversa_id, ativa=True
        )
    except Conversa.DoesNotExist:
        return Response({'erro': 'Conversa não encontrada'}, status=404)

    conteudo = request.data.get('conteudo', '').strip()
    if not conteudo:
        return Response({'erro': 'Mensagem vazia'}, status=400)

    mensagem = Mensagem.objects.create(
        conversa=conversa, remetente=request.user, conteudo=conteudo
    )
    conversa.save()  # Atualiza atualizada_em

    return Response({
        'mensagem': 'Mensagem enviada com sucesso!',
        'id': mensagem.id,
        'data_envio': mensagem.data_envio,
    }, status=status.HTTP_201_CREATED)
