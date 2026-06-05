import express from "express";
import cors from "cors";
import authRouter from "../src/routes/auth.js";
import medicosRouter from "../src/routes/medicos.js";
import horariosRouter from "../src/routes/horarios.js";
import agendamentosRouter from "../src/routes/agendamentos.js";
import { getPrisma } from "../src/db/prisma.js";

const app = express();

// Middlewares essenciais para API REST
app.use(cors());
app.use(express.json());

// Healthcheck com teste de conexão do Supabase (PostgreSQL / Prisma)
app.get("/api/health", async (req, res) => {
  const prisma = getPrisma();
  let dbStatus = "Não conectado";
  let dbDetails: any = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "Conectado";

    const medicosCount = await prisma.medico.count().catch(() => null);
    const horariosCount = await prisma.horario.count().catch(() => null);
    const agendamentosCount = await prisma.agendamento.count().catch(() => null);

    if (medicosCount === null || horariosCount === null) {
      dbDetails = {
        conectado: true,
        schema: "Incompleto",
        comentarios: "O banco de dados respondeu, mas as tabelas ainda não foram sincronizadas."
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
      comentarios: "Falha ao alcançar o banco de dados. Verifique a variável DATABASE_URL nas configurações (Settings) do Vercel."
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

// Registro das rotas API RESTful (Prisma PostgreSQL)
app.use("/api/auth", authRouter);
app.use("/api/medicos", medicosRouter);
app.use("/api/horarios", horariosRouter);
app.use("/api/agendamentos", agendamentosRouter);

// Handler global de erros para evitar retorno de HTML no frontend
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Error:", err);
  res.status(500).json({ error: "Erro Interno", message: err.message });
});

export default app;
