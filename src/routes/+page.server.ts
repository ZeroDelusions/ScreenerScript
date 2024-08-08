import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type { ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let caller = createCaller(await createContext(event))

    let symbols = await caller.getSymbols();
    let screeners = await caller.getScreeners();
    let orders = await caller.getOrders();
    let activeOrders = await caller.getAllActiveOrders(screeners);
    
    return {
        symbols: symbols,
        screeners: screeners,
        orders: orders,
        activeOrders: activeOrders
    }
    
};

