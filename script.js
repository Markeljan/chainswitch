async function initializeChainDropdown() {
  const chainSelect = document.getElementById("chainSelect");
  chains.forEach((chain) => {
    const option = document.createElement("option");
    option.value = chain.name;
    option.textContent = chain.name;
    chainSelect?.appendChild(option);
  });

  // Set chain from URL params if present, trying to find the closest match
  const urlParams = new URLSearchParams(window.location.search);
  const chainParam = urlParams.get("chain");
  if (chainParam) {
    let bestMatch = { option: null, distance: Infinity };
    Array.from(chainSelect.options).forEach((option) => {
      const distance = levenshteinDistance(chainParam.toLowerCase(), option.value.toLowerCase());
      if (distance < bestMatch.distance) {
        bestMatch = { option, distance };
      }
    });

    if (bestMatch.option) {
      chainSelect.value = bestMatch.option.value;
    }
  }

  // Update redirect URL input field if 'redirect' param is present
  const redirectParam = urlParams.get("redirect");
  if (redirectParam) {
    document.getElementById("redirectUrl").value = decodeURIComponent(redirectParam).replace(/^https?:\/\//, "");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeChainDropdown();
  updateGoToLinkButtonState();
  setupShareLinkButton();
});

document.getElementById("chainSelect")?.addEventListener("change", (e) => {
  const chainName = e.target.value;
  updateUrlParams("chain", chainName);
});

document.getElementById("redirectUrl")?.addEventListener("input", (e) => {
  const redirectUrl = e.target.value;
  updateUrlParams("redirect", redirectUrl);
  updateGoToLinkButtonState();
});

document.getElementById("switchNetwork")?.addEventListener("click", async () => {
  const chainName = document.getElementById("chainSelect").value;
  await switchNetworkTo(chainName);
});

document.getElementById("goToLink")?.addEventListener("click", () => {
  const redirectUrl = "https://" + document.getElementById("redirectUrl").value;
  window.open(redirectUrl);
});

async function switchNetworkTo(chainName) {
  const chainDetails = chains.find((chain) => chain.name === chainName);
  if (!chainDetails) {
    alert("Please select a valid chain.");
    return;
  }
  await switchNetwork(chainDetails);
}

async function switchNetwork(chainDetails) {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + chainDetails.chainId.toString(16) }],
    });
  } catch (error) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x" + chainDetails.chainId.toString(16),
              rpcUrls: chainDetails.rpc,
              chainName: chainDetails.name,
              nativeCurrency: chainDetails.nativeCurrency,
              blockExplorerUrls: [chainDetails.infoURL],
            },
          ],
        });
      } catch (addError) {
        console.error(addError);
      }
    }
  }
}

function setupShareLinkButton() {
  const shareLinkButton = document.getElementById("copyLink");
  shareLinkButton.addEventListener("click", async () => {
    try {
      const fullUrl = window.location.href;
      await navigator.clipboard.writeText(fullUrl);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  });
}

function updateUrlParams(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.pushState({}, "", url);
}

function updateGoToLinkButtonState() {
  const goToLinkButton = document.getElementById("goToLink");
  const redirectUrl = document.getElementById("redirectUrl").value;
  goToLinkButton.disabled = !redirectUrl;
}
