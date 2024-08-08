import { RestClientV5, type OrderSideV5 } from 'bybit-api';
import { PrismaClient, type Screener, type Order } from '@prisma/client';

const prisma = new PrismaClient();

interface HashTable<T> {
  [key: string]: T;
}

export class BybitService {
  // FOR DEVELPMENT USE ONLY 
  private keys = [
    new RestClientV5({
      demoTrading: true,
      parseAPIRateLimits: true,
      key: "",
      secret: "",
    }),
    new RestClientV5({
      demoTrading: true,
      parseAPIRateLimits: true,
      key: "",
      secret: "",
    })
  ]
  private changedPrices: HashTable<number[]> = {};

  public async getTickers(): Promise<any[]> {
    try {
      return await this.keys[0]
        .getTickers({ category: 'linear' })
        .then(response => {
          return response.result.list
        })
    } catch (error) {
      console.error('Error fetching tickers:', error);
      return [];
    }
  }

  public async getTickerBySymbol(
    symbol: string
  ): Promise<any> {

    return await this.keys[0]
      .getTickers({
        category: 'linear',
        symbol
      })
      .then(response => {
        return response.result.list[0]
      })
  }

  public async calculateSymbolVolatility(
    symbol: string
  ): Promise<number> {
    const ticker = await this.getTickerBySymbol(symbol)
    return Number(ticker.price24hPcnt)
  }

  public async getTop100MostVolatileCoins(): Promise<any[]> {
    const tickers = await this.getTickers();
    const tickersWithVolatility = tickers
      .filter(ticker => /^[A-Z]+USDT$/.test(ticker.symbol)) // Filter for symbols ending with 'USDT'
      .filter(ticker => !ticker.symbol.includes("BTC"))
      .map(ticker => ({
        symbol: ticker.symbol,
        volatility: Number(ticker.price24hPcnt),
      }));

    const sortedTickers = tickersWithVolatility.sort((a, b) => b.volatility - a.volatility);
    return sortedTickers.slice(0, 100);
  }

  public async getMinimalBidAmount(symbol: string): Promise<number> {
    try {
      const response = await this.keys[0].getInstrumentsInfo({ category: 'linear', symbol });
      return Number(response.result.list[0].lotSizeFilter.minOrderQty)
    } catch (error) {
      console.error('Error fetching minimal bid amount:', error);
      throw error;
    }
  }

  public async createScreenersForTop100VolatileCoins() {
    const top100VolatileCoins = await this.getTop100MostVolatileCoins();

    // Step 1: Create Screeners
    const createdScreeners = await prisma.screener.createMany({
      data: top100VolatileCoins.map(coin => ({
        keyId: 0,
        symbol: coin.symbol,
        side: "Buy",
        volatility: coin.volatility,
        tpType: "Full",
        slType: "Full",
        isLeverage: false,
        isConditional: false,
        isActive: true,
      })),
    });

    // Step 2: Create Orders for each Screener
    const screenerRecords = await prisma.screener.findMany({
      where: {
        symbol: {
          in: top100VolatileCoins.map(coin => coin.symbol),
        },
      },
    });

    const ordersData = await Promise.all(screenerRecords.map(async screener => ({
      screenerId: screener.id,
      orderId: "", // Assuming orderId is empty initially
      step: 1, // Assuming step is 1 for all orders
      tpType: "Full",
      slType: "Full",
      isLeverage: false,
      tpStep: 1,
      slStep: 1,
      symbol: screener.symbol,
      amount: await this.getMinimalBidAmount(screener.symbol), // Assuming amount is 1 for all orders
      amountType: "USD", // Assuming amountType is "USD" for all orders
    })));

    await prisma.order.createMany({
      data: ordersData,
    });
  }


  public async simpleOpenOrders(
    keyId: number,
    screener: Screener,
    orders: Order[]
  ) {

    const now = new Date();
    let candleStart = Date.now() - (61 + now.getSeconds()) * 1000;
    let candleEnd = Date.now() - (59 + now.getSeconds()) * 1000;
    let lastOrderPrice = await this.getClosingPriceOf(screener.keyId, screener.symbol, candleStart, candleEnd)

    return this.keys[keyId]
      .batchSubmitOrders("linear", orders.map(order => {
        let priceDecrease = lastOrderPrice * (order.step / 100.0);
        lastOrderPrice -= priceDecrease
        return {
          symbol: screener.symbol,
          side: screener.side as OrderSideV5,
          orderType: "Limit",
          qty: order.amount.toString(),
          price: lastOrderPrice.toString(),
          timeInForce: "GTC",
          takeProfit: "0",
          stopLoss: "0",
        }
      }))
      .then(async (response: any) => {
        let responseOrders = response.result.list
        let updatePromises = responseOrders.map((order: any, index: number) => {
          return prisma.order.update({
            where: {
              id: orders[index].id
            },
            data: {
              orderId: order.orderId
            }
          })
        })
        await Promise.allSettled(updatePromises)
        if (responseOrders.some((order: any) => order.orderId === '')) {
          throw new Error("Order with empty orderId found");
        }
      })
      .catch((error: any) => {
        throw error
      });

  }

