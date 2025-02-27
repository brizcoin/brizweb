const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const BITQUERY_ACCESS_TOKEN = process.env.BITQUERY_ACCESS_TOKEN;

    if (!BITQUERY_ACCESS_TOKEN) {
        console.log('BITQUERY_ACCESS_TOKEN is not set in environment variables');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Bitquery access token not configured' })
        };
    }

    const query = `
        query MyQuery {
            Solana {
                TokenSupplyUpdates(
                    where: { TokenSupplyUpdate: { Currency: { MintAddress: { includes: "pump" } } } }
                    orderBy: { descending: Block_Time, descendingByField: "TokenSupplyUpdate_Marketcap" }
                    limitBy: { by: TokenSupplyUpdate_Currency_MintAddress, count: 1 }
                    limit: { count: 100 }
                ) {
                    TokenSupplyUpdate {
                        Marketcap: PostBalanceInUSD
                        Currency { Name Symbol MintAddress Fungible Decimals Uri }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch('https://graphql.bitquery.io/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BITQUERY_ACCESS_TOKEN}`
            },
            body: JSON.stringify({ query })
        });

        const text = await response.text();
        console.log(`Bitquery response status: ${response.status}, body: ${text.substring(0, 100)}`);
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `Bitquery API failed: ${text}` })
            };
        }

        const data = JSON.parse(text);
        const tokens = data.data.Solana.TokenSupplyUpdates
            .slice(0, 5)
            .map(update => ({
                name: update.TokenSupplyUpdate.Currency.Name || update.TokenSupplyUpdate.Currency.Symbol || 'Unknown',
                marketcap: update.TokenSupplyUpdate.Marketcap || 0,
                image: update.TokenSupplyUpdate.Currency.Uri || null
            }));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: tokens })
        };
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};