from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.db.models import Count, Avg, Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import random
import re

from .models import Usuario, Empresa, Funcionario, Psicologo, ResetPasswordToken
from .serializers import UsuarioSerializer, EmpresaSerializer, FuncionarioSerializer
from .serializers import ResetPasswordRequestSerializer, ResetPasswordConfirmSerializer
from auditoria.utils import log_create, log_update, log_delete, log_login, log_lgpd, registrar_log


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


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastrar_empresa(request):
    try:
        dados = request.data

        campos_obrigatorios = [
            'username',
            'email',
            'password',
            'cnpj',
            'razao_social',
            'representante_nome',
            'representante_cpf',
            'cep',
            'endereco',
            'numero',
            'bairro',
            'cidade',
            'estado',
            'aceitou_lgpd',
        ]

        for campo in campos_obrigatorios:
            valor = dados.get(campo)
            if valor is None or str(valor).strip() == '':
                return Response(
                    {'erro': f'Campo obrigatório: {campo}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not dados.get('aceitou_lgpd'):
            return Response(
                {'erro': 'É obrigatório aceitar os termos da LGPD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validar_cnpj_basico(dados.get('cnpj')):
            return Response(
                {'erro': 'CNPJ inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validar_cpf(dados.get('representante_cpf')):
            return Response(
                {'erro': 'CPF do representante inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not validar_cep(dados.get('cep')):
            return Response(
                {'erro': 'CEP inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Usuario.objects.filter(username=dados.get('username')).exists():
            return Response(
                {'erro': 'Username já existe'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Usuario.objects.filter(email=dados.get('email')).exists():
            return Response(
                {'erro': 'Email já existe'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cnpj_formatado = formatar_cnpj(dados.get('cnpj'))
        representante_cpf_formatado = formatar_cpf(dados.get('representante_cpf'))
        cep_formatado = formatar_cep(dados.get('cep'))

        if Empresa.objects.filter(cnpj=cnpj_formatado).exists():
            return Response(
                {'erro': 'CNPJ já cadastrado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Empresa.objects.filter(representante_cpf=representante_cpf_formatado).exists():
            return Response(
                {'erro': 'CPF do representante já cadastrado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = Usuario.objects.create(
            username=dados.get('username'),
            email=dados.get('email'),
            first_name=dados.get('representante_nome', ''),
            last_name='',
            password=make_password(dados.get('password')),
            tipo='empresa',
            telefone=dados.get('telefone_empresa', '')
        )

        empresa = Empresa.objects.create(
            usuario=usuario,
            cnpj=cnpj_formatado,
            razao_social=dados.get('razao_social'),
            nome_fantasia=dados.get('nome_fantasia', ''),
            email_corporativo=dados.get('email_corporativo', ''),
            telefone_empresa=dados.get('telefone_empresa', ''),
            representante_nome=dados.get('representante_nome'),
            representante_cpf=representante_cpf_formatado,
            representante_cargo=dados.get('representante_cargo', ''),
            representante_email=dados.get('representante_email', ''),
            representante_telefone=dados.get('representante_telefone', ''),
            cep=cep_formatado,
            endereco=dados.get('endereco', ''),
            numero=dados.get('numero', ''),
            complemento=dados.get('complemento', ''),
            bairro=dados.get('bairro', ''),
            cidade=dados.get('cidade', ''),
            estado=str(dados.get('estado', '')).upper(),
            ramo_atividade=dados.get('ramo_atividade', ''),
            porte_empresa=dados.get('porte_empresa', ''),
            quantidade_funcionarios=int(dados.get('quantidade_funcionarios', 0) or 0),
            responsavel_rh=dados.get('responsavel_rh', ''),
            email_rh=dados.get('email_rh', ''),
            aceitou_lgpd=True,
            data_aceite_lgpd=timezone.now()
        )

        log_create(request, 'Empresa', empresa.id,
                   f'Empresa "{empresa.razao_social}" cadastrada (CNPJ: {cnpj_formatado})',
                   dados_novos={'razao_social': empresa.razao_social, 'cnpj': cnpj_formatado})
        log_lgpd(request, 'LGPD_ACEITE',
                 f'Empresa "{empresa.razao_social}" aceitou termos LGPD')

        return Response({
            'mensagem': 'Empresa cadastrada com sucesso!',
            'id': usuario.id,
            'empresa_id': empresa.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastrar_funcionario(request):
    try:
        dados = request.data

        campos_obrigatorios = [
            'username', 'email', 'password', 'empresa_id', 'cargo',
            'first_name', 'cpf', 'cep', 'endereco', 'numero',
            'bairro', 'cidade', 'estado', 'aceitou_lgpd'
        ]

        for campo in campos_obrigatorios:
            valor = dados.get(campo)
            if valor is None or str(valor).strip() == '':
                return Response({'erro': f'Campo obrigatório: {campo}'}, status=status.HTTP_400_BAD_REQUEST)

        if not dados.get('aceitou_lgpd'):
            return Response({'erro': 'É obrigatório aceitar os termos da LGPD.'}, status=status.HTTP_400_BAD_REQUEST)

        if not validar_cpf(dados.get('cpf')):
            return Response({'erro': 'CPF inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not validar_cep(dados.get('cep')):
            return Response({'erro': 'CEP inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(username=dados.get('username')).exists():
            return Response({'erro': 'Username já existe'}, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(email=dados.get('email')).exists():
            return Response({'erro': 'Email já existe'}, status=status.HTTP_400_BAD_REQUEST)

        cpf_formatado = formatar_cpf(dados.get('cpf'))
        cep_formatado = formatar_cep(dados.get('cep'))

        if Funcionario.objects.filter(cpf=cpf_formatado).exists():
            return Response({'erro': 'CPF já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            empresa = Empresa.objects.get(id=int(dados.get('empresa_id')))
        except (ValueError, TypeError):
            return Response({'erro': 'ID da empresa inválido'}, status=status.HTTP_400_BAD_REQUEST)
        except Empresa.DoesNotExist:
            return Response({'erro': 'Empresa não encontrada'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = Usuario.objects.create(
            username=dados.get('username'),
            email=dados.get('email'),
            first_name=dados.get('first_name', ''),
            last_name=dados.get('last_name', ''),
            password=make_password(dados.get('password')),
            tipo='funcionario',
            telefone=dados.get('telefone', '')
        )

        funcionario = Funcionario.objects.create(
            usuario=usuario,
            empresa=empresa,
            cargo=dados.get('cargo'),
            data_admissao=dados.get('data_admissao') or None,
            departamento=dados.get('departamento', ''),
            matricula=dados.get('matricula', ''),
            turno=dados.get('turno', ''),
            cpf=cpf_formatado,
            data_nascimento=dados.get('data_nascimento') or None,
            genero=dados.get('genero', ''),
            estado_civil=dados.get('estado_civil', ''),
            filho=dados.get('filho', False),
            quantidade_filhos=dados.get('quantidade_filhos', 0),
            telefone_emergencia=dados.get('telefone_emergencia', ''),
            contato_emergencia_nome=dados.get('contato_emergencia_nome', ''),
            contato_emergencia_parentesco=dados.get('contato_emergencia_parentesco', ''),
            cep=cep_formatado,
            endereco=dados.get('endereco', ''),
            numero=dados.get('numero', ''),
            complemento=dados.get('complemento', ''),
            bairro=dados.get('bairro', ''),
            cidade=dados.get('cidade', ''),
            estado=str(dados.get('estado', '')).upper(),
            possui_plano_saude=dados.get('possui_plano_saude', False),
            plano_saude=dados.get('plano_saude', ''),
            possui_condicao_cronica=dados.get('possui_condicao_cronica', False),
            condicao_cronica=dados.get('condicao_cronica', ''),
            faz_acompanhamento_psicologico=dados.get('faz_acompanhamento_psicologico', False),
            receber_notificacoes=dados.get('receber_notificacoes', True),
            idioma_preferido=dados.get('idioma_preferido', 'pt-BR'),
            aceitou_lgpd=True,
            data_aceite_lgpd=timezone.now(),
            ativo=True
        )

        log_create(request, 'Funcionario', funcionario.id,
                   f'Funcionário "{usuario.first_name}" cadastrado na empresa ID {empresa.id}',
                   dados_novos={'nome': usuario.first_name, 'cargo': funcionario.cargo, 'cpf': cpf_formatado})
        log_lgpd(request, 'LGPD_ACEITE',
                 f'Funcionário "{usuario.first_name}" aceitou termos LGPD')

        return Response({
            'mensagem': 'Funcionário cadastrado com sucesso!',
            'id': usuario.id,
            'funcionario_id': funcionario.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastrar_psicologo(request):
    try:
        dados = request.data

        campos_obrigatorios = ['username', 'email', 'password', 'crp', 'empresa_id']
        for campo in campos_obrigatorios:
            if campo not in dados or str(dados.get(campo)).strip() == '':
                return Response({'erro': f'Campo obrigatório: {campo}'}, status=status.HTTP_400_BAD_REQUEST)

        # A empresa precisa existir — cada psicólogo é vinculado à sua empresa pelo id.
        try:
            empresa = Empresa.objects.get(id=dados.get('empresa_id'))
        except (Empresa.DoesNotExist, ValueError, TypeError):
            return Response(
                {'erro': 'Empresa não encontrada. Informe um id de empresa válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Usuario.objects.filter(username=dados.get('username')).exists():
            return Response({'erro': 'Username já existe'}, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(email=dados.get('email')).exists():
            return Response({'erro': 'Email já existe'}, status=status.HTTP_400_BAD_REQUEST)

        if Psicologo.objects.filter(crp=dados.get('crp')).exists():
            return Response({'erro': 'CRP já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = Usuario.objects.create(
            username=dados.get('username'),
            email=dados.get('email'),
            first_name=dados.get('first_name', ''),
            last_name=dados.get('last_name', ''),
            password=make_password(dados.get('password')),
            tipo='psicologo',
            telefone=dados.get('telefone', '')
        )

        psicologo = Psicologo.objects.create(
            usuario=usuario,
            crp=dados.get('crp'),
            especialidade=dados.get('especialidade', '')
        )
        # Vincula o psicólogo à empresa informada (escopo por empresa).
        psicologo.empresas_acompanhadas.set([empresa])

        return Response({
            'mensagem': 'Psicólogo cadastrado com sucesso!',
            'id': usuario.id,
            'psicologo_id': psicologo.id,
            'empresa_id': empresa.id,
            'empresa_nome': empresa.razao_social,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_usuario(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user:
            response_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'tipo': user.tipo,
                'nome_completo': user.get_full_name()
            }

            if user.tipo == 'empresa':
                try:
                    empresa = Empresa.objects.get(usuario=user)
                    response_data['empresa_id'] = empresa.id
                    response_data['razao_social'] = empresa.razao_social
                    response_data['cnpj'] = empresa.cnpj
                except Empresa.DoesNotExist:
                    pass

            elif user.tipo == 'funcionario':
                try:
                    funcionario = Funcionario.objects.get(usuario=user, ativo=True)
                    response_data['funcionario_id'] = funcionario.id
                    response_data['empresa_id'] = funcionario.empresa.id
                except Funcionario.DoesNotExist:
                    pass

            elif user.tipo == 'psicologo':
                try:
                    psicologo = Psicologo.objects.get(usuario=user)
                    response_data['psicologo_id'] = psicologo.id
                    response_data['crp'] = psicologo.crp
                    response_data['especialidade'] = psicologo.especialidade
                except Psicologo.DoesNotExist:
                    pass

            return Response(response_data)

        return Response({'erro': 'Usuário ou senha inválidos'}, status=401)

    except Exception as e:
        return Response({'erro': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_com_token(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'erro': 'Username e password são obrigatórios'}, status=400)

    user = authenticate(username=username, password=password)

    if user:
        token, created = Token.objects.get_or_create(user=user)

        log_login(request, f'Login com token: {user.username} ({user.tipo})')

        response_data = {
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'tipo': user.tipo,
            'nome_completo': user.get_full_name()
        }

        if user.tipo == 'empresa':
            try:
                empresa = Empresa.objects.get(usuario=user)
                response_data['empresa_id'] = empresa.id
                response_data['razao_social'] = empresa.razao_social
            except Empresa.DoesNotExist:
                pass
        elif user.tipo == 'funcionario':
            try:
                funcionario = Funcionario.objects.get(usuario=user, ativo=True)
                response_data['funcionario_id'] = funcionario.id
                response_data['empresa_id'] = funcionario.empresa.id
            except Funcionario.DoesNotExist:
                pass
        elif user.tipo == 'psicologo':
            try:
                psicologo = Psicologo.objects.get(usuario=user)
                response_data['psicologo_id'] = psicologo.id
                response_data['crp'] = psicologo.crp
                response_data['especialidade'] = psicologo.especialidade
            except Psicologo.DoesNotExist:
                pass

        return Response(response_data)

    return Response({'erro': 'Credenciais inválidas'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    try:
        user = request.user

        perfil_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'tipo': user.tipo,
            'telefone': user.telefone,
            'data_cadastro': user.data_cadastro
        }

        if user.tipo == 'empresa':
            try:
                empresa = Empresa.objects.get(usuario=user)
                perfil_data['empresa'] = {
                    'id': empresa.id,
                    'cnpj': empresa.cnpj,
                    'razao_social': empresa.razao_social,
                    'nome_fantasia': empresa.nome_fantasia,
                    'email_corporativo': empresa.email_corporativo,
                    'telefone_empresa': empresa.telefone_empresa,
                    'representante_nome': empresa.representante_nome,
                    'representante_cpf': empresa.representante_cpf,
                    'representante_cargo': empresa.representante_cargo,
                    'representante_email': empresa.representante_email,
                    'representante_telefone': empresa.representante_telefone,
                    'cep': empresa.cep,
                    'endereco': empresa.endereco,
                    'numero': empresa.numero,
                    'complemento': empresa.complemento,
                    'bairro': empresa.bairro,
                    'cidade': empresa.cidade,
                    'estado': empresa.estado,
                    'ramo_atividade': empresa.ramo_atividade,
                    'porte_empresa': empresa.porte_empresa,
                    'quantidade_funcionarios': empresa.quantidade_funcionarios,
                    'responsavel_rh': empresa.responsavel_rh,
                    'email_rh': empresa.email_rh,
                    'aceitou_lgpd': empresa.aceitou_lgpd,
                    'data_aceite_lgpd': empresa.data_aceite_lgpd,
                }
            except Empresa.DoesNotExist:
                pass

        elif user.tipo == 'funcionario':
            try:
                funcionario = Funcionario.objects.get(usuario=user, ativo=True)
                perfil_data['funcionario'] = {
                    'id': funcionario.id,
                    'cargo': funcionario.cargo,
                    'data_admissao': funcionario.data_admissao,
                    'empresa_id': funcionario.empresa.id,
                    'empresa_nome': funcionario.empresa.razao_social,
                    'departamento': funcionario.departamento,
                    'matricula': funcionario.matricula,
                    'turno': funcionario.turno,
                    'cpf': funcionario.cpf,
                    'data_nascimento': funcionario.data_nascimento,
                    'genero': funcionario.genero,
                    'cep': funcionario.cep,
                    'endereco': funcionario.endereco,
                    'numero': funcionario.numero,
                    'bairro': funcionario.bairro,
                    'cidade': funcionario.cidade,
                    'estado': funcionario.estado,
                }
            except Funcionario.DoesNotExist:
                pass

        elif user.tipo == 'psicologo':
            try:
                psicologo = Psicologo.objects.get(usuario=user)
                empresas = list(
                    psicologo.empresas_acompanhadas.values('id', 'razao_social')
                )
                perfil_data['psicologo'] = {
                    'id': psicologo.id,
                    'crp': psicologo.crp,
                    'especialidade': psicologo.especialidade,
                    'total_empresas': len(empresas),
                    'empresas': empresas,
                    'empresa_principal': empresas[0]['razao_social'] if empresas else None,
                }
            except Psicologo.DoesNotExist:
                pass

        return Response(perfil_data)

    except Exception as e:
        return Response({'erro': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_usuarios(request):
    tipo = request.query_params.get('tipo')

    if tipo == 'empresa':
        empresas = Empresa.objects.select_related('usuario').all()
        data = []
        for emp in empresas:
            data.append({
                'id': emp.id,
                'username': emp.usuario.username,
                'email': emp.usuario.email,
                'tipo': 'empresa',
                'razao_social': emp.razao_social,
                'nome_fantasia': emp.nome_fantasia,
                'cnpj': emp.cnpj,
                'representante_nome': emp.representante_nome,
                'cidade': emp.cidade,
                'estado': emp.estado,
            })
        return Response(data)

    elif tipo == 'funcionario':
        funcionarios = Funcionario.objects.select_related('usuario', 'empresa').filter(ativo=True)
        data = []
        for func in funcionarios:
            data.append({
                'id': func.id,
                'username': func.usuario.username,
                'email': func.usuario.email,
                'tipo': 'funcionario',
                'nome': func.usuario.first_name,
                'sobrenome': func.usuario.last_name,
                'cargo': func.cargo,
                'empresa': func.empresa.razao_social,
                'cpf': func.cpf,
                'cidade': func.cidade,
                'estado': func.estado,
            })
        return Response(data)

    elif tipo:
        usuarios = Usuario.objects.filter(tipo=tipo)
        return Response(usuarios.values('id', 'username', 'email', 'tipo'))

    usuarios = Usuario.objects.all()
    return Response(usuarios.values('id', 'username', 'email', 'tipo'))


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def meu_perfil_funcionario(request):
    try:
        funcionario = Funcionario.objects.get(usuario=request.user, ativo=True)

        if request.method == 'GET':
            data = {
                'id': funcionario.id,
                'usuario': {
                    'id': funcionario.usuario.id,
                    'username': funcionario.usuario.username,
                    'email': funcionario.usuario.email,
                    'first_name': funcionario.usuario.first_name,
                    'last_name': funcionario.usuario.last_name,
                    'telefone': funcionario.usuario.telefone,
                },
                'empresa_id': funcionario.empresa.id,
                'empresa_nome': funcionario.empresa.razao_social,
                'cargo': funcionario.cargo,
                'data_admissao': funcionario.data_admissao,
                'departamento': funcionario.departamento,
                'matricula': funcionario.matricula,
                'turno': funcionario.turno,
                'cpf': funcionario.cpf,
                'data_nascimento': funcionario.data_nascimento,
                'genero': funcionario.genero,
                'estado_civil': funcionario.estado_civil,
                'filho': funcionario.filho,
                'quantidade_filhos': funcionario.quantidade_filhos,
                'telefone_emergencia': funcionario.telefone_emergencia,
                'contato_emergencia_nome': funcionario.contato_emergencia_nome,
                'contato_emergencia_parentesco': funcionario.contato_emergencia_parentesco,
                'endereco': funcionario.endereco,
                'numero': funcionario.numero,
                'complemento': funcionario.complemento,
                'bairro': funcionario.bairro,
                'cidade': funcionario.cidade,
                'estado': funcionario.estado,
                'cep': funcionario.cep,
                'possui_plano_saude': funcionario.possui_plano_saude,
                'plano_saude': funcionario.plano_saude,
                'faz_acompanhamento_psicologico': funcionario.faz_acompanhamento_psicologico,
                'aceitou_lgpd': funcionario.aceitou_lgpd,
                'data_aceite_lgpd': funcionario.data_aceite_lgpd,
                'ativo': funcionario.ativo,
            }
            return Response(data)

        if 'cpf' in request.data and not validar_cpf(request.data.get('cpf')):
            return Response({'erro': 'CPF inválido.'}, status=400)

        if 'cep' in request.data and request.data.get('cep') and not validar_cep(request.data.get('cep')):
            return Response({'erro': 'CEP inválido.'}, status=400)

        for key, value in request.data.items():
            if hasattr(funcionario, key):
                if key == 'cpf':
                    value = formatar_cpf(value)
                if key == 'cep':
                    value = formatar_cep(value)
                if key == 'estado' and value:
                    value = str(value).upper()
                setattr(funcionario, key, value)

        usuario_data = request.data.get('usuario', {})
        for key, value in usuario_data.items():
            if hasattr(funcionario.usuario, key):
                setattr(funcionario.usuario, key, value)

        funcionario.usuario.save()
        funcionario.save()

        return Response({'mensagem': 'Perfil atualizado com sucesso!'})

    except Funcionario.DoesNotExist:
        return Response({'erro': 'Funcionário não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_funcionarios_empresa(request):
    try:
        empresa = Empresa.objects.get(usuario=request.user)

        departamento = request.query_params.get('departamento')
        cargo = request.query_params.get('cargo')
        turno = request.query_params.get('turno')
        busca = request.query_params.get('busca')

        funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)

        if departamento:
            funcionarios = funcionarios.filter(departamento__icontains=departamento)
        if cargo:
            funcionarios = funcionarios.filter(cargo__icontains=cargo)
        if turno:
            funcionarios = funcionarios.filter(turno=turno)
        if busca:
            funcionarios = funcionarios.filter(
                Q(usuario__first_name__icontains=busca) |
                Q(usuario__last_name__icontains=busca) |
                Q(cargo__icontains=busca) |
                Q(departamento__icontains=busca) |
                Q(usuario__email__icontains=busca)
            )

        data = []
        for funcionario in funcionarios.select_related('usuario'):
            # CPF mascarado: a empresa vê apenas os últimos 2 dígitos para
            # conferência, nunca o documento completo (dado sensível).
            cpf_raw = funcionario.cpf or ''
            cpf_mascarado = (f'***.***.**{cpf_raw[-2:]}-**'
                             if len(cpf_raw) >= 2 else '')
            data.append({
                'id': funcionario.id,
                'nome': funcionario.usuario.first_name,
                'sobrenome': funcionario.usuario.last_name,
                'email': funcionario.usuario.email,
                'telefone': funcionario.usuario.telefone,
                'cargo': funcionario.cargo,
                'departamento': funcionario.departamento,
                'matricula': funcionario.matricula,
                'turno': funcionario.turno,
                'cpf_mascarado': cpf_mascarado,
                'cidade': funcionario.cidade,
                'estado': funcionario.estado,
                'ativo': funcionario.ativo,
                'data_admissao': funcionario.data_admissao,
            })

        return Response({
            'total': funcionarios.count(),
            'funcionarios': data
        })

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def excluir_funcionario(request, funcionario_id):
    try:
        empresa = Empresa.objects.get(usuario=request.user)
        funcionario = Funcionario.objects.get(id=funcionario_id, empresa=empresa, ativo=True)

        funcionario.ativo = False
        funcionario.save()

        log_delete(request, 'Funcionario', funcionario.id,
                   f'Funcionário "{funcionario.usuario.get_full_name()}" excluído logicamente',
                   dados_anteriores={'nome': funcionario.usuario.get_full_name(), 'cargo': funcionario.cargo})

        return Response({'mensagem': 'Funcionário excluído logicamente com sucesso!'})

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)
    except Funcionario.DoesNotExist:
        return Response({'erro': 'Funcionário não encontrado'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estatisticas_funcionarios(request):
    try:
        empresa = Empresa.objects.get(usuario=request.user)
        funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)

        stats = {
            'total': funcionarios.count(),
            'por_departamento': list(funcionarios.values('departamento').annotate(
                total=Count('id')
            ).exclude(departamento='')),
            'por_turno': list(funcionarios.values('turno').annotate(
                total=Count('id')
            ).exclude(turno='')),
            'por_genero': list(funcionarios.values('genero').annotate(
                total=Count('id')
            ).exclude(genero='')),
            'com_filhos': funcionarios.filter(filho=True).count(),
            'faz_acompanhamento': funcionarios.filter(
                faz_acompanhamento_psicologico=True
            ).count(),
        }

        return Response(stats)

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)


# ─── NOVO: Dashboard completo da empresa com dados de saúde ───
# Tamanho mínimo de grupo para exibir um dado agregado de saúde mental
# (k-anonimato). Grupos menores que isso são suprimidos para impedir que a
# empresa reidentifique a saúde mental de um indivíduo.
MIN_GRUPO_ANONIMATO = 5


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_empresa(request):
    """
    Dashboard da empresa com métricas de saúde mental **agregadas e anônimas**.

    Princípio de privacidade (LGPD / sigilo em saúde mental):
    a empresa NUNCA recebe o nome de um colaborador associado ao seu nível
    de saúde mental. Ela enxerga apenas o panorama coletivo da equipe.
    Dados individuais identificáveis ficam disponíveis somente para o
    psicólogo responsável, que tem dever de sigilo profissional.

    Para evitar reidentificação, grupos (ex.: departamentos) com menos de
    MIN_GRUPO_ANONIMATO pessoas têm seus indicadores de saúde suprimidos.
    """
    try:
        from questionarios.models import Avaliacao

        empresa = Empresa.objects.get(usuario=request.user)
        funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)
        total_funcionarios = funcionarios.count()

        # Última avaliação de cada funcionário
        ultima_por_func = {}
        for func in funcionarios:
            ultima = Avaliacao.objects.filter(
                funcionario=func
            ).order_by('-data_avaliacao').first()
            if ultima:
                ultima_por_func[func.id] = ultima

        # Contagem por nível (apenas números agregados — sem nomes)
        nivel_bom = sum(1 for a in ultima_por_func.values() if a.nivel == 'bom')
        nivel_medio = sum(1 for a in ultima_por_func.values() if a.nivel == 'medio')
        nivel_risco = sum(1 for a in ultima_por_func.values() if a.nivel == 'risco')
        total_avaliados = len(ultima_por_func)
        sem_avaliacao = total_funcionarios - total_avaliados

        # Saúde por departamento COM k-anonimato.
        departamentos = {}
        for func in funcionarios:
            dept = func.departamento or 'Não informado'
            if dept not in departamentos:
                departamentos[dept] = {'total': 0, 'bom': 0, 'medio': 0, 'risco': 0, 'sem': 0}
            departamentos[dept]['total'] += 1
            if func.id in ultima_por_func:
                nivel = ultima_por_func[func.id].nivel
                departamentos[dept][nivel] += 1
            else:
                departamentos[dept]['sem'] += 1

        saude_departamentos = []
        agrupado = {'total': 0, 'bom': 0, 'medio': 0, 'risco': 0, 'sem': 0}
        deptos_suprimidos = 0
        for dept, dados in departamentos.items():
            if dados['total'] >= MIN_GRUPO_ANONIMATO:
                saude_departamentos.append({
                    'departamento': dept,
                    'anonimizado': False,
                    **dados,
                })
            else:
                # Junta grupos pequenos em "Outras áreas" para não expor pessoas
                deptos_suprimidos += 1
                for k in agrupado:
                    agrupado[k] += dados[k]

        if agrupado['total'] > 0:
            saude_departamentos.append({
                'departamento': 'Outras áreas (agrupado)',
                'anonimizado': agrupado['total'] < MIN_GRUPO_ANONIMATO,
                **agrupado,
            })

        # Taxa de bem-estar (coletiva)
        taxa_bem_estar = round(nivel_bom / max(total_avaliados, 1) * 100, 1)

        # Alerta coletivo anônimo: a empresa só sabe QUANTAS pessoas precisam de
        # atenção, e a orientação geral — sem nunca saber QUEM são.
        alerta_anonimo = None
        if nivel_risco > 0 or nivel_medio > 0:
            alerta_anonimo = {
                'em_risco': nivel_risco,
                'em_atencao': nivel_medio,
                'mensagem': (
                    f'{nivel_risco + nivel_medio} colaborador(es) sinalizaram '
                    f'necessidade de atenção. Por sigilo, a identidade é tratada '
                    f'apenas pelo psicólogo responsável. Ações sugeridas à gestão: '
                    f'reforçar comunicação, revisar carga de trabalho e divulgar os '
                    f'canais de apoio.'
                ),
            }

        return Response({
            'total_funcionarios': total_funcionarios,
            'total_avaliados': total_avaliados,
            'sem_avaliacao': sem_avaliacao,
            'niveis': {
                'bom': nivel_bom,
                'medio': nivel_medio,
                'risco': nivel_risco,
            },
            'taxa_bem_estar': taxa_bem_estar,
            'total_em_risco': nivel_risco,
            'total_em_atencao': nivel_medio,
            'alerta_anonimo': alerta_anonimo,
            'saude_departamentos': saude_departamentos,
            'privacidade': {
                'anonimizado': True,
                'min_grupo': MIN_GRUPO_ANONIMATO,
                'mensagem': (
                    'Os dados de saúde mental são exibidos de forma agregada e '
                    'anônima. A empresa não tem acesso ao diagnóstico individual '
                    'de nenhum colaborador.'
                ),
            },
            # Chaves mantidas por compatibilidade — agora SEMPRE vazias,
            # pois dados individuais não são expostos à empresa.
            'funcionarios_risco': [],
            'saude_individual': [],
        })

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def solicitar_reset_senha(request):
    serializer = ResetPasswordRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    email = serializer.validated_data['email']

    try:
        user = Usuario.objects.get(email=email)
    except Usuario.DoesNotExist:
        return Response({
            'mensagem': 'Se o email existir, enviaremos um código de recuperação'
        })

    ResetPasswordToken.objects.filter(user=user, used=False).update(used=True)

    codigo = str(random.randint(100000, 999999))

    ResetPasswordToken.objects.create(
        user=user,
        token=codigo,
        expires_at=timezone.now() + timedelta(minutes=15),
        used=False
    )

    try:
        send_mail(
            subject='Código de redefinição de senha - Sintonize',
            message=f'''
Olá {user.first_name or user.username},

Seu código de redefinição de senha é:
{codigo}

Esse código é válido por 15 minutos.

Se você não solicitou esta alteração, ignore este email.

Atenciosamente,
Equipe Sintonize
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        return Response({'erro': f'Erro ao enviar email: {str(e)}'}, status=500)

    return Response({
        'mensagem': 'Código enviado com sucesso! Verifique sua caixa de entrada.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def confirmar_reset_senha(request):
    email = request.data.get('email')
    codigo = request.data.get('codigo')
    nova_senha = request.data.get('nova_senha')

    if not email or not codigo or not nova_senha:
        return Response(
            {'erro': 'Email, código e nova senha são obrigatórios'},
            status=400
        )

    try:
        user = Usuario.objects.get(email=email)
    except Usuario.DoesNotExist:
        return Response({'erro': 'Usuário não encontrado'}, status=404)

    try:
        reset_token = ResetPasswordToken.objects.get(
            user=user,
            token=codigo,
            used=False
        )
    except ResetPasswordToken.DoesNotExist:
        return Response({'erro': 'Código inválido ou já utilizado'}, status=400)

    if hasattr(reset_token, 'is_valid'):
        if not reset_token.is_valid():
            return Response({'erro': 'Código expirado'}, status=400)
    else:
        if timezone.now() > reset_token.expires_at:
            return Response({'erro': 'Código expirado'}, status=400)

    user.set_password(nova_senha)
    user.save()

    reset_token.used = True
    reset_token.save()

    registrar_log(request, 'RESET_SENHA', 'Usuario', user.id,
                  f'Senha redefinida para o usuário {user.username}')

    return Response({'mensagem': 'Senha redefinida com sucesso!'})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_funcionario(request, funcionario_id):
    try:
        empresa = Empresa.objects.get(usuario=request.user)
        funcionario = Funcionario.objects.select_related('usuario').get(
            id=funcionario_id,
            empresa=empresa,
            ativo=True
        )

        if request.method == 'GET':
            return Response({
                'id': funcionario.id,
                'usuario': {
                    'id': funcionario.usuario.id,
                    'username': funcionario.usuario.username,
                    'email': funcionario.usuario.email,
                    'first_name': funcionario.usuario.first_name,
                    'last_name': funcionario.usuario.last_name,
                    'telefone': funcionario.usuario.telefone,
                },
                'empresa_id': funcionario.empresa.id,
                'cargo': funcionario.cargo,
                'departamento': funcionario.departamento,
                'matricula': funcionario.matricula,
                'turno': funcionario.turno,
                'cpf': funcionario.cpf,
                'cep': funcionario.cep,
                'endereco': funcionario.endereco,
                'numero': funcionario.numero,
                'complemento': funcionario.complemento,
                'bairro': funcionario.bairro,
                'cidade': funcionario.cidade,
                'estado': funcionario.estado,
                'data_admissao': funcionario.data_admissao,
                'data_nascimento': funcionario.data_nascimento,
                'genero': funcionario.genero,
                'estado_civil': funcionario.estado_civil,
                'telefone_emergencia': funcionario.telefone_emergencia,
                'contato_emergencia_nome': funcionario.contato_emergencia_nome,
                'contato_emergencia_parentesco': funcionario.contato_emergencia_parentesco,
            })

        if 'cpf' in request.data and request.data.get('cpf'):
            if not validar_cpf(request.data.get('cpf')):
                return Response({'erro': 'CPF inválido.'}, status=400)

            cpf_formatado = formatar_cpf(request.data.get('cpf'))
            cpf_existe = Funcionario.objects.filter(cpf=cpf_formatado).exclude(id=funcionario.id).exists()
            if cpf_existe:
                return Response({'erro': 'CPF já cadastrado.'}, status=400)

        if 'cep' in request.data and request.data.get('cep'):
            if not validar_cep(request.data.get('cep')):
                return Response({'erro': 'CEP inválido.'}, status=400)

        usuario_data = request.data.get('usuario', {})

        if 'username' in usuario_data:
            username_existe = Usuario.objects.filter(username=usuario_data['username']).exclude(id=funcionario.usuario.id).exists()
            if username_existe:
                return Response({'erro': 'Username já existe.'}, status=400)

        if 'email' in usuario_data:
            email_existe = Usuario.objects.filter(email=usuario_data['email']).exclude(id=funcionario.usuario.id).exists()
            if email_existe:
                return Response({'erro': 'Email já existe.'}, status=400)

        campos_funcionario = [
            'cargo', 'departamento', 'matricula', 'turno',
            'cpf', 'cep', 'endereco', 'numero', 'complemento',
            'bairro', 'cidade', 'estado', 'data_admissao',
            'data_nascimento', 'genero', 'estado_civil',
            'telefone_emergencia', 'contato_emergencia_nome',
            'contato_emergencia_parentesco'
        ]

        for campo in campos_funcionario:
            if campo in request.data:
                valor = request.data.get(campo)
                if campo == 'cpf' and valor:
                    valor = formatar_cpf(valor)
                elif campo == 'cep' and valor:
                    valor = formatar_cep(valor)
                elif campo == 'estado' and valor:
                    valor = str(valor).upper()
                setattr(funcionario, campo, valor)

        for campo in ['username', 'email', 'first_name', 'last_name', 'telefone']:
            if campo in usuario_data:
                setattr(funcionario.usuario, campo, usuario_data.get(campo))

        funcionario.usuario.save()
        funcionario.save()

        log_update(request, 'Funcionario', funcionario.id,
                   f'Funcionário "{funcionario.usuario.get_full_name()}" atualizado pela empresa')

        return Response({'mensagem': 'Funcionário atualizado com sucesso!'})

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)
    except Funcionario.DoesNotExist:
        return Response({'erro': 'Funcionário não encontrado'}, status=404)
    except Exception as e:
        return Response({'erro': str(e)}, status=400)


# ─── LGPD: Exportação de dados pessoais (portabilidade) ───
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exportar_dados_lgpd(request):
    """
    Endpoint de portabilidade de dados conforme LGPD (Art. 18, V).
    Retorna todos os dados pessoais do usuário em formato JSON.
    """
    try:
        user = request.user
        dados = {
            'usuario': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'tipo': user.tipo,
                'telefone': user.telefone,
                'data_cadastro': str(user.data_cadastro),
            }
        }

        if user.tipo == 'funcionario':
            try:
                func = Funcionario.objects.get(usuario=user)
                dados['funcionario'] = {
                    'cargo': func.cargo,
                    'departamento': func.departamento,
                    'matricula': func.matricula,
                    'cpf': func.cpf,
                    'data_nascimento': str(func.data_nascimento),
                    'genero': func.genero,
                    'estado_civil': func.estado_civil,
                    'endereco': f"{func.endereco}, {func.numero} - {func.bairro}, {func.cidade}/{func.estado} - CEP: {func.cep}",
                    'aceitou_lgpd': func.aceitou_lgpd,
                    'data_aceite_lgpd': str(func.data_aceite_lgpd),
                }

                from questionarios.models import Avaliacao, Resposta
                avaliacoes = Avaliacao.objects.filter(funcionario=func).order_by('-data_avaliacao')
                dados['avaliacoes'] = [{
                    'id': a.id,
                    'data': str(a.data_avaliacao),
                    'pontuacao': a.pontuacao_total,
                    'nivel': a.nivel,
                    'recomendacoes': a.recomendacoes,
                } for a in avaliacoes]

                respostas = Resposta.objects.filter(funcionario=func).select_related('pergunta')
                dados['respostas_questionarios'] = [{
                    'pergunta': r.pergunta.texto,
                    'resposta': r.get_valor_display(),
                    'data': str(r.data_resposta),
                } for r in respostas]

            except Funcionario.DoesNotExist:
                pass

        elif user.tipo == 'empresa':
            try:
                emp = Empresa.objects.get(usuario=user)
                dados['empresa'] = {
                    'cnpj': emp.cnpj,
                    'razao_social': emp.razao_social,
                    'nome_fantasia': emp.nome_fantasia,
                    'representante_nome': emp.representante_nome,
                    'representante_cpf': emp.representante_cpf,
                    'endereco': f"{emp.endereco}, {emp.numero} - {emp.bairro}, {emp.cidade}/{emp.estado} - CEP: {emp.cep}",
                    'aceitou_lgpd': emp.aceitou_lgpd,
                    'data_aceite_lgpd': str(emp.data_aceite_lgpd),
                }
            except Empresa.DoesNotExist:
                pass

        log_lgpd(request, 'EXPORT', f'Exportação de dados pessoais do usuário {user.username}')

        return Response({
            'mensagem': 'Dados exportados com sucesso conforme LGPD (Art. 18, V)',
            'dados': dados,
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


# ─── LGPD: Solicitação de exclusão de dados ───
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def solicitar_exclusao_lgpd(request):
    """
    Endpoint para solicitação de exclusão de dados pessoais conforme LGPD (Art. 18, VI).
    Realiza a anonimização dos dados do usuário.
    """
    try:
        user = request.user
        confirmacao = request.data.get('confirmar_exclusao', False)

        if not confirmacao:
            return Response({
                'aviso': 'Para confirmar a exclusão dos seus dados, envie confirmar_exclusao: true. '
                         'Esta ação é irreversível e todos os seus dados pessoais serão anonimizados.',
            }, status=400)

        nome_original = user.get_full_name() or user.username

        # Anonimiza dados do funcionário
        if user.tipo == 'funcionario':
            try:
                func = Funcionario.objects.get(usuario=user)
                func.cpf = 'ANONIMIZADO'
                func.data_nascimento = None
                func.telefone_emergencia = ''
                func.contato_emergencia_nome = ''
                func.contato_emergencia_parentesco = ''
                func.endereco = 'ANONIMIZADO'
                func.numero = ''
                func.complemento = ''
                func.bairro = ''
                func.cidade = ''
                func.estado = ''
                func.cep = ''
                func.ativo = False
                func.save()
            except Funcionario.DoesNotExist:
                pass

        elif user.tipo == 'empresa':
            try:
                emp = Empresa.objects.get(usuario=user)
                emp.representante_cpf = 'ANONIMIZADO'
                emp.representante_nome = 'ANONIMIZADO'
                emp.representante_email = ''
                emp.representante_telefone = ''
                emp.endereco = 'ANONIMIZADO'
                emp.numero = ''
                emp.bairro = ''
                emp.cidade = ''
                emp.estado = ''
                emp.cep = ''
                emp.save()
            except Empresa.DoesNotExist:
                pass

        # Anonimiza dados do usuário
        user.first_name = 'Usuário'
        user.last_name = 'Removido'
        user.email = f'removido_{user.id}@anonimizado.local'
        user.telefone = ''
        user.is_active = False
        user.set_password(None)
        user.save()

        log_lgpd(request, 'LGPD_EXCLUSAO',
                 f'Dados do usuário "{nome_original}" (ID: {user.id}) anonimizados por solicitação LGPD')

        return Response({
            'mensagem': 'Seus dados pessoais foram anonimizados com sucesso conforme LGPD (Art. 18, VI). '
                        'Sua conta foi desativada.',
        })

    except Exception as e:
        return Response({'erro': str(e)}, status=500)


# ─── Relatórios de gestão ───
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorios_gestao(request):
    """
    Endpoint de relatórios e gráficos de gestão para a empresa.
    Retorna dados consolidados para geração de gráficos no frontend.
    """
    try:
        from questionarios.models import Avaliacao
        from django.db.models.functions import TruncMonth

        empresa = Empresa.objects.get(usuario=request.user)
        funcionarios = Funcionario.objects.filter(empresa=empresa, ativo=True)
        total_funcionarios = funcionarios.count()

        # Evolução mensal de avaliações
        avaliacoes = Avaliacao.objects.filter(
            funcionario__in=funcionarios
        ).order_by('data_avaliacao')

        evolucao_mensal = list(
            avaliacoes.annotate(mes=TruncMonth('data_avaliacao'))
            .values('mes')
            .annotate(
                total=Count('id'),
                media_pontuacao=Avg('pontuacao_total'),
                bom=Count('id', filter=Q(nivel='bom')),
                medio=Count('id', filter=Q(nivel='medio')),
                risco=Count('id', filter=Q(nivel='risco')),
            )
            .order_by('mes')
        )

        for item in evolucao_mensal:
            item['mes'] = item['mes'].strftime('%Y-%m') if item['mes'] else None
            item['media_pontuacao'] = round(item['media_pontuacao'], 1) if item['media_pontuacao'] else 0

        # Distribuição por departamento
        from django.db.models import Subquery, OuterRef
        departamentos_data = []
        for dept in funcionarios.values_list('departamento', flat=True).distinct():
            if not dept:
                continue
            funcs_dept = funcionarios.filter(departamento=dept)
            total_dept = funcs_dept.count()

            niveis = {'bom': 0, 'medio': 0, 'risco': 0, 'sem_avaliacao': 0}
            for func in funcs_dept:
                ultima = Avaliacao.objects.filter(funcionario=func).order_by('-data_avaliacao').first()
                if ultima:
                    niveis[ultima.nivel] += 1
                else:
                    niveis['sem_avaliacao'] += 1

            departamentos_data.append({
                'departamento': dept,
                'total_funcionarios': total_dept,
                **niveis,
            })

        # Distribuição por gênero
        genero_data = list(
            funcionarios.values('genero').annotate(total=Count('id')).exclude(genero='')
        )

        # Distribuição por turno
        turno_data = list(
            funcionarios.values('turno').annotate(total=Count('id')).exclude(turno='')
        )

        # Top funcionários em risco
        funcionarios_risco = []
        for func in funcionarios:
            ultima = Avaliacao.objects.filter(funcionario=func).order_by('-data_avaliacao').first()
            if ultima and ultima.nivel == 'risco':
                funcionarios_risco.append({
                    'id': func.id,
                    'nome': func.usuario.get_full_name(),
                    'cargo': func.cargo,
                    'departamento': func.departamento,
                    'pontuacao': ultima.pontuacao_total,
                    'data_avaliacao': ultima.data_avaliacao,
                })

        # Taxa de participação
        total_com_avaliacao = sum(
            1 for f in funcionarios
            if Avaliacao.objects.filter(funcionario=f).exists()
        )
        taxa_participacao = round(total_com_avaliacao / max(total_funcionarios, 1) * 100, 1)

        return Response({
            'resumo': {
                'total_funcionarios': total_funcionarios,
                'total_avaliacoes': avaliacoes.count(),
                'taxa_participacao': taxa_participacao,
                'total_com_avaliacao': total_com_avaliacao,
            },
            'evolucao_mensal': evolucao_mensal,
            'departamentos': departamentos_data,
            'distribuicao_genero': genero_data,
            'distribuicao_turno': turno_data,
            'funcionarios_risco': funcionarios_risco,
        })

    except Empresa.DoesNotExist:
        return Response({'erro': 'Acesso negado'}, status=403)
    except Exception as e:
        return Response({'erro': str(e)}, status=500)