  public async openScreenerOrders(
    keyId: number,
    screener: Screener,
    orders: Order[]
  ) {
    const batchSize = 10;

    const now = new Date();
    let candleStart = Date.now() - (61 + now.getSeconds()) * 1000;
    let candleEnd = Date.now() - (59 + now.getSeconds()) * 1000;

    const price = await this.getClosingPriceOf(keyId, screener.symbol, candleStart, candleEnd)
    const tablePrices: HashTable<number> = {}
    tablePrices[screener.symbol] = price

    return this.executeByBatches(
      this.openOrders,
      keyId,
      [orders],
      [[screener], tablePrices],
      batchSize
    )
  }

  public async openOrdersByBatches(
    keyId: number,
    orders: Order[],
    screeners: Screener[],
    prices: HashTable<number>
  ) {
    const batchSize = 10;

    return this.executeByBatches(
      this.openOrders,
      keyId,
      [orders],
      [screeners, prices],
      batchSize
    )

  }

  public openOrders(
    keyId: number,
    orders: Order[],
    screeners: Screener[],
    prices: HashTable<number>
  ) {
    screeners.forEach((screener) => {
      if (!this.changedPrices[screener.symbol]) {
        this.changedPrices[screener.symbol] = [Number(prices[screener.symbol])];
      }
    });

    return this.keys[keyId]
      .batchSubmitOrders("linear", orders.flatMap(order => {


        const currentScreener = screeners.find(screener => screener.id == order.screenerId)
        const symbol = currentScreener?.symbol

        if (!symbol) return [];

        const lastOrderPrice = this.changedPrices[symbol][this.changedPrices[symbol].length - 1];
        const priceDecrease = lastOrderPrice * (order.step / 100.0);
        const newPrice = lastOrderPrice - priceDecrease

        const tpPrice = newPrice + (newPrice * (order.tpStep / 100.0))

        const slPrice = newPrice - (newPrice * (order.slStep / 100.0))

        this.changedPrices[symbol].push(newPrice);

        return {
          symbol: symbol,
          side: currentScreener.side as OrderSideV5,
          orderType: "Limit",
          qty: order.amount.toString(),
          price: newPrice.toString(),
          takeProfit: tpPrice.toString(),
          stopLoss: slPrice.toString(),
        }
      }))
      .then(async (response: any) => {


        let responseOrders = response.result.list
        let updatePromises = responseOrders.map(async (order: any, index: number) => {
          return prisma.order.update({
            where: {
              id: orders[index].id
            },
            data: {
              orderId: order.orderId
            }
          })
        })
        await Promise.allSettled(updatePromises)
      })
      .catch((error: any) => {
        throw error
      });

  }

  public async executeTaskStep(
    getData: (response: any, ...args: any | undefined) => any,
    tasks: Screener[],
    additionalData: any[] | undefined = undefined
  ): Promise<HashTable<HashTable<any>>> {
    let taskPromises: any[] = [];
    let symbols: HashTable<number> = {}


    let newData = additionalData
      ? tasks.map(task => {
        let symbol = task.symbol
        symbols[symbol] = task.keyId as number
        return getData(task.keyId, symbol, ...additionalData)
      })
      : tasks.map(task => {
        let symbol = task.symbol
        symbols[symbol] = task.keyId as number
        return getData(task.keyId, symbol)
      });

    taskPromises = taskPromises.concat(taskPromises, newData)


    const results = await Promise.allSettled(taskPromises);
    const groupedResults: HashTable<HashTable<any[]>> = {};

    results.forEach((result, index) => {
      const symbol = Object.keys(symbols)[index]
      if (result.status === 'fulfilled') {
        if (!groupedResults[symbols[symbol]]) {
          groupedResults[symbols[symbol]] = {};
        }
        if (!groupedResults[symbols[symbol]][symbol]) {
          groupedResults[symbols[symbol]][symbol] = [];
        }
        groupedResults[symbols[symbol]][symbol] = result.value;
      } else {
        console.error(`Task ${symbol} failed:`, result.reason);
      }
    });

    return groupedResults;
  }

