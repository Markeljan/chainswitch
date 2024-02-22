document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  setupChainDropdown();
  setupRedirectFromUrl();
  setupEventListeners();
}

async function setupChainDropdown() {
  const chainSelect = document.getElementById("chainSelect");
  if (!chainSelect) return;

  for (const chain of CHAINS) {
    const option = document.createElement("option");
    option.value = option.textContent = chain.name;
    chainSelect.appendChild(option);
  }

  await setInitialChainSelection(chainSelect);
}

async function setInitialChainSelection(chainSelect) {
  const chainValue = new URLSearchParams(window.location.search).get("chain") || (await getCurrentChain()) || 1;

  const chainDetails = getChainDetails(chainValue);

  chainSelect.value = chainDetails.name;
}

function getChainDetails(chainValue) {
  //chainValue could be a number as a string
  if (!isNaN(chainValue)) {
    return CHAINS.find((chain) => chain.chainId === parseInt(chainValue)) || CHAINS[0];
  }
  // try to find a direct match first
  const directMatch = CHAINS.find(
    ({ name, shortName }) =>
      name.localeCompare(chainValue, "en", { sensitivity: "base" }) === 0 ||
      shortName.localeCompare(chainValue, "en", { sensitivity: "base" }) === 0
  );
  if (directMatch) {
    return directMatch;
  }

  // if no direct match, find the closest match
  const lowercaseChainNames = CHAINS.map(({ name }) => name.toLowerCase());
  const distances = lowercaseChainNames.map((name) => levenshteinDistance(name, chainValue));
  const minDistance = Math.min(...distances);
  const bestNameMatch = CHAINS[distances.indexOf(minDistance)].name;
  return CHAINS.find(({ name }) => name === bestNameMatch) || CHAINS[0];
}

function setupRedirectFromUrl() {
  const redirectParam = new URLSearchParams(window.location.search).get("redirect");
  if (!redirectParam) return;

  const redirectUrlInput = document.getElementById("redirectUrl");
  if (redirectUrlInput) {
    redirectUrlInput.value = decodeURIComponent(redirectParam).replace(/^https?:\/\//, "");
  }

  document.getElementById("redirectUrl")?.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/^https?:\/\//, "");
    updateGoToLinkButtonState();
    updateUrlParams("redirect", e.target.value);
  });
}

function setupEventListeners() {
  setupModalListeners();
  setupNetworkSwitchListener();
  setupUrlParamListeners();
  setupCopyLinkButton();
  setupDraggableWindow();
  setupGoToLinkButton();
}

function setupModalListeners() {
  document.getElementById("closeAlert")?.addEventListener("click", closeAlert);
  document.querySelector(".close")?.addEventListener("click", closeAlert);
}

function setupNetworkSwitchListener() {
  document.getElementById("switchNetwork")?.addEventListener("click", switchNetworkListener);
}

async function switchNetworkListener() {
  if (!window.ethereum) return showAlert("No wallet detected.");

  const chainSelect = document.getElementById("chainSelect");
  const currentChain = await getCurrentChain();
  const selectedChainName = chainSelect.value;
  const chainDetails = CHAINS.find((chain) => chain.name === selectedChainName);

  if (!chainDetails || chainDetails.chainId === currentChain) {
    return showAlert(chainDetails ? "You are already on the selected network." : "Please select a valid chain.");
  }

  await switchNetwork(chainDetails);
}

async function getCurrentChain() {
  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(chainIdHex, 16);
}

function setupUrlParamListeners() {
  document.getElementById("chainSelect")?.addEventListener("change", (e) => updateUrlParams("chain", e.target.value));
  document.getElementById("redirectUrl")?.addEventListener("input", (e) => {
    updateGoToLinkButtonState();
    updateUrlParams("redirect", e.target.value);
  });
}
function updateGoToLinkButtonState() {
  const goToLinkButton = document.getElementById("goToLink");
  const redirectUrl = document.getElementById("redirectUrl").value;

  // Enable or disable the button based on redirectUrl content
  goToLinkButton.disabled = !redirectUrl;

  if (redirectUrl) {
    goToLinkButton.classList.remove("retro-btn-disabled");
  } else {
    goToLinkButton.classList.add("retro-btn-disabled");
  }
}

