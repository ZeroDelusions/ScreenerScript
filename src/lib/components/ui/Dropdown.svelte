<script lang="ts">
    export let input: string | number;
    export let elements: any[];
</script>

<div class="flex flex-row gap-2">
    <div class="dropdown dropdown-end grow">
        <div tabindex="0" role="button" class="input input-bordered flex items-center cursor-click">Order type: {input}</div>
        <ul class="custom-dropdown">
            {#each elements as element}
                <li >
                    <button class="justify-center" on:click={() => {input = element}}>{element}</button>
                </li>
            {/each}
            
        </ul>
    </div>
</div>
  