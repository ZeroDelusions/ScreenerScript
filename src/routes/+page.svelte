<script lang="ts">
    import TradingView from "$lib/components/TradingView.svelte";
    import ScreenerGrid from "$lib/components/ScreenerGrid.svelte";
    import ScreenerEdit from "$lib/components/ScreenerEdit.svelte";

    import { globalService } from "$lib/global/store";
    import type { PageServerData } from './$types';
    import { onDestroy, onMount } from "svelte";
    import type { Screener } from "@prisma/client";

    export let data: PageServerData;

    let symbols = data.symbols
    let screeners = data.screeners
    let orders = data.orders
    let activeOrders = data.activeOrders

    globalService.update({
        symbols: symbols,
        screeners: screeners,
        orders: orders,
        activeOrders: activeOrders
    })

    let selectedScreener: Screener
    $: selectedSymbol = selectedScreener.symbol

    const unsubscribe = globalService.subscribe((value) => {
        selectedScreener = value.selectedScreener
    });

    onMount(() => {
        console.log("AFASDFADSFASF", selectedSymbol)
    })

    onDestroy(() => {
        unsubscribe();
    });

    

    let isScriptActive = false

    async function runScript() {
        isScriptActive ? globalService.stopScreeners() : await globalService.startScreeners()
        isScriptActive = !isScriptActive
    }

    async function createScreenersForTop100VolatileCoins() {
        await globalService.createScreenersForTop100VolatileCoins();
    }

</script>

{#if data}
    <div class=" bg-base-200 h-[100vh] p-2">
        <div class="grid grid-cols-9">
            <div class="grig grid-rows-5 col-span-6 gap-2">
                <div class="h-[80vh]">         
                    <TradingView bind:symbol={selectedSymbol} />
                </div>
                
                <div class="flex flex-row justify-between ">
                    <label class="input input-bordered w-[400px] justify-self-end flex self-center items-center gap-2">
                        <input type="text" class="grow" placeholder="Search" />
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-70"><path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" /></svg>
                    </label>
                    {#if isScriptActive}
                        <button class="btn btn-error" on:click={runScript}>Stop</button>
                    {:else}
                        <button class="btn btn-success" on:click={runScript}>Run</button>
                    {/if}
                    <button class="btn btn-info" on:click={createScreenersForTop100VolatileCoins}>
                        Get Top 100 Volatile Coins
                    </button>
                </div>
                    <div class="gap-2">  
                            <ScreenerGrid />
                    </div>
            </div>
            <div class="ml-2 col-span-3">
                <ScreenerEdit />
            </div>
        </div>
    </div>
{/if}


