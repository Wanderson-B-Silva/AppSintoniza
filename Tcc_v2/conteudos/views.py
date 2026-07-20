from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Conteudo


def _serialize_conteudo(c):
    return {
        'id': c.id, 'titulo': c.titulo, 'tipo': c.tipo,
        'tipo_display': c.get_tipo_display(), 'categoria': c.categoria,
        'categoria_display': c.get_categoria_display(), 'descricao': c.descricao,
        'autor': c.autor, 'url': c.url, 'duracao': c.duracao,
        'imagem_url': c.imagem_url, 'destaque': c.destaque, 'criado_em': c.criado_em,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_conteudos(request):
    tipo = request.query_params.get('tipo')
    categoria = request.query_params.get('categoria')
    busca = request.query_params.get('busca')
    qs = Conteudo.objects.filter(ativo=True)
    if tipo:
        qs = qs.filter(tipo=tipo)
    if categoria:
        qs = qs.filter(categoria=categoria)
    if busca:
        qs = qs.filter(titulo__icontains=busca)
    return Response([_serialize_conteudo(c) for c in qs])


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_videos(request):
    return Response([_serialize_conteudo(c) for c in Conteudo.objects.filter(ativo=True, tipo='video')])


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_livros(request):
    return Response([_serialize_conteudo(c) for c in Conteudo.objects.filter(ativo=True, tipo='livro')])


@api_view(['GET'])
@permission_classes([AllowAny])
def detalhe_conteudo(request, conteudo_id):
    try:
        return Response(_serialize_conteudo(Conteudo.objects.get(id=conteudo_id, ativo=True)))
    except Conteudo.DoesNotExist:
        return Response({'erro': 'Conteúdo não encontrado'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_conteudo(request):
    if request.user.tipo not in ('psicologo', 'empresa'):
        return Response({'erro': 'Sem permissão'}, status=403)
    dados = request.data
    for campo in ['titulo', 'tipo', 'descricao']:
        if not dados.get(campo):
            return Response({'erro': f'Campo obrigatório: {campo}'}, status=400)
    conteudo = Conteudo.objects.create(
        titulo=dados['titulo'], tipo=dados['tipo'],
        categoria=dados.get('categoria', 'outros'), descricao=dados['descricao'],
        autor=dados.get('autor', ''), url=dados.get('url', ''),
        duracao=dados.get('duracao', ''), imagem_url=dados.get('imagem_url', ''),
        destaque=dados.get('destaque', False),
    )
    from auditoria.utils import log_create
    log_create(request, 'Conteudo', conteudo.id, f'Conteúdo "{conteudo.titulo}" criado')
    return Response({'mensagem': 'Conteúdo criado com sucesso!', 'id': conteudo.id}, status=status.HTTP_201_CREATED)
