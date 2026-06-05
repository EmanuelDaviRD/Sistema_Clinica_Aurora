import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

// Rotas integradas
import { getPrisma } from "./src/db/prisma.ts";
import authRouter from "./src/routes/auth.ts";
import medicosRouter from "./src/routes/medicos.ts";
import horariosRouter from "./src/routes/horarios.ts";
import agendamentosRouter from "./src/routes/agendamentos.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais para API REST
  app.use(cors());
  app.use(express.json());

  // Log simples de requisições de API
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Healthcheck avançado com teste de conexão com o Supabase (PostgreSQL)
  app.get("/api/health", async (req, res) => {
    const prisma = getPrisma();
    let dbStatus = "Não conectado";
    let dbDetails: any = {};

    try {
      // Executa query de ping nativa para testar latência/conexão
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "Conectado";

      // Verifica se a estrutura de tabelas existe executando contagens
      const medicosCount = await prisma.medico.count().catch(() => null);
      const horariosCount = await prisma.horario.count().catch(() => null);
      const agendamentosCount = await prisma.agendamento.count().catch(() => null);

      if (medicosCount === null || horariosCount === null) {
        dbDetails = {
          conectado: true,
          schema: "Incompleto",
          comentarios: "O banco de dados do Supabase respondeu, mas as tabelas ainda não foram sincronizadas. Execute 'npx prisma db push' para criar as tabelas."
        };
      } else {
        dbDetails = {
          conectado: true,
          schema: "Sincronizado",
          registro_medicos: medicosCount,
          registro_horarios: horariosCount,
          registro_agendamentos: agendamentosCount,
          comentarios: "Tudo pronto! O banco do Supabase está sincronizado e operante."
        };
      }
    } catch (err: any) {
      dbStatus = "Erro de conexão";
      dbDetails = {
        conectado: false,
        detalhes_erro: err.message || err,
        comentarios: "Falha ao alcançar o banco de dados. Verifique a variável DATABASE_URL nas configurações (Settings) do AI Studio."
      };
    }

    res.json({
      status: "ok",
      horario_servidor: new Date(),
      banco_dados: {
        status: dbStatus,
        ...dbDetails
      }
    });
  });

  // Registro das rotas API RESTful (Prisma PostgreSQL) - ANTES do catch-all
  app.use("/api/auth", authRouter);
  app.use("/api/medicos", medicosRouter);
  app.use("/api/horarios", horariosRouter);
  app.use("/api/agendamentos", agendamentosRouter);

  // Integração com o ecossistema de compilação Vite
  if (process.env.NODE_ENV !== "production") {
    // Modo de Desenvolvimento: Executa o Vite como middleware de transpilador dinâmico
    console.log("Configurando middleware Vite em modo desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Modo de Produção: Serve os arquivos estáticos montados no diretório dist/
    console.log("Servindo arquivos estáticos em modo produção...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback: Redireciona qualquer rota não-API para o index.html (DEPOIS das rotas de API)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] API e Front-end iniciados com sucesso!`);
    console.log(`[Server] Acesse em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Falha ao inicializar o servidor de aplicação:", err);
  process.exit(1);
});
