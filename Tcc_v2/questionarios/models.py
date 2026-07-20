# questionarios/models.py
from django.db import models
from usuarios.models import Funcionario

class Questionario(models.Model):
    """
    Questionário de saúde mental
    """
    titulo = models.CharField(
        max_length=200,
        verbose_name="Título do questionário"
    )
    descricao = models.TextField(
        blank=True,
        verbose_name="Descrição"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Está ativo?"
    )
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data de criação"
    )
    
    def __str__(self):
        return self.titulo

class Pergunta(models.Model):
    """
    Cada pergunta do questionário
    """
    questionario = models.ForeignKey(
        Questionario, 
        on_delete=models.CASCADE,
        related_name='perguntas'
    )
    texto = models.TextField(
        verbose_name="Texto da pergunta"
    )
    ordem = models.IntegerField(
        default=0,
        verbose_name="Ordem de exibição"
    )
    peso = models.IntegerField(
        default=1,
        verbose_name="Peso na pontuação (1-5)",
        help_text="Quanto mais importante, maior o peso"
    )
    
    class Meta:
        ordering = ['ordem']
    
    def __str__(self):
        return f"{self.questionario.titulo[:20]} - Pergunta {self.ordem}"

class Resposta(models.Model):
    """
    Respostas dadas pelos funcionários
    """
    funcionario = models.ForeignKey(
        Funcionario, 
        on_delete=models.CASCADE,
        related_name='respostas'
    )
    pergunta = models.ForeignKey(
        Pergunta, 
        on_delete=models.CASCADE,
        related_name='respostas'
    )
    valor = models.IntegerField(
        choices=[(1, 'Nunca'), (2, 'Raramente'), (3, 'Às vezes'), 
                 (4, 'Frequentemente'), (5, 'Sempre')],
        verbose_name="Resposta"
    )
    data_resposta = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data da resposta"
    )
    
    class Meta:
        unique_together = ['funcionario', 'pergunta']  # Não pode responder mesma pergunta 2x
    
    def __str__(self):
        return f"Resposta de {self.funcionario} - {self.get_valor_display()}"

class Avaliacao(models.Model):
    """
    Resultado consolidado de uma avaliação
    """
    NIVEL_CHOICES = (
        ('bom', 'Bom - Nível saudável'),
        ('medio', 'Médio - Atenção necessária'),
        ('risco', 'Risco - Intervenção urgente'),
    )
    
    funcionario = models.ForeignKey(
        Funcionario, 
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )
    data_avaliacao = models.DateTimeField(
        auto_now_add=True
    )
    pontuacao_total = models.IntegerField(
        verbose_name="Pontuação total"
    )
    nivel = models.CharField(
        max_length=10,
        choices=NIVEL_CHOICES,
        verbose_name="Nível de saúde mental"
    )
    recomendacoes = models.TextField(
        blank=True,
        verbose_name="Recomendações geradas"
    )
    
    def __str__(self):
        return f"Avaliação de {self.funcionario} - {self.get_nivel_display()}"

class ParecerPsicologo(models.Model):
    """
    Parecer clínico do psicólogo sobre uma avaliação de um funcionário.
    Permite que o psicólogo AVALIE os questionários respondidos (não só crie),
    registrando uma análise profissional e um encaminhamento.
    """
    NIVEL_ATENCAO = (
        ('rotina', 'Rotina - Acompanhamento padrão'),
        ('acompanhar', 'Acompanhar - Reavaliar em breve'),
        ('urgente', 'Urgente - Intervenção imediata'),
    )

    avaliacao = models.ForeignKey(
        Avaliacao,
        on_delete=models.CASCADE,
        related_name='pareceres',
        verbose_name='Avaliação analisada'
    )
    psicologo = models.ForeignKey(
        'usuarios.Psicologo',
        on_delete=models.CASCADE,
        related_name='pareceres',
        verbose_name='Psicólogo responsável'
    )
    parecer = models.TextField(
        verbose_name='Parecer clínico',
        help_text='Análise profissional do psicólogo sobre a avaliação'
    )
    nivel_atencao = models.CharField(
        max_length=15,
        choices=NIVEL_ATENCAO,
        default='rotina',
        verbose_name='Nível de atenção'
    )
    encaminhamento = models.TextField(
        blank=True,
        verbose_name='Encaminhamento / próximos passos'
    )
    necessita_acompanhamento = models.BooleanField(
        default=False,
        verbose_name='Necessita acompanhamento contínuo'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Parecer do Psicólogo'
        verbose_name_plural = 'Pareceres dos Psicólogos'

    def __str__(self):
        return f"Parecer de {self.psicologo} sobre avaliação #{self.avaliacao_id}"


class CheckinHumor(models.Model):
    """
    Check-in diário de humor do funcionário (registro rápido de bem-estar).
    Alimenta o acompanhamento de evolução emocional ao longo do tempo.
    """
    HUMOR_CHOICES = (
        ('bem', 'Bem'),
        ('triste', 'Triste'),
        ('ansioso', 'Ansioso'),
        ('cansado', 'Cansado'),
        ('motivado', 'Motivado'),
    )

    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='checkins_humor'
    )
    humor = models.CharField(max_length=20, choices=HUMOR_CHOICES)
    nota = models.IntegerField(
        default=3,
        verbose_name='Nota de bem-estar (1 a 5)',
        choices=[(1, 'Muito baixo'), (2, 'Baixo'), (3, 'Neutro'),
                 (4, 'Bom'), (5, 'Ótimo')]
    )
    observacao = models.CharField(max_length=300, blank=True)
    data = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data']
        verbose_name = 'Check-in de Humor'
        verbose_name_plural = 'Check-ins de Humor'

    def __str__(self):
        return f"{self.funcionario} - {self.get_humor_display()} ({self.data:%d/%m})"
