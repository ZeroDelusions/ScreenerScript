import { writable, get } from 'svelte/store';
import { trpc } from "$lib/trpc/client"
import type { Screener, Order } from '@prisma/client'; 
import { type BatchOrderParamsV5, type OrderSideV5, RestClientV5 } from 'bybit-api';


class GlobalService {

    emptyScreener = {
        id: -1,
        keyId: 0,
        symbol: "",
        side: "Buy",
        volatility: 0,
        tpType: "Full",
        slType: "Full",
        isLeverage: false,
        isConditional: false,
        isActive: true,
    }

    private globalStore = writable<GlobalStorage>({
        keys: [
            new RestClientV5({
              demoTrading: true,
              parseAPIRateLimits: false,
              key: "RicmIwJ9grk2T3rway",
              secret: "Y9jLKNbm25LsMBUdYFPtOFC6Aggc5k4tFzz2",
            }),
            new RestClientV5({
              demoTrading: true,
              parseAPIRateLimits: false,
              key: "KU2BO4BsZFEGjHMTeM",
              secret: "IVuApDGFGXf41dHhvnpot5ndojPIPj0jMT71",
            })
        ],
        symbols: [],
        screeners: [],
        orders: [],
        activeOrders: {},

        selectedKey: 0,
        // selectedSymbol: "",
        selectedScreener: this.emptyScreener,
        selectedOrders: []
    });

    subscribe(callback: (value: GlobalStorage) => void) {
        return this.globalStore.subscribe(callback);
    }

    update(newData: Partial<GlobalStorage>) {
        this.globalStore.update(store => ({
            ...store,
            ...newData
        }));
    }

    async getTop100MostVolatileCoins() {
        const tickers = await trpc().getTop100MostVolatileCoins.query()
    }

    async createScreenersForTop100VolatileCoins() {
        await trpc().createScreenersForTop100VolatileCoins.query()
        await this.getScreeners()
    }

    async startScreeners() {
        await trpc().startScreeners.query()
    }

    stopScreeners() {
        trpc().stopScreeners.query()
    }

    async getClosingPriceOf(screener: Screener) {
        const now = new Date();
        let candleStart = Date.now() - (61 + now.getSeconds()) * 1000;
        let candleEnd = Date.now() - (59 + now.getSeconds()) * 1000;
        const closingPrice = await trpc().getClosingPriceOf.query({
            symbol: screener.symbol,
            keyId: screener.keyId,
            candleStart,
            candleEnd
        })
        return closingPrice
    }

    async executeScreenersStep() {
        await trpc().executeScreenersStep.mutate()
    }

    async addScreener(screener: Screener, orders: Order[]) {
        try {

            await trpc().addScreener.mutate({ screener, orders });

            const responseOrders = await trpc().getOrdersBySymbol.query({ symbol: screener.symbol });
            const newScreener = await trpc().getScreenerBySymbol.query({ symbol: screener.symbol });

            if (!newScreener) {
                throw new Error("Screener creation failed or screener not found");
            }

            await this.openOrders(screener.keyId, newScreener, responseOrders);
            await this.getOrders();
            await this.getScreeners();
            await this.getAllActiveOrders(this.getGlobalStore().screeners);
        } catch (error) {
            console.error("Error adding screener:", error);
        }
    }

    async updateScreener(screener: Screener, orders: Order[]) {
        await trpc().updateScreener.mutate({ screener, orders })
    }

    async getScreeners() {
        const screeners = await trpc().getScreeners.query();
        this.update({ screeners });
    }

    async getOrders() {
        const orders = await trpc().getOrders.query();
        this.update({ orders });
    }

    async getAllActiveOrders(screeners: Screener[]) {
        const activeOrders = await trpc().getAllActiveOrders.mutate(screeners);
        this.update({ activeOrders });
    }

    async openOrders(keyId: number, screener: Screener, orders: Order[]) {
        try {
            await trpc().openOrders.mutate({ keyId, screener, orders });
        } catch(err: any) {
           throw err;
        }
        
    }

    async getOrdersById(screenerId: number) {
        const selectedOrders = await trpc().getOrdersById.query({ screenerId });
        this.update({ selectedOrders });
    }

    async getOrdersBySymbol(symbol: string) {
        const selectedOrders = await trpc().getOrdersBySymbol.query({ symbol });
        this.update({ selectedOrders });
    }

    async addSymbol(symbol: string) {
        await trpc().addSymbol.mutate({ symbol });
        await this.getSymbols()
    }

    async deleteSymbol(symbol: string) { 
        await trpc().deleteSymbol.mutate({ symbol })
        await this.getSymbols()
    }

    async getSymbols() {
        const symbols = await trpc().getSymbols.query();
        this.update({ symbols });
    }

    async selectScreener(selectedScreener: Screener) {
        await this.getOrdersById(selectedScreener.id);
        this.update({ selectedScreener });
    }

    async clearSelectedScreener() {
        this.update({ 
            selectedOrders: [],
            selectedScreener: this.emptyScreener 
        });
    }

    async changeScreenerStatus(screener: Screener) {
        await trpc().changeScreenerStatus.mutate({ ...screener })
        await this.getScreeners()
    }

    async deleteScreener(screener: Screener) {
        await trpc().deleteScreener.mutate({ ...screener })
        await this.getScreeners()
    }

    getKeys() {
        return this.getGlobalStore().keys;
    }

    getGlobalStore() {
        return get(this.globalStore);
    }
}

export const globalService = new GlobalService();