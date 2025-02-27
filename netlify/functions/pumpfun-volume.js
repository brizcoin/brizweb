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
                where: { TokenSupplyUpdate: { Currency: { } } } # Remove specific filter
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
        console.log(`Bitquery response status: ${response.status}, body: ${text.substring(0, 500)}`); // Log more for debugging
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `Bitquery API failed: ${text}` })
            };
        }

        const data = JSON.parse(text);
        const tokenUpdates = data.data.Solana.TokenSupplyUpdates || [];
        const fallbackUpdates = data.data.Solana.AllUpdates || [];
        const tokens = tokenUpdates.length > 0 ? tokenUpdates.slice(0, 5).map(update => ({
            name: update.TokenSupplyUpdate.Currency.Name || update.TokenSupplyUpdate.Currency.Symbol || 'Unknown',
            marketcap: update.TokenSupplyUpdate.Marketcap || 0,
            image: update.TokenSupplyUpdate.Currency.Uri || null
        })) : fallbackUpdates.slice(0, 5).map(update => ({
            name: update.TokenSupplyUpdate.Currency.Name || update.TokenSupplyUpdate.Currency.Symbol || 'Unknown',
            marketcap: update.TokenSupplyUpdate.Marketcap || 0,
            image: null
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