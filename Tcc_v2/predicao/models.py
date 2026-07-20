"""
models.py - Modelos do módulo de Predição com Machine Learning
Inclui: Predição individual e Fila de Prioridade para psicólogos.
"""

from django.db import models
from usuarios.models import Funcionario, Empresa


class Predicao(models.Model):
    """
    Resultado de predição do modelo de ML para um funcionário.
    Armazena a classificação de risco e probabilidades.
    """
    NIVEL_RISCO_CHOICES = (
        ('Baixo', 'Baixo - Sem risco significativo'),
        ('Médio', 'Médio - Atenção necessária'),
        ('Alto', 'Alto - Acompanhamento recomendado'),
        ('Crítico', 'Crítico - Intervenção urgente'),
    )

    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='predicoes'
    )
    data_predicao = models.DateTimeField(auto_now_add=True)

    # Resultado do modelo
    nivel_risco_predito = models.CharField(
        max_length=20,
        choices=NIVEL_RISCO_CHOICES,
        verbose_name='Nível de risco predito'
    )
    probabilidade = models.FloatField(
        verbose_name='Probabilidade da classe predita',
        help_text='Confiança do modelo na predição (0.0 a 1.0)'
    )
    probabilidades_detalhadas = models.JSONField(
        null=True, blank=True,
        verbose_name='Probabilidades por classe',
        help_text='Probabilidade de cada nível de risco'
    )

    # Features usadas na predição
    features_entrada = models.JSONField(
        null=True, blank=True,
        verbose_name='Features usadas na predição'
    )

    # Score de prioridade para a fila (calculado a partir do ML)
    score_prioridade = models.FloatField(
        default=0.0,
        verbose_name='Score de prioridade',
        help_text='Score calculado para ordenação na fila do psicólogo (0-100)'
    )

    # Controle de atendimento
    atendido = models.BooleanField(
        default=False,
        verbose_name='Foi atendido pelo psicólogo'
    )
    data_atendimento = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Data do atendimento'
    )
    psicologo_responsavel = models.ForeignKey(
        'usuarios.Psicologo',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='predicoes_atendidas'
    )
    observacoes_psicologo = models.TextField(
        blank=True,
        verbose_name='Observações do psicólogo'
    )

    class Meta:
        ordering = ['-score_prioridade', '-data_predicao']
        verbose_name = 'Predição ML'
        verbose_name_plural = 'Predições ML'

    def __str__(self):
        return (
            f"Predição #{self.id} - {self.funcionario.usuario.get_full_name()} - "
            f"{self.nivel_risco_predito} ({self.probabilidade:.2%})"
        )

    def calcular_score_prioridade(self):
        """
        Calcula o score de prioridade para a fila do psicólogo.
        Combina: nível de risco predito + probabilidade + tempo sem atendimento.
        Score maior = maior urgência (aparece primeiro na fila).
        """
        # Peso base por nível de risco
        pesos_risco = {
            'Crítico': 80,
            'Alto': 60,
            'Médio': 30,
            'Baixo': 10,
        }
        score_base = pesos_risco.get(self.nivel_risco_predito, 0)

        # Bônus pela confiança do modelo (0-20 pontos)
        bonus_confianca = self.probabilidade * 20

        self.score_prioridade = round(score_base + bonus_confianca, 2)
        return self.score_prioridade
