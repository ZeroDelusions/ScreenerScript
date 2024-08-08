// See https://kit.svelte.dev/docs/types#app

import type { PrismaClient } from "@prisma/client";
import type { Symbol, Screener, Order } from '@prisma/client';
import { RestClientV5 } from 'bybit-api'
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	interface Window {
		TradingView: any;
	}

	var prisma: PrismaClient

	interface HashTable<T> {
		[key: string]: T;
	}

	interface GlobalStorage {
		keys: RestClientV5[],
		symbols: Symbol[],
		screeners: Screener[],
		// screeners: HashTable<Screener[]>,
		orders: Order[],
		activeOrders: HashTable<HashTable<any[]>>,

		selectedKey: number,
		selectedScreener: Screener,
        selectedOrders: Order[]
	}

	enum ChartTheme {
		light = 'light',
        dark = 'dark'
	}

	enum OrderTPSLType {
		full = "Full",
		partial = "Partial"
	}
}

export {};
