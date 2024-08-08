<script lang="ts">
    import ScreenerWidget from "./ScreenerWidget.svelte";
    import type { Order, Screener } from "@prisma/client";

    import { onDestroy, onMount } from "svelte";
    import { globalService } from "$lib/global/store";

    let screeners: Screener[];
    let orders: Order[];
    let activeOrders: HashTable<HashTable<any[]>>;

    $: screeners, console.log("FFF",screeners)

    const unsubscribe = globalService.subscribe((value) => {
      screeners = value.screeners;
      orders = value.orders;
      activeOrders = value.activeOrders;
    });

    onDestroy(() => {
      unsubscribe();
    });

    function handleScreenerClick(screener: Screener) {
      if (globalService.getGlobalStore().selectedScreener.id == screener.id) {
        globalService.clearSelectedScreener()
      } else {
        globalService.selectScreener(screener)
      }
    }


</script>

<div class="bg-base-200 grid grid-cols-6 gap-2 auto-rows-auto overflow-y-scroll">
  <!-- {#if screeners} -->
    {#each screeners as screener}
      <!-- {#if activeOrders[screener.keyId] && activeOrders[screener.keyId][screener.symbol]} -->
      <button class="{screener.id == globalService.getGlobalStore().selectedScreener.id ? 'outline' : ''} outline-2 outline-offset-2 outline-neutral rounded-xl" type="button" on:click={() => handleScreenerClick(screener)}>
        <ScreenerWidget
          screenerData={screener}
          ordersAmount={orders.filter((order) => order.screenerId == screener.id).length}
          activeOrdersAmount={(activeOrders[screener.keyId] != undefined && activeOrders[screener.keyId][screener.symbol] != undefined) ? activeOrders[screener.keyId][screener.symbol].length : 0}
          isActive={screener.isActive}
        />
      </button>
      <!-- {/if} -->
    {/each}
  <!-- {/if} -->
</div>
