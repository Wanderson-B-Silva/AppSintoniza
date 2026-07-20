from django.db import models
from django.conf import settings


class Conversa(models.Model):
    """Conversa entre dois usuários (ex: funcionário e psicólogo)."""
    participante1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversas_como_p1'
    )
    participante2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversas_como_p2'
    )
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)
    ativa = models.BooleanField(default=True)

    class Meta:
        ordering = ['-atualizada_em']
        verbose_name = 'Conversa'
        verbose_name_plural = 'Conversas'

    def __str__(self):
        return f"Conversa #{self.id}: {self.participante1.username} <-> {self.participante2.username}"


class Mensagem(models.Model):
    """Mensagem individual dentro de uma conversa."""
    conversa = models.ForeignKey(Conversa, on_delete=models.CASCADE, related_name='mensagens')
    remetente = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mensagens_enviadas'
    )
    conteudo = models.TextField(verbose_name='Conteúdo')
    lida = models.BooleanField(default=False, verbose_name='Lida')
    data_envio = models.DateTimeField(auto_now_add=True, verbose_name='Data de envio')

    class Meta:
        ordering = ['data_envio']
        verbose_name = 'Mensagem'
        verbose_name_plural = 'Mensagens'

    def __str__(self):
        return f"Msg de {self.remetente.username} em {self.data_envio:%d/%m %H:%M}"
