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
                    limit: {count: 10}  
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

        const tokenUpdates = data?.data?.Solana?.TokenSupplyUpdates || [];

        if (!Array.isArray(tokenUpdates) || tokenUpdates.length === 0) {
            console.log('No token updates found.');
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, data: [] })
            };
        }

        const tokens = tokenUpdates.map(update => {
            const tokenData = update?.TokenSupplyUpdate;
            if (!tokenData) return null;

            const marketcapRaw = tokenData?.Marketcap ?? 0;
            const marketcap = isNaN(marketcapRaw) ? 0 : parseFloat(marketcapRaw);

            console.log(`Token: ${tokenData.Currency?.Name}, Marketcap: ${marketcap}`);

            return {
                name: `$${tokenData.Currency?.Name || 'Unknown'}`,
                symbol: `$${tokenData.Currency?.Symbol || 'Unknown'}`,
                mcap: marketcap
            };
        }).filter(Boolean); // Remove any null values if an update was skipped

        // Sort by Marketcap (Descending) and select the top 5
        const topTokens = tokens.sort((a, b) => b.mcap - a.mcap).slice(0, 5);

        console.log('Top 5 Tokens:', JSON.stringify(topTokens, null, 2));

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
