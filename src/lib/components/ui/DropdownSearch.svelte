<script lang="ts">
    export let searchInput: string;
    export let filteredElements: any[];

    export let onInput;
    export let onAddElement;
    export let onSelectElement;
    export let onDeleteElement;
</script>

<div class="dropdown w-full">
    <label class="input input-bordered flex items-center gap-2">
        <input
            type="text"
            tabIndex="0"
            class="grow"
            placeholder="Search symbol"
            bind:value={searchInput}
            on:input={onInput}
        />
        {#if filteredElements.length == 0}
            <button class="bg-base-200 p-2 px-4 rounded-full" on:click={onAddElement}>
                +
            </button>
        {:else}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                class="w-4 h-4 opacity-70"
                ><path
                fill-rule="evenodd"
                d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                clip-rule="evenodd"
            /></svg>
        {/if}
    </label>
    {#if filteredElements.length > 0}
        <ul class="custom-dropdown">
            {#each filteredElements as element}
                <li class="relative">
                    <button class="" on:click={() => onSelectElement(element.name)}>
                        {element.name}
                    </button>
                    <div class="absolute right-0">
                        <button class=" ">Edit</button>
                        <button class=" " on:click={() => onDeleteElement(element.name)}>Delete</button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>