  public getActiveOrdersBy(
    keyId: number,
    symbol: string
  ) {
    return this.keys[keyId]
      .getActiveOrders({
        category: 'linear',
        symbol: symbol,
        openOnly: 0,
        limit: 100,
      })
      .then((response: any) => {
        return response.result.list
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  public async getAllActiveOrders(
    screeners: Screener[]
  ) {
    let result = await this.executeTaskStep(this.getActiveOrdersBy, screeners)
    return result
  }

  public async getClosingPriceOf(
    keyId: number,
    symbol: string,
    candleStart: number,
    candleEnd: number
  ): Promise<any> {

    return this.keys[keyId]
      .getKline({
        category: 'linear',
        symbol,
        interval: '1',
        start: candleStart,
        end: candleEnd,
      })
      .then((response: any) => {
        return response.result.list[0][4]
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  public async getAllClosingPrices(
    screeners: Screener[]
  ) {
    const now = new Date();
    let candleStart = Date.now() - (61 + now.getSeconds()) * 1000;
    let candleEnd = Date.now() - (59 + now.getSeconds()) * 1000;

    let result = await this.executeTaskStep(this.getClosingPriceOf, screeners, [candleStart, candleEnd])
    return result
  }

  public async startScreeners() {
    await this.startExecution(this.executeScriptStep)
  }

  delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  public async executeByBatches(
    func: (...args: any) => Promise<any>,
    keyId: number,
    data: any[][],
    args: any[] = [],
    batchSize: number
  ): Promise<void[]> {
    const batchPromises: Promise<any>[] = [];

    if (!Array.isArray(data) || !data.every(Array.isArray)) {
      console.error('Data is not a 2D array or is undefined:', data);
      throw new TypeError('Data is not a 2D array or is undefined');
    }

    const maxLength = Math.max(...data.map(innerArr => innerArr.length));
    let currentBatch: any[] = [];

    for (let i = 0; i < maxLength; i++) {
      for (let j = 0; j < data.length; j++) {
        if (i < data[j].length) {
          currentBatch.push(data[j][i]);
        }
        if (currentBatch.length === batchSize || (i === maxLength - 1 && j === data.length - 1)) {
          await func(keyId, currentBatch, ...args); // Ensure the function is awaited
          await this.delay(1000); // Delay after each batch
          currentBatch = [];
        }
      }
    }

    return Promise.all(batchPromises);
  }


  public async amendOrdersByBatches(
    keyId: number,
    orders: Order[],
    activeScreeners: Screener[],
    prices: HashTable<number>
  ): Promise<void[]> {
    const batchSize = 10;
    return this.executeByBatches(this.amendOrders, keyId, [orders], [activeScreeners, prices], batchSize);
  }

  amendOrders(
    keyId: number,
    orders: Order[],
    screeners: Screener[],
    prices: HashTable<number>
  ): Promise<any> {
    screeners.forEach((screeners => {
      if (!this.changedPrices[screeners.symbol]) {
        this.changedPrices[screeners.symbol] = [Number(prices[screeners.symbol])];
      }
    }));

    const amendments = orders.flatMap(order => {

      const symbol = screeners.find(screener => screener.id == order.screenerId)?.symbol
      if (!symbol) return [];
      const orderId = order.orderId;
      let currentScreener = screeners.some(screener => screener.id == order.screenerId)

      const lastOrderPrice = this.changedPrices[symbol][this.changedPrices[symbol].length - 1];
      const priceDecrease = lastOrderPrice * (order.step / 100.0);
      const newPrice = lastOrderPrice - priceDecrease;
      this.changedPrices[symbol].push(newPrice);

      if (!currentScreener) return []

      return {
        symbol: symbol,
        orderId: orderId,
        qty: order.amount.toString(),
        price: newPrice.toString()
      };


    })

    return this.keys[keyId]
      .batchAmendOrders('linear', amendments)
      .then((response: any) => {
      })
      .catch((err: any) => {
        console.log(err)
      });
  }

  public async cancelAllScreenerOrders(
    screener: Screener
  ) {
    let keyId = screener.keyId;
    let symbol = screener.symbol;
    return await this.keys[keyId]
      .cancelAllOrders({
        category: 'linear',
        symbol
      })
      .catch((error: any) => {
        console.error(error)
      })
  }

  public async changeScreenerStatus(
    screener: Screener
  ) {
    try {
      let isActive = screener.isActive
      if (!isActive) {
        await this.cancelAllScreenerOrders(screener)
      }
      await prisma.screener.update({
        where: {
          id: screener.id
        },
        data: {
          isActive
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  public async deleteScreener(
    screener: Screener
  ) {
    await this.cancelAllScreenerOrders(screener)
    let prismaPromises = []
    console.log(screener.id)
    let deleteScreenerPromise = prisma.screener.delete({
      where: {
        id: screener.id
      }
    })
    let deleteOrdersPromise = prisma.order.deleteMany({
      where: {
        screenerId: screener.id
      }
    })
    prismaPromises.push(deleteScreenerPromise, deleteOrdersPromise)
    await Promise.all(prismaPromises)
  }

  getPositionInfo(
    keyId: number
  ) {
    return this.keys[keyId]
      .getPositionInfo({
        category: 'linear',
        settleCoin: 'USDT'
      })
      .then((response: any) => {
        return response.result.list
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  public async updateScreenerWithOrders(screener: Screener, orders: Order[]) {
    // Update the screener
    await prisma.screener.update({
      where: { id: screener.id },
      data: {
        keyId: screener.keyId,
        symbol: screener.symbol,
        side: screener.side,
        isConditional: screener.isConditional,
        isActive: screener.isActive,
      },
    });

    // Get current orders
    const currentOrders = await prisma.order.findMany({
      where: { screenerId: screener.id }
    });

    const currentOrderIds = currentOrders.map(order => order.id);
    const newOrderIds = orders.map(order => order.id);

    // Identify orders to add
    const ordersToAdd = orders.filter(order => !currentOrderIds.includes(order.id));
    for (const order of ordersToAdd) {
      try {
        await prisma.order.create({
          data: {
            orderId: order.orderId,
            symbol: screener.symbol,
            step: order.step,
            tpStep: order.tpStep,
            slStep: order.slStep,
            amount: order.amount,
            amountType: order.amountType,
            screener: {
              connect: { id: screener.id }
            }
          }
        });
      } catch (error) {
        console.error('Error creating order:', order, error);
      }
    }

    // Identify orders to update
    const ordersToUpdate = orders.filter(order => currentOrderIds.includes(order.id));
    for (const order of ordersToUpdate) {
      const currentOrder = currentOrders.find(o => o.id === order.id);
      if (
        currentOrder &&
        (currentOrder.orderId !== order.orderId ||
          currentOrder.symbol !== order.symbol ||
          currentOrder.step !== order.step ||
          currentOrder.tpStep !== order.tpStep ||
          currentOrder.slStep !== order.slStep ||
          currentOrder.amount !== order.amount ||
          currentOrder.amountType !== order.amountType)
      ) {
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              orderId: order.orderId,
              symbol: order.symbol,
              step: order.step,
              tpStep: order.tpStep,
              slStep: order.slStep,
              amount: order.amount,
              amountType: order.amountType,
            }
          });
        } catch (error) {
          console.error('Error updating order:', order, error);
        }
      }
    }

    // Identify orders to delete
    const ordersToDelete = currentOrders.filter(order => !newOrderIds.includes(order.id));
    for (const order of ordersToDelete) {
      try {
        await prisma.order.delete({
          where: { id: order.id }
        });
      } catch (error) {
        console.error('Error deleting order:', order, error);
      }
    }
  }

  public async executeScriptStep() {
    try {
      this.changedPrices = {};
      let screeners = await prisma.screener.findMany();
      let [activeOrdersList, prices] = await Promise.all([this.getAllActiveOrders(screeners), this.getAllClosingPrices(screeners)]);
      let groupedOrders: HashTable<Order[][]> = {};
      await Promise.all(screeners.map(async screener => {
        const keyId = screener.keyId;
        const symbol = screener.symbol;
        if (!groupedOrders[keyId]) groupedOrders[keyId] = [];
        try {
          const orders = await prisma.order.findMany({ where: { screenerId: screener.id } });
          groupedOrders[keyId].push(orders);
        } catch (error) {
          console.error(`Failed to fetch orders for screener ID: ${screener.id}`, error);
        }
      }));

      let positionInfoPromises = [...Array(this.keys.length).keys()].map(keyId => {
        return this.getPositionInfo(keyId)
      })

      let positionsInfo = (await Promise.allSettled(positionInfoPromises))
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .map(result => result.symbol)

      let updatePromises = Object.keys(activeOrdersList).flatMap(keyId => {
        const activeScreeners = screeners.filter(screener => {
          const symbol = screener.symbol
          const isScreenerActive = screener.isActive
          const haveOrders = activeOrdersList[keyId]?.[symbol]?.length > 0;
          const havePosition = positionsInfo.includes(symbol);
          return isScreenerActive && !haveOrders && !havePosition
        })
        const orders = groupedOrders[keyId]?.flat().filter(order => activeScreeners.some(screener => screener.id == order.screenerId)) || [];
        if (activeScreeners.length > 0) {
          return this.openOrdersByBatches(Number(keyId), orders, activeScreeners, prices[keyId])
        }
        return [];
      })

      // Open additional orders if there are orders in the database that have no keyId
      let additionalOrdersPromises = Object.keys(groupedOrders).flatMap(keyId => {
        const ordersWithoutScreenerId = groupedOrders[keyId]?.flat().filter(order => !order.orderId) || [];
        if (ordersWithoutScreenerId.length > 0) {
          const screener = screeners.find(screener => screener.id == ordersWithoutScreenerId[0].screenerId);
          if (screener && activeOrdersList[keyId]?.[screener.symbol]?.length > 0) {
            const lastOrderPrice: HashTable<number> = {}
            lastOrderPrice[screener.symbol] = Number(activeOrdersList[keyId][screener.symbol][0]?.price)
            return this.openOrdersByBatches(Number(keyId), ordersWithoutScreenerId, [screener], lastOrderPrice);
          }
        }
        return [];
      });

      // Cancel active orders that are not present in the orders database
      let cancelPromises = Object.keys(activeOrdersList).flatMap(keyId => {
        const activeOrders = activeOrdersList[keyId];
        if (!activeOrders) return [];
        const ordersInDb = groupedOrders[keyId]?.flat() || [];
        const ordersToCancel = Object.keys(activeOrders).flatMap(symbol => {
          return activeOrders[symbol]?.filter((activeOrder: any) => {
            return !ordersInDb.some(order => order.orderId === activeOrder.orderId);
          }) || [];
        });
        if (ordersToCancel.length > 0) {
          return this.cancelOrdersByBatches(Number(keyId), ordersToCancel);
        }
        return [];
      });

      await Promise.allSettled(updatePromises)

      this.changedPrices = {};
      const activeScreeners = screeners.filter(screener => screener.isActive)
      if (activeScreeners.length > 0) {
        await Promise.allSettled(cancelPromises)
        await this.executeScreenersStep(activeScreeners, activeOrdersList, groupedOrders, prices);

        await Promise.allSettled(additionalOrdersPromises);
      }

    } catch (error) {
      console.error('Failed to execute script step:', error);
    }
  }

  public async executeScreenersStep(
    activeScreeners: Screener[],
    activeOrdersList: HashTable<HashTable<Object[]>>,
    groupedOrders: HashTable<Order[][]>,
    prices: HashTable<HashTable<number>>
  ): Promise<void> {
    try {
      await Promise.all(Object.keys(activeOrdersList).map(keyId => {
        const orders = groupedOrders[keyId].flat().filter(order => activeScreeners.some(screener => screener.id == order.screenerId))
        return this.amendOrdersByBatches(Number(keyId), orders, activeScreeners, prices[keyId]);
      }));

    } catch (error) {
      console.error('Failed to execute screeners step', error);
    }
  }

  public async cancelAllOrders() {
    return await this.keys[0]
      .cancelAllOrders({
        category: 'linear',
        settleCoin: 'USDT'
      })
  }



  cancelOrders(
    keyId: number,
    orders: Order[]
  ) {
    return this.keys[keyId]
      .batchCancelOrders("linear", orders.map(order => {
        return {
          symbol: order.symbol,
          orderId: order.orderId
        }
      }))
  }

  cancelOrdersByBatches(
    keyId: number,
    orders: Order[]
  ) {
    const batchSize = 10;
    return this.executeByBatches(this.cancelOrders, keyId, [orders], undefined, batchSize);
  }

  isExecuting = false;
  intervalId: NodeJS.Timeout | null = null;

  test = 0

  public async startExecution(func: (...args: any[]) => void, ...args: any[]) {
    if (this.isExecuting) {
      console.log("Execution is already in progress.");
      return;
    }

    this.isExecuting = true;

    const executeFunction = () => {
      console.log("changed: " + this.test);
      this.test++;
      func(...args);
    };

    executeFunction()

    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000 + now.getMilliseconds();

    setTimeout(() => {
      executeFunction();
      this.intervalId = setInterval(executeFunction, 60 * 1000); // Execute every 60 seconds
    }, delay);
  }

  public stopExecution() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isExecuting = false;
      console.log("Execution stopped.");
    } else {
      console.log("No execution to stop.");
    }
  }
}