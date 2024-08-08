<script lang="ts">
    import { onMount } from 'svelte';
  
    export let symbol = "BTCUSD"; // Default symbol
    $: labeledSymbol = `BYBIT:${symbol || "BTCUSDT"}.P`;
    $: labeledSymbol, updateWidget()
  
    // Function to update the widget
    function updateWidget() {
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
            script.async = true;
            script.innerHTML = JSON.stringify({
                "autosize": true,
                "symbol": labeledSymbol,
                "interval": "1",
                "timezone": "Etc/UTC",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "gridColor": "rgba(0, 0, 0, 0.06)",
                "allow_symbol_change": true,
                "calendar": false,
                "support_host": "https://www.tradingview.com"
            });
        
            const container = document.querySelector('.tradingview-widget-container__widget')!;
            container.innerHTML = ''; // Clear previous widget
            container.appendChild(script);
        }
    }
  
    // Initialize the widget on mount
    onMount(() => {
      updateWidget();
    });
    
  </script>
  
  <div class="w-full h-full">
    <div class="tradingview-widget-container w-full h-full">
      <div class="tradingview-widget-container__widget w-full h-full"></div>
    </div>
  </div>