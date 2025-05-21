document.addEventListener("DOMContentLoaded", async () => {
    const counterElement = document.getElementById("visitor-count");

    try {
        const response = await fetch("https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod/visitor-count");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        counterElement.textContent = data.count;
    } catch (error) {
        console.error("Error fetching visitor count:", error);
        counterElement.textContent = "Error loading count";
    }
});
