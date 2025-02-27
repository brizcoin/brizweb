const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const BITQUERY_ACCESS_TOKEN = process.env.BITQUERY_ACCESS_TOKEN;

    console.log('BITQUERY_ACCESS_TOKEN:', BITQUERY_ACCESS_TOKEN ? 'Set' : 'Not set');

    if (!BITQUERY_ACCESS_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Bitquery access token not configured' })
        };
    }

    const query = `
        query MyQuery {
            Solana {
                TokenSupplyUpdates(
                    where: {TokenSupplyUpdate: {Currency: {MintAddress: {includes: "pump"}}}}
                    orderBy: {descending: Block_Time, descendingByField: "TokenSupplyUpdate_Marketcap"}
                    limitBy: {by: TokenSupplyUpdate_Currency_MintAddress, count: 1}
                    limit: {count: 10} # Fetch 10 tokens
                ) {
                    TokenSupplyUpdate {
                        Marketcap: PostBalanceInUSD
                        Currency {
                            Name
                            Symbol
                            MintAddress
                            Fungible
                            Decimals
                            Uri
                        }
                    }
                }
            }
        }
    `;

    try {
        console.log('Sending Bitquery request...');
        const response = await fetch('https://streaming.bitquery.io/eap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BITQUERY_ACCESS_TOKEN}`
            },
            body: JSON.stringify({ query })
        });

        console.log('Bitquery response status:', response.status);
        const text = await response.text();
        console.log('Bitquery raw response:', text);

        if (!response.ok) {
            throw new Error(`Bitquery API failed: ${text} (Status: ${response.status})`);
        }

        const data = JSON.parse(text);
        console.log('Parsed data structure:', JSON.stringify(data, null, 2));

        const tokenUpdates = data.data?.Solana?.TokenSupplyUpdates || [];
        const tokens = tokenUpdates.map(update => {
            const marketcapRaw = update.TokenSupplyUpdate?.Marketcap;
            console.log('Raw Marketcap:', marketcapRaw, '| Type:', typeof marketcapRaw);

            // Convert Marketcap to a float safely
            const marketcap = marketcapRaw ? parseFloat(marketcapRaw) : 0;
            console.log('Parsed Marketcap:', marketcap);

            return {
                name: update.TokenSupplyUpdate?.Currency?.Name || 'Unknown',
                symbol: update.TokenSupplyUpdate?.Currency?.Symbol || 'Unknown',
                mcap: marketcap > 0 ? marketcap.toFixed(2) : '0.00'
            };
        });

        // Sort tokens by Marketcap (descending) and take top 5
        const topTokens = tokens.sort((a, b) => b.mcap - a.mcap).slice(0, 5);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: topTokens })
        };
    } catch (error) {
        console.error('Bitquery Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};
