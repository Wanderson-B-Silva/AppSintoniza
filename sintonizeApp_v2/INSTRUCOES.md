# Sintoniza · Como rodar este projeto

Projeto **frontend** (Expo / React Native) já com todas as melhorias aplicadas.
O `node_modules` não vem incluído para reduzir o tamanho — basta reinstalar.

## Passos

1. Abra a pasta no terminal:
   cd sintonizeApp_v2

2. Instale as dependências (usa o package-lock.json incluído):
   npm install

3. Confirme o IP do servidor Django em `services/api.ts`
   (hoje está fixo em 192.168.0.71 para Android/iOS).

4. Rode o app com o cache limpo:
   npx expo start -c

## Observações
- Nenhuma biblioteca nova foi adicionada: os gráficos são em React Native puro.
- O backend (Django, pasta Tcc_v2) não foi alterado — continue usando o seu.
- Veja `ANALISE_E_MELHORIAS.md` para o resumo das mudanças e o que ainda falta.
