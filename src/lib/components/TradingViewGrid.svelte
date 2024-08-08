<script>
    import TradingView from "$lib/components/TradingView.svelte";

    var isOpened = true;

    function close() {
        isOpened =!isOpened;
        console.log(isOpened);
    }
</script>

<div class="grid grid-cols-5 gap-4 w-full h-full">
    <div class="{isOpened ? "col-span-4" : "col-span-5"}">
        <TradingView />
    </div>
    {#if isOpened}
        <div class="w-full h-full bg-base-200">
            <button class="btn btn-primary" on:click={close}>Close</button>
        </div>  
    {/if}
      
</div>