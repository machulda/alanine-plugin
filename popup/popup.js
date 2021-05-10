/**
 * Query selectors
 *
 */
const enableBlockingCheckbox = document.getElementById("status");
const enableLoggingCheckbox = document.getElementById("logging-status");

const blockingSlider = document.getElementById("blocking-slider");
const loggingSlider = document.getElementById("logging-slider");

const blockingSliderValue = document.getElementById("blocking-time-value");
const loggingSliderValue = document.getElementById("logging-time-value");

const blockingSliderWrapper = document.getElementById("blocking-slider-wrapper");
const loggingSliderWrapper = document.getElementById("logging-slider-wrapper");


const versionParagraph = document.getElementById("version");
const dnsReloadButton = document.getElementById("dns-reload");
const gravityUpdateButton = document.getElementById("gravity-update");
const infobox = document.getElementById("message-box");
/// add domain to black/white list selectors

const addDomainButton = document.getElementById("add-domain");
const cancelAddDomain = document.getElementById("cancel-add-domain");
const domainform = document.getElementById("domain-form");
const submitWhitelist = document.getElementById("submit-whitelist");
const submitBlacklist = document.getElementById("submit-blacklist");


const domainInput = document.getElementById("domain-input");
const popupControls = document.getElementById("popup-controls");

const offlineDialog = document.getElementById("offline-dialog");

const spinner = document.getElementById("spinner");

const openPiholeAdmin = document.getElementById("open-admin");
const openSettings = document.getElementById("open-settings");

const indefinitelySliderHtml = "<strong>indefinitely</strong>";

let state = {};
/// msg - {id, ttl,message}
let messageArray = [];


/**
 * remove loading visual
 */
function removeLoadingVisual() {
    spinner.classList.remove("spinner");
    popupControls.classList.remove("loading");
}


/**
 * Change inner state to new state.
 * @param newState
 */
const processState = (newState) => {
    /// if state didn't change, there is no need for update
    if (newState === state) {
        return;
    }
/// we are opening popup with "loading visual" active (blurry grey background + spinner). so after we get state we can remove this visual.
    removeLoadingVisual();

    /// if offline show dialog to enter ip and port. If offline show main control panel
    if (!newState.connected) {
        offlineDialog.classList.remove("hidden");
        domainform.classList.add("hidden");
        popupControls.classList.add("hidden")
    } else {
        offlineDialog.classList.add("hidden");
        /// we want to hide everything except controls, so we can return to base state
        domainform.classList.add("hidden");
        popupControls.classList.remove("hidden");
    }
    enableBlockingCheckbox.checked = newState.blockingEnabled;
    enableLoggingCheckbox.checked = newState.loggingEnabled;

    if (newState.blockingEnabled) {
        blockingSliderWrapper.classList.remove("hidden");
    } else {
        blockingSliderWrapper.classList.add("hidden")
    }

    if (newState.loggingEnabled) {
        loggingSliderWrapper.classList.remove("hidden");
    } else {
        loggingSliderWrapper.classList.add("hidden")
    }

    versionParagraph.innerHTML = newState.version;


    state = newState;

};

/**
 * Send message to background that popup is opened
 */
const sayHelloToBackground = () => {
    browser.runtime.sendMessage({type: "hello"});
};

function changeIconToDefault() {
    browser.browserAction.setIcon(
        {path: "../icons/Logo48px.png"}
    ).catch(e => console.log("error " + e.message + " while loading default icon"));
}

const disableBlocking = () => {
    state.blockingEnabled = false;
    blockingSliderWrapper.classList.add("hidden");

    browser.runtime.sendMessage({
        type: 'disable-blocking',
        payload: {time: blockingSlider.value}
    }).catch((e) => console.error(e));
    blockingSlider.value = 0;
    blockingSliderValue.innerHTML = indefinitelySliderHtml;
};

const enableBlocking = () => {
    state.blockingEnabled = true;
    blockingSliderWrapper.classList.remove("hidden");
    browser.runtime.sendMessage({type: 'enable-blocking'}).catch((e) => console.error(e));
};
const disableLogging = () => {
    state.loggingEnabled = false;
    loggingSliderWrapper.classList.add("hidden");
    browser.runtime.sendMessage({
        type: 'disable-logging',
        payload: {time: loggingSlider.value}
    }).catch((e) => console.error(e));
    loggingSlider.value = 0;
    loggingSliderValue.innerHTML = indefinitelySliderHtml;

};

const enableLogging = () => {
    state.loggingEnabled = true;
    loggingSliderWrapper.classList.remove("hidden");
    browser.runtime.sendMessage({type: 'enable-logging'}).catch((e) => console.error(e));
};

/**
 * displays user messages.
 * @param message
 */
