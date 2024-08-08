<script lang="ts">
    export let value: boolean
    export let label: string
</script>

<div class="flex flex-row gap-2">
    <div class="form-cotrol bg-base-100 border rounded-md input-bordered px-3 flex w-full">
        <label class="label cursor-pointer w-full gap-2 justify-start">
            <input type="checkbox" bind:checked={value} class="checkbox" />
            <span class="label-text">{label}</span> 
        </label>
    </div>
</div>