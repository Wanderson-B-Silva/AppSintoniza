from .models import LogAuditoria


def get_client_ip(request):
    """Extrai o IP real do cliente, considerando proxies."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def registrar_log(request, acao, modelo, objeto_id=None, descricao='',
                  dados_anteriores=None, dados_novos=None):
    """
    Registra um evento de auditoria no banco de dados.

    Parâmetros:
        request: HttpRequest do Django
        acao: string com a ação (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
        modelo: nome do modelo afetado (ex: 'Funcionario', 'Empresa')
        objeto_id: ID do objeto afetado (opcional)
        descricao: texto descritivo da ação
        dados_anteriores: dict com dados antes da alteração (opcional)
        dados_novos: dict com dados após a alteração (opcional)
    """
    usuario = None
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        usuario = request.user

    LogAuditoria.objects.create(
        usuario=usuario,
        acao=acao,
        modelo=modelo,
        objeto_id=str(objeto_id) if objeto_id else None,
        descricao=descricao,
        dados_anteriores=dados_anteriores,
        dados_novos=dados_novos,
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
    )


def log_create(request, modelo, objeto_id, descricao, dados_novos=None):
    registrar_log(request, 'CREATE', modelo, objeto_id, descricao, dados_novos=dados_novos)


def log_update(request, modelo, objeto_id, descricao, dados_anteriores=None, dados_novos=None):
    registrar_log(request, 'UPDATE', modelo, objeto_id, descricao,
                  dados_anteriores=dados_anteriores, dados_novos=dados_novos)


def log_delete(request, modelo, objeto_id, descricao, dados_anteriores=None):
    registrar_log(request, 'DELETE', modelo, objeto_id, descricao,
                  dados_anteriores=dados_anteriores)


def log_login(request, descricao):
    registrar_log(request, 'LOGIN', 'Usuario', descricao=descricao)


def log_lgpd(request, acao, descricao):
    registrar_log(request, acao, 'Usuario', descricao=descricao)
