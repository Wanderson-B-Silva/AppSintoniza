"""
training.py - Módulo de treinamento do modelo de Machine Learning
Implementa pipeline de treinamento supervisionado para classificação
do nível de risco de saúde mental.
"""

import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import logging

logger = logging.getLogger(__name__)


class TreinadorModelo:
    """
    Classe responsável pelo treinamento de modelos de classificação
    para predição de nível de risco em saúde mental.
    """

    MODELOS_DISPONIVEIS = {
        'random_forest': RandomForestClassifier,
        'gradient_boosting': GradientBoostingClassifier,
        'logistic_regression': LogisticRegression,
        'svm': SVC,
    }

    def __init__(self, algoritmo='random_forest', random_state=42):
        self.algoritmo = algoritmo
        self.random_state = random_state
        self.modelo = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.y_pred = None
        self.resultados_cv = None

    def separar_dados(self, X, y, test_size=0.2):
        """
        Divide os dados em conjunto de treino (80%) e teste (20%).

        Args:
            X: features processadas
            y: target codificado
            test_size: proporção do conjunto de teste

        Returns:
            X_train, X_test, y_train, y_test
        """
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y  # Mantém proporção das classes
        )

        logger.info(
            f"Dados separados: {len(self.X_train)} treino, "
            f"{len(self.X_test)} teste ({test_size*100:.0f}% teste)"
        )

        return self.X_train, self.X_test, self.y_train, self.y_test

    def treinar(self, X_train=None, y_train=None):
        """
        Treina o modelo com os dados de treino.

        Args:
            X_train: features de treino (usa self.X_train se None)
            y_train: target de treino (usa self.y_train se None)

        Returns:
            modelo treinado
        """
        if X_train is None:
            X_train = self.X_train
        if y_train is None:
            y_train = self.y_train

        if X_train is None or y_train is None:
            raise RuntimeError(
                "Dados de treino não disponíveis. Execute separar_dados() primeiro."
            )

        # Configuração dos hiperparâmetros por algoritmo
        params = self._obter_parametros()

        # Instanciar e treinar modelo
        classe_modelo = self.MODELOS_DISPONIVEIS[self.algoritmo]
        self.modelo = classe_modelo(**params)
        self.modelo.fit(X_train, y_train)

        logger.info(
            f"Modelo {self.algoritmo} treinado com {len(X_train)} amostras."
        )

        return self.modelo

    def predizer(self, X_test=None):
        """Realiza predições no conjunto de teste."""
        if self.modelo is None:
            raise RuntimeError("Modelo não treinado. Execute treinar() primeiro.")

        if X_test is None:
            X_test = self.X_test

        self.y_pred = self.modelo.predict(X_test)

        return self.y_pred

    def predizer_probabilidade(self, X):
        """Retorna as probabilidades de cada classe."""
        if self.modelo is None:
            raise RuntimeError("Modelo não treinado.")

        if hasattr(self.modelo, 'predict_proba'):
            return self.modelo.predict_proba(X)

        return None

    def validacao_cruzada(self, X, y, cv=5):
        """
        Realiza validação cruzada com k-folds.

        Args:
            X: todas as features
            y: todos os targets
            cv: número de folds

        Returns:
            dict com scores de cada fold e média
        """
        params = self._obter_parametros()
        classe_modelo = self.MODELOS_DISPONIVEIS[self.algoritmo]
        modelo_cv = classe_modelo(**params)

        scores = cross_val_score(modelo_cv, X, y, cv=cv, scoring='accuracy')

        self.resultados_cv = {
            'scores': scores.tolist(),
            'media': round(float(scores.mean()), 4),
            'desvio_padrao': round(float(scores.std()), 4),
            'folds': cv,
        }

        logger.info(
            f"Validação cruzada ({cv}-fold): "
            f"Acurácia = {self.resultados_cv['media']:.4f} "
            f"(±{self.resultados_cv['desvio_padrao']:.4f})"
        )

        return self.resultados_cv

    def obter_importancia_features(self, feature_names):
        """Retorna a importância de cada feature (se o modelo suportar)."""
        if self.modelo is None:
            raise RuntimeError("Modelo não treinado.")

        if hasattr(self.modelo, 'feature_importances_'):
            importancias = self.modelo.feature_importances_
            resultado = sorted(
                zip(feature_names, importancias),
                key=lambda x: x[1],
                reverse=True
            )
            return [
                {'feature': nome, 'importancia': round(float(imp), 4)}
                for nome, imp in resultado
            ]

        return None

    def _obter_parametros(self):
        """Retorna os hiperparâmetros configurados para o algoritmo selecionado."""
        parametros = {
            'random_forest': {
                'n_estimators': 200,
                'max_depth': 15,
                'min_samples_split': 5,
                'min_samples_leaf': 2,
                'random_state': self.random_state,
                'class_weight': 'balanced',
                'n_jobs': -1,
            },
            'gradient_boosting': {
                'n_estimators': 150,
                'max_depth': 5,
                'learning_rate': 0.1,
                'random_state': self.random_state,
            },
            'logistic_regression': {
                'max_iter': 1000,
                'random_state': self.random_state,
                'multi_class': 'multinomial',
                'class_weight': 'balanced',
            },
            'svm': {
                'kernel': 'rbf',
                'random_state': self.random_state,
                'probability': True,
                'class_weight': 'balanced',
            },
        }

        return parametros.get(self.algoritmo, {})
