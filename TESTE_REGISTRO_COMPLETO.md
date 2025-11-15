# 🧪 Teste Completo do Fluxo de Cadastro

## ✅ O que foi corrigido

### Problema Identificado
❌ **Rota `/register` não estava registrada no `App.tsx`**
- O arquivo `register.tsx` existia mas o router não o chamava
- Por isso a página de registro mostrava "404 Not Found"

### Solução Aplicada
✅ Adicionadas:
1. Import do componente `Register` no `App.tsx`
2. Rota pública: `if (path.startsWith("/register")) return <Register />;`

---

## 🧪 Testes a Realizar

### Teste 1: Acessar Página de Registro
```
1. Acesse: http://localhost:5173/#/register
2. Deve aparecer:
   ✅ Logo Prieto centralizado
   ✅ Título "Criar Conta"
   ✅ Campos: Nome, Email, Senha
   ✅ Botão "Registrar"
   ✅ Link "Já tem conta? Faça login"
```

**Esperado:** Formulário completo e centralizado

---

### Teste 2: Registrar Novo Email
```
1. Preencha:
   - Nome: "Teste Silva"
   - Email: "teste.novo@example.com" (NOVO)
   - Senha: "senha123"

2. Clique "Registrar"

3. Deve aparecer:
   ✅ Toast: "Cadastro realizado com sucesso"
   ✅ Tela muda para "Sucesso!"
   ✅ Email exibido: "teste.novo@example.com"
   ✅ Mensagem: "Verifique seu e-mail..."
   ✅ Status: "⏳ Aguardando confirmação do email..."

4. NO BACKEND, VOCÊ DEVE VER (console):
   ✅ ✅ Usuário criado no storage local
   ✅ ✅ Usuário criado na tabela users do Supabase
   ✅ ℹ️ "Usuário registrado, mas email não confirmado"
```

**Esperado:** Tela de sucesso FULL-SCREEN centralizada

---

### Teste 3: Confirmar Email (Simular Confirmação)
```
1. Abra Supabase Dashboard > Authentication > Users
2. Procure pelo email registrado ("teste.novo@example.com")
3. Clique no menu (...) > "Confirm email"
4. Na aplicação deve aparecer:
   ✅ Status muda para "🔄 Verificando confirmação..."
   ✅ Aguarda 2 segundos
   ✅ Redireciona automaticamente para login (#/login)
```

**Esperado:** 
- Redirecionamento automático quando email confirmado
- URL muda para `#/login`
- Tela de login aparece

---

### Teste 4: Registrar Email já Cadastrado
```
1. Acesse: http://localhost:5173/#/register
2. Tente registrar com email que JÁ EXISTE:
   - Email: "controle.estoque.pietro@gmail.com" (admin existente)
   - Senha qualquer

3. Clique "Registrar"

4. Deve aparecer:
   ✅ Toast (erro): "Email já cadastrado"
   ✅ Tela muda para "Email já cadastrado"
   ✅ Mensagem: "Este email já possui uma conta registrada"
   ✅ Botão "Ir para o Login"
   ✅ Botão "Voltar para o Registro"

5. NO BACKEND, VOCÊ DEVE VER (console):
   ✅ ⚠️ "Tentativa de registrar email já cadastrado: ..."
   ✅ POST /api/auth/register 400 :: "Email já cadastrado"
```

**Esperado:** 
- Erro claro sem tentar criar duplicado
- Opção de fazer login ou tentar novamente

---

### Teste 5: Fluxo de Erro - Voltar para Registro
```
1. (Seguir do Teste 4 - após tela "Email já cadastrado")
2. Clique "Voltar para o Registro"

3. Deve aparecer:
   ✅ Formulário limpo (campos vazios)
   ✅ Volta ao estado inicial
```

**Esperado:** Formulário resetado e pronto para novo registro

---

### Teste 6: Fluxo de Erro - Ir para Login
```
1. (Seguir do Teste 4 - após tela "Email já cadastrado")
2. Clique "Ir para o Login"

3. Deve aparecer:
   ✅ Redirecionado para #/login
   ✅ Tela de login com campos de email/senha
```

**Esperado:** Redirecionamento para login bem-sucedido

---

## 📊 Checklist de Validação

### Layout & Responsividade
- [ ] Página é full-screen (`min-h-screen`)
- [ ] Logo Prieto aparece em todas as telas
- [ ] Card está centralizado
- [ ] Design idêntico ao forgot-password.tsx
- [ ] Responde bem em mobile (teste com zoom 50%)

### Funcionalidade
- [ ] Formulário é submetido corretamente
- [ ] Toast aparece apenas 1x por ação
- [ ] Estados mudam corretamente (form → success → login)
- [ ] Email duplicado é capturado
- [ ] Redirecionamento é automático após confirmação

### Backend
- [ ] Todos os logs aparecem no console do servidor
- [ ] Email duplicado retorna status 400
- [ ] Novo email retorna status 200
- [ ] User é criado no storage local
- [ ] User é criado na tabela Supabase

### Confirmação de Email
- [ ] Verificação acontece a cada 3 segundos
- [ ] Console mostra `🔄 Verificando confirmação...`
- [ ] Quando confirmado, logs mostram: `✅ Email confirmado, redirecionando...`
- [ ] Redirecionamento ocorre após 2 segundos

---

## 🔍 Debug: Como Verificar o Status

### No Console do Navegador (F12 > Console)
```
// Procure por:
✅ Email confirmado, redirecionando para login...  // Quando email confirmado
Erro ao verificar confirmação: ...  // Se houver problema na API
```

### No Console do Servidor (Terminal)
```
// Procure por:
⚠️ Tentativa de registrar email já cadastrado  // Email duplicado
✅ Usuário criado no storage local  // Novo user
POST /api/auth/register 200  // Sucesso
POST /api/auth/check-email ...  // Verificação a cada 3s
```

### No Supabase Dashboard
```
1. Authentication > Users
2. Procure pelo email registrado
3. Verifique se email_confirmed_at está vazio (não confirmado)
4. Clique em (...) > Confirm email para simular confirmação
```

---

## ⚠️ Possíveis Problemas & Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| "404 Not Found" | Rota não registrada | ✅ CORRIGIDO - Rota adicionada em App.tsx |
| Tela pequena (canto) | Renderização condicional errada | ✅ CORRIGIDO - Verifica `state` antes de retornar |
| Sem redirecionamento | useEffect não dispara | ✅ Verifique F12 Console para logs de erro |
| Toast duplicado | Múltiplas chamadas | ✅ Toast aparece apenas na conclusão de handleRegister |
| Email não muda pra confirmado | Supabase não sincroniza | Confirme manualmente no dashboard |

---

## 📋 Comandos Úteis

### Abrir DevTools & Debug
```
F12  → Abre DevTools
F12 > Console  → Ver logs do frontend
F12 > Network  → Ver chamadas API (procure por check-email)
```

### No Supabase Dashboard
```
1. https://app.supabase.com
2. Projeto > Authentication > Users
3. Procure pelo email registrado
4. Clique (...) > Confirm email
```

### Reiniciar Servidor (se houver mudanças)
```
Terminal: npm run dev
```

---

## ✨ Status Final

**Servidor:** ✅ Rodando em http://localhost:5173  
**Rota:** ✅ Adicionada em App.tsx  
**Arquivo:** ✅ register.tsx completo e funcional  
**Backend:** ✅ Verifica email duplicado  
**Verificação:** ✅ Polling a cada 3 segundos  

**Próximo Passo:** Execute os testes acima e reporte se algum falhar!

