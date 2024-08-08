<script lang="ts">
  import type { Screener } from "@prisma/client";
  import { onMount } from "svelte";
  import { globalService } from "$lib/global/store";

  export let screenerData: Screener;
  export let ordersAmount: number;
  export let activeOrdersAmount: number;
  export let isActive: boolean
  

  async function changeScreenerStatus() {
    await globalService.changeScreenerStatus({
      ...screenerData,
      isActive: !isActive
    })
  }

  async function deleteScreener() {
    await globalService.deleteScreener(screenerData)
  }
</script>

<div class="flex flex-col bg-base-100 rounded-xl p-2">
  <div class="flex flex-row row-span-1 justify-between">
    <button class="{isActive ? 'badge-success' : 'badge-error'} badge badge-sm" on:click|stopPropagation={changeScreenerStatus}></button>
    <p class="pl-2 text-sm">{screenerData.symbol}</p>
    <button class=" badge-neutral badge badge-sm" on:click|stopPropagation={deleteScreener}>x</button>
  </div>
  <div class="divider m-0"></div>
  <div class="row-span-4 text-sm px-2">
    <p>Orders: {ordersAmount - activeOrdersAmount}/{ordersAmount}</p>
    <p>Side: {screenerData.side}</p>
    <p>Volatility: {screenerData.volatility}</p>
  </div>
</div>
