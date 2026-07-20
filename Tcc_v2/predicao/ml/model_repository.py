"""
model_repository.py - Módulo de persistência do modelo
Responsável por salvar e carregar modelo.pkl, scaler.pkl e metadados.
"""

import os
import json
import joblib
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Diretório padrão para artefatos do modelo
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')


class ModelRepository:
    """
    Classe responsável pela persistência e carregamento dos artefatos do modelo.
    Artefatos persistidos: modelo.pkl, scaler.pkl, features.json, metricas.json
    """

    def __init__(self, diretorio=None):
        self.diretorio = diretorio or MODELS_DIR
        os.makedirs(self.diretorio, exist_ok=True)

    def salvar_modelo(self, modelo, preprocessador, feature_names, metricas=None):
        """
        Salva todos os artefatos do modelo treinado.

        Args:
            modelo: modelo sklearn treinado
            preprocessador: instância do PreProcessador com scaler ajustado
            feature_names: lista de nomes das features usadas
            metricas: dict com métricas de avaliação

        Returns:
            dict com caminhos dos arquivos salvos
        """
        caminhos = {}

        # 1. Salvar modelo treinado
        caminho_modelo = os.path.join(self.diretorio, 'modelo.pkl')
        joblib.dump(modelo, caminho_modelo)
        caminhos['modelo'] = caminho_modelo
        logger.info(f"Modelo salvo em: {caminho_modelo}")

        # 2. Salvar scaler de normalização
        caminho_scaler = os.path.join(self.diretorio, 'scaler.pkl')
        joblib.dump(preprocessador.scaler, caminho_scaler)
        caminhos['scaler'] = caminho_scaler
        logger.info(f"Scaler salvo em: {caminho_scaler}")

        # 3. Salvar imputer
        caminho_imputer = os.path.join(self.diretorio, 'imputer.pkl')
        joblib.dump(preprocessador.imputer, caminho_imputer)
        caminhos['imputer'] = caminho_imputer

        # 4. Salvar preprocessador completo
        caminho_preprocessador = os.path.join(self.diretorio, 'preprocessador.pkl')
        joblib.dump(preprocessador, caminho_preprocessador)
        caminhos['preprocessador'] = caminho_preprocessador

        # 5. Salvar lista de features
        caminho_features = os.path.join(self.diretorio, 'features.json')
        with open(caminho_features, 'w', encoding='utf-8') as f:
            json.dump({
                'features': feature_names,
                'total': len(feature_names),
                'data_salvamento': datetime.now().isoformat(),
            }, f, ensure_ascii=False, indent=2)
        caminhos['features'] = caminho_features

        # 6. Salvar métricas
        if metricas:
            caminho_metricas = os.path.join(self.diretorio, 'metricas.json')
            with open(caminho_metricas, 'w', encoding='utf-8') as f:
                json.dump(metricas, f, ensure_ascii=False, indent=2)
            caminhos['metricas'] = caminho_metricas

        logger.info(f"Todos os artefatos salvos em: {self.diretorio}")
        return caminhos

    def carregar_modelo(self):
        """
        Carrega o modelo e seus artefatos.

        Returns:
            dict com modelo, preprocessador, features e métricas
        """
        artefatos = {}

        # Modelo
        caminho_modelo = os.path.join(self.diretorio, 'modelo.pkl')
        if not os.path.exists(caminho_modelo):
            raise FileNotFoundError(
                f"Modelo não encontrado em: {caminho_modelo}. "
                "Execute o treinamento primeiro."
            )
        artefatos['modelo'] = joblib.load(caminho_modelo)
        logger.info("Modelo carregado com sucesso.")

        # Preprocessador
        caminho_preprocessador = os.path.join(self.diretorio, 'preprocessador.pkl')
        if os.path.exists(caminho_preprocessador):
            artefatos['preprocessador'] = joblib.load(caminho_preprocessador)
        else:
            # Fallback: carregar scaler e imputer separados
            caminho_scaler = os.path.join(self.diretorio, 'scaler.pkl')
            caminho_imputer = os.path.join(self.diretorio, 'imputer.pkl')
            if os.path.exists(caminho_scaler):
                artefatos['scaler'] = joblib.load(caminho_scaler)
            if os.path.exists(caminho_imputer):
                artefatos['imputer'] = joblib.load(caminho_imputer)

        # Features
        caminho_features = os.path.join(self.diretorio, 'features.json')
        if os.path.exists(caminho_features):
            with open(caminho_features, 'r', encoding='utf-8') as f:
                artefatos['features_info'] = json.load(f)

        # Métricas
        caminho_metricas = os.path.join(self.diretorio, 'metricas.json')
        if os.path.exists(caminho_metricas):
            with open(caminho_metricas, 'r', encoding='utf-8') as f:
                artefatos['metricas'] = json.load(f)

        return artefatos

    def modelo_existe(self):
        """Verifica se existe um modelo salvo."""
        return os.path.exists(os.path.join(self.diretorio, 'modelo.pkl'))

    def obter_info_modelo(self):
        """Retorna informações sobre o modelo salvo."""
        if not self.modelo_existe():
            return {'existe': False}

        info = {'existe': True, 'diretorio': self.diretorio}

        # Info do modelo
        caminho_modelo = os.path.join(self.diretorio, 'modelo.pkl')
        info['tamanho_modelo_kb'] = round(
            os.path.getsize(caminho_modelo) / 1024, 1
        )

        # Features
        caminho_features = os.path.join(self.diretorio, 'features.json')
        if os.path.exists(caminho_features):
            with open(caminho_features, 'r') as f:
                info['features'] = json.load(f)

        # Métricas
        caminho_metricas = os.path.join(self.diretorio, 'metricas.json')
        if os.path.exists(caminho_metricas):
            with open(caminho_metricas, 'r') as f:
                info['metricas'] = json.load(f)

        return info