function setupGoToLinkButton() {
  const goToLinkButton = document.getElementById("goToLink");
  const redirectUrl = document.getElementById("redirectUrl")?.value;
  goToLinkButton.disabled = !redirectUrl;

  goToLinkButton.addEventListener("click", () => {
    const redirectUrl = document.getElementById("redirectUrl")?.value;
    if (!goToLinkButton.disabled && redirectUrl) {
      window.open(`https://${redirectUrl}`, "_blank");
    }
  });
}

function setupCopyLinkButton() {
  document.getElementById("copyLink")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showAlert("✔ copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });
}

function setupDraggableWindow() {
  const titleBar = document.querySelector(".title-bar");
  const dragWindow = document.querySelector(".window");
  if (!titleBar || !dragWindow) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  titleBar.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", () => (isDragging = false));

  function startDrag(e) {
    isDragging = true;
    offsetX = e.clientX - dragWindow.offsetLeft;
    offsetY = e.clientY - dragWindow.offsetTop;
  }

  function drag(e) {
    if (!isDragging) return;
    dragWindow.style.left = `${e.clientX - offsetX}px`;
    dragWindow.style.top = `${e.clientY - offsetY}px`;
  }
}

function showAlert(message) {
  const alertModal = document.getElementById("alertModal");
  const alertMessage = document.getElementById("alertMessage");
  if (!alertModal || !alertMessage) return;

  alertMessage.innerHTML = message;
  alertModal.style.display = "block";
}

function closeAlert() {
  const alertModal = document.getElementById("alertModal");
  if (alertModal) alertModal.style.display = "none";
}

async function switchNetwork(chainDetails) {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainDetails.chainId.toString(16)}` }],
    });
    handleNetworkSwitchSuccess();
    return true;
  } catch (error) {
    if (error.code === 4902) {
      return tryAddingNewChain(chainDetails);
    }
    console.error(error);
    return false;
  }
}

async function tryAddingNewChain(chainDetails) {
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [getChainParams(chainDetails)],
    });
    handleNetworkSwitchSuccess();
    return true;
  } catch (addError) {
    console.error(addError);
    return false;
  }
}

function getChainParams(chainDetails) {
  return {
    chainId: `0x${chainDetails.chainId.toString(16)}`,
    rpcUrls: chainDetails.rpc,
    chainName: chainDetails.name,
    nativeCurrency: chainDetails.nativeCurrency,
    blockExplorerUrls: [chainDetails.infoURL],
  };
}

async function handleNetworkSwitchSuccess() {
  const redirectUrl = document.getElementById("redirectUrl").value;
  if (redirectUrl) {
    await showBSODAndRedirect(`https://${redirectUrl}`);
  } else {
    showAlert("Switched network successfully.");
  }
}

function updateUrlParams(key, value) {
  const url = new URL(window.location);
  if (key !== "chain" && !url.searchParams.get("chain")) {
    url.searchParams.set("chain", document.getElementById("chainSelect").value);
  }

  if (key === "redirect") {
    value = value.replace(/^https?:\/\//, "");
  }

  url.searchParams.set(key, value);

  if (key !== "redirect" && !url.searchParams.get("redirect")) {
    url.searchParams.set("redirect", "");
  }
  window.history.pushState({}, "", url.toString());
}

async function showBSODAndRedirect(redirectUrl) {
  const bsodOverlay = document.createElement("div");
  bsodOverlay.classList.add("bsod-overlay");
  bsodOverlay.innerHTML = `
    <div class="bsod-content">
      <p>A problem has been detected and Windows has been shut down to prevent damage to your computer.</p>
      <p>*** STOP: 0x0000001E (0xFFFFFFFFC0000005, 0xFFFFF800C0000000, 0x0000000000000000, 0x0000000000000000)</p>
      <p>*** Address FFFFF800C0000000 base at FFFFF800C0000000, DateStamp 3b7d855c</p>
      <p>Beginning dump of physical memory</p>
      <p>Physical memory dump complete.</p>
      <p>Contact your system administrator or technical support group for further assistance.</p>
      <p>Jk, you're good to go. Redirecting...</p>
    </div>
  `;
  document.body.appendChild(bsodOverlay);

  bsodOverlay.style.display = "flex";

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Open the redirectUrl in same tab
  window.open(redirectUrl, "_self");
}
