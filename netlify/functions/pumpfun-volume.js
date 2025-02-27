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
                    orderBy: {descending: Block_Time, descendingByField: "TokenSupplyUpdate_totalValue"} # Placeholder
                    limitBy: {by: TokenSupplyUpdate_Currency_MintAddress, count: 1}
                    limit: {count: 5}
                ) {
                    TokenSupplyUpdate {
                        value: totalValue  # Placeholder, replace with schema field
                        Currency {
                            Name
                            Symbol
                            MintAddress
                            Uri
                        }
                    }
                }
            }
            __schema {
                types {
                    name
                    fields {
                        name
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch('https://streaming.bitquery.io/eap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BITQUERY_ACCESS_TOKEN}`
            },
            body: JSON.stringify({ query })
        });

        const text = await response.text();
        console.log('Bitquery raw response:', text);
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: `Bitquery API failed: ${text}` })
            };
        }

        const data = JSON.parse(text);
        console.log('Parsed data structure:', JSON.stringify(data, null, 2));
        const tokenUpdates = data.data?.Solana?.TokenSupplyUpdates || [];
        const tokens = tokenUpdates.map(update => ({
            name: update.TokenSupplyUpdate?.Currency?.Name || update.TokenSupplyUpdate?.Currency?.Symbol || 'Unknown',
            marketcap: update.TokenSupplyUpdate?.value || 0, // Dynamic field
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