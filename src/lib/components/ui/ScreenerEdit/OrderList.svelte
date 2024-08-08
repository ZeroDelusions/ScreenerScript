<script lang="ts">
    import type { Order } from "@prisma/client";
    import { fade } from "svelte/transition";
    export let orders: Order[]

    export let onAddOrder
    export let onDeleteOrder
</script>

<div class="p-2 bg-base-300 rounded-md">
    <button class="hover:brightness-110 active:brightness-100 transition-all bg-base-100 flex w-full justify-center rounded-md p-1" on:click={onAddOrder}>+</button>
    <!-- {#if orders.length > 0} -->
        <div class="max-h-[50vh]">
            <ul class="grid gap-2 mt-2 flex-grow overflow-y-auto max-h-[inherit]" >
                {#each orders as order, index}
                    <li class="inline-flex flex-row gap-2 bg-base-200 rounded-md p-1 items-center">
                        <button class=" bg-base-200 btn-circle" on:click={onDeleteOrder(index)}>x</button>
                        <p>{index + 1})</p>
                        <label class="p-2 mr-4 input bg-base-200 border-0 rounded-none border-b border-base-content flex">
                            <input
                                class="w-full"
                                type="number"
                                min="0.1"
                                step="0.1"
                                tabIndex="0"     
                                placeholder=""
                                bind:value={order.step}
                            />
                            <p>%</p>
                        </label>
                        <label class="p-2 input bg-base-200 border-0 rounded-none border-b border-base-content flex">
                            <input
                                class="w-full"
                                type="number"
                                min="0.1"
                                step="0.1"
                                tabIndex="0"     
                                placeholder=""
                                bind:value={order.tpStep}
                            />
                            <p>%</p>
                        </label>
                        <label class="p-2 input bg-base-200 border-0 rounded-none border-b border-base-content flex">
                            <input
                                class="w-full"
                                type="number"
                                min="0.1"
                                step="0.1"
                                tabIndex="0"     
                                placeholder=""
                                bind:value={order.slStep}
                            />
                            <p>%</p>
                        </label>
                        <label class="p-2 input bg-base-200 border-0 rounded-none border-b border-base-content flex">
                            <!-- <label class="input bg-base-200 border-0 rounded-none border-b border-base-content flex"> -->
                            <input
                                class="w-full"
                                type="number"
                                min="0.1"
                                step="0.1"
                                tabIndex="0"
                                placeholder=""
                                bind:value={order.amount}
                            />
                        </label>
                        <!-- <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="p-2 input bg-base-200 border-0 rounded-none border-b border-base-content flex items-center w-full">Coin</div>
                            <ul class="dropdown-content menu z-10 mt-1 p-2 shadow bg-base-100 rounded-box gap-1">
                                <li >
                                    <button class="justify-center" on:click={() => {orderSide = "Long"}}>Coin</button>
                                </li>
                                <li>
                                    <button class="justify-center" on:click={() => {orderSide = "Short"}}>USDT</button>
                                </li>
                            </ul>                    
                        </div> -->
                        <select class="select p-2 bg-base-200 border-0 rounded-none border-b border-base-content flex text-center items-center bg-none">
                            <option value="" selected>Coin</option>
                            <option value="">USDT</option>
                            <option value="">%</option>
                                       
                        </select>
                        
                    </li>
                {/each}
            </ul>
        </div> 
    <!-- {/if}     -->
</div>