# Aprisco - Instruções Docker

## Comandos para desenvolvimento local

Para desenvolvimento local, use:

```bash
# Inicia o ambiente de desenvolvimento (servidor backend + Vite em modo dev)
yarn start:dev
```

## Comandos para build e publicação no Docker Hub

```bash
# Construir a imagem Docker
docker build -t douglagoncalves/central-celular:latest .

# Verificar se a imagem foi criada corretamente
docker images | grep central-celular

# Enviar a imagem para o Docker Hub
docker push douglagoncalves/central-celular:latest

# (Opcional) Criar uma tag com versão específica
docker tag douglagoncalves/central-celular:latest douglagoncalves/central-celular:1.0.0
docker push douglagoncalves/central-celular:1.0.0
```

## Executando em produção com Docker Compose

```bash
docker-compose up -d
```

## Executando em produção com Docker Swarm (Portainer)

1. No Portainer, vá para "Stacks" e clique em "Add stack"
2. Dê um nome à stack (ex: "central-celular")
3. Cole o conteúdo do arquivo `stack_final.yml` no editor
4. Clique em "Deploy the stack"

## Migrações do banco de dados

Após iniciar os containers, execute as migrações do banco de dados:

```bash
# Para Docker Compose
docker-compose exec app yarn migrate:dev

# Para Docker Swarm/Portainer
docker exec -it <container_id> yarn migrate:dev
```

## Populando o banco de dados (opcional)

```bash
# Para Docker Compose
docker-compose exec app yarn seed

# Para Docker Swarm/Portainer
docker exec -it <container_id> yarn seed
```

## Explicação das mudanças

As principais alterações feitas para resolver o problema de host bloqueado:

1. Modificamos os scripts no `package.json`:
   - `start:dev`: Modo de desenvolvimento (usando `vite dev`)
   - `start`: Modo de produção (usando `vite preview`)

2. O problema original ocorria porque estávamos usando o servidor de desenvolvimento do Vite em produção, que tem restrições de host mais rigorosas.

3. Agora usamos o modo `preview` do Vite em produção, que é projetado para visualizar a build de produção e tem menos restrições.

## Observações importantes

- O servidor Vite em modo preview roda na porta 5173
- O servidor backend roda na porta 3000
- Ambos os servidores estão configurados para aceitar conexões de qualquer host
- O arquivo `stack_final.yml` está configurado para usar o Traefik como proxy reverso 