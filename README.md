# 🚀 SailPoint Custom SaaS Connector: Airtable Integration

![SailPoint](https://img.shields.io/badge/SailPoint-Identity_Security_Cloud-005E7A?style=for-the-badge&logo=sailpoint)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

Este repositório contém o código-fonte de um **Custom SaaS Connector** desenvolvido para a plataforma SailPoint Identity Security Cloud (ISC). O conector foi construído utilizando o SaaS Connector SDK oficial (TypeScript/Node.js) e realiza a gestão do ciclo de vida de identidades de um sistema interno simulado utilizando o **Airtable**.

Esta é uma solução *Cloud-Native* e *Serverless*, eliminando a necessidade de infraestrutura local (Virtual Appliances) e executando os comandos diretamente no cluster da SailPoint.

---

## 📋 Pré-requisitos

Para executar e fazer o deploy deste projeto, você precisará de:

* [Node.js](https://nodejs.org/) (Versão 18 ou superior)
* [SailPoint CLI](https://developer.sailpoint.com/docs/tools/cli/) instalado e configurado.
* Acesso de Administrador a um Tenant do SailPoint Identity Security Cloud (ISC).
* Uma conta no Airtable com acesso a uma Base de testes e um **Personal Access Token (PAT)**.

---

## 🛠️ Estrutura do Projeto

* `src/index.ts`: O "cérebro" do conector. Intercepta as chamadas da nuvem da SailPoint e aciona as rotas corretas.
* `src/my-client.ts`: O "tradutor". Contém a lógica de comunicação REST (HTTP) com a API do Airtable.
* `connector-spec.json`: A "vitrine". Define os comandos suportados, os campos da interface gráfica (UI) no SailPoint e o esquema de dados (`id`, `name`, `email`).
* `package.json`: Gerenciamento de dependências e scripts de build.

---

## ⚙️ Comandos Suportados

Este conector foi configurado para suportar as seguintes operações de gerenciamento de contas (`std:account`) e permissões (`std:entitlement`):

- [x] `std:test-connection`: Valida a comunicação entre o SailPoint e a API do Airtable.
- [x] `std:account:list`: Agrega (lê) todas as contas existentes na base de dados.
- [x] `std:account:read`: Lê os detalhes de uma conta específica.
- [x] `std:account:create`: Provisiona uma nova conta via código.
- [x] `std:account:update`: Atualiza atributos de uma conta via código.
- [x] `std:account:delete`: Remove uma conta do sistema.
- [x] `std:entitlement:list`: Agrega (lê) os grupos de permissão disponíveis no sistema (Airtable User / Admin).
- [x] `std:account:disable: Inativa o usuário no Airtable marcando o campo Inactive.
- [x] `std:account:enable: Reativa o usuário desmarcando o campo Inactive.

---

## 🚀 Como fazer o Deploy (Passo a Passo)

### 1. Instalação e Build Local
Clone o repositório, instale as dependências e gere o pacote final (`.zip`):

```bash
# Instalar as dependências do projeto
npm install

# Compilar o código TypeScript para a pasta /dist
npm run build

# Empacotar o código e o manifesto visual em um arquivo ZIP
npm run pack-zip

# Nota sobre o Pacote de Deploy:
Caso o script automático falhe, o deploy manual deve seguir esta ordem:
Executar npm run build.
Copiar o arquivo connector-spec.json e packge.json para a pasta /dist.
Compactar o conteúdo da pasta /dist (incluindo os arquivos .js e .json) em um arquivo chamado connector.zip.

### 2. Autenticação na SailPoint CLI
Certifique-se de que sua CLI está apontando para o endereço de API do seu Tenant e autenticada via PAT.
sail config ou sail env setup

Base/Tenant URL: https://{seu-tenant}.api.identitynow.com (Nota: O sufixo .api é obrigatório para deploy).

Authentication Type: pat

Credenciais: Insira seu Client ID e Client Secret.

### 3. Upload para a Nuvem
Crie o registro do conector e faça o upload do arquivo ZIP gerado no passo 1.

# Registrar o conector na plataforma
sail conn create "meu-airtable-connector"

# Enviar o arquivo compilado
sail conn upload -c "meu-airtable-connector" -f dist/nome-do-arquivo.zip

### 4. Configuração da Source no SailPoint ISC

Acesse o painel web corporativo do SailPoint ISC.

1. Navegue até **Connections > Sources > Create New**.
2. Pesquise pelo nome do seu conector e selecione-o.
3. Na aba **Configuration**, preencha:
   * **Airtable PAT (Token):** Seu Personal Access Token do Airtable.
   * **Airtable Base ID:** O ID da base que será gerenciada (ex: appXYZ...).
4. Clique em **Save** e depois em **Test Connection**.
5. Vá até a aba **Import Data** e inicie uma **Account Aggregation** para sincronizar os usuários.
6. Ajuste de Segurança (Threshold):
Se você alterou a lógica de IDs e a agregação retornar um aviso de "Threshold exceeded", vá em Account Management > Account Aggregation.
Altere o campo Percentage of Deleted Accounts para 100% e salve para permitir a sincronização inicial.
7. Ativação Manual de Provisionamento (Interface):
Além da requisição de API via PATCH, verifique na aba Review da Source se a opção Allow Access Requests está marcada como ativa. Isso garante que o SailPoint use o conector para novas solicitações.
8. Disponibilização para o Usuário (Access Profile):
Para que a conta possa ser solicitada, crie um Access Profile vinculado aos Entitlements (User ou Admin) que o conector agregou.
9. Vá em **Entitlement Management > Entitlement Aggregation** e inicie a agregação para carregar os perfis de acesso disponíveis.

👨‍💻 Autor
Bruno Henrique Desenvolvido como projeto de laboratório e prova de conceito arquitetural para gestão de identidades SaaS-to-SaaS.
