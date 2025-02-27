const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const BITQUERY_ACCESS_TOKEN = process.env.BITQUERY_ACCESS_TOKEN;

    console.log('BITQUERY_ACCESS_TOKEN:', BITQUERY_ACCESS_TOKEN ? 'Set' : 'Not set');

    if (!BITQUERY_ACCESS_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Bitquery access token not configured'})
        };
    }

    const query = `
        query MyQuery {
            Solana {
                TokenSupplyUpdates(
                    where: {TokenSupplyUpdate: {Currency: {MintAddress: {includes: "pump"}}}}
                    limit: {count: 5}
                ) {
                    TokenSupplyUpdate {
                        MCAP: Marketcap
                        Currency {
                            Decimals
                            Fungible
                            MintAddress
                            Name
                            Symbol
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
        const tokens = tokenUpdates.map(update => ({
            name: `$${update.TokenSupplyUpdate?.Currency?.Name || update.TokenSupplyUpdate?.Currency?.Symbol || 'Unknown'}`,
            MCAP: update.TokenSupplyUpdate?.MCAP ? Number(update.TokenSupplyUpdate.MCAP).toFixed(2) : '0.00'
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: tokens })
        };
    } catch (error) {
        console.error('Bitquery Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};