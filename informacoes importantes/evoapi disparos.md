# Sumário do SaaS de Disparos WhatsApp

## **Visão Geral**
- **Produto**: SaaS para disparos de WhatsApp voltado para agências
- **Modelo**: Solução pronta (não white label) implementada para agências
- **Stack Tecnológico**: 
  - Backend/BD: Supabase
  - Frontend: Next.js + React + HeroUI
  - WhatsApp API: Evolution API

## **Funcionalidades Principais**

### 1. **Dashboard Principal (Home)**
Métricas agregadas de todos os clientes:
- Quantidade total de disparos
- Disparos agendados para o dia
- Disparos enviados no dia
- Taxa de sucesso/falha
- Quantidade de respostas recebidas
- Quantidade de pessoas que saíram da lista

### 2. **Gestão de Clientes**
- Cadastro de clientes das agências
- Campos do cliente:
  - Nome do cliente
  - Foto (opcional)
- Upload de leads via planilha
- Base de leads organizada por cliente

### 3. **Sistema de Campanhas**
Funcionalidades para criação de campanhas:
- **Configurações básicas**:
  - Data/hora de início
  - Quantidade de leads alvo
  - Volume diário de disparos
  - Atribuição de instância Evolution API específica
- **Conteúdo**:
  - Upload de mídia
  - Definição de legenda/mensagem

### 4. **Gestão de Respostas**
Sistema para processar respostas dos leads:
- **"Sair da lista"**: Remove automaticamente o lead da base
- **"Eu quero"**: Direciona para área de agendamentos
- Contabilização de todas as respostas para métricas

### 5. **Área de Agendamentos**
- Gestão de leads que responderam positivamente
- Controle de leads interessados para follow-up

## **Arquitetura do Sistema**

### **Backend (Supabase)**
- Banco de dados relacional
- Autenticação e autorização
- APIs para CRUD de clientes, campanhas e leads
- Orquestração de disparos

### **Frontend (Next.js + React + HeroUI)**
- Dashboard responsivo
- Interface para gestão de clientes
- Criador de campanhas
- Visualização de métricas e relatórios

### **Integração WhatsApp**
- Evolution API para cada cliente
- Gestão de instâncias múltiplas
- Processamento de webhooks para respostas

## **Fluxo de Trabalho**

1. **Setup do Cliente**
   - Cadastrar cliente na plataforma
   - Fazer upload da base de leads (planilha)
   - Configurar instância Evolution API

2. **Criação da Campanha**
   - Selecionar cliente
   - Definir cronograma e volume
   - Configurar conteúdo (mídia + legenda)
   - Ativar campanha

3. **Execução e Monitoramento**
   - Disparos automáticos conforme programado
   - Recebimento e processamento de respostas
   - Atualização de métricas em tempo real
   - Gestão de leads interessados

## **Requisitos Técnicos**

### **Banco de Dados**
- Tabelas para: clientes, leads, campanhas, disparos, respostas
- Relacionamentos entre entidades
- Índices para performance

### **APIs Necessárias**
- CRUD de clientes e leads
- Criação e gestão de campanhas
- Processamento de upload de planilhas
- Webhooks para respostas do WhatsApp
- Métricas e relatórios

### **Integrações**
- Evolution API (múltiplas instâncias)
- Processamento de arquivos (planilhas)
- Sistema de agendamento de disparos