
# Screener bots Script using Bybit Api

This project demonstrates the capabilities of the Bybit API by enhancing the functionality of crypto screener-bots and overcoming API request limitations. For more details, please refer to the [Key Features](#key-features) section. Additionally, this project showcases the integration of the reactive nature of Svelte with various server-side technologies.
> [!WARNING]
> This project was initially a private commission with a tight deadline and no prepayment. Unfortunately, the client ceased communication midway through development. As a result, the project is not optimized, polished, or fully logical. While it is not a complete product, it may still be useful for those interested in utilizing the Bybit API.

## Technologies Used
-	[SvelteKit](https://kit.svelte.dev/)
-	[tRPC-svelte](https://icflorescu.github.io/trpc-sveltekit/)
-	[Prisma ORM](https://www.prisma.io/?via=start&gad_source=1) on SQLite
-	[TradingView Widgets](https://www.tradingview.com/widget/advanced-chart/)
-	[Bybit API](https://bybit-exchange.github.io/docs/v5/intro)

## Key Features

1. ### Bypassing Bybit API Limitations

	- **Utilizing Multiple Subaccounts:**
	    -   Each subaccount has its own API rate limit.
	    -   Orders are scattered across multiple subaccounts to maximize throughput.
	-  **Intelligent Order Processing:**
	    -   Orders are processed in a round-robin fashion across all screeners registered to the same API key (subaccount).
	    -   For example, with 3 screeners, the process goes: Screener1-Order1, Screener2-Order1, Screener3-Order1, then back to Screener1-Order2, and so on.
	    -   This ensures somewhat equal and simultaneous addition/amendment/removal of orders across all screeners.
	-  **Batch Processing:**
	    -   Orders are grouped into batches of up to 10 (the maximum for one batch request).
	    -   Each batch is executed as a Promise.
	    -   A 1-second delay is implemented between batches to respect API rate limits.
	-  **Parallel Execution Across Subaccounts:**
	    -   Promises for screeners on different API keys (subaccounts) are executed in parallel.
	    -   This multiplies the effective throughput by the number of subaccounts used.
	-  **Optimized Performance:**
	    -   With this approach, a large number of orders can be processed rapidly.
	    -   For example, 100 screeners with 5 orders each (500 total orders) can potentially be executed in just 3 seconds when using 20 subaccounts.
	-  **Maintaining Market Responsiveness:**
	    -   The round-robin approach ensures that orders from each screener are amended simultaneously, preventing missed opportunities due to market movements.

	### 2. Comprehensive Screener Management

	-   **Dynamic Screener Creation**: Automatically generates screeners for the top 100 most volatile coins.
	-   **Flexible Order Handling**: Supports creation, amendment, and cancellation of orders across multiple screeners.
	-   **Real-time Market Data Integration**: Incorporates live price data for accurate order placement and adjustments.

	### 3. Advanced Trading Functionalities

	-   **Customizable Order Parameters**: Allows setting of take profit, stop loss, and leverage options.
	-   **Position Management**: Tracks and manages open positions across different symbols.
	-   **Volatility-based Trading**: Implements strategies based on 24-hour price percentage changes.

This implementation allows for efficient management of a large number of screeners and orders while respecting API limitations and maintaining responsiveness to market conditions.

## Disclaimer

This project is a demonstration of Bybit API capabilities and is not intended for production use without thorough testing and risk management. Trading cryptocurrencies involves significant risk. Use this software at your own risk.
