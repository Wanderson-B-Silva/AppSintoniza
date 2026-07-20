"""
data_loader.py - Módulo de carregamento e validação de dados
Responsável pela ingestão de datasets estruturados (CSV/XLSX)
"""

import os
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class DataLoader:
    """
    Classe responsável pelo carregamento e validação inicial do dataset.
    Suporta arquivos CSV e XLSX.
    """

    COLUNAS_ESPERADAS = [
        'Idade', 'Tempo Empresa (anos)',
        'Estresse (0-10)', 'Burnout (0-10)', 'Satisfação (0-10)',
        'Relacionamentos (0-10)', 'Carga Trabalho (0-10)',
        'Equilíbrio V/T (0-10)', 'Autonomia (0-10)',
        'Reconhecimento (0-10)', 'Comunicação Gestor (0-10)',
        'Segurança Psicológica (0-10)', 'Suporte Pares (0-10)',
        'Clareza de Papel (0-10)', 'Ausências (dias)',
        'Horas Extras/semana',
    ]

    COLUNA_TARGET = 'Nível de Risco'

    def __init__(self, caminho_arquivo=None):
        if caminho_arquivo is None:
            caminho_arquivo = os.path.join(
                os.path.dirname(__file__), 'data', 'saude_mental_trabalhadores.xlsx'
            )
        self.caminho_arquivo = caminho_arquivo
        self.df = None

    def carregar(self):
        """Carrega o dataset a partir do arquivo configurado."""
        ext = os.path.splitext(self.caminho_arquivo)[1].lower()
        if ext == '.csv':
            self.df = pd.read_csv(self.caminho_arquivo)
        elif ext in ('.xlsx', '.xls'):
            self.df = pd.read_excel(self.caminho_arquivo)
        else:
            raise ValueError(f"Formato de arquivo não suportado: {ext}")

        logger.info(
            f"Dataset carregado: {self.df.shape[0]} linhas x {self.df.shape[1]} colunas"
        )
        return self.df

    def validar(self):
        """Valida a estrutura e integridade do dataset."""
        if self.df is None:
            raise RuntimeError("Dataset não carregado. Execute carregar() primeiro.")

        erros = []

        # Verificar coluna target
        if self.COLUNA_TARGET not in self.df.columns:
            erros.append(f"Coluna target '{self.COLUNA_TARGET}' não encontrada.")

        # Verificar colunas de features
        colunas_faltando = [
            c for c in self.COLUNAS_ESPERADAS if c not in self.df.columns
        ]
        if colunas_faltando:
            erros.append(f"Colunas faltando: {colunas_faltando}")

        # Verificar registros vazios
        total_nulos = self.df[self.COLUNAS_ESPERADAS].isnull().sum().sum()
        if total_nulos > 0:
            logger.warning(f"Dataset possui {total_nulos} valores nulos nas features.")

        # Verificar tipos de dados
        for col in self.COLUNAS_ESPERADAS:
            if col in self.df.columns:
                if not pd.api.types.is_numeric_dtype(self.df[col]):
                    erros.append(f"Coluna '{col}' deveria ser numérica.")

        resultado = {
            'valido': len(erros) == 0,
            'erros': erros,
            'total_registros': len(self.df),
            'total_colunas': len(self.df.columns),
            'colunas': list(self.df.columns),
            'tipos_dados': {col: str(dtype) for col, dtype in self.df.dtypes.items()},
            'valores_nulos': self.df.isnull().sum().to_dict(),
            'distribuicao_target': self.df[self.COLUNA_TARGET].value_counts().to_dict()
            if self.COLUNA_TARGET in self.df.columns else {},
        }

        logger.info(
            f"Validação concluída: {'OK' if resultado['valido'] else 'FALHOU'}"
        )
        return resultado

    def obter_features_e_target(self):
        """Retorna X (features) e y (target) separados."""
        if self.df is None:
            self.carregar()

        colunas_disponiveis = [
            c for c in self.COLUNAS_ESPERADAS if c in self.df.columns
        ]
        X = self.df[colunas_disponiveis].copy()
        y = self.df[self.COLUNA_TARGET].copy()

        return X, y

    def obter_estatisticas(self):
        """Retorna estatísticas descritivas do dataset."""
        if self.df is None:
            self.carregar()

        colunas_num = [
            c for c in self.COLUNAS_ESPERADAS if c in self.df.columns
        ]
        stats = self.df[colunas_num].describe().to_dict()

        return {
            'descritivas': stats,
            'total_registros': len(self.df),
            'distribuicao_target': self.df[self.COLUNA_TARGET].value_counts().to_dict(),
        }
