from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta


class Usuario(AbstractUser):
    TIPOS = (
        ('empresa', 'Empresa'),
        ('funcionario', 'Funcionário'),
        ('psicologo', 'Psicólogo'),
    )

    tipo = models.CharField(max_length=20, choices=TIPOS)
    telefone = models.CharField(max_length=20, blank=True)
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_full_name()} - {self.tipo}"


class Empresa(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='empresa_perfil'
    )

    # Dados da empresa
    cnpj = models.CharField(max_length=18, unique=True)
    razao_social = models.CharField(max_length=200)
    nome_fantasia = models.CharField(max_length=200, blank=True)
    email_corporativo = models.EmailField(blank=True)
    telefone_empresa = models.CharField(max_length=20, blank=True)

    # Representante legal
    representante_nome = models.CharField(max_length=150)
    representante_cpf = models.CharField(max_length=14, unique=True, null=True, blank=True)
    representante_cargo = models.CharField(max_length=100, blank=True)
    representante_email = models.EmailField(blank=True)
    representante_telefone = models.CharField(max_length=20, blank=True)

    # Endereço da empresa
    cep = models.CharField(max_length=9, blank=True)
    endereco = models.CharField(max_length=200, blank=True)
    numero = models.CharField(max_length=10, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    # Informações extras
    ramo_atividade = models.CharField(max_length=100, blank=True)
    porte_empresa = models.CharField(max_length=50, blank=True)
    quantidade_funcionarios = models.PositiveIntegerField(default=0)
    responsavel_rh = models.CharField(max_length=150, blank=True)
    email_rh = models.EmailField(blank=True)

    # LGPD
    aceitou_lgpd = models.BooleanField(default=False)
    data_aceite_lgpd = models.DateTimeField(null=True, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.razao_social


class Funcionario(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='funcionario_perfil')
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='funcionarios')

    cargo = models.CharField(max_length=100)
    data_admissao = models.DateField(null=True, blank=True)
    departamento = models.CharField(max_length=100, blank=True)
    matricula = models.CharField(max_length=50, blank=True)
    turno = models.CharField(
        max_length=20,
        choices=[
            ('manha', 'Manhã'),
            ('tarde', 'Tarde'),
            ('noite', 'Noite'),
            ('integral', 'Integral')
        ],
        blank=True
    )

    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True)
    data_nascimento = models.DateField(null=True, blank=True)
    genero = models.CharField(
        max_length=20,
        choices=[
            ('M', 'Masculino'),
            ('F', 'Feminino'),
            ('NB', 'Não-binário'),
            ('PNI', 'Prefiro não informar')
        ],
        blank=True
    )
    estado_civil = models.CharField(max_length=20, blank=True)
    filho = models.BooleanField(default=False)
    quantidade_filhos = models.IntegerField(default=0)

    telefone_emergencia = models.CharField(max_length=20, blank=True)
    contato_emergencia_nome = models.CharField(max_length=100, blank=True)
    contato_emergencia_parentesco = models.CharField(max_length=50, blank=True)

    cep = models.CharField(max_length=9, blank=True)
    endereco = models.CharField(max_length=200, blank=True)
    numero = models.CharField(max_length=10, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    possui_plano_saude = models.BooleanField(default=False)
    plano_saude = models.CharField(max_length=100, blank=True)
    possui_condicao_cronica = models.BooleanField(default=False)
    condicao_cronica = models.TextField(blank=True)
    faz_acompanhamento_psicologico = models.BooleanField(default=False)

    receber_notificacoes = models.BooleanField(default=True)
    idioma_preferido = models.CharField(
        max_length=10,
        default='pt-BR',
        choices=[('pt-BR', 'Português'), ('en', 'English')]
    )

    aceitou_lgpd = models.BooleanField(default=False)
    data_aceite_lgpd = models.DateTimeField(null=True, blank=True)

    ativo = models.BooleanField(default=True)

    criado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.empresa.razao_social}"

    @property
    def idade(self):
        if self.data_nascimento:
            from datetime import date
            today = date.today()
            return today.year - self.data_nascimento.year - (
                (today.month, today.day) <
                (self.data_nascimento.month, self.data_nascimento.day)
            )
        return None


class Psicologo(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='psicologo_perfil')
    crp = models.CharField(max_length=20, unique=True)
    especialidade = models.CharField(max_length=100, blank=True)
    empresas_acompanhadas = models.ManyToManyField(Empresa, related_name='psicologos', blank=True)

    def __str__(self):
        return f"Psicólogo {self.usuario.get_full_name()} - CRP: {self.crp}"


class ResetPasswordToken(models.Model):
    user = models.ForeignKey('Usuario', on_delete=models.CASCADE)
    token = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    def is_valid(self):
        return (not self.used) and (timezone.now() <= self.expires_at)

    def __str__(self):
        return f"{self.user.email} - {self.token}"