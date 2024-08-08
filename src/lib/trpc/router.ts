import { prisma } from "$lib/server/prisma"
import { z } from "zod"
import { t } from "./t"
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { Screener, Order } from "@prisma/client"
import { BybitService } from '$lib/server/server';

const bybitService = new BybitService();

const symbolSchema = z.object({
  symbol: z.string()
});

const screenerSchema = z.custom<Screener>()
const screenersSchema = z.custom<Screener[]>()

const getOrderSchemaId = z.object({
  screenerId: z.number()
});

const getOrderSchemaSymbol = z.object({
  symbol: z.string()
});

const addOrderSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  screenerId: z.number(),
  step: z.number().min(0.01),
  tpStep: z.number().min(0.01),
  slStep: z.number().min(0.01),
  symbol: z.string(),
  amount: z.number(),
  amountType: z.string()
});

const addOrdersSchema = z.array(addOrderSchema)

const openOrderSchema = z.custom<Order>(); 

const openOrdersSchema = z.object({
  keyId: z.number(),
  screener: screenerSchema,
  orders: z.array(openOrderSchema)
})

const addScreenerSchema = z.object({
  screener: screenerSchema,
  orders: addOrdersSchema
})

const closingPriceSchema = z.object({
  keyId: z.number(),
  symbol: z.string(),
  candleStart: z.number(),
  candleEnd: z.number()
})

const cancelAllOrdersBySchema = z.object({
  keyId: z.number(),
  symbol: z.string()
})

export const router = t.router({

  getTop100MostVolatileCoins: t.procedure
    .query(async () => {
      return await bybitService.getTop100MostVolatileCoins()
    }),
  createScreenersForTop100VolatileCoins: t.procedure
    .query(async () => {
      await bybitService.createScreenersForTop100VolatileCoins()
    }),
  openOrders: t.procedure
    .input(openOrdersSchema)
    .mutation(async({ input }) => {
      await bybitService.openScreenerOrders(input.keyId, input.screener, input.orders);
    }),
  getSymbols: t.procedure
    .query(async () => {
      let result = await prisma.symbol.findMany()
      return result
    }),
  addSymbol: t.procedure
    .input(symbolSchema)
    .mutation(async ({ input, ctx }) => {
      await prisma.symbol.create({
        data: {
          name: input.symbol
        }
      })
    }),
  deleteSymbol: t.procedure
   .input(symbolSchema)
   .mutation(async ({ input }) => {
    await prisma.symbol.delete({
      where: {
        name: input.symbol
      }
    })
   }),
  getOrders: t.procedure
    .query(async() => {
      let result = await prisma.order.findMany()
      return result
    }),
  getOrdersById: t.procedure
    .input(getOrderSchemaId)
    .query(async ({ input }) => {
      let result = await prisma.order.findMany({
        where: {
          screenerId: input.screenerId
        }
      })
      return result
    }),
  getOrdersBySymbol: t.procedure
    .input(getOrderSchemaSymbol)
    .query(async ({ input }) => {
      let result = await prisma.order.findMany({
        where: {
          symbol: input.symbol
        }
      })
      return result
    }),
  getScreeners: t.procedure
    .query(async () => {
      let result = await prisma.screener.findMany()
      return result
    }),
  getScreenerBySymbol: t.procedure
    .input(symbolSchema)
    .query(async ({ input }) => {
      let result = await prisma.screener.findUnique({
        where: {
          symbol: input.symbol
        }
      })
      return result
    }),
  addScreener: t.procedure
    .input(addScreenerSchema)
    .mutation(async ({ input }) => {
      const volatility = await bybitService.calculateSymbolVolatility(input.screener.symbol)
      const { id, ...screenerData } = input.screener;
      await prisma.screener.create({
        data: {
          ...screenerData,
          volatility,
          orders: {
            createMany: { 
              data: input.orders.map(order => {
                const { id, screenerId, ...rest } = order;
                return rest;
              })
            }
          }
        }
      })
    }),
  updateScreener: t.procedure
    .input(addScreenerSchema)
    .mutation(async ({ input }) => {
      const { screener, orders } = input;
      await bybitService.updateScreenerWithOrders(screener, orders);
    }),
  executeScreenersStep: t.procedure
    .mutation(async () => {
      await bybitService.executeScriptStep()
    }),
  getAllActiveOrders: t.procedure
    .input(screenersSchema)
    .mutation(async ({ input }) => {
      return await bybitService.getAllActiveOrders(input)
    }),
  getClosingPriceOf: t.procedure
    .input(closingPriceSchema)
    .query(async ({ input }) => {
      return await bybitService.getClosingPriceOf(
        input.keyId,
        input.symbol,
        input.candleStart,
        input.candleEnd
      )
    }),
  startScreeners: t.procedure
    .query(async () => {
      await bybitService.executeScriptStep()
    }),
  stopScreeners: t.procedure
    .query(async () => {
      bybitService.stopExecution()
    }),
  changeScreenerStatus: t.procedure
    .input(screenerSchema)
    .mutation(async ({ input }) => {
      await bybitService.changeScreenerStatus(input)
    }),
  deleteScreener: t.procedure
    .input(screenerSchema)
    .mutation(async ({ input }) => {
      await bybitService.deleteScreener(input)
    })
});

export type Router = typeof router;
export const createCaller = t.createCallerFactory(router);

export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
