from django.db import models
from django.conf import settings


class LogAuditoria(models.Model):
    """
    Modelo de auditoria que registra todas as operações realizadas no sistema.
    Atende ao requisito de rastreabilidade e conformidade com a LGPD.
    """

    ACOES = (
        ('CREATE', 'Criação'),
        ('READ', 'Leitura'),
        ('UPDATE', 'Atualização'),
        ('DELETE', 'Exclusão'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('EXPORT', 'Exportação de Dados'),
        ('LGPD_ACEITE', 'Aceite LGPD'),
        ('LGPD_EXCLUSAO', 'Solicitação de Exclusão LGPD'),
        ('RESET_SENHA', 'Redefinição de Senha'),
    )

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_auditoria',
        verbose_name='Usuário'
    )
    acao = models.CharField(
        max_length=20,
        choices=ACOES,
        verbose_name='Ação realizada'
    )
    modelo = models.CharField(
        max_length=100,
        verbose_name='Modelo/Entidade afetada',
        help_text='Nome do modelo Django que foi alterado'
    )
    objeto_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='ID do objeto'
    )
    descricao = models.TextField(
        verbose_name='Descrição da ação',
        help_text='Detalhes sobre o que foi feito'
    )
    dados_anteriores = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Dados anteriores',
        help_text='Snapshot dos dados antes da alteração (JSON)'
    )
    dados_novos = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Dados novos',
        help_text='Snapshot dos dados após a alteração (JSON)'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Endereço IP'
    )
    user_agent = models.TextField(
        blank=True,
        default='',
        verbose_name='User Agent'
    )
    data_hora = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data e hora'
    )

    class Meta:
        ordering = ['-data_hora']
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'
        indexes = [
            models.Index(fields=['usuario', '-data_hora']),
            models.Index(fields=['acao', '-data_hora']),
            models.Index(fields=['modelo', '-data_hora']),
        ]

    def __str__(self):
        usuario_str = self.usuario.username if self.usuario else 'Sistema'
        return f"[{self.data_hora:%d/%m/%Y %H:%M}] {usuario_str} - {self.get_acao_display()} em {self.modelo}"
