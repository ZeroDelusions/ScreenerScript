<script lang="ts">
    import type { Order, Symbol, Screener } from "@prisma/client";
    import { onDestroy, onMount } from "svelte";
    import { globalService } from "$lib/global/store";

    import DropdownSearch from "$lib/components/ui/DropdownSearch.svelte";
    import Dropdown from "$lib/components/ui/Dropdown.svelte";
    import OrderList from "./ui/ScreenerEdit/OrderList.svelte";
    import Checkbox from "./ui/Checkbox.svelte";

    let symbols: Symbol[] = [];
    let filteredSymbols: Symbol[] = [];

    let newScreenerData: Screener;
    let orders: Order[] = [];

    const unsubscribe = globalService.subscribe((value) => {
        symbols = value.symbols;
        orders = value.selectedOrders;
        newScreenerData = value.selectedScreener;
    });

    onMount(() => {
        filteredSymbols = symbols
    })

    onDestroy(() => {
        unsubscribe();
    });

    async function addSymbol() {
        await globalService.addSymbol(newScreenerData.symbol);
        filteredSymbols = symbols;
    }

    async function deleteSymbol(symbol: string) {
        await globalService.deleteSymbol(symbol);
        filteredSymbols = symbols;
    }

    function selectSymbol(symbol: string) {
        newScreenerData.symbol = symbol;
        globalService.update({ selectedScreener: newScreenerData })
    }

    function filterSymbols(input: string) {
        filteredSymbols = symbols.filter((symbol) => {
        let symbolName = symbol.name;
        return symbolName.includes(input);
        });
    }

    function handleInput() {
        newScreenerData.symbol = newScreenerData.symbol.toUpperCase();
        filterSymbols(newScreenerData.symbol);
    }

    async function addOrder() {
        let newOrder: Order = {
            id: 0,
            orderId: '',
            screenerId: newScreenerData.id,
            symbol: '',
            step: 0.1,
            tpStep: 0.1,
            slStep: 0.1,
            amount: 1,
            amountType: "Coin",
        };
        orders = [...orders, newOrder];
    }

    async function deleteOrder(removalIndex: number) {
        orders = orders.filter((_, index) => index != removalIndex);
    }

    async function addScreener() {
        let correctedOrders = orders.map(order => {
            order.symbol = newScreenerData.symbol; 
            return order;
        })
        await globalService.addScreener(newScreenerData, correctedOrders);
    }

    async function updateScreener() {
        console.log(orders);
        await globalService.updateScreener(newScreenerData, orders);
    }

    async function clearScreener() {
        await globalService.clearSelectedScreener();
    }

    async function getTop100MostVolatileCoins() {
        await globalService.getTop100MostVolatileCoins();
    }

</script>

<div class="grid gap-2">
    <DropdownSearch
        bind:searchInput={newScreenerData.symbol}
        bind:filteredElements={filteredSymbols}
        onInput={handleInput}
        onAddElement={addSymbol}
        onSelectElement={selectSymbol}
        onDeleteElement={deleteSymbol}
    />
    <Dropdown bind:input={newScreenerData.keyId} elements={[...Array(globalService.getGlobalStore().keys.length).keys()]} />
    <Dropdown bind:input={newScreenerData.side} elements={["Buy", "Sell"]} />
    <div class="flex flex-row justify-between">
        <Checkbox bind:value={newScreenerData.isLeverage} label="Use leverage" />
    </div>
    
    <OrderList bind:orders onAddOrder={addOrder} onDeleteOrder={deleteOrder} />

    {#if newScreenerData.id == -1}
        <button class="btn btn-success" on:click={addScreener}>Add Screener</button>
    {:else}
        <button class="btn btn-success" on:click={updateScreener}>Update</button>
    {/if}
    <button class="btn btn-neutral" on:click={clearScreener}>Clear</button>
</div>
