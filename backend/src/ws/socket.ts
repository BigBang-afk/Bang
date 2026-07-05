import { Server as HttpServer } from "http";
import { Server as SocketIoServer } from "socket.io";
import { config } from "../config";
import { feedManager } from "../priceFeed/feedManager";
import { onTradeSettled } from "../trades/tradeEngine";
import { verifyToken } from "../auth/jwt";

export function attachSocket(httpServer: HttpServer) {
  const io = new SocketIoServer(httpServer, {
    cors: { origin: config.corsOrigin },
  });

  io.on("connection", (socket) => {
    // Optional auth: if a token is supplied, join a per-user room so we can
    // push that user's trade settlements privately; price ticks are public.
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const payload = verifyToken(token);
        socket.join(`user:${payload.userId}`);
      } catch {
        // ignore invalid token, socket just won't get private events
      }
    }
  });

  feedManager.on("tick", (tick) => {
    io.emit("price", tick);
  });

  onTradeSettled((trade) => {
    io.to(`user:${trade.userId}`).emit("trade:settled", trade);
  });

  return io;
}
