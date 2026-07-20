# questionarios/services.py

class CalculadoraPontuacao:
    """
    Classe responsável por calcular pontuações e níveis de saúde mental
    """
    
    @staticmethod
    def calcular_nivel(pontuacao_total):
        """
        Define o nível baseado na pontuação total
        Ajuste os valores conforme sua necessidade
        """
        if pontuacao_total <= 50:
            return 'bom'
        elif pontuacao_total <= 100:
            return 'medio'
        else:
            return 'risco'
    
    @staticmethod
    def gerar_recomendacoes(nivel):
        """
        Gera recomendações personalizadas baseadas no nível
        """
        recomendacoes = {
            'bom': 'Parabéns! Sua saúde mental está em bom estado. Continue praticando autocuidado e confira nossos conteúdos para manter esse equilíbrio.',
            'medio': 'Atenção! Alguns sinais merecem sua atenção. Recomendamos assistir aos vídeos sobre gerenciamento de estresse e técnicas de relaxamento disponíveis no app.',
            'risco': 'É importante buscar apoio profissional. Um psicólogo da nossa rede entrará em contato em breve. Enquanto isso, confira nossos conteúdos sobre saúde mental e bem-estar.'
        }
        return recomendacoes.get(nivel, '')