function displayUserMessage(message) {
    /// get id
    const id = messageArray.length === 0 ? 0 : messageArray[0].id + 1;

    /// add message to message array. we want to have our most recent message on top so unshift.
    messageArray.unshift({id: id, ttl: 5, message: message});
    /// display message
    switch (message.level) {
        case "info":
            infobox.innerHTML = `<p class="${message.level}" id="message-${id}"> <i class="fas fa-info-circle"></i> ${message.load}</p>` + infobox.innerHTML;
            break;
        case "warning":
            infobox.innerHTML = `<p class="warning" id="message-${id}"> <i class="fas fa-exclamation-triangle"></i>${message.load}</p>` + infobox.innerHTML;
            break;
        case "error":
            infobox.innerHTML = `<p class="error" id="message-${id}"><i class="fas fa-times"></i> ${message.load}</p>` + infobox.innerHTML;
            break;
    }

}

/**
 * Removes old messages. Subtracts 1 from time to live of each message and if ttl is negative remove it.
 */
function messageCleaner() {
    messageArray = messageArray.filter(function (entry) {
        entry.ttl--;
        if (entry.ttl < 0) {
            document.querySelector("#message-" + entry.id).remove();
            return false;
        } else {
            return true;
        }
    });
}



const processDnsBlockingSwitch = (e) => {
    if (enableBlockingCheckbox.checked) {
        enableBlocking();
    } else {
        disableBlocking();
    }
};


function processLoggingSwitch(e) {

    if (enableLoggingCheckbox.checked) {
        enableLogging();
    } else {
        disableLogging();
    }
}


function processReloadDns() {
    browser.runtime.sendMessage({type: 'reload'}).catch((e) => console.error(e));
}

function processUpdateGravity() {
    browser.runtime.sendMessage({type: 'update-gravity'}).catch((e) => console.error(e));
}

/**
 * Hides main control panel, shows submenu for adding domain to list
 */
function processAddDomain() {
    popupControls.classList.add("hidden");
    domainform.classList.remove("hidden");
}

/**
 * Hides submenu for adding domain to list, shows main control panel
 */
function hideAddDomainToList() {

    domainform.classList.add("hidden");
    popupControls.classList.remove("hidden");
    domainInput.value = "";
}

function processBlacklistSubmit(e) {
    e.preventDefault();
    const payload = {
        name: domainInput.value,
        type: document.querySelector('input[name="type"]:checked').value
    };

    browser.runtime.sendMessage({type: "blacklist", payload: payload});
    hideAddDomainToList();
}

function processWhitelistSubmit(e) {
    e.preventDefault();
    const payload = {
        name: domainInput.value,
        type: document.querySelector('input[name="type"]:checked').value
    };

    browser.runtime.sendMessage({type: "whitelist", payload: payload});
    hideAddDomainToList();
}

function processCancelAddDomain() {
    domainInput.value = "";
    domainform.classList.add("hidden");
    popupControls.classList.remove("hidden");
}

function processLoggingSliderValueChange(e) {
    loggingSliderValue.innerHTML = loggingSlider.value !== "0" ? `<strong>${loggingSlider.value}</strong> minutes` : indefinitelySliderHtml;
}

function processBlockingSliderValueChange(e) {
    blockingSliderValue.innerHTML = blockingSlider.value !== "0" ? `<strong>${blockingSlider.value}</strong> minutes` : indefinitelySliderHtml;
}




/**
 * listener for handling messages from background script
 */
browser.runtime.onMessage.addListener(
    (message) => {
        if (message.type === "user-message") {
            displayUserMessage(message);
        } else if (message.type === "state") {
            processState(message.load)
        } else {
            console.error("unknown message: ", message)
        }
    }
);



sayHelloToBackground();

changeIconToDefault();

/**
 * Event listeners are binded here.
 */

/**
 *  disable / enable checkboxes and sliders
 */
enableBlockingCheckbox.addEventListener("click", processDnsBlockingSwitch);
enableLoggingCheckbox.addEventListener("click", processLoggingSwitch);

blockingSlider.addEventListener("input", processBlockingSliderValueChange);
loggingSlider.addEventListener("input", processLoggingSliderValueChange);
/**
 * Popup buttons listeners
 */
dnsReloadButton.addEventListener("click", processReloadDns);
gravityUpdateButton.addEventListener("click", processUpdateGravity);
addDomainButton.addEventListener("click", processAddDomain);

/**
 * Add domain to list listeners.
 */

domainform.addEventListener("submit", (e) => {
    e.preventDefault()
});

submitBlacklist.addEventListener("click", processBlacklistSubmit);
submitWhitelist.addEventListener("click", processWhitelistSubmit);
cancelAddDomain.addEventListener("click", processCancelAddDomain);
/**
 * Event listener for opening web admin in new tab
 */
openPiholeAdmin.addEventListener("click", () => {
        browser.runtime.sendMessage({type: "get-ip"}).then((message) => {
            browser.tabs.create({url: "http://" + message.response + "/admin"})
        })
    }
);

/**
 * event listener for opening options page.
 */
openSettings.addEventListener("click", () => {
    browser.runtime.openOptionsPage()
});

/// periodically cleans old messages
setInterval(messageCleaner, 1000);


