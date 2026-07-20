from rest_framework import serializers
from django.contrib.auth.hashers import make_password
import re

from .models import Usuario, Empresa, Funcionario, Psicologo


def so_numeros(valor):
    return re.sub(r'\D', '', str(valor or ''))


def formatar_cpf(cpf):
    cpf = so_numeros(cpf)
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf


def formatar_cep(cep):
    cep = so_numeros(cep)
    if len(cep) == 8:
        return f"{cep[:5]}-{cep[5:]}"
    return cep


def formatar_cnpj(cnpj):
    cnpj = so_numeros(cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


def validar_cep(cep):
    return len(so_numeros(cep)) == 8


def validar_cnpj_basico(cnpj):
    return len(so_numeros(cnpj)) == 14


def validar_cpf(cpf):
    cpf = so_numeros(cpf)

    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10 % 11) % 10

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10 % 11) % 10

    return digito1 == int(cpf[9]) and digito2 == int(cpf[10])


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'tipo',
            'telefone',
            'password',
        ]

    def validate_email(self, value):
        qs = Usuario.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Email já existe.")
        return value

    def validate_username(self, value):
        qs = Usuario.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Username já existe.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if password:
            validated_data['password'] = make_password(password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.password = make_password(password)

        instance.save()
        return instance


class EmpresaSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Empresa
        fields = [
            'id',
            'usuario',
            'cnpj',
            'razao_social',
            'nome_fantasia',
            'email_corporativo',
            'telefone_empresa',
            'representante_nome',
            'representante_cpf',
            'representante_cargo',
            'representante_email',
            'representante_telefone',
            'cep',
            'endereco',
            'numero',
            'complemento',
            'bairro',
            'cidade',
            'estado',
            'ramo_atividade',
            'porte_empresa',
            'quantidade_funcionarios',
            'responsavel_rh',
            'email_rh',
            'aceitou_lgpd',
            'data_aceite_lgpd',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['data_aceite_lgpd', 'criado_em', 'atualizado_em']

    def validate_cnpj(self, value):
        if not validar_cnpj_basico(value):
            raise serializers.ValidationError("CNPJ inválido.")

        cnpj_formatado = formatar_cnpj(value)

        qs = Empresa.objects.filter(cnpj=cnpj_formatado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("CNPJ já cadastrado.")

        return cnpj_formatado

    def validate_representante_cpf(self, value):
        if not validar_cpf(value):
            raise serializers.ValidationError("CPF do representante inválido.")

        cpf_formatado = formatar_cpf(value)

        qs = Empresa.objects.filter(representante_cpf=cpf_formatado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("CPF do representante já cadastrado.")

        return cpf_formatado

    def validate_cep(self, value):
        if value and not validar_cep(value):
            raise serializers.ValidationError("CEP inválido.")
        return formatar_cep(value) if value else value

    def validate_estado(self, value):
        return str(value).upper() if value else value

    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario')
        usuario_data['tipo'] = 'empresa'

        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        empresa = Empresa.objects.create(usuario=usuario, **validated_data)
        return empresa

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', None)

        if usuario_data:
            usuario_serializer = UsuarioSerializer(
                instance.usuario,
                data=usuario_data,
                partial=True
            )
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class FuncionarioSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()
    empresa_nome = serializers.CharField(source='empresa.razao_social', read_only=True)
    idade = serializers.ReadOnlyField()

    class Meta:
        model = Funcionario
        fields = [
            'id',
            'usuario',
            'empresa',
            'empresa_nome',
            'cargo',
            'data_admissao',
            'departamento',
            'matricula',
            'turno',
            'cpf',
            'data_nascimento',
            'genero',
            'estado_civil',
            'filho',
            'quantidade_filhos',
            'telefone_emergencia',
            'contato_emergencia_nome',
            'contato_emergencia_parentesco',
            'cep',
            'endereco',
            'numero',
            'complemento',
            'bairro',
            'cidade',
            'estado',
            'possui_plano_saude',
            'plano_saude',
            'possui_condicao_cronica',
            'condicao_cronica',
            'faz_acompanhamento_psicologico',
            'receber_notificacoes',
            'idioma_preferido',
            'ativo',
            'criado_em',
            'atualizado_em',
            'idade',
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'idade']

    def validate_cpf(self, value):
        if not validar_cpf(value):
            raise serializers.ValidationError("CPF inválido.")

        cpf_formatado = formatar_cpf(value)

        qs = Funcionario.objects.filter(cpf=cpf_formatado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("CPF já cadastrado.")

        return cpf_formatado

    def validate_cep(self, value):
        if value and not validar_cep(value):
            raise serializers.ValidationError("CEP inválido.")
        return formatar_cep(value) if value else value

    def validate_estado(self, value):
        return str(value).upper() if value else value

    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario')
        usuario_data['tipo'] = 'funcionario'

        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        funcionario = Funcionario.objects.create(usuario=usuario, **validated_data)
        return funcionario

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', None)

        if usuario_data:
            usuario_serializer = UsuarioSerializer(
                instance.usuario,
                data=usuario_data,
                partial=True
            )
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class FuncionarioDetalhadoSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer(read_only=True)
    empresa_nome = serializers.CharField(source='empresa.razao_social', read_only=True)
    idade = serializers.ReadOnlyField()

    class Meta:
        model = Funcionario
        fields = '__all__'
        depth = 1


class FuncionarioCreateSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Funcionario
        exclude = ['criado_em', 'atualizado_em']

    def validate_cpf(self, value):
        if not validar_cpf(value):
            raise serializers.ValidationError("CPF inválido.")
        return formatar_cpf(value)

    def validate_cep(self, value):
        if value and not validar_cep(value):
            raise serializers.ValidationError("CEP inválido.")
        return formatar_cep(value) if value else value

    def validate_estado(self, value):
        return str(value).upper() if value else value

    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario')
        usuario_data['tipo'] = 'funcionario'

        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        funcionario = Funcionario.objects.create(
            usuario=usuario,
            **validated_data
        )
        return funcionario

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', None)

        if usuario_data:
            usuario_serializer = UsuarioSerializer(
                instance.usuario,
                data=usuario_data,
                partial=True
            )
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class PsicologoSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Psicologo
        fields = ['id', 'usuario', 'crp', 'especialidade', 'empresas_acompanhadas']

    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario')
        usuario_data['tipo'] = 'psicologo'

        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        psicologo = Psicologo.objects.create(usuario=usuario, **validated_data)
        return psicologo

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', None)

        if usuario_data:
            usuario_serializer = UsuarioSerializer(
                instance.usuario,
                data=usuario_data,
                partial=True
            )
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    codigo = serializers.CharField()
    nova_senha = serializers.CharField(min_length=6, write_only=True)