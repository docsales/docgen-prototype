# ⚡ Configuração Rápida - OCR

## 🚨 Erro: "URL base do OCR não configurada"

Se você está vendo este erro, siga os passos abaixo:

---

## 📝 Passo 1: Criar Arquivo `.env`

Na raiz do projeto `docgen-web-prototype/`, crie um arquivo chamado `.env`:

```bash
cd /root/workspace/docgen/docgen-web-prototype
touch .env
```

---

## 📄 Passo 2: Adicionar Configurações

Cole o seguinte conteúdo no arquivo `.env`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3004

# ========================================
# OCR Configuration (LLMWhisperer)
# ========================================

# URL base da API LLMWhisperer (OBRIGATÓRIO)
# Substitua com sua instância real
VITE_OCR_BASE_URL=https://sua-instancia-llmwhisperer.com

# API Key (se necessário)
VITE_OCR_API_KEY=sua_api_key_aqui

# URL do webhook (já configurada)
VITE_OCR_WEBHOOK_URL=https://n8n-staging.docsales.com/webhook-test/3e8934b3-d642-4b5f-963e-459bdff9ec1a

# Modo de processamento
VITE_OCR_DEFAULT_MODE=high_quality

# Formato de saída
VITE_OCR_DEFAULT_OUTPUT_MODE=text
```

---

## 🔑 Passo 3: Obter Credenciais do LLMWhisperer

### Opção A: Você já tem uma instância LLMWhisperer

1. Pegue a URL da sua instância (ex: `https://api.llmwhisperer.com`)
2. Pegue sua API Key
3. Substitua no `.env` acima

### Opção B: Você ainda não tem acesso ao LLMWhisperer

**Opção Temporária - Desabilitar OCR:**

Adicione esta linha no `.env`:

```bash
VITE_OCR_DISABLED=true
```

Isso vai desabilitar o processamento OCR até você ter as credenciais.

---

## 🔄 Passo 4: Reiniciar Servidor

Após criar/editar o `.env`, você **DEVE** reiniciar o servidor:

```bash
# Parar o servidor (Ctrl+C)
# Depois reiniciar:
npm run dev
```

**IMPORTANTE**: Mudanças no `.env` só são aplicadas após reiniciar!

---

## ✅ Passo 5: Testar

1. Recarregue a página no navegador (F5)
2. Vá para "Nova Negociação"
3. Faça upload de um documento
4. Se configurado corretamente, você verá:
   ```
   🚀 Iniciando processamento OCR: nome_arquivo.jpg
   📤 Enviando documento para OCR: {...}
   ✅ Upload concluído
   ```

Se ainda não tiver credenciais, você verá:
```
⚠️ VITE_OCR_BASE_URL não configurada. OCR não será processado.
```

Mas **sem erro** - o upload continuará funcionando normalmente.

---

## 🧪 Modo de Desenvolvimento (Sem API Real)

Se você quiser testar a interface sem chamar a API real:

1. Adicione no `.env`:
   ```bash
   VITE_OCR_BASE_URL=http://localhost:9999
   VITE_OCR_DISABLED=true
   ```

2. A interface funcionará normalmente
3. Use o botão "🧪 Simular Webhook" para testar conclusão

---

## 📋 Checklist de Verificação

- [ ] Arquivo `.env` foi criado na raiz de `docgen-web-prototype/`
- [ ] `VITE_OCR_BASE_URL` está configurada (ou OCR desabilitado)
- [ ] Servidor foi reiniciado após criar `.env`
- [ ] Página foi recarregada no navegador
- [ ] Não há mais erro "URL base do OCR não configurada"

---

## 🆘 Ainda com Problemas?

### Verificar se o `.env` está sendo lido:

Adicione isso no console do navegador (DevTools):

```javascript
console.log('OCR Config:', {
  baseUrl: import.meta.env.VITE_OCR_BASE_URL,
  disabled: import.meta.env.VITE_OCR_DISABLED,
  webhookUrl: import.meta.env.VITE_OCR_WEBHOOK_URL
});
```

Se todos retornarem `undefined`, o `.env` não está sendo lido:
- ✅ Verificar que o arquivo se chama exatamente `.env` (não `.env.txt`)
- ✅ Verificar que está na raiz de `docgen-web-prototype/`
- ✅ Reiniciar o servidor (`npm run dev`)

---

## 📚 Documentação Completa

Para configuração completa e troubleshooting:
- `OCR_CONFIG.md` - Configuração detalhada
- `INTEGRACAO_OCR_README.md` - Guia completo
- `WEBHOOK_EXAMPLES.md` - Exemplos de webhook

---

**Dúvidas? Revise a documentação ou entre em contato!** 🚀

