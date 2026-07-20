"""
preprocessing.py - Módulo de pré-processamento de dados
Responsável por tratamento de valores faltantes, encoding de variáveis
categóricas e normalização/padronização de features.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
import logging

logger = logging.getLogger(__name__)


class PreProcessador:
    """
    Classe responsável pelo pré-processamento dos dados para ML.
    Implementa pipeline completo: imputação, encoding e normalização.
    """

    # Mapeamento ordinal do target (nível de risco)
    MAPA_RISCO = {
        'Baixo': 0,
        'Médio': 1,
        'Alto': 2,
        'Crítico': 3,
    }

    MAPA_RISCO_INVERSO = {v: k for k, v in MAPA_RISCO.items()}

    def __init__(self):
        self.scaler = StandardScaler()
        self.imputer = SimpleImputer(strategy='median')
        self.label_encoder = LabelEncoder()
        self.feature_names = None
        self._fitted = False

    def fit_transform(self, X, y=None):
        """
        Ajusta o preprocessador e transforma os dados de treino.

        Args:
            X: DataFrame com as features
            y: Series com o target (opcional, será codificado se fornecido)

        Returns:
            X_processado: array numpy com features processadas
            y_codificado: array numpy com target codificado (se y fornecido)
        """
        self.feature_names = list(X.columns)

        # 1. Imputação de valores faltantes (mediana para numéricos)
        X_imputado = pd.DataFrame(
            self.imputer.fit_transform(X),
            columns=self.feature_names,
            index=X.index
        )
        logger.info("Valores faltantes tratados com imputação pela mediana.")

        # 2. Normalização/padronização (StandardScaler: média=0, desvio=1)
        X_normalizado = self.scaler.fit_transform(X_imputado)
        logger.info("Features normalizadas com StandardScaler (média=0, std=1).")

        self._fitted = True

        # 3. Codificação do target (Label Encoding ordinal)
        y_codificado = None
        if y is not None:
            y_codificado = y.map(self.MAPA_RISCO).values
            logger.info(
                f"Target codificado: {self.MAPA_RISCO}"
            )

        return X_normalizado, y_codificado

    def transform(self, X):
        """
        Transforma novos dados usando o preprocessador já ajustado.

        Args:
            X: DataFrame ou dict com as features

        Returns:
            X_processado: array numpy com features processadas
        """
        if not self._fitted:
            raise RuntimeError(
                "Preprocessador não ajustado. Execute fit_transform() primeiro."
            )

        # Se recebeu dict, converte para DataFrame
        if isinstance(X, dict):
            X = pd.DataFrame([X])

        # Garantir que as colunas estejam na ordem correta
        colunas_faltando = [c for c in self.feature_names if c not in X.columns]
        if colunas_faltando:
            raise ValueError(f"Colunas faltando na entrada: {colunas_faltando}")

        X = X[self.feature_names]

        # Imputação + normalização
        X_imputado = self.imputer.transform(X)
        X_normalizado = self.scaler.transform(X_imputado)

        return X_normalizado

    def decodificar_target(self, y_codificado):
        """Converte códigos numéricos de volta para labels de risco."""
        if isinstance(y_codificado, (int, np.integer)):
            return self.MAPA_RISCO_INVERSO.get(int(y_codificado), 'Desconhecido')
        return [
            self.MAPA_RISCO_INVERSO.get(int(v), 'Desconhecido')
            for v in y_codificado
        ]

    def obter_info_preprocessamento(self):
        """Retorna informações sobre o preprocessamento aplicado."""
        if not self._fitted:
            return {'status': 'Não ajustado'}

        return {
            'features': self.feature_names,
            'total_features': len(self.feature_names),
            'estrategia_imputacao': 'mediana',
            'normalizacao': 'StandardScaler (média=0, desvio=1)',
            'codificacao_target': self.MAPA_RISCO,
            'medias_scaler': dict(zip(
                self.feature_names,
                [round(m, 4) for m in self.scaler.mean_]
            )),
            'desvios_scaler': dict(zip(
                self.feature_names,
                [round(s, 4) for s in self.scaler.scale_]
            )),
        }
