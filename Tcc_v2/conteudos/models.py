from django.db import models


class Conteudo(models.Model):
    TIPOS = (
        ('video', 'Vídeo'),
        ('livro', 'Livro'),
        ('artigo', 'Artigo'),
        ('podcast', 'Podcast'),
        ('documentario', 'Documentário'),
    )

    CATEGORIAS = (
        ('ansiedade', 'Ansiedade'),
        ('depressao', 'Depressão'),
        ('burnout', 'Burnout'),
        ('estresse', 'Estresse'),
        ('autoconhecimento', 'Autoconhecimento'),
        ('bem_estar', 'Bem-estar'),
        ('outros', 'Outros'),
    )

    titulo = models.CharField(max_length=200, verbose_name='Título')
    tipo = models.CharField(max_length=20, choices=TIPOS, verbose_name='Tipo de conteúdo')
    categoria = models.CharField(max_length=30, choices=CATEGORIAS, default='outros', verbose_name='Categoria')
    descricao = models.TextField(verbose_name='Descrição')
    autor = models.CharField(max_length=150, blank=True, verbose_name='Autor')
    url = models.URLField(blank=True, verbose_name='Link externo')
    duracao = models.CharField(max_length=20, blank=True, verbose_name='Duração')
    imagem_url = models.URLField(blank=True, verbose_name='URL da imagem de capa')
    ativo = models.BooleanField(default=True, verbose_name='Ativo')
    destaque = models.BooleanField(default=False, verbose_name='Em destaque')
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Data de criação')
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name='Última atualização')

    class Meta:
        ordering = ['-destaque', '-criado_em']
        verbose_name = 'Conteúdo'
        verbose_name_plural = 'Conteúdos'

    def __str__(self):
        return f"[{self.get_tipo_display()}] {self.titulo}"
