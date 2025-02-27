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
                orderBy: {descending: Block_Time, descendingByField: "TokenSupplyUpdate_totalValue"}
                limitBy: {by: TokenSupplyUpdate_Currency_MintAddress, count: 1}
                limit: {count: 5}
            ) {
                TokenSupplyUpdate {
                    totalValue: totalValue  # Replace with actual field from schema
                    Currency {
                        Name
                        Symbol
                        MintAddress
                        Uri
                    }
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
        console.log('Bitquery raw response:', text); // Log the entire response
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `Bitquery API failed: ${text}` })
            };
        }

        const data = JSON.parse(text);
        console.log('Parsed data structure:', JSON.stringify(data, null, 2)); // Log parsed structure
        const tokenUpdates = data.data?.Solana?.TokenSupplyUpdates || [];
        const tokens = tokenUpdates.map(update => ({
            name: update.TokenSupplyUpdate?.Currency?.Name || update.TokenSupplyUpdate?.Currency?.Symbol || 'Unknown',
            marketcap: update.TokenSupplyUpdate?.Marketcap || 0,
            image: update.TokenSupplyUpdate?.Currency?.Uri || null
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: tokens })
        };
    } catch (error) {
        console.log('Error during fetch:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};