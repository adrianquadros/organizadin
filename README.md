
# OrganizaDin SaaS MVP

Gerador profissional de planilhas financeiras com gráficos nativos Excel.

## Configuração de Autenticação (Firebase)
Para que o login com Google funcione:
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o provedor **Google** em *Authentication > Sign-in method*.
3. Copie as chaves de configuração do SDK do Firebase e substitua o objeto `firebaseConfig` no topo do arquivo `App.tsx`.
4. Adicione o domínio da aplicação (ex: localhost) aos domínios autorizados no Firebase.

## Modo de Teste (Dev Plan Override)
Para testar os limites e funcionalidades dos planos pagos sem assinar:
1. No arquivo `.env` (ou no ambiente de execução), defina a variável:
   ```env
   VITE_DEV_PLAN_OVERRIDE=PRO
   # Opções: FREE, PRO, ANUAL
   ```
2. Ao iniciar em modo dev, o app detectará automaticamente o plano selecionado.
3. Um badge vermelho aparecerá no header indicando que o modo override está ativo.

## Limites de Geração
- **Visitante (Sem Login)**: 1 geração por mês (rastreado via localStorage).
- **Logado (Google)**: 2 gerações por mês (rastreado por ID de usuário).
- **Reset**: Os limites resetam automaticamente a cada virada de mês.

## Tecnologias
- **React 19** + **Tailwind CSS**
- **Pyodide** (Python no Browser)
- **XlsxWriter** (Gráficos Nativos Excel)
- **Firebase Auth** (Login Social)
