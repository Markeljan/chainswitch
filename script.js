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

  // Draggable functionality
  makeWindowDraggable();
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
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  const chainDetails = chains.find((chain) => chain.chainId === parseInt(currentChainId, 16));
  if (chainDetails?.name === document.getElementById("chainSelect").value) {
    alert("You are already on the selected network.");
    return;
  }
  const chainName = document.getElementById("chainSelect").value;
  await switchNetworkTo(chainName);
});

document.getElementById("goToLink")?.addEventListener("click", () => {
  const redirectUrl = "https://" + document.getElementById("redirectUrl").value;
  window.location.href = redirectUrl;
});

async function switchNetworkTo(chainName) {
  const chainDetails = chains.find((chain) => chain.name === chainName);
  if (!chainDetails) {
    alert("Please select a valid chain.");
    return;
  }
  const wasSwitchSuccessful = await switchNetwork(chainDetails);

  // If the switch was successful, change the background color and redirect to the URL
  if (wasSwitchSuccessful) {
    document.body.style.backgroundColor = "#000000";
    const windowElements = document.getElementsByClassName("window");
    const urlElements = document.getElementsByClassName("url-input");
    const retroElements = document.getElementsByClassName("retro-btn");
    for (const win of windowElements) {
      win.style.background = "#008080";
      win.style.color = "#FFFFFF";
    }
    for (const url of urlElements) {
      url.style.background = "#000000";
      url.style.color = "#FFFFFF";
    }
    for (const btn of retroElements) {
      btn.style.background = "#000000";
      btn.style.color = "#FFFFFF";
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const redirectUrl = "https://" + document.getElementById("redirectUrl").value;
    window.location.href = redirectUrl;
  }
}

async function switchNetwork(chainDetails) {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + chainDetails.chainId.toString(16) }],
    });
    return true; // Indicate the switch was successful
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
        return true; // Indicate the switch was successful after adding a new network
      } catch (addError) {
        console.error(addError);
      }
    }
    return false; // Indicate the switch was not successful
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

function makeWindowDraggable() {
  const titleBar = document.querySelector(".title-bar");
  const dragWindow = document.querySelector(".window");

  if (!titleBar || !dragWindow) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  titleBar.addEventListener("mousedown", function (e) {
    isDragging = true;
    offsetX = e.clientX - dragWindow.offsetLeft;
    offsetY = e.clientY - dragWindow.offsetTop;
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    dragWindow.style.left = `${e.clientX - offsetX}px`;
    dragWindow.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", function () {
    isDragging = false;
  });
}
